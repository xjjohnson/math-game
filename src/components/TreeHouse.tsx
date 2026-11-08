import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/AppText';
import { Birds } from '@/components/Backyard';
import { BuddyFigure } from '@/components/BuddyFigure';
import type { HomeBuddy } from '@/components/BuddyRoom';
import { Flicker, FloatUp, Lively, type BounceKind } from '@/components/Motion';
import { PersonFigure } from '@/components/PersonFigure';
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

/**
 * Inside the tree house: a cozy hideout with a round window (birds fly past), a telescope,
 * a treasure chest, string lights and a bucket on a rope that brings up snacks. Buddies who
 * climbed up sit on cushions on the floor.
 */
export function TreeHouseInside({ width: w, height: h, buddies, onEvent, onTapBuddy, onClose }: Props) {
  const { animate } = useMotion();
  const [lights, setLights] = useState(true);
  const [chest, setChest] = useState(false);
  const [sight, setSight] = useState<number | null>(null);
  const [pop, setPop] = useState<{ id: number; x: number; y: number; emoji: string } | null>(null);
  const [bumps, setBumps] = useState<Record<string, { n: number; kind: BounceKind }>>({});
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

  const floor = h * 0.8;
  const top = Math.max(h * 0.16, 64);
  const win = { left: w * 0.08, top: top + h * 0.08, size: Math.min(w * 0.3, h * 0.32) };
  const chestBox = { left: w * 0.6, top: floor - h * 0.15, width: Math.min(w * 0.22, h * 0.26), height: h * 0.15 };
  const rope = { x: w * 0.92, bottom: floor - h * 0.32 };

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
      popAt(chestBox.left + chestBox.width / 2, chestBox.top, emoji);
      hopAll('hop');
    }
    onEvent({ kind: 'chest', open: now, treasure: name });
  };
  const pullBucket = () => {
    const [emoji, name] = SNACKS[turns.current.snack++ % SNACKS.length];
    const down = h * 0.5;
    if (animate) {
      bucket.value = withSequence(
        withTiming(down, { duration: 600, easing: Easing.in(Easing.quad) }),
        withTiming(down, { duration: 250 }),
        withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) }),
      );
    }
    later(() => popAt(rope.x, rope.bottom - h * 0.02, emoji), animate ? 1650 : 0);
    onEvent({ kind: 'bucket', snack: name });
  };
  const bucketLook = useAnimatedStyle(() => ({ transform: [{ translateY: bucket.value }] }));

  const n = buddies.length;
  const bulbs = Math.max(8, Math.round(w / 45));
  const fig = Math.min(h * 0.26, (w * 0.5) / Math.max(1, n));

  return (
    <View style={[StyleSheet.absoluteFill, styles.inside]} accessibilityLabel="Inside the tree house">
      {/* Plank walls, a beam across the roof, and a plank floor. */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={[styles.plank, { backgroundColor: PLANKS[i % 2] }]} />
        ))}
      </View>
      {!lights ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim]} /> : null}
      <View style={[styles.beam, at(0, top - h * 0.03, w, h * 0.04)]} />
      <View style={[styles.floor, at(0, floor, w, h - floor)]} />

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

      {/* Telescope on a tripod, pointing out of the window. */}
      <Pressable
        onPress={lookOut}
        accessibilityRole="button"
        accessibilityLabel="Look through the telescope"
        style={at(win.left + win.size * 0.75, win.top + win.size * 0.55, w * 0.2, floor - win.top - win.size * 0.55)}
      >
        <View style={[styles.tripod, at(w * 0.08, h * 0.06, 4, floor - win.top - win.size * 0.55 - h * 0.06), { transform: [{ rotate: '12deg' }] }]} />
        <View style={[styles.tripod, at(w * 0.11, h * 0.06, 4, floor - win.top - win.size * 0.55 - h * 0.06), { transform: [{ rotate: '-12deg' }] }]} />
        <View style={[styles.tube, at(0, 0, w * 0.18, h * 0.06), { transform: [{ rotate: '-25deg' }] }]}>
          <View style={styles.tubeEnd} />
        </View>
      </Pressable>

      {/* The club sign. */}
      <View style={[styles.sign, at(w * 0.5, top + h * 0.07, Math.min(w * 0.3, 190), h * 0.13)]}>
        <Text style={styles.signText} numberOfLines={2} adjustsFontSizeToFit>
          {'⭐ Buddy\nClub ⭐'}
        </Text>
      </View>

      {/* String lights under the beam: tap to switch them. */}
      <Pressable
        onPress={() => {
          setLights(!lights);
          onEvent({ kind: 'lights', on: !lights });
        }}
        accessibilityRole="button"
        accessibilityLabel={lights ? 'Turn off the lights' : 'Turn on the lights'}
        style={at(0, top, w, h * 0.06)}
      >
        <View style={[styles.wire, at(0, h * 0.01, w, 2)]} />
        {Array.from({ length: bulbs }, (_, i) => {
          const x = ((i + 0.5) * w) / bulbs;
          const sag = Math.sin(((i + 0.5) / bulbs) * Math.PI) * h * 0.02;
          const bulb = (
            <View style={[styles.bulb, { backgroundColor: lights ? BULBS[i % BULBS.length] : '#9E9E9E' }, lights && styles.bulbLit]} />
          );
          return (
            <View key={i} style={at(x - 6, h * 0.01 + sag, 12, 16)}>
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

      {/* A bucket on a rope out of a hole in the floor: pull it to bring up a snack. */}
      <View style={[styles.hole, at(rope.x - w * 0.06, floor, w * 0.12, h * 0.04)]} />
      <Pressable onPress={pullBucket} accessibilityRole="button" accessibilityLabel="Pull up the snack bucket" style={at(rope.x - w * 0.07, top, w * 0.14, rope.bottom - top + h * 0.12)}>
        <View style={[styles.pulley, at(w * 0.07 - 9, -4, 18, 18)]} />
        <Animated.View style={[at(0, 0, w * 0.14, rope.bottom - top + h * 0.12), bucketLook]}>
          <View style={[styles.ropeLine, at(w * 0.07 - 1.5, 6, 3, rope.bottom - top - 6)]} />
          <View style={[styles.bucket, at(w * 0.02, rope.bottom - top, w * 0.1, h * 0.1)]}>
            <View style={styles.bucketBand} />
          </View>
        </Animated.View>
      </Pressable>

      {/* The treasure chest. */}
      <Pressable onPress={openChest} accessibilityRole="button" accessibilityLabel={chest ? 'Shut the treasure chest' : 'Open the treasure chest'} style={at(chestBox.left, chestBox.top - chestBox.height * 0.5, chestBox.width, chestBox.height * 1.5)}>
        {chest ? <View style={[styles.gold, at(chestBox.width * 0.1, chestBox.height * 0.45, chestBox.width * 0.8, chestBox.height * 0.25)]} /> : null}
        <View style={[styles.lid, at(0, chest ? 0 : chestBox.height * 0.35, chestBox.width, chestBox.height * (chest ? 0.3 : 0.4)), chest && { transform: [{ skewX: '-10deg' }] }]} />
        <View style={[styles.chest, at(0, chestBox.height * 0.7, chestBox.width, chestBox.height * 0.8)]}>
          <View style={styles.lock} />
        </View>
      </Pressable>

      {/* Cushions, and the buddies who climbed up sitting on them. */}
      {buddies.map((b, i) => {
        const x = w * 0.36 + (i - (n - 1) / 2) * fig * 0.95;
        const bump = bumps[b.id];
        return (
          <View key={b.id} style={at(x - fig / 2, floor + h * 0.06 - fig, fig, fig)}>
            <View style={[styles.cushion, at(fig * 0.05, fig * 0.82, fig * 0.9, fig * 0.22), { backgroundColor: BULBS[(i + 2) % BULBS.length], borderRadius: fig }]} />
            <Pressable
              onPress={() => {
                setBumps((all) => ({ ...all, [b.id]: { n: (all[b.id]?.n ?? 0) + 1, kind: 'hop' } }));
                onTapBuddy(b.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={b.name}
              style={StyleSheet.absoluteFill}
            >
              <Lively height={fig} seed={b.id} breathe bounce={bump?.n} bounceKind={bump?.kind} style={StyleSheet.absoluteFill}>
                {b.person ? (
                  <PersonFigure look={b.person.look} size={fig} dressed={b.person.dressed} gift={b.gift} alive wave={bump?.n} />
                ) : (
                  <BuddyFigure value={b.emoji} size={fig} fur={b.fur} belly={b.belly} dressed={b.dressed} gift={b.gift} wave={bump?.n} />
                )}
              </Lively>
            </Pressable>
          </View>
        );
      })}

      {n === 0 ? (
        <Pressable
          onPress={() => onEvent({ kind: 'callUp' })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.callUp, at(w * 0.25, floor - h * 0.2, w * 0.5, h * 0.11), pressed && { opacity: 0.8 }]}
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
        style={({ pressed }) => [styles.down, at(12, floor + (h - floor) * 0.18, Math.min(170, w * 0.4), Math.min(52, (h - floor) * 0.7)), pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.downText} numberOfLines={1} adjustsFontSizeToFit>
          ⬇️ Climb down
        </Text>
      </Pressable>

      {pop ? (
        <FloatUp key={pop.id} rise={h * 0.14} duration={POP_MS} style={at(pop.x - 24, pop.y - 50, 48, 50)}>
          <Text style={{ fontSize: 36 }}>{pop.emoji}</Text>
        </FloatUp>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inside: { backgroundColor: '#B07A4F', overflow: 'hidden' },
  plank: { flex: 1, borderRightWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  dim: { backgroundColor: 'rgba(16, 18, 52, 0.45)' },
  beam: { backgroundColor: '#6D4C41', borderWidth: 3, borderColor: OUTLINE },
  floor: { backgroundColor: '#8A5A36', borderTopWidth: 4, borderColor: OUTLINE },
  window: { overflow: 'hidden', borderWidth: 6, borderColor: '#6D4C41' },
  cross: { backgroundColor: '#6D4C41' },
  sight: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  tripod: { backgroundColor: '#4E342E' },
  tube: { backgroundColor: '#FFCA28', borderWidth: 3, borderColor: OUTLINE, borderRadius: 8, transformOrigin: 'right' },
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
  callUp: { backgroundColor: '#FFF8E7', borderWidth: 3, borderColor: OUTLINE, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  callUpText: { fontSize: 20, fontWeight: '800', color: '#5B3A24' },
  down: { backgroundColor: '#FFF8E7', borderWidth: 3, borderColor: OUTLINE, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  downText: { fontSize: 18, fontWeight: '800', color: '#5B3A24' },
});
