import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Bob, Flicker, seedOf, Swing } from '@/components/Motion';
import { FORT, TREE_HOUSE } from '@/constants/room';
import { useMotion } from '@/hooks/useAccessibility';
import { INK } from '@/constants/artStyle';

const OUTLINE = INK;
const WOOD = '#B07A4F';
const WOOD_DARK = '#8A5A36';
const LEAVES = ['#4CAF50', '#43A047', '#66BB6A'];

function at(left: number, top: number, width: number, height: number): ViewStyle {
  return { position: 'absolute', left, top, width, height };
}

interface Drawn {
  w: number;
  h: number;
  on: boolean;
}

/**
 * A big tree with a tree house in its branches and a rope ladder down to the grass. The leaves
 * spill out above and around the box; buddies inside look out over the window sill.
 */
export function TreeWithHouse({ w, h, on }: Drawn) {
  const floorY = h * TREE_HOUSE.floor;
  const wallTop = h * TREE_HOUSE.wallTop;
  const sill = h * TREE_HOUSE.sill;
  const house = { left: w * 0.18, width: w * 0.64 };
  const trunk = { left: w * 0.42, width: w * 0.16 };
  const blob = (x: number, y: number, r: number, i: number) => (
    <View key={i} style={[styles.leaves, at(x - r, y - r, r * 2, r * 2), { borderRadius: r, backgroundColor: LEAVES[i % LEAVES.length] }]} />
  );
  return (
    <>
      {/* Leaves behind the house, reaching above its box. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {blob(w * 0.2, h * 0.08, w * 0.24, 0)}
        {blob(w * 0.52, -h * 0.08, w * 0.3, 1)}
        {blob(w * 0.82, h * 0.06, w * 0.24, 2)}
        {blob(w * 0.08, h * 0.32, w * 0.16, 1)}
        {blob(w * 0.95, h * 0.3, w * 0.16, 0)}
      </View>
      {/* Trunk, with a branch either side holding up the house. */}
      <View style={[styles.trunk, at(trunk.left, floorY - h * 0.02, trunk.width, h - floorY + h * 0.02)]} />
      <View style={[styles.trunk, at(w * 0.24, floorY + h * 0.05, w * 0.22, h * 0.04), { transform: [{ rotate: '-28deg' }] }]} />
      <View style={[styles.trunk, at(w * 0.54, floorY + h * 0.05, w * 0.22, h * 0.04), { transform: [{ rotate: '28deg' }] }]} />
      {/* The house: a roof, plank walls with a window and a door, on a platform. */}
      <View style={[styles.roof, at(house.left - w * 0.06, 0, house.width + w * 0.12, wallTop + h * 0.03), { borderTopLeftRadius: w * 0.3, borderTopRightRadius: w * 0.3 }]} />
      <View style={[styles.house, at(house.left, wallTop, house.width, floorY - wallTop)]}>
        {[0.25, 0.5, 0.75].map((x) => (
          <View key={x} style={[styles.plankLine, { left: `${x * 100}%` }]} />
        ))}
      </View>
      {/* Window the buddies look out of (they're drawn on top, from the sill up). */}
      <View style={[styles.window, at(house.left + house.width * 0.08, wallTop + h * 0.05, house.width * 0.56, sill - wallTop - h * 0.05)]} />
      <View style={[styles.sill, at(house.left + house.width * 0.04, sill - h * 0.012, house.width * 0.64, h * 0.03)]} />
      {/* Door with a flag above it; the flag waves while someone is inside. */}
      <View style={[styles.door, at(house.left + house.width * 0.72, wallTop + h * 0.1, house.width * 0.2, floorY - wallTop - h * 0.1)]}>
        <View style={styles.knob} />
      </View>
      <View style={[styles.pole, at(house.left + house.width * 0.98, -h * 0.12, 3, h * 0.16)]} />
      <Swing active={on} sway={0.25} style={at(house.left + house.width * 0.98 + 3, -h * 0.12, w * 0.12, h * 0.07)}>
        <View style={styles.flag} />
      </Swing>
      <View style={[styles.platform, at(house.left - w * 0.06, floorY - h * 0.01, house.width + w * 0.12, h * 0.05)]} />
      {/* Rope ladder down to the grass. */}
      <View style={[styles.rope, at(w * 0.14, floorY + h * 0.03, 3, h - floorY - h * 0.03)]} />
      <View style={[styles.rope, at(w * 0.27, floorY + h * 0.03, 3, h - floorY - h * 0.03)]} />
      {[0.12, 0.3, 0.48, 0.66, 0.84].map((t) => (
        <View key={t} style={[styles.rung, at(w * 0.13, floorY + h * 0.03 + (h - floorY) * t, w * 0.16, h * 0.022)]} />
      ))}
    </>
  );
}

/** A wooden A-frame with two swings; switched on, they swing (and so do buddies sitting on them). */
export function SwingSet({ w, h, on }: Drawn) {
  const beam = h * 0.05;
  const seatY = h * (1 - 0.1 / 0.6);
  const swing = (x: number, i: number) => (
    <Swing key={x} active={on} style={at(w * x - w * 0.06, beam * 1.4, w * 0.12, seatY - beam * 1.4 + h * 0.04)}>
      <View style={[styles.chain, { left: '12%' }]} />
      <View style={[styles.chain, { right: '12%' }]} />
      <View style={[styles.seatBoard, { backgroundColor: i ? '#42A5F5' : '#EF5350' }]} />
    </Swing>
  );
  return (
    <>
      {/* Legs, leaning in to the bar at each end. */}
      {[0.02, 0.9].map((x) => (
        <View key={x} pointerEvents="none" style={at(w * x, 0, w * 0.08, h)}>
          <View style={[styles.leg, at(0, 0, w * 0.03, h * 1.02), { left: w * 0.01, transform: [{ rotate: '8deg' }] }]} />
          <View style={[styles.leg, at(0, 0, w * 0.03, h * 1.02), { left: w * 0.04, transform: [{ rotate: '-8deg' }] }]} />
        </View>
      ))}
      <View style={[styles.beam, at(0, 0, w, beam)]} />
      {swing(0.27, 0)}
      {swing(0.73, 1)}
    </>
  );
}

/** A little fort on stilts with a striped roof, a ladder up and a slide down the right. */
export function PlayScape({ w, h, on }: Drawn) {
  const fortW = w * FORT.width;
  const floor = h * FORT.platform;
  const roofH = h * 0.18;
  const slideLen = Math.hypot(w - fortW, h - floor);
  const angle = Math.atan2(h - floor, w - fortW);
  return (
    <>
      {/* The slide, from the platform's edge down to the grass. */}
      <View
        style={[
          styles.slide,
          at(fortW + (w - fortW) / 2 - slideLen / 2, floor + (h - floor) / 2 - h * 0.035, slideLen, h * 0.07),
          { transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }] },
        ]}
      />
      {/* Posts and the platform. */}
      <View style={[styles.post, at(fortW * 0.04, roofH, fortW * 0.1, h - roofH)]} />
      <View style={[styles.post, at(fortW * 0.86, roofH, fortW * 0.1, h - roofH)]} />
      <View style={[styles.platformBoard, at(0, floor - h * 0.02, fortW, h * 0.05)]} />
      {/* A railing round the platform, and a ladder under it. */}
      <View style={[styles.rail, at(fortW * 0.04, floor - h * 0.14, fortW * 0.92, h * 0.03)]} />
      {[0.25, 0.5, 0.75].map((x) => (
        <View key={x} style={[styles.post, at(fortW * x, floor - h * 0.14, fortW * 0.05, h * 0.13)]} />
      ))}
      {[0.2, 0.45, 0.7].map((t) => (
        <View key={t} style={[styles.rung, at(fortW * 0.14, floor + (h - floor) * t, fortW * 0.72, h * 0.025)]} />
      ))}
      {/* A peaked, striped roof; its flag waves while someone's sliding. */}
      <View style={[styles.fortRoof, at(-fortW * 0.06, 0, fortW * 1.12, roofH)]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? '#FFF8E1' : '#EF5350' }} />
        ))}
      </View>
      <View style={[styles.pole, at(fortW * 0.5, -h * 0.14, 3, h * 0.15)]} />
      <Swing active={on} sway={0.25} style={at(fortW * 0.5 + 3, -h * 0.14, w * 0.1, h * 0.07)}>
        <View style={[styles.flag, { backgroundColor: '#FFCA28' }]} />
      </Swing>
    </>
  );
}

/** A round trampoline on legs; switched on, its mat dips and springs. */
export function Trampoline({ w, h, on }: Drawn) {
  const mat = h * 0.25;
  return (
    <>
      {[0.12, 0.45, 0.78].map((x) => (
        <View key={x} style={[styles.trampLeg, at(w * x, mat, w * 0.06, h - mat)]} />
      ))}
      <Bob seed="trampoline" rise={-h * 0.08} active={on} style={at(0, 0, w, mat * 1.4)}>
        <View style={[styles.mat, { flex: 1, borderRadius: w }]}>
          <View style={[styles.matInner, { borderRadius: w }]} />
        </View>
      </Bob>
    </>
  );
}

/** The backyard's sky and fence, drawn where a room has its wall; `fence` is the wall paint. */
export function BackyardSky({ width, floorY, fence }: { width: number; floorY: number; fence: string }) {
  const fenceH = floorY * 0.22;
  const picket = Math.max(18, floorY * 0.05);
  const count = Math.ceil(width / (picket * 1.6));
  return (
    <View pointerEvents="none" style={at(0, 0, width, floorY)}>
      <View style={[StyleSheet.absoluteFill, styles.skyTop]} />
      <View style={[at(0, floorY * 0.45, width, floorY * 0.55), styles.skyLow]} />
      {[0.12, 0.38, 0.62, 0.86].map((x, i) => (
        <View key={x} style={at(width * x, floorY * (0.22 + (i % 2) * 0.1), floorY * 0.3, floorY * 0.1)}>
          <View style={[styles.cloud, at(0, floorY * 0.03, floorY * 0.3, floorY * 0.07)]} />
          <View style={[styles.cloud, at(floorY * 0.06, 0, floorY * 0.12, floorY * 0.09)]} />
          <View style={[styles.cloud, at(floorY * 0.14, floorY * 0.01, floorY * 0.1, floorY * 0.08)]} />
        </View>
      ))}
      {/* Far-off hills, then the fence along the back of the yard. */}
      <View style={[styles.hill, at(-width * 0.05, floorY - fenceH * 1.5, width * 0.6, fenceH * 2.4), { borderRadius: width }]} />
      <View style={[styles.hill2, at(width * 0.45, floorY - fenceH * 1.3, width * 0.65, fenceH * 2.4), { borderRadius: width }]} />
      <View style={[styles.fenceRail, at(0, floorY - fenceH * 0.75, width, fenceH * 0.12), { backgroundColor: fence }]} />
      <View style={[styles.fenceRail, at(0, floorY - fenceH * 0.3, width, fenceH * 0.12), { backgroundColor: fence }]} />
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.picket, at(i * picket * 1.6, floorY - fenceH, picket, fenceH), { backgroundColor: fence, borderTopLeftRadius: picket / 2, borderTopRightRadius: picket / 2 }]}
        />
      ))}
    </View>
  );
}

/** Tufts of grass and flowers across the backyard's lawn. */
export function Lawn({ width, top, height }: { width: number; top: number; height: number }) {
  const count = Math.max(6, Math.round(width / 70));
  return (
    <View pointerEvents="none" style={at(0, top, width, height)}>
      {Array.from({ length: count }, (_, i) => {
        const r = seedOf(`lawn-${i}`);
        const x = (i + r * 0.6) * (width / count);
        const y = height * (0.12 + r * 0.7);
        const flower = i % 4 === 1;
        return flower ? (
          <View key={i} style={at(x, y, 12, 12)}>
            <View style={[styles.petal, { backgroundColor: i % 8 === 1 ? '#F48FB1' : '#FFF59D' }]} />
            <View style={styles.flowerMiddle} />
          </View>
        ) : (
          <View key={i} style={[styles.tuft, at(x, y, 4, 10)]} />
        );
      })}
    </View>
  );
}

/** Tap to make it night in the backyard (a moon comes out, with stars and fireflies) and day again. */
export function SunMoon({ left, top, size, night, onPress }: { left: number; top: number; size: number; night: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={night ? 'The moon. Tap for morning' : 'The sun. Tap for night time'}
      style={at(left, top, size, size)}
      hitSlop={10}
    >
      {night ? (
        <View style={[styles.moon, { flex: 1, borderRadius: size }]}>
          <View style={[styles.moonBite, at(size * 0.32, -size * 0.08, size * 0.85, size * 0.85), { borderRadius: size }]} />
        </View>
      ) : (
        <Flicker seed="sun" style={{ flex: 1 }}>
          {[0, 45, 90, 135].map((d) => (
            <View key={d} style={[styles.ray, at(-size * 0.2, size / 2 - 2, size * 1.4, 4), { transform: [{ rotate: `${d}deg` }] }]} />
          ))}
          <View style={[styles.sun, { flex: 1, borderRadius: size }]} />
        </Flicker>
      )}
    </Pressable>
  );
}

/** Stars and fireflies over the backyard at night, drawn above the dark. */
export function NightSky({ width, floorY, height }: { width: number; floorY: number; height: number }) {
  return (
    <View pointerEvents="none" style={at(0, 0, width, height)}>
      {Array.from({ length: 16 }, (_, i) => {
        const r = seedOf(`star-${i}`);
        return <View key={`s${i}`} style={[styles.star, at(width * ((i + r) / 16), floorY * (0.15 + r * 0.45), 4, 4)]} />;
      })}
      {Array.from({ length: 10 }, (_, i) => {
        const r = seedOf(`firefly-${i}`);
        return (
          <Bob key={`f${i}`} seed={`firefly-${i}`} rise={floorY * 0.06} active style={at(width * ((i + r) / 10), floorY * (0.6 + r * 0.45), 8, 8)}>
            <Flicker seed={`ff-${i}`} style={{ flex: 1 }}>
              <View style={styles.firefly} />
            </Flicker>
          </Bob>
        );
      })}
    </View>
  );
}

/** Birds flying across the backyard sky, flapping, over and over. Still in the sky when motion is off. */
export function Birds({ width, floorY }: { width: number; floorY: number }) {
  return (
    <View pointerEvents="none" style={at(0, 0, width, floorY)}>
      {[0, 1, 2, 3].map((i) => (
        <Bird key={i} index={i} width={width} y={floorY * (0.16 + (i % 3) * 0.09)} size={Math.max(16, floorY * (0.045 + (i % 2) * 0.015))} />
      ))}
    </View>
  );
}

const BIRD_COLORS = ['#455A64', '#5C6BC0', '#E53935', '#6D4C41'];

function Bird({ index, width, y, size }: { index: number; width: number; y: number; size: number }) {
  const { animate } = useMotion();
  const t = useSharedValue(0);
  const flap = useSharedValue(0);
  const r = seedOf(`bird-${index}`);
  // Two fly right, two fly left; each at its own speed.
  const right = index % 2 === 0;
  const ms = Math.round(16000 + r * 9000 + (width / 2000) * 4000);
  useEffect(() => {
    if (!animate) {
      t.value = 0.2 + index * 0.2;
      flap.value = 0;
      return;
    }
    t.value = r;
    t.value = withSequence(
      withTiming(1, { duration: Math.round(ms * (1 - r)), easing: Easing.linear }),
      withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: ms, easing: Easing.linear })), -1),
    );
    flap.value = withDelay(
      Math.round(r * 300),
      withRepeat(withSequence(withTiming(1, { duration: 180, easing: Easing.inOut(Easing.sin) }), withTiming(-1, { duration: 220, easing: Easing.inOut(Easing.sin) })), -1, true),
    );
    return () => {
      cancelAnimation(t);
      cancelAnimation(flap);
    };
  }, [animate, flap, index, ms, r, t]);
  const span = width + size * 4;
  const fly = useAnimatedStyle(() => {
    const x = right ? -size * 2 + t.value * span : width + size * 2 - t.value * span;
    return { transform: [{ translateX: x }, { translateY: Math.sin(t.value * Math.PI * 14) * size * 0.4 }, { scaleX: right ? 1 : -1 }] };
  });
  const up = useAnimatedStyle(() => ({ transform: [{ rotate: `${-20 - flap.value * 35}deg` }] }));
  const down = useAnimatedStyle(() => ({ transform: [{ rotate: `${20 + flap.value * 35}deg` }] }));
  const color = BIRD_COLORS[index % BIRD_COLORS.length];
  return (
    <Animated.View style={[at(0, y, size * 1.6, size), fly]}>
      {/* Back wing, body with a beak, front wing; the wings flap from the shoulder. */}
      <Animated.View style={[at(size * 0.25, size * 0.25, size * 0.7, size * 0.22), { transformOrigin: 'left' }, up]}>
        <View style={[styles.wing, { backgroundColor: color, opacity: 0.75 }]} />
      </Animated.View>
      <View style={[styles.birdBody, at(size * 0.1, size * 0.3, size * 1.0, size * 0.42), { backgroundColor: color, borderRadius: size }]} />
      <View style={[styles.beak, at(size * 1.05, size * 0.42, size * 0.22, size * 0.14)]} />
      <View style={[styles.eye, at(size * 0.85, size * 0.38, size * 0.09, size * 0.09)]} />
      <Animated.View style={[at(size * 0.3, size * 0.35, size * 0.7, size * 0.22), { transformOrigin: 'left' }, down]}>
        <View style={[styles.wing, { backgroundColor: color }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  leaves: { borderWidth: 3, borderColor: '#2E7D32' },
  trunk: { backgroundColor: '#795548', borderWidth: 3, borderColor: OUTLINE, borderRadius: 6 },
  roof: { backgroundColor: '#C0504D', borderWidth: 3, borderColor: OUTLINE },
  house: { backgroundColor: WOOD, borderWidth: 3, borderColor: OUTLINE, overflow: 'hidden' },
  plankLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(0,0,0,0.18)' },
  window: { backgroundColor: '#3E2A1E', borderWidth: 3, borderColor: OUTLINE, borderRadius: 4 },
  sill: { backgroundColor: WOOD_DARK, borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
  door: { backgroundColor: WOOD_DARK, borderWidth: 3, borderColor: OUTLINE, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
  knob: { position: 'absolute', right: '18%', top: '55%', width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFCA28' },
  pole: { backgroundColor: OUTLINE },
  flag: { flex: 1, backgroundColor: '#42A5F5', borderWidth: 2, borderColor: OUTLINE, borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  platform: { backgroundColor: WOOD_DARK, borderWidth: 3, borderColor: OUTLINE, borderRadius: 4 },
  rope: { backgroundColor: '#D7B98E', borderRadius: 2 },
  rung: { backgroundColor: WOOD, borderWidth: 1.5, borderColor: OUTLINE, borderRadius: 3 },
  leg: { backgroundColor: WOOD, borderWidth: 2, borderColor: OUTLINE, borderRadius: 4 },
  beam: { backgroundColor: WOOD_DARK, borderWidth: 3, borderColor: OUTLINE, borderRadius: 4 },
  chain: { position: 'absolute', top: 0, bottom: 4, width: 2, backgroundColor: '#78909C' },
  seatBoard: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, borderWidth: 2, borderColor: OUTLINE, borderRadius: 4 },
  slide: { backgroundColor: '#FFCA28', borderWidth: 3, borderColor: OUTLINE, borderRadius: 10 },
  post: { backgroundColor: WOOD, borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
  platformBoard: { backgroundColor: WOOD_DARK, borderWidth: 3, borderColor: OUTLINE, borderRadius: 4 },
  rail: { backgroundColor: '#66BB6A', borderWidth: 2, borderColor: OUTLINE, borderRadius: 4 },
  fortRoof: { flexDirection: 'row', overflow: 'hidden', borderWidth: 3, borderColor: OUTLINE, borderTopLeftRadius: 60, borderTopRightRadius: 60 },
  trampLeg: { backgroundColor: '#546E7A', borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
  mat: { backgroundColor: '#1E88E5', borderWidth: 3, borderColor: OUTLINE, padding: 4 },
  matInner: { flex: 1, backgroundColor: '#263238' },
  skyTop: { backgroundColor: '#8FD3F4' },
  skyLow: { backgroundColor: '#B9E5F8' },
  cloud: { backgroundColor: '#FFFFFF', borderRadius: 99 },
  hill: { backgroundColor: '#8BC58A' },
  hill2: { backgroundColor: '#7CB87A' },
  fenceRail: { borderWidth: 2, borderColor: OUTLINE },
  picket: { borderWidth: 2, borderColor: OUTLINE },
  tuft: { backgroundColor: '#558B2F', borderRadius: 2 },
  petal: { position: 'absolute', left: 0, top: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: OUTLINE },
  flowerMiddle: { position: 'absolute', left: 4, top: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FB8C00' },
  sun: { backgroundColor: '#FFEB3B', borderWidth: 3, borderColor: '#F9A825' },
  ray: { backgroundColor: '#FFD54F', borderRadius: 2 },
  moon: { backgroundColor: '#FFF9C4', borderWidth: 2, borderColor: '#F0E68C', overflow: 'hidden' },
  moonBite: { backgroundColor: '#4A6A8C' },
  star: { backgroundColor: '#FFF9C4', borderRadius: 2 },
  firefly: { flex: 1, borderRadius: 4, backgroundColor: '#E6FF6E', shadowColor: '#E6FF6E', shadowOpacity: 1, shadowRadius: 6 },
  birdBody: { borderWidth: 1.5, borderColor: '#263238' },
  wing: { flex: 1, borderRadius: 99, borderWidth: 1.5, borderColor: '#263238' },
  beak: { backgroundColor: '#FFA000', borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  eye: { backgroundColor: '#FFFFFF', borderRadius: 4 },
});
