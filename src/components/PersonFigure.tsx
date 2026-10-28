import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Text } from '@/components/AppText';
import { useArmWave, useBlink } from '@/components/Motion';
import {
  HAIR_COLORS,
  SKIN_TONES,
  type LegsCut,
  type Pattern,
  type PersonLook,
  type TopCut,
} from '@/constants/wardrobe';

/** A piece of clothing ready to draw. */
export interface Cloth {
  color: string;
  cut?: TopCut | LegsCut;
  pattern?: Pattern;
  patternColor?: string;
}

/** What a person has on, ready to draw. */
export interface PersonDressed {
  hat?: string;
  face?: string;
  neck?: string;
  feet?: string;
  top?: Cloth;
  legs?: Cloth;
}

interface Props {
  look: PersonLook;
  /** Height (and width) of the box the person stands in. */
  size: number;
  dressed: PersonDressed;
  gift?: string | null;
  /** Blinks now and then, for people living in the home. */
  alive?: boolean;
  /** Eyes shut, for sleeping on a bed. */
  asleep?: boolean;
  /** Change this number to wave once. */
  wave?: number;
}

const LINE = '#3B2B25';
const UNDERSHIRT = '#FAFAFA';
const UNDERWEAR = '#E3E3E3';
const SHOES = '#4E342E';

/**
 * A person drawn in a simple cartoon style: big round head, dot eyes and rosy cheeks on a
 * small body. Hair is its own piece, and every top and bottom can come off, leaving a
 * plain undershirt and shorts underneath.
 */
export function PersonFigure({ look, size, dressed, gift, alive = false, asleep = false, wave }: Props) {
  const u = size * look.height;
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[0];
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0];
  const line = Math.max(1.5, u * 0.012);
  const edge: ViewStyle = { borderWidth: line, borderColor: LINE };
  const cx = u / 2;
  const headD = u * 0.46;
  const headTop = u * 0.06;
  const headCY = headTop + headD / 2;
  const torsoW = u * 0.26;
  const torsoTop = u * 0.47;
  const torsoH = u * 0.2;
  const armW = u * 0.075;
  const armH = u * 0.21;
  const armTop = u * 0.48;
  const legW = u * 0.085;
  const legTop = u * 0.64;
  const legH = u * 0.29;
  const eyeY = headCY + headD * 0.05;

  const top = dressed.top;
  const legs = dressed.legs;
  const dress = top?.cut === 'dress';
  const sleeve = top ? (top.cut === 'tee' || !top.cut ? 0.42 : 0.85) : 0;

  const lids = useBlink(alive, asleep, `${look.skin}${look.hair}${look.hairColor}`);
  const blink = useAnimatedStyle(() => ({ transform: [{ scaleY: lids.value }] }));
  const waving = useArmWave(wave, -12, armH, -1);

  const box = (left: number, t: number, width: number, height: number): ViewStyle => ({
    position: 'absolute',
    left,
    top: t,
    width,
    height,
  });

  const legsCover = (side: number) => {
    if (!legs || legs.cut === 'skirt') return null;
    const share = legs.cut === 'shorts' ? 0.38 : legs.cut === 'tights' ? 0.97 : 1;
    return (
      <View
        style={[
          box(cx + (side < 0 ? -legW - u * 0.008 : u * 0.008), legTop, legW, legH * share),
          edge,
          { backgroundColor: legs.color, borderRadius: legW * 0.3 },
        ]}
      />
    );
  };

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.inner, { width: u, height: u, left: (size - u) / 2 }]}>
        {/* Hair that hangs behind the head. */}
        <HairBack look={look} color={hair} cx={cx} u={u} headD={headD} headTop={headTop} edge={edge} />

        {/* Legs, then what covers them, then shoes. */}
        {[-1, 1].map((side) => (
          <View key={`leg${side}`}>
            <View
              style={[
                box(cx + (side < 0 ? -legW - u * 0.008 : u * 0.008), legTop, legW, legH),
                edge,
                { backgroundColor: skin, borderRadius: legW * 0.3 },
              ]}
            />
            {legsCover(side)}
          </View>
        ))}
        {/* Underwear, hidden by anything worn over the hips. */}
        <View
          style={[
            box(cx - torsoW * 0.47, u * 0.62, torsoW * 0.94, u * 0.09),
            edge,
            { backgroundColor: legs && legs.cut !== 'skirt' ? legs.color : UNDERWEAR, borderRadius: u * 0.02 },
          ]}
        />
        {legs?.cut === 'skirt' ? (
          <View
            style={[
              box(cx - torsoW * 0.62, u * 0.62, torsoW * 1.24, u * 0.13),
              edge,
              { backgroundColor: legs.color, borderBottomLeftRadius: u * 0.06, borderBottomRightRadius: u * 0.06 },
            ]}
          />
        ) : null}
        {[-1, 1].map((side) => (
          <View
            key={`shoe${side}`}
            style={[
              box(cx + (side < 0 ? -u * 0.125 : u * 0.005), u * 0.915, u * 0.12, u * 0.07),
              edge,
              { backgroundColor: SHOES, borderTopLeftRadius: u * 0.05, borderTopRightRadius: u * 0.05, borderRadius: u * 0.02 },
            ]}
          />
        ))}
        {dressed.feet
          ? [-1, 1].map((side) => (
              <Text
                key={`feet${side}`}
                style={[styles.part, { fontSize: Math.round(u * 0.1), top: u * 0.86, left: cx + (side < 0 ? -u * 0.135 : u * 0.0) }]}
              >
                {dressed.feet}
              </Text>
            ))
          : null}

        {/* Arms with sleeves, hands at the ends. */}
        {[-1, 1].map((side) => {
          const left = side < 0 ? cx - torsoW / 2 - armW + u * 0.012 : cx + torsoW / 2 - u * 0.012;
          return (
            <Animated.View
              key={`arm${side}`}
              style={[
                box(left, armTop, armW, armH),
                edge,
                styles.clip,
                { backgroundColor: skin, borderRadius: armW / 2 },
                side < 0 ? { transform: [{ rotate: '12deg' }] } : waving,
              ]}
            >
              <View style={{ height: `${sleeve * 100}%`, backgroundColor: top?.color ?? UNDERSHIRT }} />
            </Animated.View>
          );
        })}

        {/* The body: a dress, a top, or the undershirt. */}
        {dress && top ? (
          <View
            style={[
              box(cx - torsoW * 0.66, u * 0.6, torsoW * 1.32, u * 0.18),
              edge,
              styles.clip,
              { backgroundColor: top.color, borderBottomLeftRadius: u * 0.07, borderBottomRightRadius: u * 0.07 },
            ]}
          >
            <PatternFill cloth={top} u={u} />
          </View>
        ) : null}
        <View
          style={[
            box(cx - torsoW / 2, torsoTop, torsoW, torsoH),
            edge,
            styles.clip,
            {
              backgroundColor: top?.color ?? UNDERSHIRT,
              borderTopLeftRadius: u * 0.07,
              borderTopRightRadius: u * 0.07,
              borderRadius: u * 0.03,
            },
          ]}
        >
          {top ? <PatternFill cloth={top} u={u} /> : null}
        </View>

        {/* Ears, head and face. */}
        {[-1, 1].map((side) => (
          <View
            key={`ear${side}`}
            style={[
              box(cx + side * headD * 0.47 - u * 0.04, headCY - u * 0.02, u * 0.08, u * 0.08),
              edge,
              { backgroundColor: skin, borderRadius: u },
            ]}
          />
        ))}
        <View style={[box(cx - headD / 2, headTop, headD, headD), edge, { backgroundColor: skin, borderRadius: headD }]} />
        {look.beard !== null ? (
          <View
            style={[
              box(cx - headD * 0.4, headCY + headD * 0.16, headD * 0.8, headD * 0.44),
              edge,
              {
                backgroundColor: HAIR_COLORS[look.beard] ?? hair,
                borderTopWidth: 0,
                borderBottomLeftRadius: headD * 0.38,
                borderBottomRightRadius: headD * 0.38,
              },
            ]}
          />
        ) : null}
        <HairFront look={look} color={hair} cx={cx} u={u} headD={headD} headTop={headTop} edge={edge} />
        {[-1, 1].map((side) => (
          <View key={`eye${side}`}>
            <Animated.View
              style={[box(cx + side * headD * 0.17 - u * 0.022, eyeY - u * 0.022, u * 0.044, u * 0.044), styles.eye, blink]}
            />
            <View
              style={[
                box(cx + side * headD * 0.3 - u * 0.035, eyeY + u * 0.03, u * 0.07, u * 0.045),
                styles.cheek,
              ]}
            />
          </View>
        ))}
        <View
          style={[
            box(cx - u * 0.035, eyeY + u * 0.035, u * 0.07, u * 0.035),
            {
              borderBottomWidth: line * 1.3,
              borderColor: look.beard !== null ? '#F3E6DA' : LINE,
              borderBottomLeftRadius: u * 0.04,
              borderBottomRightRadius: u * 0.04,
            },
          ]}
        />

        {dressed.neck ? (
          <Text style={[styles.part, styles.center, { fontSize: Math.round(u * 0.12), top: u * 0.43, width: u }]}>
            {dressed.neck}
          </Text>
        ) : null}
        {dressed.face ? (
          <Text style={[styles.part, styles.center, { fontSize: Math.round(u * 0.2), top: eyeY - u * 0.13, width: u }]}>
            {dressed.face}
          </Text>
        ) : null}
        {dressed.hat ? (
          <Text style={[styles.part, styles.center, { fontSize: Math.round(u * 0.28), top: headTop - u * 0.2, width: u }]}>
            {dressed.hat}
          </Text>
        ) : null}
      </View>
      {gift ? (
        <Text style={[styles.part, { fontSize: Math.round(size * 0.18), top: size - u - size * 0.04, right: size * 0.06 }]}>
          {gift}
        </Text>
      ) : null}
    </View>
  );
}

interface HairProps {
  look: PersonLook;
  color: string;
  cx: number;
  u: number;
  headD: number;
  headTop: number;
  edge: ViewStyle;
}

/** Hair behind the head: long hair, ponytails, pigtails, buns and curls. */
function HairBack({ look, color, cx, u, headD, headTop, edge }: HairProps) {
  const fill = { backgroundColor: color };
  const at = (left: number, top: number, width: number, height: number, radius: number) => [
    styles.part,
    edge,
    fill,
    { left, top, width, height, borderRadius: radius },
  ];
  const headCY = headTop + headD / 2;
  switch (look.hair) {
    case 'long':
      return <View style={at(cx - headD * 0.58, headCY - u * 0.04, headD * 1.16, u * 0.36, u * 0.06)} />;
    case 'wavy':
      return (
        <>
          <View style={at(cx - headD * 0.58, headCY - u * 0.04, headD * 1.16, u * 0.3, u * 0.06)} />
          {[-0.45, -0.15, 0.15, 0.45].map((k) => (
            <View key={k} style={at(cx + k * headD - u * 0.05, headCY + u * 0.2, u * 0.1, u * 0.1, u)} />
          ))}
        </>
      );
    case 'ponytail':
      return <View style={at(cx + headD * 0.32, headTop + u * 0.04, u * 0.16, u * 0.22, u * 0.08)} />;
    case 'pigtails':
      return (
        <>
          {[-1, 1].map((side) => (
            <View key={side} style={at(cx + side * headD * 0.58 - u * 0.07, headCY - u * 0.02, u * 0.14, u * 0.17, u)} />
          ))}
        </>
      );
    case 'bun':
      return <View style={at(cx - u * 0.08, headTop - u * 0.07, u * 0.16, u * 0.14, u)} />;
    case 'curly':
      return <View style={at(cx - headD * 0.64, headTop - u * 0.04, headD * 1.28, headD * 1.08, u)} />;
    default:
      return null;
  }
}

/** Hair on top of the head, over the forehead; bald heads keep a little at the sides. */
function HairFront({ look, color, cx, u, headD, headTop, edge }: HairProps) {
  const fill = { backgroundColor: color };
  if (look.hair === 'bald') {
    return (
      <>
        {[-1, 1].map((side) => (
          <View
            key={side}
            style={[
              styles.part,
              edge,
              fill,
              { left: cx + side * headD * 0.44 - u * 0.04, top: headTop + headD * 0.3, width: u * 0.08, height: u * 0.12, borderRadius: u },
            ]}
          />
        ))}
      </>
    );
  }
  const tall = look.hair === 'curly' ? 0.46 : 0.4;
  return (
    <View
      style={[
        styles.part,
        edge,
        fill,
        {
          left: cx - headD / 2 - u * 0.012,
          top: headTop - u * 0.015,
          width: headD + u * 0.024,
          height: headD * tall,
          borderTopLeftRadius: headD / 2,
          borderTopRightRadius: headD / 2,
          borderBottomLeftRadius: look.hair === 'short' ? u * 0.03 : u * 0.06,
          borderBottomRightRadius: u * 0.1,
        },
      ]}
    />
  );
}

/** Dots, stripes or little flowers over a piece of clothing. */
function PatternFill({ cloth, u }: { cloth: Cloth; u: number }) {
  const c = cloth.patternColor ?? '#FFFFFF';
  if (cloth.pattern === 'stripes') {
    return (
      <View style={StyleSheet.absoluteFill}>
        {[0.18, 0.46, 0.74].map((k) => (
          <View key={k} style={{ position: 'absolute', left: 0, right: 0, top: `${k * 100}%`, height: u * 0.03, backgroundColor: c }} />
        ))}
      </View>
    );
  }
  if (cloth.pattern === 'dots' || cloth.pattern === 'flowers') {
    const d = cloth.pattern === 'dots' ? u * 0.025 : u * 0.04;
    const spots = [
      [0.15, 0.2],
      [0.6, 0.12],
      [0.38, 0.45],
      [0.8, 0.5],
      [0.1, 0.7],
      [0.55, 0.78],
    ];
    return (
      <View style={StyleSheet.absoluteFill}>
        {spots.map(([x, y]) => (
          <View
            key={`${x}${y}`}
            style={{
              position: 'absolute',
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: d,
              height: d,
              borderRadius: d,
              backgroundColor: c,
              borderWidth: cloth.pattern === 'flowers' ? d * 0.3 : 0,
              borderColor: '#E8A0A8',
            }}
          />
        ))}
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  inner: { position: 'absolute', bottom: 0 },
  part: { position: 'absolute' },
  center: { left: 0, textAlign: 'center' },
  clip: { overflow: 'hidden' },
  eye: { borderRadius: 999, backgroundColor: '#2A1E1A' },
  cheek: { borderRadius: 999, backgroundColor: '#F28B9B', opacity: 0.5 },
});
