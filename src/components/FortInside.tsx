import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, type ScrollViewInstance, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Polygon } from 'react-native-svg';

import { Text } from '@/components/AppText';
import { BlanketSheet } from '@/components/BlanketFort';
import { BuddyFigure } from '@/components/BuddyFigure';
import { GroundShadow } from '@/components/GroundShadow';
import type { HomeBuddy } from '@/components/BuddyRoom';
import { Drifting, Flicker, FloatUp, Glide, Lively, type BounceKind } from '@/components/Motion';
import { PersonFigure } from '@/components/PersonFigure';
import { INK } from '@/constants/artStyle';
import { BLANKETS, findBlanket, type BlanketId, type FortExtra, type FortExtraId } from '@/constants/fort';
import { BUDDY_SIZE } from '@/constants/room';
import { useMotion } from '@/hooks/useAccessibility';
import { useMultiDrag } from '@/hooks/useMultiDrag';

/** What happened inside the fort, for the buddy's speech bubble. */
export type FortEvent =
  | { kind: 'open' }
  | { kind: 'pillows' }
  | { kind: 'book'; story: string }
  | { kind: 'cocoa' }
  | { kind: 'flashlight'; on: boolean }
  | { kind: 'puppet'; name: string }
  | { kind: 'lights'; on: boolean }
  | { kind: 'sleep'; on: boolean }
  | { kind: 'wobble' }
  | { kind: 'collapse' }
  | { kind: 'rebuild' }
  | { kind: 'blanket'; name: string }
  | { kind: 'callIn' }
  | { kind: 'out' };

/** Stories read by flashlight, one after another. */
export const FORT_STORIES = ['a story about a brave little dragon', 'a story about a pirate ship', 'a story about a sleepy bear', 'a story about a rocket to the moon', 'a story about a secret garden'];

/** The shadow puppets the flashlight makes on the blanket wall. */
type Puppet = 'dog' | 'bird' | 'bunny';
const PUPPETS: [Puppet, string][] = [
  ['dog', 'a barking dog'],
  ['bird', 'a flying bird'],
  ['bunny', 'a hopping bunny'],
];

const OUTLINE = INK;
const BULBS = ['#FF5252', '#FFD740', '#69F0AE', '#40C4FF', '#E040FB'];
const POP_MS = 1300;
/** How many phone screens wide the fort is inside; the tunnel room adds one more. */
const SPAN = 1.5;
const TUNNEL_SPAN = 1;
/** Pokes at the tent pole, close together, that bring the blanket down. */
const POKES_TO_FALL = 3;
const POKE_GAP_MS = 2500;

interface Props {
  width: number;
  height: number;
  blanket: BlanketId;
  /** Buddies inside the fort. */
  buddies: HomeBuddy[];
  /** What the player's stars have unlocked inside. */
  extras: ReadonlySet<FortExtraId>;
  /** The next thing stars will unlock, to show what's coming. */
  next: FortExtra | null;
  onEvent: (e: FortEvent) => void;
  onBlanket: (blanket: BlanketId) => void;
  onTapBuddy: (id: string) => void;
  onClose: () => void;
}

function at(left: number, top: number, width: number, height: number): ViewStyle {
  return { position: 'absolute', left, top, width, height };
}

interface Spot {
  x: number;
  y: number;
}

/** A shadow puppet: a plain dark shape, our own simple drawing. */
function PuppetShadow({ kind, size }: { kind: Puppet; size: number }) {
  const fill = 'rgba(25, 18, 24, 0.85)';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {kind === 'dog' ? (
        <>
          <Ellipse cx={46} cy={56} rx={26} ry={20} fill={fill} />
          <Ellipse cx={76} cy={64} rx={18} ry={9} fill={fill} />
          <Path d="M28,44 Q20,18 40,30 Z" fill={fill} />
          <Path d="M60,74 L74,86 L52,80 Z" fill={fill} />
        </>
      ) : kind === 'bird' ? (
        <>
          <Ellipse cx={50} cy={58} rx={20} ry={11} fill={fill} />
          <Path d="M44,54 Q30,20 8,26 Q28,40 40,60 Z" fill={fill} />
          <Path d="M56,54 Q70,20 92,26 Q72,40 60,60 Z" fill={fill} />
          <Polygon points="68,56 80,60 68,62" fill={fill} />
        </>
      ) : (
        <>
          <Circle cx={50} cy={64} r={20} fill={fill} />
          <Ellipse cx={40} cy={30} rx={7} ry={20} fill={fill} />
          <Ellipse cx={60} cy={30} rx={7} ry={20} fill={fill} />
        </>
      )}
    </Svg>
  );
}

/**
 * Inside the blanket fort: a cozy, dim hideout under the blanket, wider than the screen. A
 * pillow pile to bounce on, a flashlight to shine about, a book and hot cocoa; stars unlock
 * string lights, shadow puppets, glow stars with a sleepover, and a tunnel to a second room.
 * Poke the tent pole too much and the blanket falls down on everyone.
 */
export function FortInside({ width: w, height: h, blanket, buddies, extras, next, onEvent, onBlanket, onTapBuddy, onClose }: Props) {
  const { animate } = useMotion();
  const [lights, setLights] = useState(true);
  const [torch, setTorch] = useState(false);
  const [beam, setBeam] = useState<Spot | null>(null);
  const [puppet, setPuppet] = useState<number | null>(null);
  const [asleep, setAsleep] = useState(false);
  const [fallen, setFallen] = useState(false);
  const [canRebuild, setCanRebuild] = useState(false);
  const [picker, setPicker] = useState(false);
  const [pop, setPop] = useState<{ id: number; x: number; y: number; emoji: string } | null>(null);
  const [bumps, setBumps] = useState<Record<string, { n: number; kind: BounceKind }>>({});
  const [spots, setSpots] = useState<Record<string, Spot>>({});
  const scroller = useRef<ScrollViewInstance>(null);
  const turns = useRef({ story: 0, puppet: 0, pop: 0, pokes: [] as number[] });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pole = useSharedValue(0);
  const sheet = useSharedValue(0);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => onEvent({ kind: 'open' }), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  const popAt = (x: number, y: number, emoji: string) => {
    const id = ++turns.current.pop;
    setPop({ id, x, y, emoji });
    later(() => setPop((p) => (p?.id === id ? null : p)), POP_MS);
  };
  const hopAll = (kind: BounceKind) =>
    setBumps((b) => Object.fromEntries(buddies.map((x) => [x.id, { n: (b[x.id]?.n ?? 0) + 1, kind }])));

  const tunnel = extras.has('tunnel');
  const unit = Math.round(Math.min(h, w * 1.15));
  const screen = Math.round(unit * 1.05);
  const mainW = Math.max(w, Math.round(screen * SPAN));
  const cw = tunnel ? mainW + Math.round(screen * TUNNEL_SPAN) : mainW;
  const fig = Math.round(BUDDY_SIZE * unit);
  const floor = Math.round(h * 0.66);
  // Below the name tag and speech bubble along the top of the screen.
  const top = Math.min(floor * 0.45, Math.max(h * 0.2, 150));
  const pileBox = { left: screen * 0.06, width: unit * 0.42, height: unit * 0.2 };
  const poleX = mainW * 0.55;
  const book = { left: screen * 0.78, width: unit * 0.13, height: unit * 0.08 };
  const mug = { left: mainW - screen * 0.2, width: unit * 0.08, height: unit * 0.09 };
  const moon = { left: screen * 0.62, top: top + unit * 0.12, size: unit * 0.13 };
  const other: BlanketId = BLANKETS[(BLANKETS.findIndex((b) => b.id === blanket) + 2) % BLANKETS.length].id;

  const spotOf = (id: string, i: number): Spot =>
    spots[id] ?? { x: screen * 0.5 + ((i + 0.5) * (mainW - screen * 0.7)) / Math.max(1, buddies.length), y: floor + (h - floor) * (i % 2 ? 0.62 : 0.3) };
  const clampSpot = (s: Spot): Spot => ({
    x: Math.min(cw - fig * 0.4, Math.max(fig * 0.4, s.x)),
    y: Math.min(h - 8, Math.max(floor + 6, s.y)),
  });

  const bounce = () => {
    hopAll('hop');
    popAt(pileBox.left + pileBox.width / 2, floor - pileBox.height, '🪶');
    onEvent({ kind: 'pillows' });
  };
  const read = () => {
    const story = FORT_STORIES[turns.current.story++ % FORT_STORIES.length];
    popAt(book.left + book.width / 2, floor - book.height, '📖');
    onEvent({ kind: 'book', story });
  };
  const sip = () => {
    popAt(mug.left + mug.width / 2, floor - mug.height, '♨️');
    onEvent({ kind: 'cocoa' });
  };
  const toggleTorch = () => {
    const on = !torch;
    setTorch(on);
    setPuppet(null);
    if (on && !beam) setBeam({ x: w / 2, y: floor * 0.55 });
    onEvent({ kind: 'flashlight', on });
  };
  const nextPuppet = () => {
    if (!torch) {
      setTorch(true);
      if (!beam) setBeam({ x: w / 2, y: floor * 0.55 });
    }
    const i = turns.current.puppet++ % PUPPETS.length;
    setPuppet(i);
    onEvent({ kind: 'puppet', name: PUPPETS[i][1] });
  };
  const toggleSleep = () => {
    const on = !asleep;
    setAsleep(on);
    if (on) setTorch(false);
    onEvent({ kind: 'sleep', on });
  };

  // Poking the tent pole wobbles it; a few quick pokes and down comes the blanket.
  const poke = () => {
    if (fallen) return;
    const now = Date.now();
    const pokes = [...turns.current.pokes.filter((t) => now - t < POKE_GAP_MS), now];
    turns.current.pokes = pokes;
    if (animate) pole.value = withSequence(withTiming(1, { duration: 90 }), withTiming(-1, { duration: 140 }), withSpring(0, { damping: 5 }));
    if (pokes.length < POKES_TO_FALL) return onEvent({ kind: 'wobble' });
    turns.current.pokes = [];
    setFallen(true);
    setCanRebuild(false);
    setPicker(false);
    sheet.value = animate ? withTiming(1, { duration: 650, easing: Easing.in(Easing.quad) }) : 1;
    later(() => hopAll('wiggle'), animate ? 700 : 0);
    later(() => hopAll('wiggle'), animate ? 1300 : 0);
    later(() => setCanRebuild(true), animate ? 1500 : 0);
    onEvent({ kind: 'collapse' });
  };
  const rebuild = () => {
    sheet.value = animate ? withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }) : 0;
    later(() => {
      setFallen(false);
      hopAll('land');
    }, animate ? 520 : 0);
    setCanRebuild(false);
    onEvent({ kind: 'rebuild' });
  };
  const poleLook = useAnimatedStyle(() => ({ transform: [{ rotate: `${pole.value * 4}deg` }] }));
  const sheetLook = useAnimatedStyle(() => ({ transform: [{ translateY: (sheet.value - 1) * h }] }));

  const dim = asleep ? 0.55 : lights && extras.has('lights') ? 0.18 : 0.35;
  const bulbs = Math.max(8, Math.round(mainW / 45));
  const beamR = unit * 0.26;
  const placed = buddies.map((b, i) => ({ b, i, spot: spotOf(b.id, i) })).sort((a, c) => a.spot.y - c.spot.y);
  const touch = useMultiDrag({
    items: placed.map(({ b, spot }) => ({ id: b.id, left: spot.x - fig / 2, top: spot.y - fig, width: fig, height: fig, spot })),
    roomW: cw,
    viewW: w,
    scroller,
    onLetGo: (id, moved, spot) => {
      if (!moved) {
        setBumps((all) => ({ ...all, [id]: { n: (all[id]?.n ?? 0) + 1, kind: 'hop' } }));
        onTapBuddy(id);
        return;
      }
      setSpots((all) => ({ ...all, [id]: clampSpot(spot) }));
    },
  });
  const glowStars = extras.has('sleepover')
    ? Array.from({ length: Math.round(cw / 60) }, (_, i) => ({ x: ((i + 0.3) * cw) / Math.round(cw / 60), y: top + unit * 0.04 + ((i * 37) % 5) * unit * 0.035 }))
    : [];

  return (
    <View
      ref={touch.frameRef as never}
      onLayout={touch.measure}
      style={[StyleSheet.absoluteFill, styles.inside]}
      accessibilityLabel="Inside the blanket fort"
    >
      <ScrollView
        ref={scroller}
        horizontal
        scrollEnabled={!touch.holding}
        onScroll={touch.onScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ width: cw, height: h }}
      >
        {/* The blanket overhead and all around, sagging between the chairs. */}
        <BlanketSheet blanket={blanket} width={mainW} height={floor} cell={unit * 0.16} style={at(0, 0, mainW, floor)} />
        {tunnel ? <BlanketSheet blanket={other} width={cw - mainW} height={floor} cell={unit * 0.16} style={at(mainW, 0, cw - mainW, floor)} /> : null}
        <View pointerEvents="none" style={[styles.sag, at(0, top - unit * 0.1, cw, unit * 0.12)]} />

        {/* Shining the flashlight: drag anywhere on the blanket wall to move the light. */}
        <View
          style={at(0, top + unit * 0.06, cw, floor - top - unit * 0.06)}
          onStartShouldSetResponder={() => torch}
          onMoveShouldSetResponder={() => torch}
          onResponderGrant={(e) => setBeam({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY + top + unit * 0.06 })}
          onResponderMove={(e) => setBeam({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY + top + unit * 0.06 })}
        />

        {/* The floor. */}
        <View style={[styles.floor, at(0, floor, cw, h - floor)]} />

        {/* The tunnel through to the second room. */}
        {tunnel ? (
          <View pointerEvents="none" style={[styles.tunnel, at(mainW - unit * 0.08, floor - unit * 0.34, unit * 0.16, unit * 0.36)]} />
        ) : null}

        {/* The tent pole holding the middle up: poke it and it wobbles... */}
        <Pressable onPress={poke} accessibilityRole="button" accessibilityLabel="Poke the tent pole" style={at(poleX - unit * 0.05, top - unit * 0.06, unit * 0.1, floor - top + unit * 0.08)}>
          <Animated.View style={[styles.pole, at(unit * 0.05 - 5, 0, 10, floor - top + unit * 0.08), poleLook, { transformOrigin: 'bottom' }]} />
        </Pressable>

        {/* The pillow pile. */}
        <Pressable
          onPress={bounce}
          accessibilityRole="button"
          accessibilityLabel="Bounce on the pillow pile"
          style={at(pileBox.left, floor - pileBox.height * 0.7, pileBox.width, pileBox.height)}
        >
          {[
            [0, 0.4, '#F7C6D9'],
            [0.36, 0.45, '#BFE3F7'],
            [0.66, 0.42, '#FFFDF8'],
            [0.18, 0.05, '#FFE08A'],
            [0.5, 0.06, '#C3E8C0'],
          ].map(([x, y, c], i) => (
            <View
              key={i}
              style={[styles.pillow, at(pileBox.width * (x as number), pileBox.height * (y as number), pileBox.width * 0.36, pileBox.height * 0.5), { backgroundColor: c as string }]}
            />
          ))}
        </Pressable>

        {/* A storybook and a mug of hot cocoa. */}
        <Pressable onPress={read} accessibilityRole="button" accessibilityLabel="Read a story by flashlight" style={at(book.left, floor - book.height * 0.6, book.width, book.height)}>
          <View style={[styles.book, StyleSheet.absoluteFill]}>
            <View style={styles.spine} />
          </View>
        </Pressable>
        <Pressable onPress={sip} accessibilityRole="button" accessibilityLabel="Sip hot cocoa" style={at(mug.left, floor - mug.height * 0.8, mug.width * 1.3, mug.height)}>
          <View style={[styles.mug, at(0, 0, mug.width, mug.height)]} />
          <View style={[styles.handle, at(mug.width * 0.85, mug.height * 0.2, mug.width * 0.4, mug.height * 0.45)]} />
        </Pressable>

        {/* Dim under the blanket; lights, glow stars, the flashlight and the buddies show above it. */}
        <View pointerEvents="none" style={[at(0, 0, cw, h), { backgroundColor: `rgba(16, 18, 52, ${dim})` }]} />

        {glowStars.map((s, i) => (
          <View key={i} pointerEvents="none" style={at(s.x - 7, s.y - 7, 14, 14)}>
            <Text style={[styles.glowStar, { opacity: asleep ? 1 : 0.7 }]}>★</Text>
          </View>
        ))}

        {/* The sleepover moon (stars unlock it): everyone snuggles down to sleep. */}
        {extras.has('sleepover') ? (
          <Pressable
            onPress={toggleSleep}
            accessibilityRole="button"
            accessibilityLabel={asleep ? 'Wake everyone up' : 'Have a sleepover'}
            style={[styles.moon, at(moon.left, moon.top, moon.size, moon.size), { borderRadius: moon.size }]}
          >
            <Text style={{ fontSize: Math.round(moon.size * 0.6) }}>{asleep ? '☀️' : '🌙'}</Text>
          </Pressable>
        ) : null}

        {/* String lights along the top (stars unlock them). */}
        {extras.has('lights') ? (
          <Pressable
            onPress={() => {
              setLights(!lights);
              onEvent({ kind: 'lights', on: !lights });
            }}
            accessibilityRole="button"
            accessibilityLabel={lights ? 'Turn off the string lights' : 'Turn on the string lights'}
            style={at(0, top, mainW, unit * 0.07)}
          >
            <View style={[styles.wire, at(0, unit * 0.01, mainW, 2)]} />
            {Array.from({ length: bulbs }, (_, i) => {
              const x = ((i + 0.5) * mainW) / bulbs;
              const sag = Math.abs(Math.sin(((i + 0.5) / bulbs) * Math.PI * 3)) * unit * 0.02;
              const bulb = <View style={[styles.bulb, { backgroundColor: lights ? BULBS[i % BULBS.length] : '#9E9E9E' }]} />;
              return (
                <View key={i} style={at(x - 6, unit * 0.01 + sag, 12, 16)}>
                  {lights ? (
                    <Flicker seed={`fort-bulb-${i}`} style={{ flex: 1 }}>
                      {bulb}
                    </Flicker>
                  ) : (
                    bulb
                  )}
                </View>
              );
            })}
          </Pressable>
        ) : null}

        {/* The flashlight's pool of light, and a shadow puppet in it. */}
        {torch && beam ? (
          <View pointerEvents="none" style={[styles.beam, at(beam.x - beamR, beam.y - beamR, beamR * 2, beamR * 2), { borderRadius: beamR }]}>
            {puppet !== null ? <PuppetShadow kind={PUPPETS[puppet][0]} size={beamR * 1.5} /> : null}
          </View>
        ) : null}

        <View style={at(0, 0, cw, h)} pointerEvents="box-none" {...touch.handlers}>
        {placed.map(({ b, i, spot: home }) => {
          const bump = bumps[b.id];
          const held = !!touch.dragAt[b.id];
          const spot = touch.dragAt[b.id] ? clampSpot(touch.dragAt[b.id]) : home;
          const sleeping = asleep && !held;
          return (
            <Glide
              key={b.id}
              left={spot.x - fig / 2}
              top={spot.y - fig}
              instant={held}
              dangle
              land
              grow={held ? 1.08 : 1}
              style={[{ width: fig, height: fig }, held && styles.raised]}
            >
              <View
                accessible
                accessibilityLabel={`${b.name}. Drag to move`}
                style={StyleSheet.absoluteFill}
              >
                <GroundShadow width={fig * 0.42} hidden={held} style={{ left: fig / 2 - fig * 0.21, bottom: -fig * 0.035 }} />
                <Lively height={fig} seed={b.id} breathe={!held} asleep={sleeping} bounce={bump?.n} bounceKind={bump?.kind} style={StyleSheet.absoluteFill}>
                  {b.person ? (
                    <PersonFigure look={b.person.look} size={fig} dressed={b.person.dressed} gift={b.gift} alive asleep={sleeping} mood={held ? 'happy' : b.mood} wave={bump?.kind === 'hop' ? bump.n : undefined} />
                  ) : (
                    <BuddyFigure value={b.emoji} size={fig} fur={b.fur} belly={b.belly} dressed={b.dressed} gift={b.gift} mood={held ? 'happy' : b.mood} wave={bump?.kind === 'hop' ? bump.n : undefined} />
                  )}
                </Lively>
                {sleeping ? (
                  <Drifting rise={fig * 0.25} style={styles.zzz}>
                    <Text style={{ fontSize: Math.round(fig * 0.3) }}>💤</Text>
                  </Drifting>
                ) : null}
              </View>
            </Glide>
          );
        })}
        </View>

        {pop ? (
          <FloatUp key={pop.id} rise={unit * 0.14} duration={POP_MS} style={at(pop.x - 24, pop.y - 50, 48, 50)}>
            <Text style={{ fontSize: 36 }}>{pop.emoji}</Text>
          </FloatUp>
        ) : null}

        {/* Down comes the blanket! Lumps wiggle where the buddies are underneath. */}
        {fallen ? (
          <Animated.View pointerEvents="none" style={[at(0, 0, cw, h), sheetLook]}>
            <BlanketSheet blanket={blanket} width={cw} height={h} cell={unit * 0.16} style={at(0, 0, cw, h)} />
            {placed.map(({ b, spot }) => (
              <Lively key={b.id} height={fig} seed={`lump-${b.id}`} bounce={bumps[b.id]?.n} bounceKind="wiggle" style={at(spot.x - fig * 0.4, spot.y - fig * 0.7, fig * 0.8, fig * 0.7)}>
                <View style={[styles.lump, StyleSheet.absoluteFill, { borderRadius: fig }]} />
              </Lively>
            ))}
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* The buttons along the top: flashlight, puppets, blankets, and what stars unlock next. */}
      {!fallen ? (
        <View style={[styles.tools, { left: Math.min(170, w * 0.42) + 20, top: h - 62 }]} pointerEvents="box-none">
          <Pressable onPress={toggleTorch} accessibilityRole="button" accessibilityLabel={torch ? 'Turn off the flashlight' : 'Turn on the flashlight'} style={[styles.tool, torch && styles.toolOn]}>
            <Text style={styles.toolText}>🔦</Text>
          </Pressable>
          {extras.has('puppets') ? (
            <Pressable onPress={nextPuppet} accessibilityRole="button" accessibilityLabel="Make a shadow puppet" style={styles.tool}>
              <Text style={styles.toolText}>🤚</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setPicker(!picker)} accessibilityRole="button" accessibilityLabel="Change the blanket" style={[styles.tool, picker && styles.toolOn]}>
            <Text style={styles.toolText}>🎨</Text>
          </Pressable>
        </View>
      ) : null}
      {picker && !fallen ? (
        <ScrollView horizontal style={[styles.picker, { top: h - 130 }]} contentContainerStyle={styles.pickerRow}>
          {BLANKETS.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => {
                onBlanket(b.id);
                setPicker(false);
                onEvent({ kind: 'blanket', name: findBlanket(b.id)?.name ?? b.name });
              }}
              accessibilityRole="button"
              accessibilityLabel={b.name}
              accessibilityState={{ selected: b.id === blanket }}
              style={[styles.swatch, b.id === blanket && styles.swatchOn]}
            >
              <BlanketSheet blanket={b.id} width={52} height={40} cell={14} style={styles.swatchCloth} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {next && !fallen ? (
        <View pointerEvents="none" style={[styles.next, { right: 12, top: floor + 8 }]}>
          <Text style={styles.nextText} numberOfLines={2} adjustsFontSizeToFit>
            {`🔒 ⭐ ${next.stars}: ${next.name}`}
          </Text>
        </View>
      ) : null}
      {fallen && canRebuild ? (
        <Pressable onPress={rebuild} accessibilityRole="button" style={({ pressed }) => [styles.callUp, at(w * 0.15, h * 0.4, w * 0.7, 60), pressed && { opacity: 0.8 }]}>
          <Text style={styles.callUpText} numberOfLines={1} adjustsFontSizeToFit>
            ⛺ Put the fort back up!
          </Text>
        </Pressable>
      ) : null}

      {buddies.length === 0 && !fallen ? (
        <Pressable
          onPress={() => onEvent({ kind: 'callIn' })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.callUp, at(w * 0.15, floor + (h - floor) * 0.2, w * 0.7, Math.min(60, (h - floor) * 0.4)), pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.callUpText} numberOfLines={1} adjustsFontSizeToFit>
            🧸 Call the buddies in!
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => {
          onEvent({ kind: 'out' });
          onClose();
        }}
        accessibilityRole="button"
        accessibilityLabel="Crawl out of the fort"
        style={({ pressed }) => [styles.callUp, at(12, h - 64, Math.min(170, w * 0.42), 52), pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.downText} numberOfLines={1} adjustsFontSizeToFit>
          ⬅️ Crawl out
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inside: { backgroundColor: '#3A2A33', overflow: 'hidden' },
  sag: { backgroundColor: 'rgba(0,0,0,0.18)', borderBottomLeftRadius: 999, borderBottomRightRadius: 999 },
  floor: { backgroundColor: '#8C6D5A', borderTopWidth: 4, borderColor: OUTLINE },
  tunnel: { backgroundColor: '#1E1418', borderWidth: 3, borderColor: OUTLINE, borderTopLeftRadius: 999, borderTopRightRadius: 999 },
  pole: { backgroundColor: '#C08A5B', borderWidth: 2, borderColor: OUTLINE, borderRadius: 4 },
  pillow: { position: 'absolute', borderWidth: 2.5, borderColor: OUTLINE, borderRadius: 18 },
  book: { backgroundColor: '#E8473F', borderWidth: 2.5, borderColor: OUTLINE, borderRadius: 3, transform: [{ rotate: '-6deg' }] },
  spine: { position: 'absolute', left: '46%', top: 0, bottom: 0, width: 3, backgroundColor: '#FFFDF8' },
  mug: { backgroundColor: '#3A86E8', borderWidth: 2.5, borderColor: OUTLINE, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  handle: { borderWidth: 3, borderColor: OUTLINE, borderRadius: 99, borderLeftWidth: 0 },
  beam: { backgroundColor: 'rgba(255, 240, 180, 0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  glowStar: { fontSize: 13, color: '#D6FFB8', textShadowColor: '#B9FF8C', textShadowRadius: 6 },
  moon: { backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 3, borderColor: OUTLINE, alignItems: 'center', justifyContent: 'center' },
  wire: { backgroundColor: '#3E2723' },
  bulb: { flex: 1, borderRadius: 6, borderWidth: 1.5, borderColor: '#3E2723' },
  lump: { backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 2, borderColor: 'rgba(78,51,36,0.35)' },
  zzz: { position: 'absolute', top: -10, right: 0 },
  raised: { zIndex: 5 },
  tools: { position: 'absolute', right: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'flex-end' },
  tool: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF8E7', borderWidth: 3, borderColor: OUTLINE, alignItems: 'center', justifyContent: 'center' },
  toolOn: { backgroundColor: '#FFE08A' },
  toolText: { fontSize: 22 },
  next: { position: 'absolute', backgroundColor: 'rgba(255,248,231,0.92)', borderRadius: 14, borderWidth: 2, borderColor: OUTLINE, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 200 },
  nextText: { fontSize: 14, fontWeight: '800', color: '#5B3A24' },
  picker: { position: 'absolute', left: 0, right: 0, maxHeight: 64 },
  pickerRow: { gap: 10, paddingHorizontal: 12, alignItems: 'center' },
  swatch: { width: 60, height: 48, borderRadius: 12, borderWidth: 3, borderColor: OUTLINE, overflow: 'hidden', backgroundColor: '#FFF8E7' },
  swatchOn: { borderColor: '#FFD54F', borderWidth: 4 },
  swatchCloth: { position: 'absolute', left: 0, top: 0 },
  callUp: { backgroundColor: '#FFF8E7', borderWidth: 3, borderColor: OUTLINE, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  callUpText: { fontSize: 20, fontWeight: '800', color: '#5B3A24' },
  downText: { fontSize: 18, fontWeight: '800', color: '#5B3A24' },
});
