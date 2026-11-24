import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { INK } from '@/constants/artStyle';
import { useMotion } from '@/hooks/useAccessibility';
import { ROUNDABOUT, TOWN_H, TOWN_W } from '@/utils/roads';
import { TOWN_LOTS } from '@/utils/townLayout';

/** A value that runs 0 to 1 over and over (or sits at `rest` with Reduce motion on). */
function useLoop(ms: number, { back = false, delay = 0, rest = 0 }: { back?: boolean; delay?: number; rest?: number } = {}): SharedValue<number> {
  const { animate } = useMotion();
  const t = useSharedValue(rest);
  useEffect(() => {
    if (!animate) {
      t.value = rest;
      return;
    }
    t.value = 0;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: ms, easing: back ? Easing.inOut(Easing.sin) : Easing.linear }), -1, back));
    return () => cancelAnimation(t);
  }, [animate, back, delay, ms, rest, t]);
  return t;
}

const bakery = TOWN_LOTS.find((l) => l.id === 'bakery')!;
const home = TOWN_LOTS.find((l) => l.id === 'home')!;

/**
 * The things in town that keep moving: the fountain, chimney smoke, ducks on the pond,
 * cloud shadows drifting over, a bird, and someone out for a walk. At night the town gets
 * a dark blue wash. Everything follows the Reduce motion setting.
 */
export function TownLife({ night = false }: { night?: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fountain />
      <Smoke x={bakery.x + bakery.w - 27} y={bakery.y - bakery.depth + 40 - 26} />
      <Smoke x={home.x + 30} y={home.y - home.depth + 40 - 20} delay={900} />
      <Duck x={1250} y={1176} />
      <Duck x={1310} y={1190} delay={1300} />
      <Walker />
      <Bird />
      <Cloud y={300} ms={52000} />
      <Cloud y={900} ms={64000} delay={20000} />
      {night ? <View style={styles.night} /> : null}
    </View>
  );
}

function Fountain() {
  const t = useLoop(900, { back: true, rest: 0.5 });
  const spray = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.75 + t.value * 0.4 }], opacity: 0.75 + t.value * 0.25 }));
  return <Animated.View style={[styles.spray, { left: ROUNDABOUT.x - 12, top: ROUNDABOUT.y - 46 }, spray]} />;
}

function Smoke({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  const t = useLoop(2600, { delay });
  const puff = (k: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const p = (t.value + k / 3) % 1;
      return { opacity: 0.8 * (1 - p), transform: [{ translateX: p * 18 }, { translateY: -p * 50 }, { scale: 0.6 + p * 0.9 }] };
    });
  const a = puff(0);
  const b = puff(1);
  const c = puff(2);
  return (
    <>
      {[a, b, c].map((s, i) => (
        <Animated.View key={i} style={[styles.puff, { left: x - 9, top: y - 9 }, s]} />
      ))}
    </>
  );
}

function Duck({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  const t = useLoop(3800, { back: true, delay, rest: 0.5 });
  const look = useAnimatedStyle(() => ({ transform: [{ translateX: (t.value - 0.5) * 40 }, { translateY: Math.sin(t.value * Math.PI * 4) * 2 }] }));
  return (
    <Animated.View style={[styles.duck, { left: x - 14, top: y - 10 }, look]}>
      <View style={styles.duckBody} />
      <View style={styles.duckHead} />
      <View style={styles.duckBeak} />
    </Animated.View>
  );
}

/** Someone walking along the pavement by the shops, there and back. */
function Walker() {
  const t = useLoop(16000, { back: true, rest: 0.3 });
  const step = useLoop(500, { back: true, rest: 0.5 });
  const look = useAnimatedStyle(() => ({ transform: [{ translateX: 260 + t.value * 1080 }, { translateY: 548 - Math.abs(step.value - 0.5) * 4 }] }));
  return (
    <Animated.View style={[styles.walker, look]}>
      <View style={styles.walkerHead} />
      <View style={styles.walkerBody} />
    </Animated.View>
  );
}

/** A bird flying across now and then. */
function Bird() {
  const t = useLoop(14000, { delay: 3000, rest: -1 });
  const flap = useLoop(300, { back: true, rest: 0.5 });
  const look = useAnimatedStyle(() => ({
    opacity: t.value < 0 ? 0 : 1,
    transform: [{ translateX: -60 + t.value * (TOWN_W + 120) }, { translateY: 180 + Math.sin(t.value * Math.PI * 3) * 40 }, { scaleY: 0.6 + flap.value * 0.6 }],
  }));
  return (
    <Animated.View style={[styles.bird, look]}>
      <View style={[styles.wing, { transform: [{ rotate: '-25deg' }] }]} />
      <View style={[styles.wing, { transform: [{ rotate: '25deg' }], marginLeft: -3 }]} />
    </Animated.View>
  );
}

/** A soft cloud shadow sliding across the town. */
function Cloud({ y, ms, delay = 0 }: { y: number; ms: number; delay?: number }) {
  const t = useLoop(ms, { delay, rest: -1 });
  const look = useAnimatedStyle(() => ({ opacity: t.value < 0 ? 0 : 1, transform: [{ translateX: -400 + t.value * (TOWN_W + 600) }] }));
  return (
    <Animated.View style={[styles.cloud, { top: y }, look]}>
      <View style={[styles.cloudPart, { width: 220, height: 90, left: 0, top: 30 }]} />
      <View style={[styles.cloudPart, { width: 150, height: 110, left: 60, top: 0 }]} />
      <View style={[styles.cloudPart, { width: 120, height: 80, left: 160, top: 40 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spray: { position: 'absolute', width: 24, height: 46, borderRadius: 12, backgroundColor: '#E7F6FD', borderWidth: 2, borderColor: '#7FCBEF', transformOrigin: 'bottom' },
  puff: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFDF8' },
  duck: { position: 'absolute', width: 34, height: 24 },
  duckBody: { position: 'absolute', left: 0, top: 6, width: 26, height: 16, borderRadius: 8, backgroundColor: '#FFFDF8', borderWidth: 2, borderColor: INK },
  duckHead: { position: 'absolute', left: 16, top: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: '#FFFDF8', borderWidth: 2, borderColor: INK },
  duckBeak: { position: 'absolute', left: 28, top: 5, width: 7, height: 5, borderRadius: 2, backgroundColor: '#F28C28' },
  walker: { position: 'absolute', left: 0, top: 0, width: 18, height: 30, alignItems: 'center' },
  walkerHead: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFC9A8', borderWidth: 2, borderColor: INK },
  walkerBody: { width: 16, height: 14, borderRadius: 6, backgroundColor: '#8E5BD8', borderWidth: 2, borderColor: INK, marginTop: -2 },
  bird: { position: 'absolute', left: 0, top: 0, flexDirection: 'row' },
  wing: { width: 14, height: 4, borderRadius: 2, backgroundColor: INK },
  cloud: { position: 'absolute', left: 0, width: 300, height: 130 },
  cloudPart: { position: 'absolute', borderRadius: 60, backgroundColor: 'rgba(40, 60, 90, 0.08)' },
  night: { position: 'absolute', left: 0, top: 0, width: TOWN_W, height: TOWN_H, backgroundColor: 'rgba(20, 30, 80, 0.32)' },
});
