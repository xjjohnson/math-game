import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { BRIGHT, INK, inkWidth, shade, SHINE, SOFT, tint } from '@/constants/artStyle';

/**
 * Room things drawn in the game's own outlined style instead of emoji. Each drawing fills a
 * 100 x 100 box with its bottom on the floor line, so seats and tops line up with the item's
 * `seat` / `top` heights in constants/room.ts. Add more ids to DRAWINGS bit by bit.
 */

type Draw = (k: Kit) => ReactNode;

/** What every drawing gets: the outline props, ready to spread. */
interface Kit {
  /** Outline: INK at the right width for this size. */
  o: { stroke: string; strokeWidth: number; strokeLinejoin: 'round'; strokeLinecap: 'round' };
}

const WOOD = SOFT.wood;
const WOOD_DARK = shade(SOFT.wood);
const RED = BRIGHT.red;
const SKY = '#8FC1E8';

/** Scales a small drawing up from the middle of the floor line, so small things fill their box like an emoji does. */
const grow = (k: number, node: ReactNode) => <G transform={`translate(50 97) scale(${k}) translate(-50 -97)`}>{node}</G>;

/** Outline props made thinner so they come out the normal width after `grow(k)`. */
const thin = (o: Kit['o'], k: number): Kit['o'] => ({ ...o, strokeWidth: o.strokeWidth / k });

const shine = (cx: number, cy: number, r: number) => <Ellipse cx={cx} cy={cy} rx={r} ry={r * 0.7} fill={SHINE} opacity={0.75} />;

const DRAWINGS: Record<string, Draw> = {
  couch: ({ o }) => (
    <G>
      <Rect x={8} y={30} width={84} height={40} rx={12} fill={SKY} {...o} />
      <Rect x={14} y={55} width={72} height={22} rx={7} fill={tint(SKY, 0.2)} {...o} />
      <Line x1={50} y1={56} x2={50} y2={76} {...o} />
      <Rect x={2} y={44} width={18} height={42} rx={9} fill={SKY} {...o} />
      <Rect x={80} y={44} width={18} height={42} rx={9} fill={SKY} {...o} />
      <Rect x={10} y={76} width={80} height={12} rx={4} fill={shade(SKY)} {...o} />
      <Rect x={14} y={88} width={7} height={9} rx={2} fill={WOOD_DARK} {...o} />
      <Rect x={79} y={88} width={7} height={9} rx={2} fill={WOOD_DARK} {...o} />
    </G>
  ),
  chair: ({ o }) => (
    <G>
      <Rect x={26} y={60} width={8} height={37} rx={3} fill={WOOD_DARK} {...o} />
      <Rect x={66} y={60} width={8} height={37} rx={3} fill={WOOD_DARK} {...o} />
      <Rect x={28} y={6} width={44} height={46} rx={10} fill={WOOD} {...o} />
      <Rect x={37} y={15} width={26} height={28} rx={6} fill={shade(WOOD, 0.1)} />
      <Rect x={20} y={48} width={60} height={13} rx={5} fill={WOOD} {...o} />
      <Rect x={22} y={44} width={56} height={8} rx={4} fill={BRIGHT.red} {...o} />
    </G>
  ),
  bed: ({ o }) => (
    <G>
      <Rect x={3} y={26} width={20} height={70} rx={8} fill={WOOD} {...o} />
      <Rect x={84} y={52} width={14} height={44} rx={6} fill={WOOD} {...o} />
      <Rect x={10} y={58} width={84} height={22} rx={7} fill={SOFT.white} {...o} />
      <Ellipse cx={30} cy={55} rx={15} ry={8} fill={SOFT.white} {...o} />
      <Rect x={38} y={55} width={56} height={27} rx={8} fill={SOFT.lilac} {...o} />
      <Line x1={38} y1={63} x2={94} y2={63} {...o} stroke={shade(SOFT.lilac, 0.3)} />
      {[50, 64, 78].map((x) => (
        <Circle key={x} cx={x} cy={73} r={2.5} fill={SHINE} />
      ))}
      <Rect x={8} y={80} width={88} height={10} rx={3} fill={WOOD_DARK} {...o} />
    </G>
  ),
  tv: ({ o }) => (
    <G>
      <Line x1={50} y1={20} x2={36} y2={4} {...o} />
      <Line x1={50} y1={20} x2={66} y2={6} {...o} />
      <Circle cx={36} cy={4} r={3} fill={RED} {...o} />
      <Rect x={24} y={84} width={10} height={13} rx={3} fill={WOOD_DARK} {...o} />
      <Rect x={66} y={84} width={10} height={13} rx={3} fill={WOOD_DARK} {...o} />
      <Rect x={8} y={20} width={84} height={66} rx={12} fill="#5B5368" {...o} />
      <Rect x={16} y={28} width={58} height={50} rx={6} fill="#9AD3F2" {...o} />
      <Path d="M22,34 Q34,31 40,40" fill="none" stroke={SHINE} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
      <Circle cx={83} cy={40} r={4} fill={BRIGHT.yellow} {...o} />
      <Circle cx={83} cy={56} r={4} fill={BRIGHT.green} {...o} />
    </G>
  ),
  plant: ({ o }) => (
    <G>
      {[
        [50, 30, 0],
        [32, 40, -40],
        [68, 40, 40],
        [40, 22, -15],
        [60, 22, 15],
      ].map(([x, y, r]) => (
        <Ellipse key={`${x}${y}`} cx={x} cy={y} rx={12} ry={22} fill={r === 0 ? BRIGHT.green : SOFT.sage} transform={`rotate(${r} ${x} ${y})`} {...o} />
      ))}
      <Path d="M28,62 L72,62 L66,96 L34,96 Z" fill="#E07A5F" {...o} />
      <Rect x={24} y={56} width={52} height={12} rx={4} fill={shade('#E07A5F', 0.1)} {...o} />
    </G>
  ),
  clock: ({ o }) => (
    <G>
      <Path d="M20,90 L20,48 Q20,14 50,14 Q80,14 80,48 L80,90 Z" fill={WOOD} {...o} />
      <Rect x={14} y={88} width={72} height={9} rx={3} fill={WOOD_DARK} {...o} />
      <Circle cx={50} cy={50} r={22} fill={SOFT.white} {...o} />
      {[0, 90, 180, 270].map((a) => (
        <Circle key={a} cx={50 + 16 * Math.sin((a * Math.PI) / 180)} cy={50 - 16 * Math.cos((a * Math.PI) / 180)} r={1.8} fill={INK} />
      ))}
      <Line x1={50} y1={50} x2={50} y2={36} {...o} />
      <Line x1={50} y1={50} x2={60} y2={54} {...o} />
      <Circle cx={50} cy={50} r={2.5} fill={RED} />
    </G>
  ),
  radio: ({ o }) => (
    <G>
      <Path d="M26,38 Q50,12 74,38" fill="none" {...o} strokeWidth={o.strokeWidth * 1.6} />
      <Line x1={72} y1={36} x2={88} y2={10} {...o} />
      <Circle cx={88} cy={10} r={3} fill={BRIGHT.yellow} {...o} />
      <Rect x={8} y={36} width={84} height={58} rx={12} fill="#E8735A" {...o} />
      <Circle cx={34} cy={65} r={17} fill={SOFT.cream} {...o} />
      {[-7, 0, 7].flatMap((dx) => [-7, 0, 7].map((dy) => <Circle key={`${dx}${dy}`} cx={34 + dx} cy={65 + dy} r={1.8} fill={INK} />))}
      <Rect x={58} y={48} width={26} height={12} rx={3} fill={SOFT.butter} {...o} />
      <Line x1={66} y1={50} x2={66} y2={58} stroke={RED} strokeWidth={2} />
      <Circle cx={63} cy={76} r={5} fill={shade('#E8735A', 0.25)} {...o} />
      <Circle cx={79} cy={76} r={5} fill={shade('#E8735A', 0.25)} {...o} />
    </G>
  ),
  apples: ({ o: base }) => {
    const o = thin(base, 1.45);
    return grow(
      1.45,
    <G>
      {[
        [34, 72],
        [64, 76],
      ].map(([x, y]) => (
        <G key={x}>
          <Path d={`M${x},${y - 16} Q${x + 2},${y - 26} ${x + 6},${y - 28}`} fill="none" {...o} />
          <Ellipse cx={x + 9} cy={y - 24} rx={7} ry={3.5} fill={BRIGHT.green} transform={`rotate(-25 ${x + 9} ${y - 24})`} {...o} />
          <Path
            d={`M${x},${y - 14} Q${x + 20},${y - 24} ${x + 20},${y} Q${x + 18},${y + 20} ${x},${y + 18} Q${x - 18},${y + 20} ${x - 20},${y} Q${x - 20},${y - 24} ${x},${y - 14} Z`}
            fill={RED}
            {...o}
          />
          {shine(x - 9, y - 6, 4)}
        </G>
      ))}
    </G>
    );
  },
  bread: ({ o }) => (
    <G>
      <Path d="M10,94 L10,58 Q10,30 50,30 Q90,30 90,58 L90,94 Z" fill="#E3A857" {...o} />
      {[34, 50, 66].map((x) => (
        <Path key={x} d={`M${x - 6},${44} Q${x},${38} ${x + 6},${44}`} fill="none" stroke={shade('#E3A857', 0.3)} strokeWidth={o.strokeWidth} strokeLinecap="round" />
      ))}
      <Rect x={10} y={80} width={80} height={14} fill={shade('#E3A857', 0.12)} {...o} />
    </G>
  ),
  cookies: ({ o: base }) => {
    const o = thin(base, 1.25);
    return grow(
      1.25,
    <G>
      {[86, 74, 62].map((y, i) => (
        <G key={y}>
          <Ellipse cx={50 + (i - 1) * 3} cy={y} rx={34} ry={11} fill={i === 2 ? '#E0A864' : shade('#E0A864', 0.12)} {...o} />
        </G>
      ))}
      {[
        [36, 60],
        [52, 58],
        [64, 63],
        [46, 66],
      ].map(([x, y]) => (
        <Circle key={`${x}${y}`} cx={x + 3} cy={y} r={3} fill="#6B3E26" />
      ))}
    </G>
    );
  },
  cupcake: ({ o }) => (
    <G>
      <Path d="M24,60 L76,60 L68,96 L32,96 Z" fill={BRIGHT.pink} {...o} />
      {[38, 50, 62].map((x) => (
        <Line key={x} x1={x} y1={62} x2={x - (x - 50) * 0.25} y2={94} stroke={shade(BRIGHT.pink, 0.25)} strokeWidth={2.5} />
      ))}
      <Path d="M20,62 Q14,48 30,44 Q30,28 50,30 Q70,28 70,44 Q86,48 80,62 Z" fill={SOFT.cream} {...o} />
      {[
        [36, 46, BRIGHT.blue],
        [58, 40, BRIGHT.yellow],
        [66, 52, BRIGHT.green],
        [44, 56, BRIGHT.purple],
      ].map(([x, y, c]) => (
        <Rect key={`${x}`} x={Number(x)} y={Number(y)} width={6} height={2.5} rx={1.2} fill={String(c)} />
      ))}
      <Circle cx={52} cy={24} r={8} fill={RED} {...o} />
      {shine(49, 21, 2.5)}
    </G>
  ),
  milk: ({ o }) => (
    <G>
      <Path d="M28,14 L36,96 L64,96 L72,14 Z" fill="#DCEFFB" {...o} />
      <Path d="M30.5,34 L36.5,94 L63.5,94 L69.5,34 Z" fill={SOFT.white} />
      <Path d="M28,14 L36,96 L64,96 L72,14 Z" fill="none" {...o} />
      <Line x1={30.5} y1={34} x2={69.5} y2={34} {...o} />
      <Path d="M38,42 L41,86" fill="none" stroke="#DCEFFB" strokeWidth={4} strokeLinecap="round" />
    </G>
  ),
  cocoa: ({ o }) => (
    <G>
      {[38, 54].map((x) => (
        <Path key={x} d={`M${x},26 Q${x - 6},18 ${x},12 Q${x + 6},6 ${x},0`} fill="none" stroke={SOFT.stone} strokeWidth={3} strokeLinecap="round" />
      ))}
      <Path d="M72,50 Q92,50 90,66 Q88,80 70,78" fill="none" {...o} strokeWidth={o.strokeWidth * 2.6} stroke={INK} />
      <Path d="M72,50 Q92,50 90,66 Q88,80 70,78" fill="none" stroke={BRIGHT.red} strokeWidth={o.strokeWidth * 1.2} strokeLinecap="round" />
      <Rect x={18} y={34} width={56} height={62} rx={10} fill={BRIGHT.red} {...o} />
      <Ellipse cx={46} cy={36} rx={26} ry={6} fill="#7A4A30" {...o} />
      <Rect x={34} y={31} width={8} height={7} rx={2} fill={SOFT.white} {...o} />
      <Rect x={48} y={32} width={8} height={7} rx={2} fill={SOFT.white} {...o} />
      <Circle cx={46} cy={66} r={9} fill={SOFT.white} opacity={0.85} />
    </G>
  ),
  teddy: ({ o }) => {
    const fur = '#C68B59';
    return (
      <G>
        <Circle cx={32} cy={22} r={9} fill={fur} {...o} />
        <Circle cx={68} cy={22} r={9} fill={fur} {...o} />
        <Circle cx={32} cy={22} r={4} fill={SOFT.peach} />
        <Circle cx={68} cy={22} r={4} fill={SOFT.peach} />
        <Ellipse cx={28} cy={88} rx={12} ry={9} fill={fur} {...o} />
        <Ellipse cx={72} cy={88} rx={12} ry={9} fill={fur} {...o} />
        <Ellipse cx={50} cy={72} rx={24} ry={22} fill={fur} {...o} />
        <Ellipse cx={50} cy={76} rx={13} ry={12} fill={SOFT.sand} />
        <Ellipse cx={24} cy={66} rx={8} ry={13} fill={fur} transform="rotate(25 24 66)" {...o} />
        <Ellipse cx={76} cy={66} rx={8} ry={13} fill={fur} transform="rotate(-25 76 66)" {...o} />
        <Circle cx={50} cy={38} r={21} fill={fur} {...o} />
        <Ellipse cx={50} cy={46} rx={10} ry={8} fill={SOFT.sand} {...o} />
        <Ellipse cx={50} cy={42} rx={4} ry={3} fill={INK} />
        <Circle cx={42} cy={33} r={3} fill={INK} />
        <Circle cx={58} cy={33} r={3} fill={INK} />
        <Circle cx={43} cy={32} r={1} fill={SHINE} />
        <Circle cx={59} cy={32} r={1} fill={SHINE} />
        <Path d="M44,58 L50,54 L56,58 L50,62 Z" fill={RED} {...o} />
      </G>
    );
  },
  ball: ({ o: base }) => {
    const o = thin(base, 1.55);
    return grow(
      1.55,
    <G>
      <Circle cx={50} cy={70} r={26} fill={BRIGHT.blue} {...o} />
      <Path d="M27,58 Q50,72 73,58 L75,66 Q50,82 25,66 Z" fill={SOFT.white} />
      <Path d="M50,44 Q42,70 50,96" fill="none" stroke={BRIGHT.yellow} strokeWidth={6} />
      <Circle cx={50} cy={70} r={26} fill="none" {...o} />
      {shine(40, 56, 5)}
    </G>
    );
  },
  duck: ({ o: base }) => {
    const o = thin(base, 1.12);
    return grow(
      1.12,
    <G>
      <Path d="M20,74 Q22,96 56,96 Q88,96 86,70 Q84,62 76,66 Q70,58 52,62 Q30,62 20,74 Z" fill={BRIGHT.yellow} {...o} />
      <Path d="M46,78 Q60,70 72,78 Q62,88 46,78 Z" fill={shade(BRIGHT.yellow, 0.12)} {...o} />
      <Circle cx={36} cy={50} r={17} fill={BRIGHT.yellow} {...o} />
      <Path d="M20,52 Q8,50 8,56 Q12,62 22,58 Z" fill={BRIGHT.orange} {...o} />
      <Circle cx={34} cy={46} r={3} fill={INK} />
      <Circle cx={35} cy={45} r={1} fill={SHINE} />
    </G>
    );
  },
  blocks: ({ o }) => (
    <G>
      {[
        [14, 62, BRIGHT.red],
        [52, 62, BRIGHT.blue],
        [33, 28, BRIGHT.green],
      ].map(([x, y, c]) => (
        <G key={`${x}${y}`}>
          <Rect x={Number(x)} y={Number(y)} width={34} height={34} rx={4} fill={String(c)} {...o} />
          <Rect x={Number(x) + 7} y={Number(y) + 7} width={20} height={20} rx={3} fill={tint(String(c), 0.45)} />
        </G>
      ))}
      <Polygon points="31,79 37,69 43,79" fill={SOFT.white} {...o} />
      <Circle cx={69} cy={79} r={5} fill={SOFT.white} {...o} />
      <Rect x={45} y={40} width={10} height={10} rx={1} fill={SOFT.white} {...o} />
    </G>
  ),
  books: ({ o }) => (
    <G>
      {[
        [12, 78, 76, BRIGHT.blue],
        [18, 62, 66, BRIGHT.red],
        [10, 46, 72, BRIGHT.green],
        [22, 30, 58, BRIGHT.yellow],
      ].map(([x, y, w, c]) => (
        <G key={`${y}`}>
          <Rect x={Number(x)} y={Number(y)} width={Number(w)} height={16} rx={3} fill={String(c)} {...o} />
          <Rect x={Number(x) + Number(w) - 10} y={Number(y) + 3} width={7} height={10} fill={SOFT.white} />
          <Line x1={Number(x) + 8} y1={Number(y) + 8} x2={Number(x) + 30} y2={Number(y) + 8} stroke={tint(String(c), 0.5)} strokeWidth={2.5} strokeLinecap="round" />
        </G>
      ))}
    </G>
  ),
  backpack: ({ o }) => (
    <G>
      <Path d="M38,26 Q38,10 50,10 Q62,10 62,26" fill="none" {...o} strokeWidth={o.strokeWidth * 1.6} />
      <Rect x={20} y={24} width={60} height={72} rx={18} fill={BRIGHT.blue} {...o} />
      <Path d="M24,44 Q50,36 76,44" fill="none" {...o} />
      <Rect x={30} y={60} width={40} height={28} rx={9} fill={shade(BRIGHT.blue)} {...o} />
      <Line x1={36} y1={68} x2={64} y2={68} stroke={BRIGHT.yellow} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={66} cy={34} r={4} fill={BRIGHT.yellow} {...o} />
    </G>
  ),
  balloon: ({ o }) => (
    <G>
      <Path d="M50,64 Q44,74 52,82 Q58,90 50,98" fill="none" {...o} strokeWidth={o.strokeWidth * 0.8} />
      <Polygon points="50,60 45,68 55,68" fill={shade(RED)} {...o} />
      <Ellipse cx={50} cy={34} rx={24} ry={29} fill={RED} {...o} />
      {shine(40, 22, 6)}
    </G>
  ),
};

/** Whether this room thing has a drawing (else it shows its emoji). */
export function hasDrawing(id: string | undefined): boolean {
  return !!id && id in DRAWINGS;
}

/** The ids drawn so far, for tests and the style doc. */
export const DRAWN_IDS = Object.keys(DRAWINGS);

interface Props {
  id: string;
  width: number;
  height: number;
}

/** A room thing drawn in the outlined style, sitting on the bottom of its box. */
export function DrawnItem({ id, width, height }: Props) {
  const draw = DRAWINGS[id];
  if (!draw) return null;
  const side = Math.min(width, height);
  // Outline in pixels matches people and furniture of the same height.
  const strokeWidth = (Math.max(1.5, inkWidth(side * 1.4)) * 100) / side;
  const o = { stroke: INK, strokeWidth, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'flex-end' }} accessibilityElementsHidden importantForAccessibility="no">
      <Svg width={side} height={side} viewBox="-3 -3 106 106">
        {draw({ o })}
      </Svg>
    </View>
  );
}
