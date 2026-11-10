import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Pattern, Polygon, Rect } from 'react-native-svg';

import { Text } from '@/components/AppText';
import { DriftLoop } from '@/components/Motion';
import { shade } from '@/constants/artStyle';
import { BACKGROUND_PATTERNS } from '@/constants/patterns';

interface Props {
  /** The themed background's id; themes with a drawn pattern use it. */
  id?: string;
  /** The background colour; the pattern is drawn in a darker shade of it. */
  color?: string;
  /** Emoji for themes without a drawn pattern yet. */
  decor: string[];
}

/** Little drawings in a 24 x 24 box, filled with the pattern colour `c`. */
type Motif = (c: string) => ReactNode;

const MOTIFS: Record<string, Motif> = {
  star: (c) => <Polygon points="12,2 14.9,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.1,8.6" fill={c} strokeLinejoin="round" stroke={c} strokeWidth={1.5} />,
  sparkle: (c) => <Path d="M12,1 Q13.5,10.5 23,12 Q13.5,13.5 12,23 Q10.5,13.5 1,12 Q10.5,10.5 12,1 Z" fill={c} />,
  moon: (c) => <Path d="M15,2 A10,10 0 1 0 22,17 A8,8 0 1 1 15,2 Z" fill={c} />,
  planet: (c) => (
    <G>
      <Circle cx={12} cy={12} r={7} fill={c} />
      <Ellipse cx={12} cy={12} rx={11.5} ry={3.5} fill="none" stroke={c} strokeWidth={2} transform="rotate(-20 12 12)" />
    </G>
  ),
  bubble: (c) => (
    <G>
      <Circle cx={12} cy={12} r={9} fill="none" stroke={c} strokeWidth={2.2} />
      <Circle cx={8.5} cy={8.5} r={2} fill={c} />
    </G>
  ),
  fish: (c) => (
    <G>
      <Ellipse cx={10} cy={12} rx={8} ry={5.5} fill={c} />
      <Polygon points="16,12 23,6 23,18" fill={c} />
      <Circle cx={6.5} cy={10.5} r={1.4} fill="#FFFFFF" />
    </G>
  ),
  wave: (c) => <Path d="M0,14 Q3,8 6,14 T12,14 T18,14 T24,14" fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round" />,
  leaf: (c) => (
    <G>
      <Path d="M3,21 Q3,4 21,3 Q20,21 3,21 Z" fill={c} />
      <Line x1={5} y1={19} x2={16} y2={8} stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
    </G>
  ),
  flower: (c) => (
    <G>
      {[0, 72, 144, 216, 288].map((a) => (
        <Circle key={a} cx={12 + 6 * Math.sin((a * Math.PI) / 180)} cy={12 - 6 * Math.cos((a * Math.PI) / 180)} r={4.5} fill={c} />
      ))}
      <Circle cx={12} cy={12} r={3.2} fill="#FFFFFF" opacity={0.8} />
    </G>
  ),
  heart: (c) => <Path d="M12,21 C4,15 1,11 1,7.5 C1,4 3.6,2 6.5,2 C9,2 11,3.6 12,5.5 C13,3.6 15,2 17.5,2 C20.4,2 23,4 23,7.5 C23,11 20,15 12,21 Z" fill={c} />,
  candy: (c) => (
    <G>
      <Polygon points="2,7 7,12 2,17" fill={c} />
      <Polygon points="22,7 17,12 22,17" fill={c} />
      <Circle cx={12} cy={12} r={6} fill={c} />
      <Path d="M9,9 Q12,12 9,15 M13,8.5 Q16,12 13,15.5" fill="none" stroke="#FFFFFF" strokeWidth={1.3} opacity={0.7} />
    </G>
  ),
  dot: (c) => <Circle cx={12} cy={12} r={5} fill={c} />,
  snowflake: (c) => (
    <G stroke={c} strokeWidth={2} strokeLinecap="round">
      {[0, 60, 120].map((a) => (
        <G key={a} transform={`rotate(${a} 12 12)`}>
          <Line x1={12} y1={1} x2={12} y2={23} />
          <Line x1={12} y1={5} x2={9} y2={2.5} />
          <Line x1={12} y1={5} x2={15} y2={2.5} />
          <Line x1={12} y1={19} x2={9} y2={21.5} />
          <Line x1={12} y1={19} x2={15} y2={21.5} />
        </G>
      ))}
    </G>
  ),
  cloud: (c) => (
    <G fill={c}>
      <Circle cx={8} cy={14} r={5} />
      <Circle cx={13} cy={10} r={6} />
      <Circle cx={18} cy={14} r={4.5} />
      <Rect x={6} y={13} width={14} height={6} rx={3} />
    </G>
  ),
  paw: (c) => (
    <G fill={c}>
      <Ellipse cx={12} cy={16} rx={6} ry={5} />
      <Circle cx={5} cy={10} r={2.5} />
      <Circle cx={9.5} cy={5.5} r={2.5} />
      <Circle cx={14.5} cy={5.5} r={2.5} />
      <Circle cx={19} cy={10} r={2.5} />
    </G>
  ),
  bone: (c) => (
    <G fill={c} transform="rotate(-30 12 12)">
      <Rect x={5} y={9.5} width={14} height={5} rx={2} />
      <Circle cx={4.5} cy={9} r={3} />
      <Circle cx={4.5} cy={15} r={3} />
      <Circle cx={19.5} cy={9} r={3} />
      <Circle cx={19.5} cy={15} r={3} />
    </G>
  ),
  ball: (c) => (
    <G>
      <Circle cx={12} cy={12} r={9.5} fill={c} />
      <Path d="M3,10 Q12,15 21,10 M12,2.5 Q8,12 12,21.5" fill="none" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.75} />
    </G>
  ),
  flame: (c) => <Path d="M12,1 Q19,9 18,15 Q17,22 12,22 Q7,22 6,16 Q5.5,11 9,8 Q9,12 11,13 Q9,6 12,1 Z" fill={c} />,
  cherry: (c) => (
    <G>
      <Path d="M8,15 Q10,6 16,2 M16,15 Q15,8 16,2" fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={7} cy={17} r={4.5} fill={c} />
      <Circle cx={16.5} cy={17} r={4.5} fill={c} />
    </G>
  ),
  gift: (c) => (
    <G>
      <Rect x={3} y={9} width={18} height={13} rx={1.5} fill={c} />
      <Rect x={10.5} y={9} width={3} height={13} fill="#FFFFFF" opacity={0.7} />
      <Path d="M12,9 Q7,2 5,6 Q4,9 12,9 Q20,9 19,6 Q17,2 12,9 Z" fill={c} />
    </G>
  ),
  bell: (c) => (
    <G fill={c}>
      <Path d="M5,18 Q6,16 6,11 Q6,4 12,4 Q18,4 18,11 Q18,16 19,18 Z" />
      <Circle cx={12} cy={20} r={2.2} />
      <Circle cx={12} cy={3} r={1.6} />
    </G>
  ),
  pumpkin: (c) => (
    <G>
      <Path d="M12,6 Q12,3 14.5,2" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx={8} cy={14} rx={5.5} ry={7} fill={c} />
      <Ellipse cx={16} cy={14} rx={5.5} ry={7} fill={c} />
      <Ellipse cx={12} cy={14} rx={5} ry={7.5} fill={c} />
    </G>
  ),
  sun: (c) => (
    <G>
      <Circle cx={12} cy={12} r={5.5} fill={c} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <Line key={a} x1={12} y1={3.5} x2={12} y2={1} stroke={c} strokeWidth={2} strokeLinecap="round" transform={`rotate(${a} 12 12)`} />
      ))}
    </G>
  ),
  coin: (c) => (
    <G>
      <Circle cx={12} cy={12} r={9} fill={c} />
      <Circle cx={12} cy={12} r={5.5} fill="none" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.7} />
    </G>
  ),
  egg: (c) => <Path d="M12,2 Q19,2 19,14 Q19,22 12,22 Q5,22 5,14 Q5,2 12,2 Z" fill={c} />,
};


/** Where the drawings sit in one 180 x 180 tile: x, y, size, turn. Fixed, so nothing jumps. */
const SPOTS: [number, number, number, number][] = [
  [18, 16, 30, -12],
  [110, 30, 22, 10],
  [62, 78, 26, 4],
  [150, 104, 28, -8],
  [24, 124, 22, 14],
  [96, 146, 30, -4],
];
const TILE = 180;

/**
 * A faint drawn pattern behind a screen for the themed backgrounds, in a darker shade of the
 * background colour. The whole field drifts slowly upward and wraps around. Themes without a
 * pattern fall back to their emoji.
 */
export function BackgroundDecor({ id, color, decor }: Props) {
  const motifs = id ? BACKGROUND_PATTERNS[id] : undefined;
  const patternId = `bg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (motifs && color) {
    const ink = shade(color, 0.35);
    const tile = (copy: string) => (
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={`${patternId}${copy}`} width={TILE} height={TILE} patternUnits="userSpaceOnUse">
            {SPOTS.map(([x, y, s, turn], i) => {
              const draw = MOTIFS[motifs[i % motifs.length]] ?? MOTIFS.dot;
              return (
                <G key={i} transform={`translate(${x} ${y}) rotate(${turn} ${s / 2} ${s / 2}) scale(${s / 24})`}>
                  {draw(ink)}
                </G>
              );
            })}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId}${copy})`} opacity={0.32} />
      </Svg>
    );
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <DriftLoop>{tile('a')}</DriftLoop>
      </View>
    );
  }
  if (decor.length === 0) return null;
  return <EmojiDecor decor={decor} />;
}

const COLUMNS = 4;
const ROWS = 9;
const TILT = [-14, 8, -4, 12, -10, 4];

/** The older look: faint emoji scattered in fixed spots. */
function EmojiDecor({ decor }: { decor: string[] }) {
  const spots = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const i = row * COLUMNS + col;
      spots.push(
        <Text
          key={i}
          style={[
            styles.item,
            {
              left: `${col * (100 / COLUMNS) + (row % 2) * (50 / COLUMNS) + 2}%`,
              top: `${row * (100 / ROWS) + 1}%`,
              fontSize: i % 3 === 0 ? 40 : 30,
              transform: [{ rotate: `${TILT[i % TILT.length]}deg` }],
            },
          ]}
        >
          {decor[(i + row) % decor.length]}
        </Text>,
      );
    }
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Drifts up very slowly, so menus feel alive without pulling the eye. */}
      <DriftLoop>{spots}</DriftLoop>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute', opacity: 0.2 },
});
