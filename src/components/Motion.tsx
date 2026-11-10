import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { useMotion } from '@/hooks/useAccessibility';
import { dangleTilt, fallMs } from '@/utils/motion';

/** A steady number from a string, so each buddy keeps its own rhythm. */
export function seedOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h % 1000) / 1000;
}

/**
 * Runs `start` whenever `trigger` changes after the first render, so a new number
 * replays a one-off animation and mounting doesn't play it.
 */
function useReplay(trigger: number | undefined, start: () => void) {
  const last = useRef(trigger);
  useEffect(() => {
    if (trigger === undefined || trigger === last.current) return;
    last.current = trigger;
    start();
    // Only the trigger matters; `start` is a fresh closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
}

/**
 * Counts how many times `on` has turned true, for replaying a one-off animation (a hop, a wave,
 * a landing) from something that is a yes/no, like "is waving" or "is held".
 */
export function useTimesOn(on: boolean): number {
  const seen = useRef({ on, n: 0 });
  if (on && !seen.current.on) seen.current.n += 1;
  seen.current.on = on;
  return seen.current.n;
}

/** A quick wobble back to still after a squash. */
const SETTLE = { damping: 10, stiffness: 260 };

export type BounceKind = 'hop' | 'wiggle' | 'land' | 'shake' | 'pop';

interface LivelyProps {
  children: ReactNode;
  /** Height of what's inside, for how high a hop goes. */
  height: number;
  /** Keeps buddies from breathing in step; any steady string, like the buddy's id. */
  seed?: string;
  /** Breathe slowly in place: off for things that aren't alive. */
  breathe?: boolean;
  /** Breathing slower and deeper, for sleeping on a bed. */
  asleep?: boolean;
  /** Change this number to play `bounce` once. */
  bounce?: number;
  bounceKind?: BounceKind;
  style?: StyleProp<ViewStyle>;
}

/**
 * Brings what's inside to life: a slow breath from the feet up, and a one-off hop,
 * wiggle, landing squash or head shake when `bounce` changes. Still when motion is reduced.
 */
export function Lively({
  children,
  height,
  seed = '',
  breathe = false,
  asleep = false,
  bounce,
  bounceKind = 'hop',
  style,
}: LivelyProps) {
  const { animate } = useMotion();
  const breath = useSharedValue(0);
  const lift = useSharedValue(0);
  const squash = useSharedValue(0);
  const turn = useSharedValue(0);

  useEffect(() => {
    if (!animate || !breathe) {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }
    const r = seedOf(seed);
    const half = (asleep ? 1900 : 1200) + r * 300;
    const ease = Easing.inOut(Easing.sin);
    breath.value = 0;
    breath.value = withDelay(
      Math.round(r * 900),
      withRepeat(withSequence(withTiming(1, { duration: half, easing: ease }), withTiming(0, { duration: half, easing: ease })), -1),
    );
    return () => cancelAnimation(breath);
  }, [animate, breathe, asleep, seed, breath]);

  useReplay(bounce, () => {
    if (!animate) return;
    const quick = { duration: 110 };
    if (bounceKind === 'hop') {
      lift.value = withSequence(
        withTiming(-height * 0.16, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) }),
        withTiming(-height * 0.06, { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }),
      );
      squash.value = withSequence(withDelay(370, withTiming(0.7, { duration: 70 })), withSpring(0, SETTLE));
    } else if (bounceKind === 'land') {
      squash.value = withSequence(withTiming(1, { duration: 80 }), withSpring(0, SETTLE));
    } else if (bounceKind === 'pop') {
      // Stretches up tall for a moment, like something just popped on, and wobbles back.
      squash.value = withSequence(withTiming(-1.2, { duration: 90 }), withSpring(0, SETTLE));
    } else if (bounceKind === 'wiggle') {
      turn.value = withSequence(
        withTiming(-9, quick),
        withTiming(9, quick),
        withTiming(-6, quick),
        withTiming(5, quick),
        withTiming(0, quick),
      );
    } else {
      turn.value = withSequence(withTiming(-5, quick), withTiming(5, quick), withTiming(-4, quick), withTiming(0, quick));
    }
  });

  const look = useAnimatedStyle(() => {
    const deep = asleep ? 0.045 : 0.025;
    const sy = 1 + breath.value * deep - squash.value * 0.1;
    const sx = 1 - breath.value * deep * 0.4 + squash.value * 0.07;
    return {
      transform: [{ translateY: lift.value }, { rotate: `${turn.value}deg` }, { scaleX: sx }, { scaleY: sy }],
    };
  });

  return <Animated.View style={[styles.feet, style, look]}>{children}</Animated.View>;
}

/**
 * The wave of an arm drawn as a box that hangs from its shoulder: tilted `rest` degrees
 * about its middle when still, swung up from the shoulder and back while `wave` plays.
 * `out` is -1 for an arm on the right (swings up to the right) and 1 on the left.
 */
export function useArmWave(wave: number | undefined, rest: number, armH: number, out: 1 | -1) {
  const { animate } = useMotion();
  const swing = useSharedValue(0);

  useReplay(wave, () => {
    if (!animate) return;
    const up = { duration: 240, easing: Easing.out(Easing.quad) };
    const tick = { duration: 160, easing: Easing.inOut(Easing.sin) };
    swing.value = withSequence(
      withTiming(130, up),
      withTiming(105, tick),
      withTiming(135, tick),
      withTiming(105, tick),
      withTiming(130, tick),
      withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
    );
  });

  // Turning about the shoulder moves the middle; this puts the still arm back where it was.
  const rad = (rest * Math.PI) / 180;
  const dx = (armH / 2) * Math.sin(rad);
  const dy = (armH / 2) * (1 - Math.cos(rad));
  return useAnimatedStyle(() => ({
    transformOrigin: 'top',
    transform: [{ translateX: dx }, { translateY: dy }, { rotate: `${rest + out * swing.value}deg` }],
  }));
}

/** Eyelids that blink now and then, or stay shut while asleep. */
export function useBlink(alive: boolean, asleep: boolean, seed: string): SharedValue<number> {
  const { animate } = useMotion();
  const open = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(open);
    if (asleep) {
      open.value = 0.15;
      return;
    }
    open.value = 1;
    if (!alive || !animate) return;
    const wait = 2600 + Math.round(seedOf(seed) * 2200);
    open.value = withRepeat(
      withSequence(withDelay(wait, withTiming(0.1, { duration: 70 })), withTiming(1, { duration: 90 })),
      -1,
    );
    return () => cancelAnimation(open);
  }, [alive, asleep, animate, seed, open]);
  return open;
}

interface FloatUpProps {
  children: ReactNode;
  /** How far up it drifts. */
  rise: number;
  /** How long it shows, matching when it's taken away. */
  duration: number;
  style?: StyleProp<ViewStyle>;
}

/** Pops in, drifts up and fades out, for the little pictures over a tapped thing. */
export function FloatUp({ children, rise, duration, style }: FloatUpProps) {
  const { animate } = useMotion();
  const t = useSharedValue(animate ? 0 : 1);
  const pop = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    pop.value = withSpring(1, { damping: 8 });
    t.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const look = useAnimatedStyle(() => ({
    opacity: animate ? Math.min(1, (1 - t.value) * 3.3) : 1,
    transform: [{ translateY: -rise * t.value }, { scale: 0.4 + pop.value * 0.6 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[style, look]}>
      {children}
    </Animated.View>
  );
}

/** Rises a little and fades, over and over, like a sleeper's Zzz. Still when motion is reduced. */
export function Drifting({ children, rise, style }: { children: ReactNode; rise: number; style?: StyleProp<ViewStyle> }) {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    t.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.sin) }), -1);
    return () => cancelAnimation(t);
  }, [animate, t]);
  const look = useAnimatedStyle(() => ({
    opacity: animate ? Math.min(1, t.value * 5, (1 - t.value) * 2.5) : 1,
    transform: [{ translateY: -rise * t.value }, { translateX: Math.sin(t.value * 6) * rise * 0.15 }, { scale: 0.7 + t.value * 0.4 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[style, look]}>
      {children}
    </Animated.View>
  );
}

/**
 * A firelight flicker: a gentle, uneven wobble in size and brightness, and a sway for flames. `seed` sets each
 * light's own rhythm so lights side by side don't pulse together. Still when motion is off.
 */
export function Flicker({
  children,
  seed,
  sway = 0,
  style,
}: {
  children: ReactNode;
  seed: string;
  /** How far it leans side to side, in degrees, like a flame in a draft. */
  sway?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    const r = seedOf(seed);
    const step = (to: number, ms: number) => withTiming(to, { duration: ms, easing: Easing.inOut(Easing.sin) });
    t.value = withDelay(
      Math.round(r * 400),
      withRepeat(withSequence(step(1, 260 + r * 120), step(0.35, 180), step(0.8, 220 + r * 90), step(0, 300)), -1),
    );
    return () => cancelAnimation(t);
  }, [animate, seed, t]);
  const look = useAnimatedStyle(() => ({
    opacity: 0.82 + t.value * 0.18,
    transform: [{ rotate: `${(t.value - 0.5) * sway}deg` }, { scaleY: 0.92 + t.value * 0.12 }, { scaleX: 0.97 + t.value * 0.04 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[style, look]}>
      {children}
    </Animated.View>
  );
}

/**
 * Bobs up and down on its own rhythm: a little jiggle at rest, and jumps `rise` high while `active`
 * (a ball in a ball pit someone is bouncing in). Still when motion is off.
 */
export function Bob({
  children,
  seed,
  rise,
  active,
  style,
}: {
  children: ReactNode;
  seed: string;
  rise: number;
  active: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate) {
      t.value = 0;
      return;
    }
    const r = seedOf(seed);
    const up = active ? 1 : 0.07;
    const ms = active ? 300 + r * 260 : 900 + r * 700;
    t.value = withDelay(
      Math.round(r * (active ? 250 : 900)),
      withRepeat(
        withSequence(
          withTiming(up, { duration: ms, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: ms, easing: Easing.in(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(t);
  }, [animate, active, seed, t]);
  const look = useAnimatedStyle(() => ({ transform: [{ translateY: -rise * t.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[style, look]}>
      {children}
    </Animated.View>
  );
}

/** Turns round and round while `active`, like the drum of a washing machine. Still when motion is off. */
export function Spin({ children, active, style }: { children: ReactNode; active: boolean; style?: StyleProp<ViewStyle> }) {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate || !active) {
      cancelAnimation(t);
      return;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1);
    return () => cancelAnimation(t);
  }, [animate, active, t]);
  const look = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 360}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[style, look]}>
      {children}
    </Animated.View>
  );
}

/** Shakes a little side to side while `active`, like a washing machine on spin. Still when motion is off. */
export function Rumble({ children, active, style }: { children: ReactNode; active: boolean; style?: StyleProp<ViewStyle> }) {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate || !active) {
      cancelAnimation(t);
      t.value = withTiming(0, { duration: 80 });
      return;
    }
    t.value = withRepeat(withSequence(withTiming(1, { duration: 70 }), withTiming(-1, { duration: 140 }), withTiming(0, { duration: 70 })), -1);
    return () => cancelAnimation(t);
  }, [animate, active, t]);
  const look = useAnimatedStyle(() => ({ transform: [{ translateX: t.value * 1.5 }, { rotate: `${t.value * 0.6}deg` }] }));
  return <Animated.View style={[style, look]}>{children}</Animated.View>;
}

/** Rocks from side to side on its feet while `active`, like a pig rolling about in the mud. Still when motion is off. */
export function Wallow({ children, active, style }: { children: ReactNode; active: boolean; style?: StyleProp<ViewStyle> }) {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate || !active) {
      cancelAnimation(t);
      t.value = withTiming(0, { duration: 200 });
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    t.value = withRepeat(withSequence(withTiming(1, { duration: 450, easing: ease }), withTiming(-1, { duration: 900, easing: ease }), withTiming(0, { duration: 450, easing: ease })), -1);
    return () => cancelAnimation(t);
  }, [animate, active, t]);
  const look = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 14}deg` }] }));
  return <Animated.View style={[{ transformOrigin: 'bottom' }, style, look]}>{children}</Animated.View>;
}

/** Swings to and fro from its top edge while `active`, like a playground swing. Still when motion is off. */
export function Swing({
  children,
  active,
  sway = 1,
  style,
}: {
  children: ReactNode;
  active: boolean;
  /** How far it swings, as a share of a full playground swing (30 degrees each way). */
  sway?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate || !active) {
      cancelAnimation(t);
      t.value = withTiming(0, { duration: 500 });
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    t.value = withRepeat(withSequence(withTiming(1, { duration: 650, easing: ease }), withTiming(-1, { duration: 1300, easing: ease }), withTiming(0, { duration: 650, easing: ease })), -1);
    return () => cancelAnimation(t);
  }, [animate, active, t]);
  const look = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 30 * sway}deg` }] }));
  return <Animated.View style={[{ transformOrigin: 'top' }, style, look]}>{children}</Animated.View>;
}

/**
 * Puts what's inside at `left`/`top` (in its parent's points) and, when that changes, walks it
 * there instead of jumping: a smooth glide with a little waddle and bounce for each step. While
 * `instant` (a finger is carrying it) it follows exactly. `grow` scales it up, for being held.
 * Jumps straight there when motion is off.
 *
 * Picking up and dropping (`dangle`, `land`): while carried, a `dangle` piece hangs from the
 * finger and swings behind it like a pendulum, stretching a little. Let go above where it ends
 * up, it falls there (speeding up like a real drop) instead of walking, and a `land` piece
 * squashes when it touches down.
 */
export function Glide({
  left,
  top,
  instant = false,
  walk = true,
  grow = 1,
  bounce = 6,
  dangle = false,
  land = false,
  children,
  style,
  pointerEvents,
  accessibilityLabel,
}: {
  left: number;
  top: number;
  instant?: boolean;
  /** Waddle and bounce on the way, for people and buddies; off for things that slide. */
  walk?: boolean;
  grow?: number;
  /** How high each step bounces, in points. */
  bounce?: number;
  /** Hangs and swings from the finger while carried, for people and buddies. */
  dangle?: boolean;
  /** Falls to where it was let go over and squashes on landing. */
  land?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  accessibilityLabel?: string;
}) {
  const { animate } = useMotion();
  const x = useSharedValue(left);
  const y = useSharedValue(top);
  const steps = useSharedValue(0);
  const size = useSharedValue(grow);
  const swing = useSharedValue(0);
  const stretch = useSharedValue(0);
  const squash = useSharedValue(0);
  const first = useRef(true);
  const wasHeld = useRef(instant);
  const lastLeft = useRef(left);
  useEffect(() => {
    const dropped = wasHeld.current && !instant;
    wasHeld.current = instant;
    const moveX = left - lastLeft.current;
    lastLeft.current = left;
    if (first.current) {
      first.current = false;
      return;
    }
    if (dangle && animate) {
      if (instant && Math.abs(moveX) > 0.5) {
        // Swinging out behind the finger, then back and forth until it settles.
        swing.value = withSequence(withTiming(dangleTilt(moveX), { duration: 90 }), withSpring(0, PENDULUM));
      } else if (!instant) {
        swing.value = withSpring(0, PENDULUM);
      }
    }
    const far = Math.hypot(left - x.value, top - y.value);
    cancelAnimation(steps);
    steps.value = 0;
    const squashAfter = (ms: number) => {
      if (!land || !animate) return;
      squash.value = withDelay(ms, withSequence(withTiming(1, { duration: 80 }), withSpring(0, SETTLE)));
    };
    if (!animate || instant || far < 1) {
      cancelAnimation(x);
      cancelAnimation(y);
      x.value = left;
      y.value = top;
      if (dropped) squashAfter(0);
      return;
    }
    if (dropped && land && top > y.value + 4) {
      // Let go up high: drop down, speeding up, and squash on the floor.
      const ms = fallMs(top - y.value);
      x.value = withTiming(left, { duration: ms, easing: Easing.out(Easing.quad) });
      y.value = withTiming(top, { duration: ms, easing: Easing.in(Easing.quad) });
      squashAfter(ms);
      return;
    }
    const ms = glideMs(far);
    const ease = Easing.inOut(Easing.quad);
    x.value = withTiming(left, { duration: ms, easing: ease });
    y.value = withTiming(top, { duration: ms, easing: ease });
    if (walk && far > 30) steps.value = withTiming(stepsFor(ms), { duration: ms, easing: Easing.linear });
    if (dropped) squashAfter(dropped && walk ? 0 : ms);
    // Only a new place (or picking up / letting go) moves it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, top, instant, animate]);
  useEffect(() => {
    size.value = animate ? withSpring(grow, SETTLE) : grow;
  }, [grow, animate, size]);
  useEffect(() => {
    // Hanging from the finger pulls it a little longer; let go, it springs back.
    stretch.value = animate && dangle && instant ? withSpring(1, SETTLE) : withSpring(0, SETTLE);
  }, [instant, dangle, animate, stretch]);
  const look = useAnimatedStyle(() => {
    const s = steps.value;
    const q = squash.value;
    return {
      left: x.value,
      top: y.value,
      transform: [
        { translateY: -Math.abs(Math.sin(s * Math.PI)) * bounce },
        { rotate: `${Math.sin(s * Math.PI) * 5}deg` },
        { scale: size.value },
        { scaleX: 1 + q * 0.12 },
        { scaleY: 1 - q * 0.16 },
      ],
    };
  });
  const hang = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${swing.value}deg` },
      { scaleY: 1 + stretch.value * 0.06 },
      { scaleX: 1 - stretch.value * 0.03 },
    ],
  }));
  return (
    <Animated.View pointerEvents={pointerEvents} accessibilityLabel={accessibilityLabel} style={[styles.glide, style, look]}>
      {dangle ? <Animated.View style={[styles.hang, hang]}>{children}</Animated.View> : children}
    </Animated.View>
  );
}

/** A loose spring for a held figure swinging back and forth under the finger. */
const PENDULUM = { damping: 3.2, stiffness: 70, mass: 0.8 };

/** How long a walk of `far` points takes: about 450 points a second, never under 60ms or over 0.9s. */
export function glideMs(far: number): number {
  return Math.round(Math.min(900, Math.max(60, far * 2.2)));
}

/** How many waddle steps a walk of `ms` takes: one every 180ms or so, at least one. */
export function stepsFor(ms: number): number {
  return Math.max(1, Math.round(ms / 180));
}

/**
 * Bobs and rocks quickly while `active`, like someone working hard at something (a buddy
 * running the bakery mixer). Still when motion is off.
 */
export function Busy({ children, active, style }: { children: ReactNode; active: boolean; style?: StyleProp<ViewStyle> }) {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate || !active) {
      cancelAnimation(t);
      t.value = withTiming(0, { duration: 120 });
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    t.value = withRepeat(withSequence(withTiming(1, { duration: 170, easing: ease }), withTiming(-1, { duration: 340, easing: ease }), withTiming(0, { duration: 170, easing: ease })), -1);
    return () => cancelAnimation(t);
  }, [animate, active, t]);
  const look = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.abs(t.value) * 4 }, { rotate: `${t.value * 6}deg` }],
  }));
  return <Animated.View style={[{ transformOrigin: 'bottom' }, style, look]}>{children}</Animated.View>;
}

/**
 * Springs a panel in from off to one side (`from`) when it appears, overshooting a touch and settling,
 * like a drawer sliding out. Remount with a new `key` to play it again (a different tab). Still when
 * motion is off.
 */
export function SlideIn({
  children,
  from = 'bottom',
  distance = 80,
  delay = 0,
  style,
}: {
  children: ReactNode;
  from?: 'bottom' | 'left' | 'right';
  distance?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { animate } = useMotion();
  const t = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) t.value = withDelay(delay, withSpring(1, PANEL));
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const look = useAnimatedStyle(() => {
    const off = (1 - t.value) * distance;
    return {
      opacity: Math.min(1, t.value * 2.5),
      transform: from === 'bottom' ? [{ translateY: off }] : [{ translateX: from === 'left' ? -off : off }],
    };
  });
  return <Animated.View style={[style, look]}>{children}</Animated.View>;
}

/** A quick spring with a little overshoot, for panels sliding in. */
const PANEL = { damping: 13, stiffness: 190, mass: 0.9 };

/**
 * A choice that shows it's picked: it grows a little with a springy bounce and a colored ring
 * pops in around it. Shrinks back and the ring fades when something else is picked.
 */
export function Picked({
  on,
  children,
  ring = colors.primary,
  radius = 16,
  grow = 1.1,
  style,
}: {
  on: boolean;
  children: ReactNode;
  /** The ring's color. */
  ring?: string;
  /** The ring's corner rounding, to match the choice's shape. */
  radius?: number;
  grow?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { animate } = useMotion();
  const t = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    t.value = animate ? withSpring(on ? 1 : 0, { damping: 9, stiffness: 260 }) : on ? 1 : 0;
  }, [on, animate, t]);
  const look = useAnimatedStyle(() => ({ transform: [{ scale: 1 + (grow - 1) * t.value }] }));
  const ringLook = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, t.value)),
    transform: [{ scale: 1.25 - 0.25 * t.value }],
  }));
  return (
    <Animated.View style={[style, look]}>
      {children}
      <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: ring, borderRadius: radius + 5 }, ringLook]} />
    </Animated.View>
  );
}

/** Little clouds that burst out from a spot and fade: the poof of clothes popping on. */
export function Poof({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (animate) t.value = withTiming(1, { duration: POOF_MS, easing: Easing.out(Easing.quad) });
    // Only on mount; a new poof mounts a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!animate) return null;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: 0, height: 0 }, style]}>
      {Array.from({ length: 7 }, (_, i) => (
        <Puff key={i} angle={(i / 7) * Math.PI * 2 + 0.3} size={size} t={t} big={i % 2 === 0} />
      ))}
      <Puff angle={0} size={size} t={t} big center />
    </View>
  );
}

/** How long a poof lasts. */
export const POOF_MS = 520;

function Puff({ angle, size, t, big, center = false }: { angle: number; size: number; t: SharedValue<number>; big: boolean; center?: boolean }) {
  const d = (big ? 0.34 : 0.24) * size * (center ? 1.5 : 1);
  const reach = center ? 0 : size * 0.42;
  const look = useAnimatedStyle(() => ({
    opacity: t.value < 0.05 ? t.value * 20 : 1 - t.value,
    transform: [
      { translateX: Math.cos(angle) * reach * t.value - d / 2 },
      { translateY: Math.sin(angle) * reach * t.value - d / 2 },
      { scale: 0.3 + t.value * (center ? 0.9 : 0.8) },
    ],
  }));
  return <Animated.View style={[styles.puff, { width: d, height: d, borderRadius: d }, look]} />;
}

/**
 * Something knocked off (a hat swapped for a new one): it drops `fall` points, spinning, bounces
 * where it lands, lies there a moment and fades. Plays once.
 */
export function Tumble({ children, fall, side, style }: { children: ReactNode; fall: number; side: 1 | -1; style?: StyleProp<ViewStyle> }) {
  const { animate } = useMotion();
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const spin = useSharedValue(0);
  const fade = useSharedValue(1);
  useEffect(() => {
    if (!animate) return;
    const ms = fallMs(fall);
    const hop = Math.min(30, fall * 0.12);
    y.value = withSequence(
      withTiming(fall, { duration: ms, easing: Easing.in(Easing.quad) }),
      withTiming(fall - hop, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(fall, { duration: 140, easing: Easing.in(Easing.quad) }),
    );
    x.value = withTiming(side * Math.max(24, fall * 0.3), { duration: ms + 280, easing: Easing.out(Easing.quad) });
    spin.value = withTiming(side * 200, { duration: ms + 280, easing: Easing.out(Easing.quad) });
    fade.value = withDelay(TUMBLE_MS - 400, withTiming(0, { duration: 400 }));
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const look = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${spin.value}deg` }],
  }));
  if (!animate) return null;
  return (
    <Animated.View pointerEvents="none" style={[style, look]}>
      {children}
    </Animated.View>
  );
}

/** How long a knocked-off piece is on screen, falling and then lying on the floor. */
export const TUMBLE_MS = 1900;

const CONFETTI_COLORS =['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F45'];

interface ConfettiProps {
  /** Change this number to throw another handful; 0 throws none. */
  burst: number;
  /** How far the pieces fall. */
  fall?: number;
  count?: number;
  /** Where the pieces fall, over the parent by default. */
  style?: StyleProp<ViewStyle>;
}

/** A handful of paper bits that flutter down once over what's behind them. */
export function Confetti({ burst, fall = 420, count = 22, style }: ConfettiProps) {
  const { animate } = useMotion();
  if (!animate || burst <= 0) return null;
  return (
    <View pointerEvents="none" style={[styles.cover, style]}>
      {Array.from({ length: count }, (_, i) => (
        <Bit key={`${burst}-${i}`} index={i} burst={burst} fall={fall} />
      ))}
    </View>
  );
}

function Bit({ index, burst, fall }: { index: number; burst: number; fall: number }) {
  const r = seedOf(`${burst}:${index}`);
  const r2 = seedOf(`${index}:${burst}x`);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(Math.round(r2 * 350), withTiming(1, { duration: 1500 + r * 900, easing: Easing.in(Easing.quad) }));
    // Only on mount; a new burst mounts new bits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const drift = (r2 - 0.5) * 80;
  const spin = 360 + r * 540;
  const look = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - Math.max(0, t.value - 0.75) * 4,
    transform: [
      { translateY: -20 + t.value * fall },
      { translateX: drift * t.value + Math.sin(t.value * 9 + r * 6) * 10 },
      { rotate: `${t.value * spin}deg` },
      { scaleX: Math.cos(t.value * 12 + r * 3) },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.bit,
        { left: `${4 + r * 92}%`, backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length], height: index % 3 === 0 ? 8 : 12 },
        look,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // Breathing and squashing keep the feet on the floor.
  feet: { transformOrigin: 'bottom' },
  glide: { position: 'absolute', transformOrigin: 'bottom' },
  // A held figure hangs from the top, where the finger has it.
  hang: { width: '100%', height: '100%', transformOrigin: 'top', alignItems: 'center', justifyContent: 'flex-end' },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  ring: { position: 'absolute', left: -5, top: -5, right: -5, bottom: -5, borderWidth: 3 },
  puff: { position: 'absolute', left: 0, top: 0, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E4E0F0' },
  bit: { position: 'absolute', top: 0, width: 8, borderRadius: 2 },
});
