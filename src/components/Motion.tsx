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

import { useMotion } from '@/hooks/useAccessibility';

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

/** A quick wobble back to still after a squash. */
const SETTLE = { damping: 10, stiffness: 260 };

export type BounceKind = 'hop' | 'wiggle' | 'land' | 'shake';

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

const CONFETTI_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F45'];

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
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  bit: { position: 'absolute', top: 0, width: 8, borderRadius: 2 },
});
