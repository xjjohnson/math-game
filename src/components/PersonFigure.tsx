import { useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/AppText';
import { useArmWave, useBlink } from '@/components/Motion';
import { BARE_SHOES, Glasses, Hat, Neckwear, shoeLook } from '@/components/PersonAccessories';
import { BRIGHT, INK, inkWidth, shade, SHINE } from '@/constants/artStyle';
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

/** What a person has on, ready to draw. Hat, glasses, neck and shoes are wearable ids. */
export interface PersonDressed {
  hat?: string;
  face?: string;
  neck?: string;
  feet?: string;
  top?: Cloth;
  legs?: Cloth;
}

/** How a person's face looks. `smile` is the everyday face. */
export type Mood = 'smile' | 'happy' | 'sad' | 'surprised' | 'cross' | 'silly';
export const MOODS: readonly Mood[] = ['smile', 'happy', 'sad', 'surprised', 'cross', 'silly'];

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
  /** The face to show; defaults to a small smile. */
  mood?: Mood;
  /** Same as mood "happy": a big open grin, for being picked up and carried. */
  happy?: boolean;
}

const UNDERSHIRT = '#FAFAFA';
const UNDERWEAR = '#E3E3E3';
const EYE = '#2A1E1A';
const CHEEK = '#F28B9B';
const MOUTH = '#8E3B3B';
const TONGUE = '#F28B9B';
const HAIR_TIE = BRIGHT.pink;

/** Measurements every part of a person is drawn from, in pixels. */
interface Body {
  u: number;
  cx: number;
  line: number;
  headD: number;
  headTop: number;
  headCY: number;
  eyeY: number;
  torsoW: number;
  torsoTop: number;
  torsoH: number;
  armW: number;
  armH: number;
  armTop: number;
  legW: number;
  legTop: number;
  legH: number;
}

function measure(u: number): Body {
  const headD = u * 0.5;
  const headTop = u * 0.03;
  const headCY = headTop + headD / 2;
  return {
    u,
    cx: u / 2,
    line: Math.max(1.5, inkWidth(u) * 0.8),
    headD,
    headTop,
    headCY,
    eyeY: headCY + headD * 0.07,
    torsoW: u * 0.27,
    torsoTop: u * 0.48,
    torsoH: u * 0.19,
    armW: u * 0.078,
    armH: u * 0.2,
    armTop: u * 0.49,
    legW: u * 0.085,
    legTop: u * 0.64,
    legH: u * 0.29,
  };
}

/** A rectangle with its own radius on each corner, as an SVG path. */
function roundRect(x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number): string {
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    `Q${x + w},${y} ${x + w},${y + tr}`,
    `V${y + h - br}`,
    `Q${x + w},${y + h} ${x + w - br},${y + h}`,
    `H${x + bl}`,
    `Q${x},${y + h} ${x},${y + h - bl}`,
    `V${y + tl}`,
    `Q${x},${y} ${x + tl},${y}`,
    'Z',
  ].join(' ');
}

/** A shape that is wide at the top edge and flares out to a rounded hem (skirts, dresses). */
function flare(cx: number, y0: number, y1: number, w0: number, w1: number, r: number): string {
  return `M${cx - w0},${y0} H${cx + w0} L${cx + w1},${y1 - r} Q${cx + w1},${y1} ${cx + w1 - r},${y1} H${cx - w1 + r} Q${cx - w1},${y1} ${cx - w1},${y1 - r} Z`;
}

/**
 * A person drawn in the game's picture-book style: a big round head with shiny dot eyes and
 * rosy cheeks, a small body, mitten hands and a soft darker shade under the chin. Hair is its
 * own piece, and every top and bottom can come off, leaving a plain undershirt and shorts.
 *
 * Drawn in layers so the parts that move can move: back (hair, legs, shoes), arms (one waves),
 * front (body, head, face), then eyes that blink, then hats, glasses and neckwear.
 */
export function PersonFigure({ look, size, dressed, gift, alive = false, asleep = false, wave, mood, happy = false }: Props) {
  const u = size * look.height;
  const b = measure(u);
  const { cx, line, headD, headCY, eyeY, torsoW, torsoTop, torsoH, armW, armH, armTop, legW, legTop, legH } = b;
  const skin = SKIN_TONES[look.skin] ?? SKIN_TONES[0];
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0];
  const edge: ViewStyle = { borderWidth: line, borderColor: INK };
  const shoes = shoeLook(dressed.feet);
  const shod = shoes !== BARE_SHOES;
  const fit = { u, cx, headD, headTop: b.headTop, eyeY, line, edge };
  const clipId = `pf${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const face: Mood = mood ?? (happy ? 'happy' : 'smile');

  const top = dressed.top;
  const legs = dressed.legs;
  const dress = top?.cut === 'dress';
  const sleeve = top ? (top.cut === 'tee' || !top.cut ? 0.42 : 0.85) : 0.42;
  const shirt = top?.color ?? UNDERSHIRT;

  // Arms hang in boxes wide enough for the mitten; the box turns about its top to wave.
  const mitten = armW * 1.5;
  const armBoxW = mitten + line * 2;
  const armBoxH = armH + mitten * 0.55;
  const lids = useBlink(alive, asleep, `${look.skin}${look.hair}${look.hairColor}`);
  const blink = useAnimatedStyle(() => ({ transform: [{ scaleY: lids.value }] }));
  const waving = useArmWave(wave, -12, armBoxH, -1);

  // Where the top of the shoe sits; the bare leg stops here so no foot pokes out behind it.
  const lift = u * 0.07 * shoes.tall * 10;
  const shoeTop = u * 0.915 - lift + line;
  const legX = (side: number) => cx + (side < 0 ? -legW - u * 0.008 : u * 0.008);

  const legsCover = (side: number) => {
    if (!legs || legs.cut === 'skirt') return null;
    const share = legs.cut === 'shorts' ? 0.38 : legs.cut === 'tights' ? 0.97 : 1;
    return (
      <Rect x={legX(side)} y={legTop} width={legW} height={legH * share} rx={legW * 0.3} fill={legs.color} stroke={INK} strokeWidth={line} />
    );
  };

  const dressPath = flare(cx, u * 0.6, u * 0.78, torsoW * 0.5, torsoW * 0.68, u * 0.05);
  const skirtPath = flare(cx, u * 0.62, u * 0.75, torsoW * 0.5, torsoW * 0.64, u * 0.04);
  const torsoPath = roundRect(cx - torsoW / 2, torsoTop, torsoW, torsoH, u * 0.07, u * 0.07, u * 0.03, u * 0.03);

  const arm = (side: number) => {
    const armCX = side < 0 ? cx - torsoW / 2 - armW / 2 + u * 0.014 : cx + torsoW / 2 + armW / 2 - u * 0.014;
    const mid = armBoxW / 2;
    const handY = armH - mitten * 0.05;
    return (
      <Animated.View
        key={`arm${side}`}
        style={[styles.part, { left: armCX - armBoxW / 2, top: armTop, width: armBoxW, height: armBoxH }, side < 0 ? styles.backArm : waving]}
      >
        <Svg width={armBoxW} height={armBoxH}>
          <Rect x={mid - armW / 2} y={line / 2} width={armW} height={handY} rx={armW / 2} fill={skin} stroke={INK} strokeWidth={line} />
          <Rect
            x={mid - armW / 2 - line * 0.3}
            y={line / 2}
            width={armW + line * 0.6}
            height={armH * sleeve}
            rx={armW / 2}
            fill={shirt}
            stroke={INK}
            strokeWidth={line}
          />
          {/* Mitten hand: a round paw with a little thumb toward the body. */}
          <Circle cx={mid - side * mitten * 0.36} cy={handY - mitten * 0.08} r={mitten * 0.2} fill={skin} stroke={INK} strokeWidth={line} />
          <Circle cx={mid} cy={handY} r={mitten / 2 - line / 2} fill={skin} stroke={INK} strokeWidth={line} />
        </Svg>
      </Animated.View>
    );
  };

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.inner, { width: u, height: u, left: (size - u) / 2 }]}>
        {/* Back: hair that hangs behind the head, legs, what covers them, shoes. */}
        <Svg width={u} height={u} style={StyleSheet.absoluteFill}>
          <HairBack look={look} color={hair} b={b} />
          {[-1, 1].map((side) => (
            <G key={`leg${side}`}>
              <Rect
                x={legX(side)}
                y={legTop}
                width={legW}
                height={shod ? shoeTop - legTop : legH}
                rx={legW * 0.3}
                fill={skin}
                stroke={INK}
                strokeWidth={line}
              />
              {legsCover(side)}
            </G>
          ))}
          {/* Underwear, hidden by anything worn over the hips. */}
          <Rect
            x={cx - torsoW * 0.47}
            y={u * 0.62}
            width={torsoW * 0.94}
            height={u * 0.09}
            rx={u * 0.02}
            fill={legs && legs.cut !== 'skirt' ? legs.color : UNDERWEAR}
            stroke={INK}
            strokeWidth={line}
          />
          {legs?.cut === 'skirt' ? <Path d={skirtPath} fill={legs.color} stroke={INK} strokeWidth={line} strokeLinejoin="round" /> : null}
          {[-1, 1].map((side) => {
            const left = cx + (side < 0 ? -u * 0.125 : u * 0.005);
            const shoeW = u * 0.12;
            return (
              <G key={`shoe${side}`}>
                {shoes.sock ? (
                  <Rect
                    x={legX(side) - u * 0.004}
                    y={u * 0.8}
                    width={legW + u * 0.008}
                    height={u * 0.13}
                    rx={legW * 0.3}
                    fill={shoes.sock}
                    stroke={INK}
                    strokeWidth={line}
                  />
                ) : null}
                <Path
                  d={roundRect(left, u * 0.915 - lift, shoeW, u * 0.07 + lift, u * 0.05, u * 0.05, u * 0.02, u * 0.02)}
                  fill={shoes.color}
                  stroke={INK}
                  strokeWidth={line}
                />
                <Rect x={left + line} y={u * 0.963} width={shoeW - line * 2} height={u * 0.02} fill={shoes.sole} />
              </G>
            );
          })}
        </Svg>

        {/* Arms behind the body; the right one waves. */}
        {[-1, 1].map(arm)}

        {/* Front: the body (a dress, a top, or the undershirt), then the head and face. */}
        <Svg width={u} height={u} style={StyleSheet.absoluteFill}>
          <Defs>
            <ClipPath id={`${clipId}t`}>
              <Path d={torsoPath} />
            </ClipPath>
            <ClipPath id={`${clipId}d`}>
              <Path d={dressPath} />
            </ClipPath>
          </Defs>
          {dress && top ? (
            <G>
              <Path d={dressPath} fill={top.color} />
              <G clipPath={`url(#${clipId}d)`}>
                <PatternFill cloth={top} x={cx - torsoW * 0.7} y={u * 0.6} w={torsoW * 1.4} h={u * 0.18} u={u} />
              </G>
              <Path d={dressPath} fill="none" stroke={INK} strokeWidth={line} strokeLinejoin="round" />
            </G>
          ) : null}
          <Path d={torsoPath} fill={shirt} />
          <G clipPath={`url(#${clipId}t)`}>
            {top ? <PatternFill cloth={top} x={cx - torsoW / 2} y={torsoTop} w={torsoW} h={torsoH} u={u} /> : null}
            {/* The head's soft shadow on the chest. */}
            <Ellipse cx={cx} cy={torsoTop} rx={headD * 0.3} ry={u * 0.035} fill={shade(shirt)} />
          </G>
          <Path d={torsoPath} fill="none" stroke={INK} strokeWidth={line} />

          {[-1, 1].map((side) => (
            <G key={`ear${side}`}>
              <Circle cx={cx + side * headD * 0.48} cy={headCY + u * 0.02} r={u * 0.042} fill={skin} stroke={INK} strokeWidth={line} />
              <Circle cx={cx + side * headD * 0.49} cy={headCY + u * 0.02} r={u * 0.018} fill={shade(skin, 0.12)} />
            </G>
          ))}
          <Circle cx={cx} cy={headCY} r={headD / 2} fill={skin} stroke={INK} strokeWidth={line} />
          <HairFront look={look} color={hair} b={b} />
          {[-1, 1].map((side) => (
            <Ellipse
              key={`cheek${side}`}
              cx={cx + side * headD * 0.3}
              cy={eyeY + u * 0.05}
              rx={u * 0.036}
              ry={u * 0.022}
              fill={CHEEK}
              opacity={face === 'cross' ? 0.8 : 0.5}
            />
          ))}
          <FaceLines mood={face} b={b} />
          {look.beard !== null ? <Beard color={HAIR_COLORS[look.beard] ?? hair} b={b} /> : null}
        </Svg>

        {/* Shiny dot eyes that blink. */}
        {[-1, 1].map((side) => {
          const e = u * (face === 'surprised' ? 0.064 : 0.054);
          return (
            <Animated.View
              key={`eye${side}`}
              style={[styles.part, styles.eye, { left: cx + side * headD * 0.17 - e / 2, top: eyeY - e / 2, width: e, height: e }, blink]}
            >
              <View style={[styles.shine, { width: e * 0.36, height: e * 0.36, top: e * 0.14, right: e * 0.14 }]} />
            </Animated.View>
          );
        })}

        {dressed.neck ? <Neckwear id={dressed.neck} f={fit} /> : null}
        {dressed.face ? <Glasses id={dressed.face} f={fit} /> : null}
        {dressed.hat ? <Hat id={dressed.hat} f={fit} /> : null}
      </View>
      {gift ? (
        <Text style={[styles.part, { fontSize: Math.round(size * 0.18), top: size - u - size * 0.04, right: size * 0.06 }]}>
          {gift}
        </Text>
      ) : null}
    </View>
  );
}

/** The mouth (and eyebrows, for strong feelings) for each mood. */
function FaceLines({ mood, b }: { mood: Mood; b: Body }) {
  const { u, cx, headD, eyeY, line } = b;
  const my = eyeY + u * 0.045;
  const w = u * 0.032;
  const stroke = { fill: 'none', stroke: INK, strokeWidth: line * 1.2, strokeLinecap: 'round' as const };
  const brows = (tilt: number) =>
    [-1, 1].map((side) => {
      const x = cx + side * headD * 0.17;
      const y = eyeY - u * 0.055;
      // tilt > 0: inner ends down (cross); tilt < 0: inner ends up (sad).
      return (
        <Path key={`brow${side}`} d={`M${x - side * u * 0.03},${y + tilt} L${x + side * u * 0.03},${y - tilt}`} {...stroke} />
      );
    });
  switch (mood) {
    case 'happy':
    case 'silly': {
      const gw = u * 0.045;
      const grin = `M${cx - gw},${my - u * 0.004} Q${cx},${my - u * 0.01} ${cx + gw},${my - u * 0.004} Q${cx + gw * 0.9},${my + u * 0.06} ${cx},${my + u * 0.06} Q${cx - gw * 0.9},${my + u * 0.06} ${cx - gw},${my - u * 0.004} Z`;
      return (
        <G>
          <Path d={grin} fill={MOUTH} stroke={INK} strokeWidth={line} strokeLinejoin="round" />
          {mood === 'silly' ? (
            <Ellipse cx={cx + u * 0.012} cy={my + u * 0.062} rx={u * 0.022} ry={u * 0.028} fill={TONGUE} stroke={INK} strokeWidth={line} />
          ) : (
            <Ellipse cx={cx} cy={my + u * 0.045} rx={u * 0.022} ry={u * 0.01} fill={TONGUE} />
          )}
        </G>
      );
    }
    case 'sad':
      return (
        <G>
          {brows(-u * 0.012)}
          <Path d={`M${cx - w},${my + u * 0.03} Q${cx},${my} ${cx + w},${my + u * 0.03}`} {...stroke} />
        </G>
      );
    case 'surprised':
      return (
        <G>
          {brows(0).map((p, i) => (
            <G key={i} transform={`translate(0 ${-u * 0.012})`}>
              {p}
            </G>
          ))}
          <Ellipse cx={cx} cy={my + u * 0.022} rx={u * 0.018} ry={u * 0.024} fill={MOUTH} stroke={INK} strokeWidth={line} />
        </G>
      );
    case 'cross':
      return (
        <G>
          {brows(u * 0.014)}
          <Path d={`M${cx - w * 0.8},${my + u * 0.02} L${cx + w * 0.8},${my + u * 0.02}`} {...stroke} />
        </G>
      );
    default:
      return <Path d={`M${cx - w},${my} Q${cx},${my + u * 0.035} ${cx + w},${my}`} {...stroke} />;
  }
}

interface HairProps {
  look: PersonLook;
  color: string;
  b: Body;
}

/** Hair behind the head: long hair, ponytails, pigtails, buns and curls. */
function HairBack({ look, color, b }: HairProps) {
  const { u, cx, headD, headTop, headCY, line } = b;
  const ink = { fill: color, stroke: INK, strokeWidth: line };
  const tie = { fill: HAIR_TIE, stroke: INK, strokeWidth: line * 0.8 };
  switch (look.hair) {
    case 'long':
      return <Path d={roundRect(cx - headD * 0.58, headCY - u * 0.04, headD * 1.16, u * 0.36, u * 0.06, u * 0.06, u * 0.08, u * 0.08)} {...ink} />;
    case 'wavy':
      return (
        <G>
          <Path d={roundRect(cx - headD * 0.58, headCY - u * 0.04, headD * 1.16, u * 0.3, u * 0.06, u * 0.06, u * 0.05, u * 0.05)} {...ink} />
          {[-0.45, -0.15, 0.15, 0.45].map((k) => (
            <Circle key={k} cx={cx + k * headD} cy={headCY + u * 0.26} r={u * 0.055} {...ink} />
          ))}
        </G>
      );
    case 'ponytail':
      return (
        <G>
          <Ellipse cx={cx + headD * 0.52} cy={headTop + u * 0.2} rx={u * 0.075} ry={u * 0.12} {...ink} />
          <Circle cx={cx + headD * 0.44} cy={headTop + u * 0.09} r={u * 0.025} {...tie} />
        </G>
      );
    case 'pigtails':
      return (
        <G>
          {[-1, 1].map((side) => (
            <G key={side}>
              <Ellipse cx={cx + side * headD * 0.62} cy={headCY + u * 0.07} rx={u * 0.07} ry={u * 0.09} {...ink} />
              <Circle cx={cx + side * headD * 0.54} cy={headCY - u * 0.01} r={u * 0.022} {...tie} />
            </G>
          ))}
        </G>
      );
    case 'bun':
      return <Circle cx={cx} cy={headTop + u * 0.03} r={u * 0.058} {...ink} />;
    case 'curly': {
      // A cloud of curls all round the head.
      const ring = headD * 0.5;
      return (
        <G>
          {[-200, -165, -130, -90, -50, -15, 20, 160].map((deg) => {
            const a = (deg * Math.PI) / 180;
            return <Circle key={deg} cx={cx + Math.cos(a) * ring} cy={headCY + Math.sin(a) * ring} r={headD * 0.19} {...ink} />;
          })}
        </G>
      );
    }
    default:
      return null;
  }
}

/** Hair on top of the head, ending in a fringe over the forehead; bald heads keep a little at the sides. */
function HairFront({ look, color, b }: HairProps) {
  const { u, cx, headD, headTop, headCY, line } = b;
  const ink = { fill: color, stroke: INK, strokeWidth: line, strokeLinejoin: 'round' as const };
  if (look.hair === 'bald') {
    return (
      <G>
        {[-1, 1].map((side) => (
          <Ellipse key={side} cx={cx + side * headD * 0.44} cy={headTop + headD * 0.42} rx={u * 0.04} ry={u * 0.06} {...ink} />
        ))}
      </G>
    );
  }
  const r = headD / 2 + u * 0.012;
  const yb = headTop + headD * (look.hair === 'curly' ? 0.4 : look.hair === 'short' ? 0.34 : 0.38);
  const half = Math.sqrt(Math.max(0, r * r - (headCY - yb) * (headCY - yb)));
  const left = cx - half;
  const right = cx + half;
  const dip = headD * 0.07;
  let fringe: string;
  if (look.hair === 'short' || look.hair === 'curly') {
    // Little scallops all along.
    const n = look.hair === 'curly' ? 5 : 3;
    const step = (right - left) / n;
    fringe = Array.from({ length: n }, (_, i) => {
      const x0 = right - step * i;
      return `Q${x0 - step / 2},${yb + dip * 1.4} ${x0 - step},${yb}`;
    }).join(' ');
  } else {
    // A side-swept fringe for longer hair.
    fringe = `Q${cx + half * 0.15},${yb + dip * 2.2} ${cx - half * 0.35},${yb + dip * 0.3} Q${cx - half * 0.8},${yb + dip * 1.4} ${left},${yb + dip}`;
  }
  return <Path d={`M${left},${yb} A${r},${r} 0 0 1 ${right},${yb} ${fringe} Z`} {...ink} />;
}

/** A beard along the jaw and round the chin with a little moustache; the mouth shows above it. */
function Beard({ color, b }: { color: string; b: Body }) {
  const { u, cx, headD, headCY, eyeY, line } = b;
  const r = headD * 0.51;
  const inner = headD * 0.34;
  const my = eyeY + u * 0.045;
  const jaw = `M${cx - r},${headCY} A${r},${r * 1.12} 0 0 0 ${cx + r},${headCY} L${cx + inner},${headCY + headD * 0.1} Q${cx},${headCY + headD * 0.44} ${cx - inner},${headCY + headD * 0.1} Z`;
  return (
    <G>
      <Path d={jaw} fill={color} stroke={INK} strokeWidth={line} strokeLinejoin="round" />
      {[-1, 1].map((side) => (
        <Ellipse key={side} cx={cx + side * u * 0.03} cy={my - u * 0.008} rx={u * 0.036} ry={u * 0.016} fill={color} stroke={INK} strokeWidth={line * 0.8} />
      ))}
    </G>
  );
}

/** Dots, stripes or little flowers over a piece of clothing, inside the box given. */
function PatternFill({ cloth, x, y, w, h, u }: { cloth: Cloth; x: number; y: number; w: number; h: number; u: number }) {
  const c = cloth.patternColor ?? '#FFFFFF';
  if (cloth.pattern === 'stripes') {
    return (
      <G>
        {[0.18, 0.46, 0.74].map((k) => (
          <Rect key={k} x={x} y={y + k * h} width={w} height={u * 0.03} fill={c} />
        ))}
      </G>
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
      <G>
        {spots.map(([sx, sy]) =>
          cloth.pattern === 'flowers' ? (
            <Circle key={`${sx}${sy}`} cx={x + sx * w + d / 2} cy={y + sy * h + d / 2} r={d * 0.35} fill={c} stroke="#E8A0A8" strokeWidth={d * 0.3} />
          ) : (
            <Circle key={`${sx}${sy}`} cx={x + sx * w + d / 2} cy={y + sy * h + d / 2} r={d / 2} fill={c} />
          ),
        )}
      </G>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  inner: { position: 'absolute', bottom: 0 },
  part: { position: 'absolute' },
  backArm: { transformOrigin: 'top', transform: [{ rotate: '12deg' }] },
  eye: { borderRadius: 999, backgroundColor: EYE },
  shine: { position: 'absolute', borderRadius: 999, backgroundColor: SHINE },
});
