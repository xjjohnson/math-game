import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type HostInstance, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Text } from '@/components/AppText';
import { pillFace } from '@/components/Chrome';
import { CarDrawing, CAR_BOX } from '@/components/community/CarDrawing';
import { CarMenu } from '@/components/community/CarMenu';
import { TownLife } from '@/components/community/TownLife';
import { TownArt } from '@/components/community/TownArt';
import { findCar } from '@/constants/cars';
import { INK } from '@/constants/artStyle';
import { colors } from '@/constants/theme';
import { useMotion } from '@/hooks/useAccessibility';
import { townSession, useTownState } from '@/services/townSession';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import { garageOf, topSpeed } from '@/utils/garage';
import type { CarSpot } from '@/utils/multiplayer/protocol';
import {
  advance,
  nearestRoad,
  pickExit,
  placeOf,
  planRoute,
  routePoints,
  TOWN_H,
  TOWN_W,
  turnAround,
  turnKind,
  leftToGo,
  type CarPos,
  type RoadSpot,
} from '@/utils/roads';
import { playSound } from '@/utils/soundEffects';
import type { BuildingId } from '@/utils/town';
import { isDoor, lotAt, parkedAt, START_STOP, TOWN_LOTS, type TownLot } from '@/utils/townLayout';

/** Below this many points of finger movement a touch is a tap. */
const TAP_SLOP = 8;
/** After a drag to look around, the camera goes back to the car after this long. */
const LOOK_AROUND_MS = 2500;
/** How often this phone tells friends where its car is: while moving, and while parked. */
const SEND_MOVING_MS = 200;
const SEND_STILL_MS = 2000;
/** Speeding up and slowing down, map points a second each second. */
const ACCEL = 320;
const BRAKE = 420;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 1.6;
/** How long the zoom into a door takes before going inside. */
const ENTER_MS = 380;

/** Where every player's car is, kept while the Town screen is closed (going into a building and out again). */
let savedPos: CarPos | null = null;

type Camera = { x: number; y: number; scale: number };

function clampCam(c: Camera, w: number, h: number): Camera {
  const scale = Math.min(MAX_ZOOM, Math.max(Math.max(MIN_ZOOM, w / TOWN_W, h / TOWN_H), c.scale));
  const minX = Math.min(0, w - TOWN_W * scale);
  const minY = Math.min(0, h - TOWN_H * scale);
  return { scale, x: Math.min(0, Math.max(minX, c.x)), y: Math.min(0, Math.max(minY, c.y)) };
}

/** Is it night on the phone's clock? */
const isNight = (d = new Date()) => d.getHours() >= 20 || d.getHours() < 6;

/**
 * The town you drive round. Cars stay on the roads: tap a place to drive there, or (with
 * the wheel) hold Go and turn the wheel the way you want to go at the next crossing.
 * Park at a building's spot and tap Go in. Friends on the same visit drive in the same town.
 * Walk mode is the old look-around map: drag, pinch, tap a building to go in.
 */
export function DriveTown({ onDoor }: { onDoor: (id: BuildingId) => void }) {
  const { animate } = useMotion();
  const profile = useActiveProfile();
  const setGarage = useProfiles((s) => s.setGarage);
  const town = useTownState();
  const garage = profile ? garageOf(profile) : null;
  const kind = findCar(garage?.car);
  const top = profile ? topSpeed(profile, kind) : 170;
  const controls = garage?.controls ?? 'tap';
  const riders = Math.min(kind.seats, Math.max(1, town.look.buddies.length));
  const night = useMemo(() => isNight(), []);

  const [view, setView] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState<'drive' | 'walk'>('drive');
  const [menu, setMenu] = useState<'car' | 'where' | null>(null);
  const [parked, setParked] = useState<TownLot | null>(null);
  const [route, setRoute] = useState<{ pts: string; lot: TownLot | null } | null>(null);
  const [ahead, setAhead] = useState<{ x: number; y: number; turn: -1 | 0 | 1 } | null>(null);
  const [wheelTurn, setWheelTurn] = useState(0);
  const [treat, setTreat] = useState<null | 'wash' | 'pump' | 'treat'>(null);
  const [honkNote, setHonkNote] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const frame = useRef<HostInstance>(null);
  const origin = useRef({ x: 0, y: 0 });
  const pos = useRef<CarPos>(savedPos ?? { kind: 'road', ...START_STOP });
  const speed = useRef(0);
  const gas = useRef(false);
  const steer = useRef(0);
  const plan = useRef<{ goal: RoadSpot; via: string[]; i: number; lot: TownLot | null; follow?: string } | null>(null);
  const lookUntil = useRef(0);
  const lastSend = useRef(0);
  const parkedRef = useRef<TownLot | null>(null);
  const aheadRef = useRef<string>('');
  const entering = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const style = useRef({ k: kind.id, p: garage?.paint ?? 0, st: !!garage?.stripe });
  style.current = { k: kind.id, p: garage?.paint ?? 0, st: !!garage?.stripe };
  const topRef = useRef(top);
  topRef.current = top;

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const cx = useSharedValue(0);
  const cy = useSharedValue(0);
  const ch = useSharedValue(0);

  // Start where the car was, close in.
  const placed = useRef(false);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setView({ width, height });
    frame.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      origin.current = { x: pageX ?? 0, y: pageY ?? 0 };
    });
    if (!placed.current && width > 0) {
      placed.current = true;
      const s = Math.max(MIN_ZOOM, Math.min(1, width / 560));
      const { pt, heading } = placeOf(pos.current);
      cx.value = pt.x;
      cy.value = pt.y;
      ch.value = heading;
      const c = clampCam({ scale: s, x: width / 2 - pt.x * s, y: height / 2 - pt.y * s }, width, height);
      tx.value = c.x;
      ty.value = c.y;
      scale.value = c.scale;
    }
  };

  /** Plan a drive to a spot on the road, and show the dotted line. */
  const driveTo = useCallback((goal: RoadSpot, lot: TownLot | null, follow?: string) => {
    const r = planRoute(pos.current, goal);
    plan.current = { goal, via: r.via, i: 0, lot, follow };
    setRoute({ pts: routePoints(pos.current, goal, r.via).map((p) => `${p.x},${p.y}`).join(' '), lot });
    setTreat(null);
  }, []);

  const cancelPlan = () => {
    if (!plan.current) return;
    plan.current = null;
    setRoute(null);
  };

  // --- the driving loop ---
  useEffect(() => {
    let raf = 0;
    let last = Date.now();
    let followAt = 0;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = plan.current;
      // How fast to go: a route drives itself and slows down as it arrives.
      let want = 0;
      if (p) {
        const left = leftToGo(pos.current, p.goal, p.via);
        if (left < 2) {
          plan.current = null;
          speed.current = 0;
          setRoute(null);
        } else want = Math.min(topRef.current, Math.max(40, left * 2.2));
        // Following a friend: aim again for where their car is now.
        if (p.follow && now - followAt > 1000) {
          followAt = now;
          const friend = townSession().getState().cars[p.follow];
          if (!friend) {
            plan.current = null;
            setRoute(null);
          } else {
            const near = nearestRoad({ x: friend.x, y: friend.y });
            plan.current = { ...p, goal: { from: near.from, to: near.to, d: near.d }, via: planRoute(pos.current, near).via, i: 0 };
          }
        }
      } else if (gas.current && modeRef.current === 'drive') want = topRef.current;
      const v = speed.current;
      speed.current = want > v ? Math.min(want, v + ACCEL * dt) : Math.max(want, v - BRAKE * dt);
      if (p && plan.current) speed.current = Math.min(speed.current, want);

      if (speed.current > 0.5) {
        pos.current = advance(pos.current, speed.current * dt, (prev, node) => {
          const q = plan.current;
          if (q) {
            const k = q.via.indexOf(node, q.i);
            if (k >= 0) {
              q.i = k + 1;
              return q.via[k + 1] ?? q.goal.to;
            }
          }
          return pickExit(prev, node, steer.current);
        });
        savedPos = pos.current;
      }
      const { pt, heading } = placeOf(pos.current);
      cx.value = pt.x;
      cy.value = pt.y;
      // Turn the short way round.
      let h = heading;
      while (h - ch.value > 180) h -= 360;
      while (h - ch.value < -180) h += 360;
      ch.value = ch.value + (h - ch.value) * Math.min(1, dt * 14);

      // The camera follows the car, looking a little ahead, unless the player is looking around.
      const vw = viewRef.current;
      if (modeRef.current === 'drive' && now > lookUntil.current && vw.width > 0) {
        const s = scale.value;
        const ahead = 50 * (speed.current / 170);
        const rad = (heading * Math.PI) / 180;
        const goal = clampCam(
          { scale: s, x: vw.width / 2 - (pt.x + Math.cos(rad) * ahead) * s, y: vw.height * 0.48 - (pt.y + Math.sin(rad) * ahead) * s },
          vw.width,
          vw.height,
        );
        const k = Math.min(1, dt * 6);
        tx.value = tx.value + (goal.x - tx.value) * k;
        ty.value = ty.value + (goal.y - ty.value) * k;
      }

      // Parked by a building?
      const still = speed.current < 1;
      const lot = still ? parkedAt(pt) : null;
      if (lot !== parkedRef.current) {
        parkedRef.current = lot;
        setParked(lot);
      }

      // Which way the car will go at the next crossing (with the wheel).
      if (pos.current.kind === 'road' && !plan.current) {
        const { from, to } = pos.current;
        const next = pickExit(from, to, steer.current);
        const turn = turnKind(from, to, next);
        const key = `${to}:${turn}`;
        if (key !== aheadRef.current) {
          aheadRef.current = key;
          const n = placeOf({ kind: 'road', from, to, d: 0 });
          void n;
          const at = placeOf({ kind: 'turn', prev: from, node: to, next, s: 0 }).pt;
          setAhead(turn === 2 ? null : { x: at.x, y: at.y, turn: turn as -1 | 0 | 1 });
        }
      } else if (aheadRef.current) {
        aheadRef.current = '';
        setAhead(null);
      }

      // Tell friends where the car is.
      if (now - lastSend.current > (still ? SEND_STILL_MS : SEND_MOVING_MS)) {
        lastSend.current = now;
        const s = style.current;
        townSession().sendCar({ x: Math.round(pt.x), y: Math.round(pt.y), h: Math.round(heading), k: s.k, p: s.p, ...(s.st ? { st: true } : {}) });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ch, cx, cy, scale, tx, ty]);

  // A friend honked at me.
  useEffect(() => {
    if (!town.honked || Date.now() - town.honked.at > 3000) return;
    const who = town.people.find((p) => p.id === town.honked!.from)?.name ?? 'A friend';
    setHonkNote(`${who} honked at you!`);
    playSound('horn');
    const t = setTimeout(() => setHonkNote(null), 2500);
    return () => clearTimeout(t);
  }, [town.honked, town.people]);

  // Keys on a computer: arrows or WASD to drive, space to honk.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        gas.current = true;
        cancelPlan();
      } else if (e.key === 'ArrowLeft' || e.key === 'a') steer.current = -1;
      else if (e.key === 'ArrowRight' || e.key === 'd') steer.current = 1;
      else if (e.key === 'ArrowDown' || e.key === 's') gas.current = false;
      else if (e.key === ' ') honk();
      else return;
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') gas.current = false;
      else if (['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(e.key)) steer.current = 0;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // honk reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const honk = () => {
    playSound(kind.shape === 'icecream' ? 'jingle' : 'horn');
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    if (kind.shape === 'fire') {
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    }
    // Friends close by hear it.
    const me = { x: cx.value, y: cy.value };
    for (const [id, c] of Object.entries(townSession().getState().cars)) {
      if (Math.hypot(c.x - me.x, c.y - me.y) < 180) townSession().honkAt(id);
    }
  };

  // --- touches on the map: drag to look around, pinch to zoom, tap to drive or go in ---
  const gesture = useRef<{ start: Camera; touches: { x: number; y: number }[]; moved: boolean } | null>(null);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const at = (pageX: number, pageY: number) => ({ x: pageX - origin.current.x, y: pageY - origin.current.y });
  const touchesOf = (e: GestureResponderEvent) => {
    const list = e.nativeEvent.touches?.length ? e.nativeEvent.touches : [e.nativeEvent];
    return list.slice(0, 2).map((t) => at(t.pageX, t.pageY));
  };
  const camNow = (): Camera => ({ x: tx.value, y: ty.value, scale: scale.value });
  const setCam = (c: Camera) => {
    const fit = clampCam(c, view.width, view.height);
    tx.value = fit.x;
    ty.value = fit.y;
    scale.value = fit.scale;
  };
  const begin = (e: GestureResponderEvent) => {
    gesture.current = { start: camNow(), touches: touchesOf(e), moved: gesture.current?.moved ?? false };
  };
  const move = (e: GestureResponderEvent) => {
    const g = gesture.current;
    if (!g) return;
    const now = touchesOf(e);
    if (now.length !== g.touches.length) return begin(e);
    if (now.length >= 2) {
      g.moved = true;
      lookUntil.current = Date.now() + LOOK_AROUND_MS;
      const d0 = Math.hypot(g.touches[1].x - g.touches[0].x, g.touches[1].y - g.touches[0].y);
      const d1 = Math.hypot(now[1].x - now[0].x, now[1].y - now[0].y);
      const s = d0 > 0 ? g.start.scale * (d1 / d0) : g.start.scale;
      const m0 = { x: (g.touches[0].x + g.touches[1].x) / 2, y: (g.touches[0].y + g.touches[1].y) / 2 };
      const m1 = { x: (now[0].x + now[1].x) / 2, y: (now[0].y + now[1].y) / 2 };
      const wx = (m0.x - g.start.x) / g.start.scale;
      const wy = (m0.y - g.start.y) / g.start.scale;
      setCam({ scale: s, x: m1.x - wx * s, y: m1.y - wy * s });
      return;
    }
    const dx = now[0].x - g.touches[0].x;
    const dy = now[0].y - g.touches[0].y;
    if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    g.moved = true;
    lookUntil.current = Date.now() + LOOK_AROUND_MS;
    setCam({ ...g.start, x: g.start.x + dx, y: g.start.y + dy });
  };
  const end = () => {
    const g = gesture.current;
    gesture.current = null;
    if (g && !g.moved && g.touches[0]) tap(g.touches[0]);
  };

  const tap = (p: { x: number; y: number }) => {
    const w = { x: (p.x - tx.value) / scale.value, y: (p.y - ty.value) / scale.value };
    // A friend's car: honk at it; tap it again to follow it.
    const friend = Object.entries(town.cars).find(([, c]) => Math.hypot(c.x - w.x, c.y - w.y) < 44);
    if (friend && mode === 'drive') {
      const [id, c] = friend;
      const again = lastTap.current?.id === id && Date.now() - lastTap.current.at < 700;
      lastTap.current = { id, at: Date.now() };
      townSession().honkAt(id);
      playSound('horn');
      if (again) {
        const near = nearestRoad({ x: c.x, y: c.y });
        driveTo(near, null, id);
      }
      return;
    }
    const lot = lotAt(w);
    if (mode === 'walk') {
      if (lot && isDoor(lot.kind)) enter(lot);
      return;
    }
    if (lot && lot.kind !== 'soon') return driveTo(lot.stop, lot);
    const near = nearestRoad(w);
    if (near.gap < 140) driveTo(near, null);
  };

  /** Zoom in on the door, then go inside. */
  const enter = (lot: TownLot) => {
    if (entering.current || !isDoor(lot.kind)) return;
    const go = () => (lot.kind === 'home' ? router.push('/buddy') : onDoor(lot.kind as BuildingId));
    if (!animate) return go();
    entering.current = true;
    const before = camNow();
    const s = Math.min(2.4, before.scale * 2.6);
    const doorX = lot.x + lot.w / 2;
    const doorY = lot.y - 16;
    const ease = { duration: ENTER_MS, easing: Easing.in(Easing.quad) };
    lookUntil.current = Date.now() + ENTER_MS + 900;
    scale.value = withTiming(s, ease);
    tx.value = withTiming(view.width / 2 - doorX * s, ease);
    ty.value = withTiming(view.height / 2 - doorY * s, ease);
    setTimeout(() => {
      go();
      setTimeout(() => {
        entering.current = false;
        tx.value = before.x;
        ty.value = before.y;
        scale.value = before.scale;
      }, 500);
    }, ENTER_MS);
  };

  const zoomBy = (factor: number) => {
    const c = camNow();
    const s = c.scale * factor;
    const mid = { x: view.width / 2, y: view.height / 2 };
    const wx = (mid.x - c.x) / c.scale;
    const wy = (mid.y - c.y) / c.scale;
    const fit = clampCam({ scale: s, x: mid.x - wx * s, y: mid.y - wy * s }, view.width, view.height);
    const ease = { duration: animate ? 220 : 0, easing: Easing.out(Easing.quad) };
    scale.value = withTiming(fit.scale, ease);
    tx.value = withTiming(fit.x, ease);
    ty.value = withTiming(fit.y, ease);
  };

  const world = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }] }));
  const carLook = useAnimatedStyle(() => ({
    transform: [{ translateX: cx.value - CAR_BOX / 2 }, { translateY: cy.value - CAR_BOX / 2 }, { rotate: `${ch.value}deg` }],
  }));

  const wheel = useAnimatedStyle(() => ({ transform: [{ rotate: `${wheelTurn * 70}deg` }] }));

  // The steering wheel: drag sideways to turn; it springs back when let go.
  const wheelStart = useRef(0);
  const wheelResponder = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      wheelStart.current = e.nativeEvent.pageX;
      cancelPlan();
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const t = Math.max(-1, Math.min(1, (e.nativeEvent.pageX - wheelStart.current) / 50));
      steer.current = t;
      setWheelTurn(t);
    },
    onResponderRelease: () => {
      steer.current = 0;
      setWheelTurn(0);
    },
    onResponderTerminate: () => {
      steer.current = 0;
      setWheelTurn(0);
    },
  };

  const wash = (what: 'wash' | 'pump' | 'treat') => {
    setTreat(what);
    playSound('reward');
    setTimeout(() => setTreat((t) => (t === what ? null : t)), 2600);
  };

  if (!profile || !garage) return null;
  const bottomGap = 96;

  return (
    <View ref={frame} style={styles.frame} onLayout={onLayout}>
      <View
        style={StyleSheet.absoluteFill}
        accessibilityLabel={
          mode === 'drive'
            ? 'Town. Tap a building or a road to drive there. Drag to look around.'
            : 'Town map. Drag to look around, pinch to zoom, tap a building to go in.'
        }
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={begin}
        onResponderMove={move}
        onResponderRelease={end}
        onResponderTerminate={() => (gesture.current = null)}
      >
        <Animated.View style={[styles.world, world]}>
          <TownArt night={night} />
          <TownLife night={night} />
          {route ? (
            <Svg style={StyleSheet.absoluteFill} width={TOWN_W} height={TOWN_H} pointerEvents="none">
              <Polyline points={route.pts} fill="none" stroke="#FFFDF8" strokeWidth={8} strokeDasharray="2 16" strokeLinecap="round" />
            </Svg>
          ) : null}
          {ahead && mode === 'drive' && controls === 'wheel' ? <TurnArrow x={ahead.x} y={ahead.y} turn={ahead.turn} /> : null}
          {Object.entries(town.cars).map(([id, c]) => (
            <FriendCar key={id} car={c} name={town.people.find((p) => p.id === id)?.name ?? ''} />
          ))}
          <Animated.View style={[styles.car, carLook]} pointerEvents="none">
            <CarDrawing shape={kind.shape} paint={garage.paint} stripe={garage.stripe} riders={riders} flash={flash} />
          </Animated.View>
          {treat === 'wash' ? <Bubbles x={cx.value} y={cy.value} /> : null}
        </Animated.View>
      </View>

      {/* Zoom buttons. */}
      <View style={styles.zoom} pointerEvents="box-none">
        <RoundButton label="＋" a11y="Zoom in" onPress={() => zoomBy(1.25)} />
        <RoundButton label="－" a11y="Zoom out" onPress={() => zoomBy(1 / 1.25)} />
      </View>

      {honkNote ? (
        <View style={styles.noteSpot} pointerEvents="none">
          <Text style={styles.note}>📯 {honkNote}</Text>
        </View>
      ) : null}

      {/* Parked at a door: go in. At the car wash, pump or bakery: a little treat. */}
      {parked && mode === 'drive' && !menu ? (
        <View style={styles.goSpot} pointerEvents="box-none">
          {isDoor(parked.kind) ? (
            <Pressable onPress={() => enter(parked)} accessibilityRole="button" accessibilityLabel={`Go into ${parked.name}`} style={({ pressed }) => [styles.goIn, pressed && styles.pressed]}>
              <Text style={styles.goInText}>Go in · {parked.name}</Text>
            </Pressable>
          ) : null}
          {parked.kind === 'wash' ? <ActionPill label="🫧 Wash my car" onPress={() => wash('wash')} /> : null}
          {parked.kind === 'pump' ? <ActionPill label="⛽ Fill up" onPress={() => wash('pump')} /> : null}
          {parked.kind === 'bakery' ? <ActionPill label="🥐 Drive-through treat" onPress={() => wash('treat')} /> : null}
          {treat === 'pump' ? <FuelMeter /> : null}
          {treat === 'treat' ? <Text style={styles.note}>Here is a warm roll for your buddy!</Text> : null}
          {treat === 'wash' ? <Text style={styles.note}>Sparkly clean!</Text> : null}
        </View>
      ) : null}

      {mode === 'drive' && !parked && !route && controls === 'tap' && !menu ? (
        <View style={styles.hintSpot} pointerEvents="none">
          <Text style={styles.note}>Tap a place to drive there</Text>
        </View>
      ) : null}

      {/* Wheel and Go pedal. */}
      {mode === 'drive' && controls === 'wheel' && !menu ? (
        <View style={[styles.pedals, { bottom: bottomGap }]} pointerEvents="box-none">
          <View {...wheelResponder} style={styles.wheelHit} accessibilityRole="adjustable" accessibilityLabel="Steering wheel. Slide left or right to turn at the next crossing.">
            <Animated.View style={[styles.wheel, wheel]}>
              <SteeringWheel />
            </Animated.View>
          </View>
          <View style={styles.middleButtons}>
            <RoundButton label="📯" a11y="Honk the horn" onPress={honk} />
            <RoundButton
              label="↩"
              a11y="Turn around"
              onPress={() => {
                cancelPlan();
                pos.current = turnAround(pos.current);
                speed.current = 0;
              }}
            />
          </View>
          <Pressable
            onPressIn={() => {
              gas.current = true;
              cancelPlan();
            }}
            onPressOut={() => (gas.current = false)}
            accessibilityRole="button"
            accessibilityLabel="Go. Hold to drive."
            style={({ pressed }) => [styles.go, pressed && styles.goPressed]}
          >
            <Text style={styles.goText}>GO</Text>
          </Pressable>
        </View>
      ) : null}
      {mode === 'drive' && controls === 'tap' && !menu ? (
        <View style={[styles.hornSpot, { bottom: bottomGap }]} pointerEvents="box-none">
          <RoundButton label="📯" a11y="Honk the horn" onPress={honk} />
        </View>
      ) : null}

      {/* Bottom row: the car menu, Where to?, and Walk / Drive. */}
      <View style={styles.bottomRow} pointerEvents="box-none">
        <ActionPill label="🚗 My car" onPress={() => setMenu((m) => (m === 'car' ? null : 'car'))} />
        <ActionPill label="📍 Where to?" onPress={() => setMenu((m) => (m === 'where' ? null : 'where'))} />
        <ActionPill
          label={mode === 'drive' ? '🚶 Walk' : '🚗 Drive'}
          onPress={() => {
            cancelPlan();
            gas.current = false;
            setMode((m) => (m === 'drive' ? 'walk' : 'drive'));
          }}
        />
      </View>

      {menu === 'car' ? (
        <CarMenu
          onClose={() => setMenu(null)}
          onControls={(c) => setGarage(profile.id, { controls: c })}
        />
      ) : null}
      {menu === 'where' ? (
        <View style={styles.whereSpot}>
          <View style={styles.where}>
            <Text style={styles.whereTitle}>Where to?</Text>
            <View style={styles.whereGrid}>
              {TOWN_LOTS.filter((l) => l.kind !== 'soon').map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => {
                    setMenu(null);
                    if (mode === 'walk' && isDoor(l.kind)) return enter(l);
                    setMode('drive');
                    driveTo(l.stop, l);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.whereItem, { borderColor: l.color }, pressed && styles.pressed]}
                >
                  <Text style={styles.whereText}>{l.name}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setMenu(null)} accessibilityRole="button" style={styles.close}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** A friend's car, gliding smoothly between the spots their phone sends. */
function FriendCar({ car, name }: { car: CarSpot; name: string }) {
  const x = useSharedValue(car.x);
  const y = useSharedValue(car.y);
  const h = useSharedValue(car.h);
  useEffect(() => {
    const ease = { duration: 240, easing: Easing.linear };
    x.value = withTiming(car.x, ease);
    y.value = withTiming(car.y, ease);
    let to = car.h;
    while (to - h.value > 180) to -= 360;
    while (to - h.value < -180) to += 360;
    h.value = withTiming(to, ease);
  }, [car.x, car.y, car.h, h, x, y]);
  const kind = findCar(car.k);
  const body = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - CAR_BOX / 2 }, { translateY: y.value - CAR_BOX / 2 }, { rotate: `${h.value}deg` }] }));
  const flag = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - 10 }, { translateY: y.value - 74 }] }));
  return (
    <>
      <Animated.View style={[styles.car, body]} pointerEvents="none">
        <CarDrawing shape={kind.shape} paint={car.p} stripe={!!car.st} riders={1} />
      </Animated.View>
      <Animated.View style={[styles.flag, flag]} pointerEvents="none">
        <View style={styles.flagPole} />
        <Text style={styles.flagText} numberOfLines={1}>
          {name}
        </Text>
      </Animated.View>
    </>
  );
}

/** An arrow painted on the road at the next crossing: which way the wheel will take you. */
function TurnArrow({ x, y, turn }: { x: number; y: number; turn: -1 | 0 | 1 }) {
  return (
    <View pointerEvents="none" style={[styles.arrow, { left: x - 22, top: y - 22 }]}>
      <Text style={styles.arrowText}>{turn === -1 ? '↰' : turn === 1 ? '↱' : '↑'}</Text>
    </View>
  );
}

/** The wheel drawing: a rim, spokes, a horn button and a yellow dot on top so turning shows. */
function SteeringWheel() {
  return (
    <Svg width={112} height={112} viewBox="-56 -56 112 112">
      <Circle cx={0} cy={0} r={52} fill="#FFFDF8" stroke={INK} strokeWidth={3} />
      <Circle cx={0} cy={0} r={38} fill="none" stroke="#5F6B7A" strokeWidth={12} />
      <Line x1={-38} y1={0} x2={38} y2={0} stroke="#5F6B7A" strokeWidth={10} />
      <Line x1={0} y1={0} x2={0} y2={38} stroke="#5F6B7A" strokeWidth={10} />
      <Circle cx={0} cy={0} r={12} fill={colors.primary} stroke={INK} strokeWidth={2.5} />
      <Circle cx={0} cy={-38} r={5} fill="#FFC93C" stroke={INK} strokeWidth={2} />
    </Svg>
  );
}

/** Soap bubbles over the car at the car wash. */
function Bubbles({ x, y }: { x: number; y: number }) {
  return (
    <View pointerEvents="none" style={[styles.bubbles, { left: x - 50, top: y - 50 }]}>
      <Text style={styles.bubbleText}>🫧 ✨ 🫧</Text>
    </View>
  );
}

/** The pump's meter filling up. */
function FuelMeter() {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) });
  }, [fill]);
  const bar = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={styles.meter}>
      <Animated.View style={[styles.meterFill, bar]} />
    </View>
  );
}

function RoundButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
      <Text style={styles.roundText}>{label}</Text>
    </Pressable>
  );
}

function ActionPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden', backgroundColor: '#9FD07A' },
  world: { position: 'absolute', left: 0, top: 0, width: TOWN_W, height: TOWN_H, transformOrigin: '0 0' },
  car: { position: 'absolute', left: 0, top: 0, width: CAR_BOX, height: CAR_BOX },
  flag: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', alignItems: 'flex-start' },
  flagPole: { width: 3, height: 40, backgroundColor: INK },
  flagText: { fontSize: 15, fontWeight: '800', color: INK, backgroundColor: '#FFFDF8', borderWidth: 2, borderColor: INK, paddingHorizontal: 8, paddingVertical: 1, borderRadius: 6, overflow: 'hidden', maxWidth: 120 },
  arrow: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,253,248,0.92)', borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 26, fontWeight: '900', color: colors.primary, lineHeight: 30 },
  zoom: { position: 'absolute', right: 10, top: 76, gap: 10 },
  round: { width: 56, height: 56, borderRadius: 28, ...pillFace, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 26, fontWeight: '900', color: INK, lineHeight: 30 },
  pressed: { transform: [{ scale: 0.94 }] },
  noteSpot: { position: 'absolute', top: 76, left: 0, right: 0, alignItems: 'center' },
  hintSpot: { position: 'absolute', bottom: 160, left: 0, right: 0, alignItems: 'center' },
  note: { fontSize: 17, fontWeight: '800', color: INK, backgroundColor: 'rgba(255,253,248,0.96)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, overflow: 'hidden', textAlign: 'center' },
  goSpot: { position: 'absolute', top: 76, left: 70, right: 70, alignItems: 'center', gap: 8 },
  goIn: { backgroundColor: colors.correct, borderRadius: 30, borderWidth: 3, borderColor: INK, paddingHorizontal: 22, paddingVertical: 12, minHeight: 56, justifyContent: 'center', boxShadow: '0px 4px 0px rgba(78, 51, 36, 0.25)' },
  goInText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  pedals: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  wheelHit: { width: 124, height: 124, alignItems: 'center', justifyContent: 'center' },
  wheel: { width: 112, height: 112 },
  middleButtons: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  go: { width: 96, height: 124, borderRadius: 24, backgroundColor: '#3FB66B', borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 6px 0px #2E8A50' },
  goPressed: { transform: [{ translateY: 4 }], boxShadow: '0px 2px 0px #2E8A50' },
  goText: { fontSize: 30, fontWeight: '900', color: '#FFFFFF' },
  hornSpot: { position: 'absolute', right: 12 },
  bottomRow: { position: 'absolute', left: 10, right: 10, bottom: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  pill: { ...pillFace, paddingHorizontal: 14, minHeight: 52, justifyContent: 'center', borderRadius: 26 },
  pillText: { fontSize: 17, fontWeight: '800', color: INK, textAlign: 'center' },
  whereSpot: { position: 'absolute', top: 70, left: 12, right: 12, alignItems: 'center' },
  where: { width: '100%', maxWidth: 520, backgroundColor: '#FFFDF8', borderRadius: 24, borderWidth: 3, borderColor: INK, padding: 16, gap: 10 },
  whereTitle: { fontSize: 22, fontWeight: '900', color: INK, textAlign: 'center' },
  whereGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  whereItem: { borderWidth: 4, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, minHeight: 52, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  whereText: { fontSize: 18, fontWeight: '800', color: INK },
  close: { alignSelf: 'center', padding: 10 },
  closeText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  bubbles: { position: 'absolute', width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  bubbleText: { fontSize: 30 },
  meter: { width: 200, height: 22, borderRadius: 11, borderWidth: 3, borderColor: INK, backgroundColor: '#FFFDF8', overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: '#3FB66B' },
});
