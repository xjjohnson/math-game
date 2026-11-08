import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/AppText';
import { Birds } from '@/components/Backyard';
import { BuddyFigure } from '@/components/BuddyFigure';
import type { HomeBuddy } from '@/components/BuddyRoom';
import { Flicker, FloatUp, Lively, type BounceKind } from '@/components/Motion';
import { PersonFigure } from '@/components/PersonFigure';
import { BUDDY_SIZE } from '@/constants/room';
import { useMotion } from '@/hooks/useAccessibility';

/** What happened in the tree house, for the buddy's speech bubble. */
export type TreeHouseEvent =
  | { kind: 'open' }
  | { kind: 'telescope'; sight: string }
  | { kind: 'chest'; open: boolean; treasure: string }
  | { kind: 'lights'; on: boolean }
  | { kind: 'bucket'; snack: string }
  | { kind: 'callUp' }
  | { kind: 'down' };

/** What the telescope shows, one after another: a picture and its name. */
export const SIGHTS: [string, string][] = [
  ['🌈', 'a rainbow'],
  ['🚀', 'a rocket'],
  ['🦅', 'an eagle'],
  ['🎈', 'a balloon'],
  ['✈️', 'a plane'],
  ['🌕', 'the moon'],
  ['🐿️', 'a squirrel'],
];
export const TREASURES: [string, string][] = [
  ['💎', 'a sparkly gem'],
  ['👑', 'a crown'],
  ['🗝️', 'a secret key'],
  ['🐚', 'a seashell'],
  ['🪙', 'a gold coin'],
  ['🗺️', 'a treasure map'],
];
export const SNACKS: [string, string][] = [
  ['🍪', 'cookies'],
  ['🍎', 'an apple'],
  ['🧃', 'a juice box'],
  ['🍌', 'a banana'],
  ['🧁', 'a cupcake'],
];

const OUTLINE = '#5B3A24';
const PLANKS = ['#C08A5B', '#B07A4F'];
const BULBS = ['#FF5252', '#FFD740', '#69F0AE', '#40C4FF', '#E040FB'];
const POP_MS = 1300;
/** How many phone screens wide the tree house is (a room in the home is 2.5). */
const SPAN = 1.8;
/** Below this many pixels a touch on a buddy is a tap, not a drag. */
const TAP_SLOP = 6;

interface Props {
  width: number;
  height: number;
  /** Buddies up in the tree house. */
  buddies: HomeBuddy[];
  onEvent: (e: TreeHouseEvent) => void;
  onTapBuddy: (id: string) => void;
  onClose: () => void;
}

function at(left: number, top: number, width: number, height: number): ViewStyle {
  return { position: 'absolute', left, top, width, height };
}

/** A buddy's spot on the tree house floor: the middle of its feet, in pixels across the room. */
interface Spot {
  x: number;
  y: number;
}

/**
 * Inside the tree house: a cozy hideout wider than the screen (it scrolls sideways like the
 * rooms), with a round window (birds fly past), a telescope, a treasure chest, string lights
 * and a bucket on a rope that brings up snacks. Buddies who climbed up are drawn as big as at
 * home and can be dragged anywhere on the floor.
 */
export function TreeHouseInside({ width: w, height: h, buddies, onEvent, onTapBuddy, onClose }: Props) {
  const { animate } = useMotion();
  const [lights, setLights] = useState(true);
  const [chest, setChest] = useState(false);
  const [sight, setSight] = useState<number | null>(null);
  const [pop, setPop] = useState<{ id: number; x: number; y: number; emoji: string } | null>(null);
  const [bumps, setBumps] = useState<Record<string, { n: number; kind: BounceKind }>>({});
  const [spots, setSpots] = useState<Record<string, Spot>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const drag = useRef<{ id: string; pageX: number; pageY: number; from: Spot; moved: boolean } | null>(null);
  const turns = useRef({ sight: 0, treasure: 0, snack: 0, pop: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bucket = useSharedValue(0);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  const popAt = (x: number, y: number, emoji: string) => {
    const id = ++turns.current.pop;
    setPop({ id, x, y, emoji });
    later(() => setPop((p) => (p?.id === id ? null : p)), POP_MS);
  };
  const hopAll = (kind: BounceKind) =>
    setBumps((b) => Object.fromEntries(buddies.map((x) => [x.id, { n: (b[x.id]?.n ?? 0) + 1, kind }])));

  // Sized like the home: a "unit" from the height (or a narrow screen's width), and screens of that.
  const unit = Math.round(Math.min(h, w * 1.15));
  const screen = Math.round(unit * 1.05);
  const cw = Math.max(w, Math.round(screen * SPAN));
  const fig = Math.round(BUDDY_SIZE * unit);
  const floor = Math.round(h * 0.68);
  const top = Math.max(h * 0.12, 64);
  const win = { size: unit * 0.3, left: screen * 0.08, top: floor - unit * 0.62 };
  const scopeH = unit * 0.32;
  const scope = { left: win.left + win.size * 0.8, top: floor - scopeH, width: unit * 0.22, height: scopeH };
  const chestBox = { left: screen * 1.15, width: unit * 0.24, height: unit * 0.16 };
  const rope = { x: cw - screen * 0.12, bottom: floor - unit * 0.36 };

  // Where each buddy stands: where it was dragged, or spread across the floor in two staggered rows.
  const spotOf = (id: string, i: number): Spot =>
    spots[id] ?? { x: screen * 0.3 + ((i + 0.5) * (cw - screen * 0.6)) / Math.max(1, buddies.length), y: floor + (h - floor) * (i % 2 ? 0.62 : 0.3) };
  const clampSpot = (s: Spot): Spot => ({
    x: Math.min(cw - fig * 0.4, Math.max(fig * 0.4, s.x)),
    y: Math.min(h - 8, Math.max(floor + 6, s.y)),
  });

  const lookOut = () => {
    const i = turns.current.sight++ % SIGHTS.length;
    setSight(i);
    later(() => setSight((s) => (s === i ? null : s)), 2200);
    onEvent({ kind: 'telescope', sight: SIGHTS[i][1] });
  };
  const openChest = () => {
    const now = !chest;
    setChest(now);
    const [emoji, name] = TREASURES[turns.current.treasure % TREASURES.length];
    if (now) {
      turns.current.treasure++;
      popAt(chestBox.left + chestBox.width / 2, floor - chestBox.height, emoji);
      hopAll('hop');
    }
    onEvent({ kind: 'chest', open: now, treasure: name });
  };
  const pullBucket = () => {
    const [emoji, name] = SNACKS[turns.current.snack++ % SNACKS.length];
    const down = h - rope.bottom;
    if (animate) {
      bucket.value = withSequence(
        withTiming(down, { duration: 600, easing: Easing.in(Easing.quad) }),
        withTiming(down, { duration: 250 }),
        withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) }),
      );
    }
    later(() => popAt(rope.x, rope.bottom - unit * 0.02, emoji), animate ? 1650 : 0);
    onEvent({ kind: 'bucket', snack: name });
  };
  const bucketLook = useAnimatedStyle(() => ({ transform: [{ translateY: bucket.value }] }));

  // Dragging a buddy around the floor; a touch that doesn't move is a tap.
  const grab = (id: string, from: Spot, e: GestureResponderEvent) => {
    drag.current = { id, pageX: e.nativeEvent.pageX, pageY: e.nativeEvent.pageY, from, moved: false };
    return true;
  };
  const move = (e: GestureResponderEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.nativeEvent.pageX - d.pageX;
    const dy = e.nativeEvent.pageY - d.pageY;
    if (!d.moved && Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return;
    if (!d.moved) setDragging(d.id);
    d.moved = true;
    setSpots((all) => ({ ...all, [d.id]: { x: d.from.x + dx, y: d.from.y + dy } }));
  };
  const letGo = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(null);
    if (!d) return;
    if (!d.moved) {
      setBumps((all) => ({ ...all, [d.id]: { n: (all[d.id]?.n ?? 0) + 1, kind: 'hop' } }));
      onTapBuddy(d.id);
      return;
    }
    setSpots((all) => ({ ...all, [d.id]: clampSpot(all[d.id] ?? d.from) }));
    setBumps((all) => ({ ...all, [d.id]: { n: (all[d.id]?.n ?? 0) + 1, kind: 'land' } }));
  };

  const bulbs = Math.max(8, Math.round(cw / 45));
  // Back to front, so whoever stands lower on the floor is in front.
  const placed = buddies.map((b, i) => ({ b, i, spot: spotOf(b.id, i) })).sort((a, c) => a.spot.y - c.spot.y);

  return (
    <View style={[StyleSheet.absoluteFill, styles.inside]} accessibilityLabel="Inside the tree house">
      <ScrollView
        horizontal
        scrollEnabled={!dragging}
        showsHorizontalScrollIndicator={false}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ width: cw, height: h }}
      >
        {/* Plank walls, a beam across the roof, and a plank floor. */}
        <View style={[at(0, 0, cw, h), { flexDirection: 'row' }]}>
          {Array.from({ length: Math.round(cw / 44) }, (_, i) => (
            <View key={i} style={[styles.plank, { backgroundColor: PLANKS[i % 2] }]} />
          ))}
        </View>
        <View style={[styles.beam, at(0, top - unit * 0.03, cw, unit * 0.04)]} />
        <View style={[styles.floor, at(0, floor, cw, h - floor)]} />

        {/* Round window: sky with birds going by, and whatever the telescope spots. */}
        <View style={[styles.window, at(win.left, win.top, win.size, win.size), { borderRadius: win.size }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: lights ? '#8FD3F4' : '#2A3A6A' }]} />
          <Birds width={win.size} floorY={win.size} />
          {sight !== null ? (
            <View style={styles.sight}>
              <Text style={{ fontSize: Math.round(win.size * 0.42) }}>{SIGHTS[sight][0]}</Text>
            </View>
          ) : null}
          <View style={[styles.cross, at(win.size / 2 - 2, 0, 4, win.size)]} />
          <View style={[styles.cross, at(0, win.size / 2 - 2, win.size, 4)]} />
        </View>

        {/* Telescope on a short tripod by the window, pointing out of it. */}
        <Pressable onPress={lookOut} accessibilityRole="button" accessibilityLabel="Look through the telescope" style={at(scope.left, scope.top, scope.width, scope.height)}>
          <View style={[styles.tripod, at(scope.width * 0.45, scope.height * 0.3, 4, scope.height * 0.72), { transform: [{ rotate: '14deg' }] }]} />
          <View style={[styles.tripod, at(scope.width * 0.55, scope.height * 0.3, 4, scope.height * 0.72), { transform: [{ rotate: '-14deg' }] }]} />
          <View style={[styles.tube, at(0, scope.height * 0.12, scope.width, scope.height * 0.2), { transform: [{ rotate: '-28deg' }] }]}>
            <View style={styles.tubeEnd} />
          </View>
        </Pressable>

        {/* The club sign. */}
        <View style={[styles.sign, at(screen * 0.62, top + unit * 0.08, Math.min(unit * 0.42, 220), unit * 0.17)]}>
          <Text style={styles.signText} numberOfLines={2} adjustsFontSizeToFit>
            {'⭐ Buddy\nClub ⭐'}
          </Text>
        </View>

        {/* String lights under the beam, the whole way across: tap to switch them. */}
        <Pressable
          onPress={() => {
            setLights(!lights);
            onEvent({ kind: 'lights', on: !lights });
          }}
          accessibilityRole="button"
          accessibilityLabel={lights ? 'Turn off the lights' : 'Turn on the lights'}
          style={at(0, top, cw, unit * 0.07)}
        >
          <View style={[styles.wire, at(0, unit * 0.01, cw, 2)]} />
          {Array.from({ length: bulbs }, (_, i) => {
            const x = ((i + 0.5) * cw) / bulbs;
            const sag = Math.abs(Math.sin(((i + 0.5) / bulbs) * Math.PI * 3)) * unit * 0.02;
            const bulb = <View style={[styles.bulb, { backgroundColor: lights ? BULBS[i % BULBS.length] : '#9E9E9E' }, lights && styles.bulbLit]} />;
            return (
              <View key={i} style={at(x - 6, unit * 0.01 + sag, 12, 16)}>
                {lights ? (
                  <Flicker seed={`bulb-${i}`} style={{ flex: 1 }}>
                    {bulb}
                  </Flicker>
                ) : (
                  bulb
                )}
              </View>
            );
          })}
        </Pressable>

        {/* The treasure chest on the floor. */}
        <Pressable
          onPress={openChest}
          accessibilityRole="button"
          accessibilityLabel={chest ? 'Shut the treasure chest' : 'Open the treasure chest'}
          style={at(chestBox.left, floor - chestBox.height * 1.5, chestBox.width, chestBox.height * 1.5)}
        >
          {chest ? <View style={[styles.gold, at(chestBox.width * 0.1, chestBox.height * 0.45, chestBox.width * 0.8, chestBox.height * 0.25)]} /> : null}
          <View style={[styles.lid, at(0, chest ? 0 : chestBox.height * 0.35, chestBox.width, chestBox.height * (chest ? 0.3 : 0.4)), chest && { transform: [{ skewX: '-10deg' }] }]} />
          <View style={[styles.chest, at(0, chestBox.height * 0.7, chestBox.width, chestBox.height * 0.8)]}>
            <View style={styles.lock} />
          </View>
        </Pressable>

        {/* A bucket on a rope out of a hole in the floor: pull it to bring up a snack. */}
        <View style={[styles.hole, at(rope.x - unit * 0.08, floor + 4, unit * 0.16, unit * 0.05)]} />
        <Pressable
          onPress={pullBucket}
          accessibilityRole="button"
          accessibilityLabel="Pull up the snack bucket"
          style={at(rope.x - unit * 0.08, top, unit * 0.16, rope.bottom - top + unit * 0.13)}
        >
          <View style={[styles.pulley, at(unit * 0.08 - 9, -4, 18, 18)]} />
          <Animated.View style={[at(0, 0, unit * 0.16, rope.bottom - top + unit * 0.13), bucketLook]}>
            <View style={[styles.ropeLine, at(unit * 0.08 - 1.5, 6, 3, rope.bottom - top - 6)]} />
            <View style={[styles.bucket, at(unit * 0.025, rope.bottom - top, unit * 0.11, unit * 0.12)]}>
              <View style={styles.bucketBand} />
            </View>
          </Animated.View>
        </Pressable>

        {/* The buddies who climbed up, as big as at home: drag them about, tap to say hi. */}
        {placed.map(({ b, i, spot }) => {
          const bump = bumps[b.id];
          const held = dragging === b.id;
          return (
            <View
              key={b.id}
              accessible
              accessibilityLabel={`${b.name}. Drag to move`}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => grab(b.id, spot, e)}
              onResponderMove={move}
              onResponderRelease={letGo}
              onResponderTerminate={letGo}
              onResponderTerminationRequest={() => false}
              style={[at(spot.x - fig / 2, spot.y - fig, fig, fig), held && styles.lifted]}
            >
              <View pointerEvents="none" style={[styles.cushion, at(fig * 0.1, fig * 0.86, fig * 0.8, fig * 0.16), { backgroundColor: BULBS[(i + 2) % BULBS.length], borderRadius: fig, opacity: held ? 0 : 1 }]} />
              <Lively height={fig} seed={b.id} breathe={!held} bounce={bump?.n} bounceKind={bump?.kind} style={StyleSheet.absoluteFill}>
                {b.person ? (
                  <PersonFigure look={b.person.look} size={fig} dressed={b.person.dressed} gift={b.gift} alive wave={bump?.kind === 'hop' ? bump.n : undefined} />
                ) : (
                  <BuddyFigure value={b.emoji} size={fig} fur={b.fur} belly={b.belly} dressed={b.dressed} gift={b.gift} wave={bump?.kind === 'hop' ? bump.n : undefined} />
                )}
              </Lively>
            </View>
          );
        })}

        {pop ? (
          <FloatUp key={pop.id} rise={unit * 0.14} duration={POP_MS} style={at(pop.x - 24, pop.y - 50, 48, 50)}>
            <Text style={{ fontSize: 36 }}>{pop.emoji}</Text>
          </FloatUp>
        ) : null}
      </ScrollView>
      {!lights ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim]} /> : null}

      {buddies.length === 0 ? (
        <Pressable
          onPress={() => onEvent({ kind: 'callUp' })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.callUp, at(w * 0.15, floor + (h - floor) * 0.2, w * 0.7, Math.min(60, (h - floor) * 0.4)), pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.callUpText} numberOfLines={1} adjustsFontSizeToFit>
            🪜 Call the buddies up!
          </Text>
        </Pressable>
      ) : null}

      {/* Climb back down through the hatch. */}
      <Pressable
        onPress={() => {
          onEvent({ kind: 'down' });
          onClose();
        }}
        accessibilityRole="button"
        accessibilityLabel="Climb down from the tree house"
        style={({ pressed }) => [styles.down, at(12, h - 64, Math.min(170, w * 0.42), 52), pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.downText} numberOfLines={1} adjustsFontSizeToFit>
          ⬇️ Climb down
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inside: { backgroundColor: '#B07A4F', overflow: 'hidden' },
  plank: { flex: 1, borderRightWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  dim: { backgroundColor: 'rgba(16, 18, 52, 0.4)' },
  beam: { backgroundColor: '#6D4C41', borderWidth: 3, borderColor: OUTLINE },
  floor: { backgroundColor: '#8A5A36', borderTopWidth: 4, borderColor: OUTLINE },
  window: { overflow: 'hidden', borderWidth: 6, borderColor: '#6D4C41' },
  cross: { backgroundColor: '#6D4C41' },
  sight: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  tripod: { backgroundColor: '#4E342E', transformOrigin: 'top' },
  tube: { backgroundColor: '#FFCA28', borderWidth: 3, borderColor: OUTLINE, borderRadius: 8 },
  tubeEnd: { position: 'absolute', left: -2, top: -4, bottom: -4, width: 10, backgroundColor: '#FFB300', borderWidth: 2, borderColor: OUTLINE, borderRadius: 4 },
  sign: { backgroundColor: '#FFF3E0', borderWidth: 3, borderColor: OUTLINE, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, transform: [{ rotate: '-3deg' }] },
  signText: { fontSize: 18, fontWeight: '800', color: '#6D4C41', textAlign: 'center' },
  wire: { backgroundColor: '#3E2723' },
  bulb: { flex: 1, borderRadius: 6, borderWidth: 1.5, borderColor: '#3E2723' },
  bulbLit: { shadowColor: '#FFF59D', shadowOpacity: 0.9, shadowRadius: 8 },
  hole: { backgroundColor: '#3E2723', borderRadius: 99 },
  pulley: { backgroundColor: '#90A4AE', borderWidth: 2, borderColor: OUTLINE, borderRadius: 9 },
  ropeLine: { backgroundColor: '#D7B98E' },
  bucket: { backgroundColor: '#90A4AE', borderWidth: 3, borderColor: OUTLINE, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  bucketBand: { marginTop: '30%', height: 4, backgroundColor: '#607D8B' },
  gold: { backgroundColor: '#FFD54F', borderWidth: 2, borderColor: '#F9A825', borderRadius: 99 },
  lid: { backgroundColor: '#8D6E63', borderWidth: 3, borderColor: OUTLINE, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  chest: { backgroundColor: '#A1887F', borderWidth: 3, borderColor: OUTLINE, borderRadius: 4, alignItems: 'center' },
  lock: { marginTop: -6, width: 14, height: 16, borderRadius: 3, backgroundColor: '#FFCA28', borderWidth: 2, borderColor: OUTLINE },
  cushion: { borderWidth: 2, borderColor: OUTLINE },
  lifted: { transform: [{ scale: 1.08 }], zIndex: 5 },
  callUp: { backgroundColor: '#FFF8E7', borderWidth: 3, borderColor: OUTLINE, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  callUpText: { fontSize: 20, fontWeight: '800', color: '#5B3A24' },
  down: { backgroundColor: '#FFF8E7', borderWidth: 3, borderColor: OUTLINE, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  downText: { fontSize: 18, fontWeight: '800', color: '#5B3A24' },
});
