import { memo, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import {
  BRUSH_SIZES,
  fillsOf,
  labelAt,
  PAINT_COLORS,
  pageOf,
  PAPER_H,
  PAPER_W,
  smoothPath,
  sumFor,
  type BrushAction,
  type Picture,
  type Shape,
} from '@/utils/easel';

interface Props {
  picture: Picture;
  /** Drawn width in points; the height follows the paper's 3 by 4 shape. */
  width: number;
  /** Color by number: write each area's sum in it until it has the right color. */
  numbers?: boolean;
  /** Areas to point out (the ones still wrong after Check). */
  flash?: ReadonlySet<number>;
  style?: ViewStyle;
}

const OUTLINE = '#2B2B2B';

/**
 * A picture from the School easel, drawn with SVG: the page's areas with their
 * fills, then the brush lines, then the page's outlines on top, so painting
 * never hides the lines of a coloring page.
 */
export function PaintingView({ picture, width, numbers = false, flash, style }: Props) {
  const page = pageOf(picture.page);
  const fills = useMemo(() => fillsOf(picture.actions, page.regions.length), [picture.actions, page]);
  const brush = picture.actions.filter((a): a is BrushAction => a.k === 's');
  const height = (width * PAPER_H) / PAPER_W;
  const small = width < 160;
  return (
    <View style={[{ width, height, backgroundColor: '#FFFFFF' }, style]} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${PAPER_W} ${PAPER_H}`}>
        {page.regions.map((r, i) => (
          <ShapeView key={i} shape={r.shape} fill={PAINT_COLORS[fills[i]] ?? '#FFFFFF'} />
        ))}
        <Strokes strokes={brush} />
        {page.regions.map((r, i) =>
          r.line === false && !flash?.has(i) ? null : (
            <ShapeView
              key={i}
              shape={r.shape}
              fill="none"
              stroke={flash?.has(i) ? '#FF1744' : OUTLINE}
              strokeWidth={flash?.has(i) ? 12 : small ? 8 : 5}
            />
          ),
        )}
        {page.lines?.map((d, i) => (
          <Path key={i} d={d} stroke={OUTLINE} strokeWidth={small ? 8 : 5} strokeLinecap="round" fill="none" />
        ))}
        {numbers && picture.lv !== null && !small
          ? page.regions.map((r, i) => {
              if (r.n === undefined || fills[i] === r.n) return null;
              const [x, y] = labelAt(r);
              const text = sumFor(r.n, picture.lv!, `${page.id}:${i}`);
              return (
                <G key={i}>
                  <SvgText x={x} y={y + 10} fontSize={28} fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" stroke="#FFFFFF" strokeWidth={7} fill="#FFFFFF">
                    {text}
                  </SvgText>
                  <SvgText x={x} y={y + 10} fontSize={28} fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" fill="#263238">
                    {text}
                  </SvgText>
                </G>
              );
            })
          : null}
      </Svg>
    </View>
  );
}

/** The brush lines; each one is drawn once and kept until it changes. */
const Strokes = memo(function Strokes({ strokes }: { strokes: BrushAction[] }) {
  return (
    <>
      {strokes.map((s) => (
        <Stroke key={s.id} stroke={s} />
      ))}
    </>
  );
});

const Stroke = memo(function Stroke({ stroke }: { stroke: BrushAction }) {
  return (
    <Path
      d={smoothPath(stroke.p)}
      stroke={PAINT_COLORS[stroke.c] ?? PAINT_COLORS[1]}
      strokeWidth={BRUSH_SIZES[stroke.w] ?? BRUSH_SIZES[1]}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
});

function ShapeView({ shape, fill, stroke, strokeWidth }: { shape: Shape; fill: string; stroke?: string; strokeWidth?: number }) {
  const look = { fill, stroke, strokeWidth, strokeLinejoin: 'round' as const };
  switch (shape.s) {
    case 'r':
      return <Rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} {...look} />;
    case 'c':
      return <Circle cx={shape.x} cy={shape.y} r={shape.r} {...look} />;
    case 'e':
      return <Ellipse cx={shape.x} cy={shape.y} rx={shape.rx} ry={shape.ry} {...look} />;
    case 'p':
      return <Polygon points={shape.pts.join(' ')} {...look} />;
  }
}

/** A picture in a wooden frame, as it hangs in the buddies' home. */
export function FramedPicture({ picture, width, height }: { picture?: Picture; width: number; height: number }) {
  const border = Math.max(3, Math.round(width * 0.08));
  const inner = Math.min(width - border * 2, ((height - border * 2) * PAPER_W) / PAPER_H);
  return (
    <View style={[styles.frame, { width, height, borderWidth: border }]}>
      {picture ? <PaintingView picture={picture} width={inner} /> : <View style={[styles.empty, { width: inner, height: (inner * PAPER_H) / PAPER_W }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderColor: '#A86B45', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  empty: { backgroundColor: '#FFF8E1' },
});
