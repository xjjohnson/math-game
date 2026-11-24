import { useId, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { INK, shade, tint } from '@/constants/artStyle';
import { findBlanket, type Blanket, type BlanketId } from '@/constants/fort';

/**
 * The blanket fort, drawn in code in the game's outlined style: two chairs with a big blanket
 * over them, clothespins on top, pillows peeking out and a flap tied back from the door.
 * It's our own simple drawing, not copied from any app.
 */

const WOOD = '#B07A4F';
const PIN = '#F2C45A';
const PILLOWS = ['#FFFDF8', '#F7C6D9', '#BFE3F7'];

function starPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/** The blanket's pattern over a box, `cell` pixels to a repeat. Clip it to the blanket's shape. */
export function blanketMarks(b: Blanket, x: number, y: number, w: number, h: number, cell: number): ReactNode {
  const cols = Math.ceil(w / cell) + 1;
  const rows = Math.ceil(h / cell) + 1;
  const out: ReactNode[] = [<Rect key="base" x={x} y={y} width={w} height={h} fill={b.base} />];
  if (b.id === 'stars') {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const cx = x + c * cell + (r % 2 ? cell / 2 : 0);
        const cy = y + r * cell + cell * 0.4;
        out.push(<Polygon key={`s${r}-${c}`} points={starPoints(cx, cy, cell * ((r + c) % 3 ? 0.16 : 0.24))} fill={b.marks[(r + c) % 2]} />);
      }
  } else if (b.id === 'stripes') {
    for (let c = 0; c < cols * 2; c++) {
      if (c % 2) continue;
      out.push(<Rect key={`t${c}`} x={x + (c * cell) / 2} y={y} width={cell * 0.28} height={h} fill={b.marks[(c / 2) % 2]} />);
    }
  } else if (b.id === 'plaid') {
    for (let i = 0; i < Math.max(cols, rows); i++) {
      out.push(<Rect key={`v${i}`} x={x + i * cell} y={y} width={cell * 0.34} height={h} fill={b.marks[0]} opacity={0.45} />);
      out.push(<Rect key={`h${i}`} x={x} y={y + i * cell} width={w} height={cell * 0.34} fill={b.marks[0]} opacity={0.45} />);
      out.push(<Rect key={`vl${i}`} x={x + i * cell + cell * 0.62} y={y} width={cell * 0.06} height={h} fill={b.marks[1]} opacity={0.8} />);
      out.push(<Rect key={`hl${i}`} x={x} y={y + i * cell + cell * 0.62} width={w} height={cell * 0.06} fill={b.marks[1]} opacity={0.8} />);
    }
  } else if (b.id === 'dots') {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        out.push(<Circle key={`d${r}-${c}`} cx={x + c * cell + (r % 2 ? cell / 2 : 0)} cy={y + r * cell + cell / 2} r={cell * 0.18} fill={b.marks[0]} />);
  } else if (b.id === 'rainbow') {
    const band = Math.max(cell * 0.5, h / b.marks.length);
    for (let i = 0; i * band < h; i++) out.push(<Rect key={`r${i}`} x={x} y={y + i * band} width={w} height={band + 0.5} fill={b.marks[i % b.marks.length]} />);
  } else {
    // Patchwork: squares of different cloth with dashed stitches between.
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        out.push(<Rect key={`q${r}-${c}`} x={x + c * cell} y={y + r * cell} width={cell} height={cell} fill={b.marks[(r * 2 + c) % b.marks.length]} />);
    for (let i = 1; i < Math.max(cols, rows); i++) {
      out.push(<Line key={`qv${i}`} x1={x + i * cell} y1={y} x2={x + i * cell} y2={y + h} stroke={b.base} strokeWidth={cell * 0.05} strokeDasharray={`${cell * 0.1},${cell * 0.08}`} />);
      out.push(<Line key={`qh${i}`} x1={x} y1={y + i * cell} x2={x + w} y2={y + i * cell} stroke={b.base} strokeWidth={cell * 0.05} strokeDasharray={`${cell * 0.1},${cell * 0.08}`} />);
    }
  }
  return out;
}

/** A plain sheet of blanket, for the swatches and the fort's inside walls. */
export function BlanketSheet({ blanket, width, height, cell, style }: { blanket: BlanketId; width: number; height: number; cell?: number; style?: StyleProp<ViewStyle> }) {
  const b = findBlanket(blanket);
  if (!b) return null;
  return (
    <View style={[{ width, height }, style]} pointerEvents="none">
      <Svg width={width} height={height}>
        {blanketMarks(b, 0, 0, width, height, cell ?? Math.max(10, Math.min(width, height) / 3))}
      </Svg>
    </View>
  );
}

interface Props {
  width: number;
  height: number;
  /** The blanket over it, or null while it's still folded up waiting to be set up. */
  blanket: BlanketId | null;
  /** A little flag on top (unlocked by stars). */
  flag?: boolean;
  /** Lit from inside in a dark room. */
  glowing?: boolean;
}

/** The fort outside: 155 x 100 units, standing on its bottom edge. */
export function BlanketFort({ width, height, blanket, flag, glowing }: Props) {
  const clip = `fort${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const o = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const b = blanket ? findBlanket(blanket) : undefined;

  const chair = (x: number, flip: boolean) => (
    <G key={`chair${x}`} transform={flip ? `translate(${2 * x},0) scale(-1,1)` : undefined}>
      <Rect x={x - 3} y={24} width={7} height={73} rx={2} fill={WOOD} {...o} />
      <Rect x={x - 3} y={60} width={26} height={7} rx={2} fill={WOOD} {...o} />
      <Rect x={x + 18} y={64} width={6} height={33} rx={2} fill={shade(WOOD)} {...o} />
    </G>
  );

  if (!b) {
    // Folded up: two chairs and a neat stack of folded blankets and pillows between them.
    return (
      <View style={{ width, height }} pointerEvents="none">
        <Svg width={width} height={height} viewBox="0 0 155 100">
          {chair(22, false)}
          {chair(133, true)}
          <Rect x={46} y={76} width={64} height={21} rx={6} fill="#3C4F9E" {...o} />
          <Rect x={50} y={60} width={56} height={17} rx={6} fill="#E8473F" {...o} />
          <Rect x={54} y={46} width={48} height={15} rx={6} fill="#7FC8A9" {...o} />
          <Ellipse cx={78} cy={40} rx={20} ry={8} fill={PILLOWS[1]} {...o} />
          <Polygon points={starPoints(78, 18, 9)} fill="#FFD54F" {...o} strokeWidth={2} />
        </Svg>
      </View>
    );
  }

  // The blanket hangs from the chair backs, dips between them and falls to the floor in folds.
  const drape = 'M6,97 C8,70 6,44 14,24 Q46,32 78,30 Q110,32 141,24 C149,44 147,70 149,97 Q138,92 128,97 Q116,92 104,97 L52,97 Q40,92 28,97 Q16,92 6,97 Z';
  const door = 'M56,97 C56,74 64,56 78,56 C92,56 100,74 100,97 Z';
  return (
    <View style={{ width, height }} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 155 100">
        <Defs>
          <ClipPath id={clip}>
            <Path d={drape} />
          </ClipPath>
        </Defs>
        {chair(14, false)}
        {chair(141, true)}
        {flag ? (
          <G>
            <Line x1={78} y1={30} x2={78} y2={4} {...o} />
            <Path d="M78,5 L96,10 L78,16 Z" fill="#E8473F" {...o} strokeWidth={2} />
          </G>
        ) : null}
        <G clipPath={`url(#${clip})`}>
          {blanketMarks(b, 0, 0, 155, 100, 17)}
          {/* Soft shading in the folds. */}
          <Path d="M30,40 Q34,70 28,97 M126,40 Q122,70 128,97" stroke={shade(b.base, 0.3)} strokeWidth={5} opacity={0.35} fill="none" />
        </G>
        <Path d={drape} fill="none" {...o} />
        {/* Inside is dark (or glowing), with pillows in the doorway. */}
        <Path d={door} fill={glowing ? '#FFE9A8' : '#3A2A33'} {...o} />
        {glowing ? <Ellipse cx={78} cy={84} rx={16} ry={10} fill="#FFF6D5" opacity={0.9} /> : null}
        <Ellipse cx={66} cy={93} rx={11} ry={5} fill={PILLOWS[2]} {...o} strokeWidth={2} />
        <Ellipse cx={90} cy={93} rx={11} ry={5} fill={PILLOWS[0]} {...o} strokeWidth={2} />
        {/* The flap, tied back to the right of the door. */}
        <G>
          <Path d="M92,58 Q104,70 108,97 L98,97 Q98,76 92,58 Z" fill={tint(b.base, 0.15)} {...o} strokeWidth={2} />
          <Path d="M101,78 L108,74" stroke="#E8473F" strokeWidth={3} strokeLinecap="round" />
        </G>
        {/* Clothespins holding the blanket on the chair backs. */}
        {[14, 141].map((x) => (
          <Rect key={x} x={x - 3} y={20} width={6} height={13} rx={2} fill={PIN} {...o} strokeWidth={2} />
        ))}
        {/* Pillows peeking out at the sides. */}
        <Ellipse cx={20} cy={95} rx={12} ry={5} fill={PILLOWS[1]} {...o} strokeWidth={2} />
        <Ellipse cx={136} cy={95} rx={12} ry={5} fill={PILLOWS[2]} {...o} strokeWidth={2} />
      </Svg>
    </View>
  );
}
