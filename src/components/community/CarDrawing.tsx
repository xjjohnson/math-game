import { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { CAR_PAINTS, type CarShape } from '@/constants/cars';
import { INK, shade, SHADOW, tint } from '@/constants/artStyle';

/** Size of the box a car is drawn in (it faces right, its middle in the middle of the box). */
export const CAR_BOX = 96;

const RAINBOW = ['#E8473F', '#F28C28', '#FFC93C', '#3FB66B', '#3A86E8', '#8E5BD8'];
const GLASS = '#CFEAF8';
const TYRE = '#3B3B45';

interface Props {
  shape: CarShape;
  paint: number;
  stripe?: boolean;
  /** Buddy heads riding along (0 to 3), drawn as little round faces. */
  riders?: number;
  /** Fire truck lights on. */
  flash?: boolean;
  /** Draw at this size (the box is square). */
  size?: number;
}

/**
 * A car seen from above with a little tilt, facing right, in the game's outlined style.
 * All original shapes drawn in code.
 */
export const CarDrawing = memo(function CarDrawing({ shape, paint, stripe = false, riders = 0, flash = false, size = CAR_BOX }: Props) {
  const body = CAR_PAINTS[paint] ?? CAR_PAINTS[0];
  const dark = shade(body);
  const light = tint(body, 0.45);
  const long = shape === 'bus' ? 84 : shape === 'fire' || shape === 'van' ? 76 : shape === 'racer' ? 72 : shape === 'tractor' ? 56 : 66;
  const wide = shape === 'bus' || shape === 'fire' ? 40 : shape === 'racer' ? 32 : 36;
  const x0 = -long / 2;
  const y0 = -wide / 2;
  const sw = 2.5;
  return (
    <Svg width={size} height={size} viewBox={`${-CAR_BOX / 2} ${-CAR_BOX / 2} ${CAR_BOX} ${CAR_BOX}`}>
      {/* Shadow on the road. */}
      <Ellipse cx={1} cy={5} rx={long * 0.55} ry={wide * 0.62} fill={SHADOW} />
      {/* Wheels peek out on both sides. */}
      {wheels(shape, long, wide).map(([x, r], i) => (
        <G key={i}>
          <Rect x={x - r} y={y0 - 5} width={r * 2} height={9} rx={4} fill={TYRE} stroke={INK} strokeWidth={2} />
          <Rect x={x - r} y={-y0 - 4} width={r * 2} height={9} rx={4} fill={TYRE} stroke={INK} strokeWidth={2} />
        </G>
      ))}
      {shape === 'tractor' ? (
        <G>
          {/* Big back wheels and a bonnet in front. */}
          <Rect x={x0 + 2} y={y0 - 9} width={24} height={12} rx={5} fill={TYRE} stroke={INK} strokeWidth={2} />
          <Rect x={x0 + 2} y={-y0 - 3} width={24} height={12} rx={5} fill={TYRE} stroke={INK} strokeWidth={2} />
          <Rect x={x0 + 18} y={-11} width={long / 2 + 10} height={22} rx={8} fill={body} stroke={INK} strokeWidth={sw} />
          <Rect x={x0 + 2} y={y0 + 2} width={26} height={wide - 4} rx={8} fill={dark} stroke={INK} strokeWidth={sw} />
          <Rect x={x0 + 6} y={y0 + 6} width={18} height={wide - 12} rx={6} fill={GLASS} stroke={INK} strokeWidth={2} />
          <Rect x={long / 2 - 16} y={-14} width={6} height={10} rx={3} fill="#5F6B7A" stroke={INK} strokeWidth={2} />
        </G>
      ) : (
        <G>
          {/* The body: a rounded box, darker along its lower side. */}
          <Rect x={x0} y={y0} width={long} height={wide} rx={shape === 'bus' ? 9 : 14} fill={body} stroke={INK} strokeWidth={sw} />
          <Rect x={x0 + 4} y={-y0 - 9} width={long - 8} height={6} rx={3} fill={dark} />
          {stripe ? RAINBOW.map((c, i) => <Rect key={c} x={x0 + 6} y={-6 + i * 2} width={long - 12} height={2} fill={c} />) : null}
          {cabin(shape, long, wide, body, light, dark)}
        </G>
      )}
      {/* Headlights. */}
      <Circle cx={long / 2 - 4} cy={y0 + 7} r={3.5} fill="#FFF1A8" stroke={INK} strokeWidth={1.5} />
      <Circle cx={long / 2 - 4} cy={-y0 - 7} r={3.5} fill="#FFF1A8" stroke={INK} strokeWidth={1.5} />
      {/* Riders: round little heads. */}
      {Array.from({ length: Math.min(riders, 3) }, (_, i) => {
        const cx = shape === 'pickup' ? x0 + 12 + i * 9 : shape === 'bus' ? x0 + 16 + i * 16 : x0 + 14;
        const cy = shape === 'pickup' || shape === 'bus' ? (i % 2 ? 6 : -6) : 0;
        return <Circle key={i} cx={cx} cy={cy} r={6} fill={['#F3DDB3', '#FFC9A8', '#CDB8F0'][i]} stroke={INK} strokeWidth={2} />;
      })}
      {shape === 'fire' ? (
        <G>
          <Rect x={-4} y={-8} width={8} height={16} rx={3} fill={flash ? '#FFC93C' : '#E8473F'} stroke={INK} strokeWidth={2} />
          <Rect x={-2} y={-3} width={4} height={6} fill={flash ? '#3A86E8' : '#FFFDF8'} />
        </G>
      ) : null}
    </Svg>
  );
});

/** Where the wheels sit along the car, and how long each one shows. */
function wheels(shape: CarShape, long: number, wide: number): [number, number][] {
  void wide;
  if (shape === 'tractor') return [[long / 2 - 10, 7]];
  if (shape === 'bus' || shape === 'fire') return [
    [-long / 2 + 14, 8],
    [long / 2 - 14, 8],
    [-long / 2 + 30, 8],
  ];
  return [
    [-long / 2 + 14, 8],
    [long / 2 - 14, 8],
  ];
}

/** Roof, windows and the bits that make each car its own. */
function cabin(shape: CarShape, long: number, wide: number, body: string, light: string, dark: string) {
  const sw = 2.5;
  const y0 = -wide / 2;
  switch (shape) {
    case 'pickup':
      return (
        <G>
          {/* Open bed behind the cab. */}
          <Rect x={-long / 2 + 4} y={y0 + 5} width={long * 0.42} height={wide - 10} rx={4} fill={dark} stroke={INK} strokeWidth={2} />
          <Rect x={-2} y={y0 + 4} width={long * 0.3} height={wide - 8} rx={6} fill={GLASS} stroke={INK} strokeWidth={sw} />
          <Rect x={3} y={y0 + 8} width={long * 0.18} height={wide - 16} rx={4} fill={light} stroke={INK} strokeWidth={2} />
        </G>
      );
    case 'bus':
      return (
        <G>
          <Rect x={-long / 2 + 6} y={y0 + 5} width={long - 18} height={wide - 10} rx={6} fill={light} stroke={INK} strokeWidth={2} />
          {[0, 1, 2, 3].map((i) => (
            <Rect key={i} x={-long / 2 + 10 + i * 16} y={y0 + 2} width={10} height={4} rx={2} fill={GLASS} stroke={INK} strokeWidth={1.5} />
          ))}
          <Rect x={long / 2 - 14} y={y0 + 5} width={8} height={wide - 10} rx={3} fill={GLASS} stroke={INK} strokeWidth={2} />
        </G>
      );
    case 'icecream':
      return (
        <G>
          <Rect x={-long / 2 + 4} y={y0 + 4} width={long * 0.6} height={wide - 8} rx={8} fill="#FFFDF8" stroke={INK} strokeWidth={2} />
          {/* A big cone on the roof. */}
          <Path d="M-12 -3 L-4 12 L4 -3 Z" fill="#D9A66B" stroke={INK} strokeWidth={2} />
          <Circle cx={-4} cy={-6} r={8} fill="#F7B6C2" stroke={INK} strokeWidth={2} />
          <Rect x={long / 2 - 20} y={y0 + 5} width={12} height={wide - 10} rx={4} fill={GLASS} stroke={INK} strokeWidth={2} />
        </G>
      );
    case 'van':
      return (
        <G>
          <Rect x={-long / 2 + 4} y={y0 + 4} width={long * 0.64} height={wide - 8} rx={6} fill={light} stroke={INK} strokeWidth={2} />
          {/* A loaf on the roof sign. */}
          <Ellipse cx={-8} cy={0} rx={12} ry={7} fill="#E9A85C" stroke={INK} strokeWidth={2} />
          <Path d="M-13 -4 l-2 8 M-8 -5 l-2 10 M-3 -4 l-2 8" stroke={INK} strokeWidth={1.5} />
          <Rect x={long / 2 - 20} y={y0 + 5} width={12} height={wide - 10} rx={4} fill={GLASS} stroke={INK} strokeWidth={2} />
        </G>
      );
    case 'fire':
      return (
        <G>
          {/* Ladder along the top. */}
          <Rect x={-long / 2 + 6} y={-6} width={long * 0.62} height={12} rx={2} fill="#CFC8C0" stroke={INK} strokeWidth={2} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Path key={i} d={`M${-long / 2 + 12 + i * 9} -6 v12`} stroke={INK} strokeWidth={1.5} />
          ))}
          <Rect x={long / 2 - 18} y={y0 + 5} width={12} height={wide - 10} rx={4} fill={GLASS} stroke={INK} strokeWidth={2} />
        </G>
      );
    case 'racer':
      return (
        <G>
          {/* Spoiler at the back, a long nose and one seat. */}
          <Rect x={-long / 2 - 3} y={y0 - 2} width={8} height={wide + 4} rx={3} fill={shade(body, 0.3)} stroke={INK} strokeWidth={2} />
          <Ellipse cx={-4} cy={0} rx={12} ry={9} fill={GLASS} stroke={INK} strokeWidth={sw} />
          <Rect x={8} y={-3} width={long / 2 - 12} height={6} rx={3} fill="#FFFDF8" />
        </G>
      );
    default:
      return (
        <G>
          <Rect x={-long / 2 + 12} y={y0 + 4} width={long * 0.52} height={wide - 8} rx={9} fill={GLASS} stroke={INK} strokeWidth={sw} />
          <Rect x={-long / 2 + 18} y={y0 + 8} width={long * 0.32} height={wide - 16} rx={6} fill={light} stroke={INK} strokeWidth={2} />
        </G>
      );
  }
}
