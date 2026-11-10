import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type HostInstance, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/AppText';
import { Lively } from '@/components/Motion';
import { INK, shade } from '@/constants/artStyle';
import { useMotion } from '@/hooks/useAccessibility';
import { useTownState } from '@/services/townSession';
import { BUILDINGS, type BuildingId } from '@/utils/town';
import {
  clampCamera,
  coverScale,
  MAP_H,
  MAP_W,
  MAX_ZOOM,
  pinchCamera,
  type Camera,
} from '@/utils/townMap';

/** A building on the map: its spot (top left, in map points) and size. */
interface Lot {
  id: BuildingId | 'home';
  name: string;
  emoji: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const SPOTS: Record<BuildingId, { x: number; y: number; w: number; h: number }> = {
  school: { x: 300, y: 270, w: 210, h: 170 },
  shop: { x: 560, y: 290, w: 170, h: 150 },
  bakery: { x: 870, y: 290, w: 170, h: 150 },
  library: { x: 1090, y: 270, w: 200, h: 170 },
  park: { x: 300, y: 760, w: 200, h: 150 },
  farm: { x: 1090, y: 760, w: 210, h: 150 },
};
const HOME_SPOT = { x: 870, y: 760, w: 170, h: 150 };
/** The ring road's outer edges. */
const LOTS: Lot[] = [
  ...BUILDINGS.map((b): Lot => {
    const spot = SPOTS[b.id];
    return { id: b.id, name: b.name, emoji: b.emoji, color: b.color, ...spot };
  }),
  { id: 'home', name: 'Buddy home', emoji: '🏠', color: '#EF6C9A', ...HOME_SPOT },
];

/** Below this many points of movement a touch is a tap. */
const TAP_SLOP = 8;
/** How long the zoom into a building takes before going inside. */
const ENTER_MS = 380;

/**
 * The town as a map seen from above: roads, a roundabout with a fountain, trees, and the buildings
 * spread around. Drag to move around, pinch (or the + and − buttons, or the mouse wheel on a computer)
 * to zoom, tap a building to make it bounce and show its name, and tap it again to zoom in and go inside.
 */
export function TownMap({ onDoor }: { onDoor: (id: BuildingId) => void }) {
  const { animate } = useMotion();
  const { people } = useTownState();
  const [view, setView] = useState({ width: 0, height: 0 });
  const [picked, setPicked] = useState<string | null>(null);
  const [bounces, setBounces] = useState<Record<string, number>>({});
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const frame = useRef<HostInstance>(null);
  const origin = useRef({ x: 0, y: 0 });
  const gesture = useRef<{
    start: Camera;
    touches: { x: number; y: number }[];
    moved: boolean;
    last: { x: number; y: number; t: number };
    velocity: { x: number; y: number };
  } | null>(null);
  const entering = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placed = useRef(false);

  useEffect(
    () => () => {
      if (entering.current) clearTimeout(entering.current);
    },
    [],
  );

  const camera = (): Camera => ({ x: tx.value, y: ty.value, scale: scale.value });
  const setCamera = (c: Camera) => {
    const fit = clampCamera(c, view.width, view.height);
    tx.value = fit.x;
    ty.value = fit.y;
    scale.value = fit.scale;
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setView({ width, height });
    frame.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      origin.current = { x: pageX ?? 0, y: pageY ?? 0 };
    });
    if (!placed.current && width > 0 && height > 0) {
      // Start over the roundabout, close enough in to read the signs.
      placed.current = true;
      const s = Math.max(coverScale(width, height), Math.min(1, width / 760));
      const c = clampCamera({ scale: s, x: width / 2 - (MAP_W / 2) * s, y: height / 2 - (MAP_H / 2) * s }, width, height);
      tx.value = c.x;
      ty.value = c.y;
      scale.value = c.scale;
    }
  };

  const at = (pageX: number, pageY: number) => ({ x: pageX - origin.current.x, y: pageY - origin.current.y });
  const touchesOf = (e: GestureResponderEvent) => {
    const list = e.nativeEvent.touches?.length ? e.nativeEvent.touches : [e.nativeEvent];
    return list.slice(0, 2).map((t) => at(t.pageX, t.pageY));
  };

  const begin = (e: GestureResponderEvent) => {
    cancelAnimation(tx);
    cancelAnimation(ty);
    const touches = touchesOf(e);
    const first = touches[0] ?? { x: 0, y: 0 };
    gesture.current = {
      start: camera(),
      touches,
      moved: gesture.current?.moved ?? false,
      last: { ...first, t: Date.now() },
      velocity: { x: 0, y: 0 },
    };
  };

  const move = (e: GestureResponderEvent) => {
    const g = gesture.current;
    if (!g) return;
    const now = touchesOf(e);
    // A finger added or lifted: start again from here, so the map doesn't jump.
    if (now.length !== g.touches.length) return begin(e);
    if (now.length >= 2 && g.touches.length >= 2) {
      g.moved = true;
      setCamera(pinchCamera(g.start, [g.touches[0], g.touches[1]], [now[0], now[1]]));
      return;
    }
    const dx = now[0].x - g.touches[0].x;
    const dy = now[0].y - g.touches[0].y;
    if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    g.moved = true;
    const t = Date.now();
    const dt = Math.max(1, t - g.last.t);
    g.velocity = { x: ((now[0].x - g.last.x) / dt) * 1000, y: ((now[0].y - g.last.y) / dt) * 1000 };
    g.last = { ...now[0], t };
    setCamera({ ...g.start, x: g.start.x + dx, y: g.start.y + dy });
  };

  const end = (e: GestureResponderEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (!g.moved) return tap(g.touches[0]);
    // Let go while moving: the map glides on a little and slows down, staying inside its edges.
    if (animate && g.touches.length === 1) {
      const s = scale.value;
      tx.value = withDecay({ velocity: g.velocity.x, clamp: [Math.min(0, view.width - MAP_W * s), 0] });
      ty.value = withDecay({ velocity: g.velocity.y, clamp: [Math.min(0, view.height - MAP_H * s), 0] });
    }
    void e;
  };

  /** A tap on the map: a building bounces and shows its name; tapped again, it zooms in and goes inside. */
  const tap = (p: { x: number; y: number } | undefined) => {
    if (!p) return;
    const s = scale.value;
    const wx = (p.x - tx.value) / s;
    const wy = (p.y - ty.value) / s;
    const lot = LOTS.find((l) => wx >= l.x && wx <= l.x + l.w && wy >= l.y - l.h * 0.35 && wy <= l.y + l.h);
    if (!lot) return setPicked(null);
    setBounces((b) => ({ ...b, [lot.id]: (b[lot.id] ?? 0) + 1 }));
    if (picked === lot.id) enter(lot);
    else setPicked(lot.id);
  };

  /** Zooms in on a building's door, then goes inside; the map is back where it was on return. */
  const enter = (lot: Lot) => {
    if (entering.current) return;
    const go = () => (lot.id === 'home' ? router.push('/buddy') : onDoor(lot.id as BuildingId));
    if (!animate) return go();
    const before = camera();
    const s = Math.min(MAX_ZOOM * 1.6, before.scale * 3);
    const doorX = lot.x + lot.w / 2;
    const doorY = lot.y + lot.h * 0.85;
    const ease = { duration: ENTER_MS, easing: Easing.in(Easing.quad) };
    scale.value = withTiming(s, ease);
    tx.value = withTiming(view.width / 2 - doorX * s, ease);
    ty.value = withTiming(view.height / 2 - doorY * s, ease);
    entering.current = setTimeout(() => {
      go();
      entering.current = setTimeout(() => {
        entering.current = null;
        setPicked(null);
        tx.value = before.x;
        ty.value = before.y;
        scale.value = before.scale;
      }, 500);
    }, ENTER_MS);
  };

  const zoomBy = (factor: number) => {
    const c = camera();
    const mid = { x: view.width / 2, y: view.height / 2 };
    const next = pinchCamera(c, [mid, { x: mid.x + 100, y: mid.y }], [mid, { x: mid.x + 100 * factor, y: mid.y }]);
    const fit = clampCamera(next, view.width, view.height);
    const ease = { duration: animate ? 220 : 0, easing: Easing.out(Easing.quad) };
    scale.value = withTiming(fit.scale, ease);
    tx.value = withTiming(fit.x, ease);
    ty.value = withTiming(fit.y, ease);
  };

  const look = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  // The mouse wheel zooms on a computer.
  const wheel =
    Platform.OS === 'web'
      ? {
          onWheel: (e: { deltaY: number; preventDefault?: () => void }) => {
            e.preventDefault?.();
            zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
          },
        }
      : {};

  // Friends nearby: on the street they stand round the fountain; inside a building, they show over its roof.
  const onStreet = people.filter((p) => p.place === 'street');
  const inside = (id: string) => people.filter((p) => p.place === id);

  return (
    <View ref={frame} style={styles.frame} onLayout={onLayout} accessibilityLabel="Town map. Drag to look around, pinch to zoom, tap a building twice to go in.">
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={begin}
        onResponderMove={move}
        onResponderRelease={end}
        onResponderTerminate={() => (gesture.current = null)}
        {...wheel}
      >
        <Animated.View style={[styles.world, look]}>
          <Ground />
          <Cars />
          {LOTS.map((lot) => (
            <BuildingOnMap key={lot.id} lot={lot} bounce={bounces[lot.id] ?? 0} picked={picked === lot.id} friends={inside(lot.id).map((p) => p.avatar)} />
          ))}
          {onStreet.map((p, i) => (
            <Text key={p.id} style={[styles.friend, { left: MAP_W / 2 - 110 + (i % 4) * 56, top: MAP_H / 2 + 70 + Math.floor(i / 4) * 50 }]}>
              {p.avatar}
            </Text>
          ))}
        </Animated.View>
      </View>
      <View style={styles.zoom} pointerEvents="box-none">
        <Pressable onPress={() => zoomBy(1.3)} accessibilityRole="button" accessibilityLabel="Zoom in" style={({ pressed }) => [styles.zoomButton, pressed && styles.pressed]}>
          <Text style={styles.zoomText}>＋</Text>
        </Pressable>
        <Pressable onPress={() => zoomBy(1 / 1.3)} accessibilityRole="button" accessibilityLabel="Zoom out" style={({ pressed }) => [styles.zoomButton, pressed && styles.pressed]}>
          <Text style={styles.zoomText}>－</Text>
        </Pressable>
      </View>
      {picked ? (
        <View style={styles.hintSpot} pointerEvents="none">
          <Text style={styles.hint}>Tap {LOTS.find((l) => l.id === picked)?.name} again to go in</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Grass, roads, the roundabout and fountain, a pond, trees and flowers. */
function Ground() {
  return (
    <>
      <View style={[styles.fill, { backgroundColor: '#9CCC65' }]} />
      {/* Paler patches of grass so the field isn't flat. */}
      {PATCHES.map(([x, y, r], i) => (
        <View key={i} style={[styles.patch, { left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r }]} />
      ))}
      {/* The ring road round the town, and the two roads across it. */}
      <Road x={RING.x0} y={RING.y0} w={RING.x1 - RING.x0} h={ROAD} />
      <Road x={RING.x0} y={RING.y1 - ROAD} w={RING.x1 - RING.x0} h={ROAD} />
      <Road x={RING.x0} y={RING.y0} w={ROAD} h={RING.y1 - RING.y0} vertical />
      <Road x={RING.x1 - ROAD} y={RING.y0} w={ROAD} h={RING.y1 - RING.y0} vertical />
      <Road x={0} y={MAP_H / 2 - ROAD / 2} w={MAP_W} h={ROAD} />
      <Road x={MAP_W / 2 - ROAD / 2} y={RING.y0} w={ROAD} h={RING.y1 - RING.y0} vertical />
      {/* Roundabout with a fountain. */}
      <View style={[styles.round, { left: MAP_W / 2 - 95, top: MAP_H / 2 - 95, width: 190, height: 190, borderRadius: 95 }]} />
      <View style={[styles.grassRing, { left: MAP_W / 2 - 62, top: MAP_H / 2 - 62, width: 124, height: 124, borderRadius: 62 }]} />
      <Fountain />
      {/* Pond, with a duck. */}
      <View style={[styles.pond, { left: 1180, top: 1040, width: 220, height: 120, borderRadius: 70 }]} />
      <Text style={[styles.decor, { left: 1260, top: 1068, fontSize: 34 }]}>🦆</Text>
      {TREES.map(([x, y, e], i) => (
        <Text key={i} style={[styles.decor, { left: x, top: y, fontSize: e === '🌷' || e === '🌼' ? 26 : 44 }]}>
          {e}
        </Text>
      ))}
    </>
  );
}

function Road({ x, y, w, h, vertical = false }: { x: number; y: number; w: number; h: number; vertical?: boolean }) {
  const dashes = Math.floor((vertical ? h : w) / 60);
  return (
    <View style={[styles.road, { left: x, top: y, width: w, height: h, flexDirection: vertical ? 'column' : 'row' }]}>
      {Array.from({ length: dashes }, (_, i) => (
        <View key={i} style={vertical ? styles.dashV : styles.dashH} />
      ))}
    </View>
  );
}

/** Water that rises and falls in the middle of the roundabout. */
function Fountain() {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [animate, t]);
  const spray = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.8 + t.value * 0.35 }], opacity: 0.75 + t.value * 0.25 }));
  return (
    <>
      <View style={[styles.basin, { left: MAP_W / 2 - 42, top: MAP_H / 2 - 42, width: 84, height: 84, borderRadius: 42 }]} />
      <Animated.View style={[styles.spray, { left: MAP_W / 2 - 14, top: MAP_H / 2 - 46, width: 28, height: 52, borderRadius: 14, transformOrigin: 'bottom' }, spray]} />
    </>
  );
}

/** Little cars driving round the town, so it never stands still. */
function Cars() {
  return (
    <>
      <Car emoji="🚗" from={{ x: -80, y: MAP_H / 2 - 30 }} to={{ x: MAP_W + 20, y: MAP_H / 2 - 30 }} ms={9000} />
      <Car emoji="🚙" from={{ x: MAP_W + 20, y: MAP_H / 2 + 2 }} to={{ x: -80, y: MAP_H / 2 + 2 }} ms={11000} flip delay={2500} />
      <Car emoji="🚌" from={{ x: RING.x0 + 4, y: RING.y1 + 40 }} to={{ x: RING.x0 + 4, y: RING.y0 - 60 }} ms={10000} up />
      <Car emoji="🚲" from={{ x: RING.x0 - 40, y: RING.y0 + 6 }} to={{ x: RING.x1 + 10, y: RING.y0 + 6 }} ms={16000} delay={4000} />
    </>
  );
}

function Car({
  emoji,
  from,
  to,
  ms,
  delay = 0,
  flip = false,
  up = false,
}: {
  emoji: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  ms: number;
  delay?: number;
  flip?: boolean;
  up?: boolean;
}) {
  const { animate } = useMotion();
  const t = useSharedValue(delay / ms);
  useEffect(() => {
    if (!animate) return;
    t.value = withRepeat(withTiming(1 + delay / ms, { duration: ms, easing: Easing.linear }), -1);
    return () => cancelAnimation(t);
  }, [animate, ms, delay, t]);
  const look = useAnimatedStyle(() => {
    const p = t.value % 1;
    return {
      transform: [
        { translateX: from.x + (to.x - from.x) * p },
        { translateY: from.y + (to.y - from.y) * p },
        { scaleX: flip ? 1 : -1 },
        { rotate: up ? '90deg' : '0deg' },
      ],
    };
  });
  return (
    <Animated.View style={[styles.car, look]} pointerEvents="none">
      <Text style={{ fontSize: 34 }}>{emoji}</Text>
    </Animated.View>
  );
}

function BuildingOnMap({ lot, bounce, picked, friends }: { lot: Lot; bounce: number; picked: boolean; friends: string[] }) {
  const roof = shade(lot.color, 0.3);
  return (
    <View style={[styles.lot, { left: lot.x, top: lot.y - lot.h * 0.35, width: lot.w, height: lot.h * 1.35 }]} pointerEvents="none">
      <View style={[styles.shadow, { width: lot.w * 1.05, left: -lot.w * 0.025 }]} />
      <Lively height={lot.h * 1.35} bounce={bounce} bounceKind="pop" style={styles.fill}>
        {/* Roof */}
        <View style={[styles.roof, { borderLeftWidth: lot.w * 0.58, borderRightWidth: lot.w * 0.58, borderBottomWidth: lot.h * 0.38, borderBottomColor: roof, left: -lot.w * 0.08 }]} />
        <View style={[styles.body, { top: lot.h * 0.35, height: lot.h, backgroundColor: lot.color }, picked && styles.bodyPicked]}>
          <View style={styles.awning} />
          <Text style={styles.emoji}>{lot.emoji}</Text>
          <Text style={styles.name} numberOfLines={2}>
            {lot.name}
          </Text>
          <View style={[styles.door, { width: lot.w * 0.28, height: lot.h * 0.36, left: lot.w * 0.36 }]}>
            <View style={styles.knob} />
          </View>
        </View>
        {friends.length ? (
          <View style={styles.friendsInside}>
            {friends.slice(0, 4).map((a, i) => (
              <Text key={i} style={styles.friendSmall}>
                {a}
              </Text>
            ))}
          </View>
        ) : null}
      </Lively>
    </View>
  );
}

/** Where each building stands on the map (top left of its walls) and its size, in map points. */
const RING = { x0: 200, y0: 160, x1: 1400, y1: 1000 };
const ROAD = 70;
const PATCHES: [number, number, number][] = [
  [120, 120, 90],
  [1500, 200, 110],
  [640, 980, 120],
  [1450, 900, 90],
  [90, 1050, 100],
  [1000, 620, 70],
];
const TREES: [number, number, string][] = [
  [60, 60, '🌳'],
  [140, 300, '🌲'],
  [80, 560, '🌳'],
  [120, 820, '🌲'],
  [1460, 80, '🌳'],
  [1500, 420, '🌲'],
  [1470, 700, '🌳'],
  [260, 1060, '🌳'],
  [600, 1070, '🌲'],
  [960, 1080, '🌳'],
  [560, 720, '🌳'],
  [660, 860, '🌷'],
  [700, 880, '🌼'],
  [1000, 200, '🌷'],
  [1040, 216, '🌼'],
  [380, 200, '🌼'],
  [360, 690, '🌳'],
  [420, 680, '🌲'],
  [1330, 470, '🌷'],
  [300, 470, '🌼'],
];

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden', backgroundColor: '#9CCC65' },
  world: { position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H, transformOrigin: '0 0' },
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  patch: { position: 'absolute', backgroundColor: '#AED581', opacity: 0.8 },
  road: { position: 'absolute', backgroundColor: '#78909C', borderColor: '#ECEFF1', borderWidth: 4, alignItems: 'center', justifyContent: 'space-around', overflow: 'hidden' },
  dashH: { width: 26, height: 5, backgroundColor: '#FFF59D', borderRadius: 3 },
  dashV: { width: 5, height: 26, backgroundColor: '#FFF59D', borderRadius: 3 },
  round: { position: 'absolute', backgroundColor: '#78909C', borderWidth: 4, borderColor: '#ECEFF1' },
  grassRing: { position: 'absolute', backgroundColor: '#8BC34A', borderWidth: 3, borderColor: INK },
  basin: { position: 'absolute', backgroundColor: '#4FC3F7', borderWidth: 4, borderColor: '#B0BEC5' },
  spray: { position: 'absolute', backgroundColor: '#E1F5FE', borderWidth: 2, borderColor: '#81D4FA' },
  pond: { position: 'absolute', backgroundColor: '#4FC3F7', borderWidth: 3, borderColor: INK },
  decor: { position: 'absolute' },
  car: { position: 'absolute', left: 0, top: 0 },
  lot: { position: 'absolute' },
  shadow: { position: 'absolute', bottom: -10, height: 22, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.18)' },
  roof: { position: 'absolute', top: 0, width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  body: { position: 'absolute', left: 0, right: 0, borderWidth: 3, borderColor: INK, borderRadius: 8, alignItems: 'center' },
  bodyPicked: { borderColor: '#FFEB3B', borderWidth: 6 },
  awning: { alignSelf: 'stretch', height: 12, backgroundColor: '#FFFFFF', opacity: 0.85, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  emoji: { fontSize: 38, marginTop: 4 },
  name: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 4 },
  door: { position: 'absolute', bottom: 0, backgroundColor: '#8D6E63', borderWidth: 3, borderColor: INK, borderTopLeftRadius: 12, borderTopRightRadius: 12, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 },
  knob: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFCA28' },
  friend: { position: 'absolute', fontSize: 40 },
  friendsInside: { position: 'absolute', top: -14, alignSelf: 'center', flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, paddingHorizontal: 8, borderWidth: 2, borderColor: INK },
  friendSmall: { fontSize: 26 },
  zoom: { position: 'absolute', right: 10, top: 140, gap: 10 },
  zoomButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  zoomText: { fontSize: 28, fontWeight: '900', color: INK, lineHeight: 32 },
  pressed: { transform: [{ scale: 0.94 }] },
  hintSpot: { position: 'absolute', top: 64, left: 0, right: 0, alignItems: 'center' },
  hint: { fontSize: 17, fontWeight: '800', color: INK, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, overflow: 'hidden' },
});
