import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import { Spin } from '@/components/Motion';
import { BRIGHT, INK, inkWidth, shade, SHINE, SOFT, tint } from '@/constants/artStyle';
import { findFilament, PRINT_MS, RAINBOW, type FilamentId, type PrintToyId } from '@/constants/printer';
import { useMotion } from '@/hooks/useAccessibility';

/**
 * The 3D printer and the toys it makes, drawn in code in the game's outlined style.
 * Everything here is our own simple drawing: no real printer brand or toy is copied.
 */

type Outline = { stroke: string; strokeWidth: number; strokeLinejoin: 'round'; strokeLinecap: 'round' };

/** What each toy drawing gets: the outline, and the colour of part `i` (a rainbow print cycles colours). */
interface ToyKit {
  o: Outline;
  c: (i: number) => string;
  dark: (i: number) => string;
}

const EYE = INK;

const eye = (cx: number, cy: number, r = 3.2) => (
  <G>
    <Circle cx={cx} cy={cy} r={r} fill={EYE} />
    <Circle cx={cx + r * 0.35} cy={cy - r * 0.35} r={r * 0.35} fill={SHINE} />
  </G>
);

/** Each toy fills a 100 x 100 box standing on its bottom edge (y = 97). */
const TOYS: Record<PrintToyId, (k: ToyKit) => ReactNode> = {
  star: ({ o, c }) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? 17 : 40;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      return `${50 + r * Math.cos(a)},${56 + r * Math.sin(a)}`;
    }).join(' ');
    return (
      <G>
        <Polygon points={pts} fill={c(0)} {...o} />
        {eye(43, 56)}
        {eye(57, 56)}
        <Path d="M45,65 Q50,70 55,65" fill="none" {...o} />
      </G>
    );
  },
  heart: ({ o, c, dark }) => (
    <G>
      <Path d="M50,94 C18,72 6,52 14,34 C22,16 44,18 50,34 C56,18 78,16 86,34 C94,52 82,72 50,94 Z" fill={c(0)} {...o} />
      <Path d="M24,36 Q28,28 36,28" fill="none" stroke={tint(c(0), 0.5)} strokeWidth={4} strokeLinecap="round" />
      <Path d="M62,80 Q74,70 80,58" fill="none" stroke={dark(0)} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
    </G>
  ),
  boat: ({ o, c, dark }) => (
    <G>
      <Line x1={50} y1={14} x2={50} y2={72} {...o} />
      <Path d="M53,16 L84,62 L53,62 Z" fill={c(1)} {...o} />
      <Path d="M47,26 L22,62 L47,62 Z" fill={c(2)} {...o} />
      <Path d="M8,70 L92,70 L78,94 L22,94 Z" fill={c(0)} {...o} />
      <Line x1={16} y1={80} x2={84} y2={80} stroke={dark(0)} strokeWidth={3} />
      <Circle cx={36} cy={86} r={3} fill={tint(c(0), 0.5)} {...o} />
      <Circle cx={64} cy={86} r={3} fill={tint(c(0), 0.5)} {...o} />
    </G>
  ),
  cat: ({ o, c, dark }) => (
    <G>
      <Path d="M74,90 Q96,84 90,62 Q87,54 80,58" fill="none" {...o} stroke={INK} strokeWidth={o.strokeWidth * 3.2} />
      <Path d="M74,90 Q96,84 90,62 Q87,54 80,58" fill="none" stroke={c(1)} strokeWidth={o.strokeWidth * 1.8} strokeLinecap="round" />
      <Ellipse cx={50} cy={74} rx={28} ry={22} fill={c(0)} {...o} />
      <Path d="M27,36 L30,10 L46,26 Z" fill={c(1)} {...o} />
      <Path d="M73,36 L70,10 L54,26 Z" fill={c(1)} {...o} />
      <Circle cx={50} cy={40} r={22} fill={c(0)} {...o} />
      {eye(42, 38)}
      {eye(58, 38)}
      <Path d="M47,46 L53,46 L50,50 Z" fill={BRIGHT.pink} {...o} strokeWidth={o.strokeWidth * 0.6} />
      <Path d="M44,53 Q50,57 56,53" fill="none" {...o} />
      <Ellipse cx={40} cy={95} rx={8} ry={4} fill={dark(0)} {...o} />
      <Ellipse cx={60} cy={95} rx={8} ry={4} fill={dark(0)} {...o} />
    </G>
  ),
  dino: ({ o, c, dark }) => (
    <G>
      <Path d="M20,72 Q4,70 2,52 Q14,64 26,62 Z" fill={c(0)} {...o} />
      <Rect x={28} y={74} width={12} height={22} rx={5} fill={dark(0)} {...o} />
      <Rect x={58} y={74} width={12} height={22} rx={5} fill={dark(0)} {...o} />
      <Ellipse cx={48} cy={66} rx={30} ry={18} fill={c(0)} {...o} />
      <Path d="M66,58 Q70,30 78,18 L88,22 Q82,36 80,62 Z" fill={c(0)} {...o} />
      <Ellipse cx={86} cy={18} rx={12} ry={9} fill={c(0)} {...o} />
      {eye(88, 15, 2.6)}
      {[34, 46, 58].map((x, i) => (
        <Circle key={x} cx={x} cy={56 + (i % 2) * 4} r={4} fill={c(1)} stroke={dark(1)} strokeWidth={1.5} />
      ))}
    </G>
  ),
  raceCar: ({ o, c, dark }) => (
    <G>
      <Path d="M6,82 L10,64 Q14,58 26,58 L40,58 L48,44 L70,44 L76,58 L90,62 Q96,66 94,82 Z" fill={c(0)} {...o} />
      <Path d="M50,48 L54,58 L72,58 L68,48 Z" fill={SOFT.sky} {...o} />
      <Rect x={2} y={52} width={14} height={8} rx={2} fill={c(1)} {...o} />
      <Circle cx={36} cy={70} r={8} fill={SOFT.white} {...o} />
      <Line x1={36} y1={64} x2={36} y2={76} stroke={dark(0)} strokeWidth={3} />
      <Circle cx={26} cy={86} r={11} fill="#5B5368" {...o} />
      <Circle cx={26} cy={86} r={4} fill={SOFT.stone} />
      <Circle cx={76} cy={86} r={11} fill="#5B5368" {...o} />
      <Circle cx={76} cy={86} r={4} fill={SOFT.stone} />
    </G>
  ),
  rocket: ({ o, c, dark }) => (
    <G>
      <Path d="M32,66 L16,90 L36,84 Z" fill={c(1)} {...o} />
      <Path d="M68,66 L84,90 L64,84 Z" fill={c(1)} {...o} />
      <Path d="M50,4 Q74,24 70,70 L66,88 L34,88 L30,70 Q26,24 50,4 Z" fill={c(0)} {...o} />
      <Path d="M36,20 Q50,6 64,20 Z" fill={c(2)} {...o} />
      <Circle cx={50} cy={44} r={11} fill={SOFT.sky} {...o} />
      <Path d="M45,39 Q48,36 52,37" fill="none" stroke={SHINE} strokeWidth={3} strokeLinecap="round" />
      <Rect x={40} y={88} width={20} height={8} rx={3} fill={dark(0)} {...o} />
    </G>
  ),
  robot: ({ o, c, dark }) => (
    <G>
      <Line x1={50} y1={6} x2={50} y2={18} {...o} />
      <Circle cx={50} cy={6} r={4} fill={BRIGHT.red} {...o} />
      <Rect x={28} y={18} width={44} height={30} rx={8} fill={c(0)} {...o} />
      <Rect x={36} y={26} width={28} height={14} rx={5} fill={SOFT.white} {...o} />
      {eye(44, 33, 2.8)}
      {eye(56, 33, 2.8)}
      <Rect x={14} y={54} width={10} height={26} rx={5} fill={dark(0)} {...o} />
      <Rect x={76} y={54} width={10} height={26} rx={5} fill={dark(0)} {...o} />
      <Rect x={24} y={50} width={52} height={34} rx={8} fill={c(1)} {...o} />
      <Circle cx={40} cy={66} r={4} fill={BRIGHT.yellow} {...o} />
      <Circle cx={60} cy={66} r={4} fill={BRIGHT.green} {...o} />
      <Rect x={32} y={84} width={12} height={12} rx={3} fill={dark(1)} {...o} />
      <Rect x={56} y={84} width={12} height={12} rx={3} fill={dark(1)} {...o} />
    </G>
  ),
  octopus: ({ o, c }) => (
    <G>
      {[16, 32, 50, 68, 84].map((x, i) => (
        <Path
          key={x}
          d={`M${x},62 Q${x + (i % 2 ? 6 : -6)},80 ${x + (x < 50 ? -6 : x > 50 ? 6 : 0)},92 Q${x + (x < 50 ? -12 : x > 50 ? 12 : 0)},96 ${x + (x < 50 ? -14 : x > 50 ? 14 : 4)},88`}
          fill="none"
          stroke={INK}
          strokeWidth={o.strokeWidth * 3.6}
          strokeLinecap="round"
        />
      ))}
      {[16, 32, 50, 68, 84].map((x, i) => (
        <Path
          key={`in${x}`}
          d={`M${x},62 Q${x + (i % 2 ? 6 : -6)},80 ${x + (x < 50 ? -6 : x > 50 ? 6 : 0)},92 Q${x + (x < 50 ? -12 : x > 50 ? 12 : 0)},96 ${x + (x < 50 ? -14 : x > 50 ? 14 : 4)},88`}
          fill="none"
          stroke={c(i + 1)}
          strokeWidth={o.strokeWidth * 2}
          strokeLinecap="round"
        />
      ))}
      <Path d="M14,66 Q10,10 50,10 Q90,10 86,66 Z" fill={c(0)} {...o} />
      {eye(40, 44, 4)}
      {eye(60, 44, 4)}
      <Path d="M44,56 Q50,61 56,56" fill="none" {...o} />
      <Circle cx={34} cy={24} r={4} fill={tint(c(0), 0.4)} />
      <Circle cx={66} cy={28} r={3} fill={tint(c(0), 0.4)} />
    </G>
  ),
  castle: ({ o, c, dark }) => (
    <G>
      <Path d="M24,46 L24,38 L32,38 L32,44 L40,44 L40,38 L48,38 L48,44 L52,44 L52,38 L60,38 L60,44 L68,44 L68,38 L76,38 L76,46 Z" fill={c(0)} {...o} />
      <Rect x={24} y={46} width={52} height={50} fill={c(0)} {...o} />
      <Rect x={6} y={30} width={20} height={66} fill={c(1)} {...o} />
      <Rect x={74} y={30} width={20} height={66} fill={c(1)} {...o} />
      <Path d="M3,32 L16,8 L29,32 Z" fill={c(2)} {...o} />
      <Path d="M71,32 L84,8 L97,32 Z" fill={c(2)} {...o} />
      <Path d="M40,96 L40,74 Q50,62 60,74 L60,96 Z" fill={dark(0)} {...o} />
      <Rect x={12} y={46} width={8} height={12} rx={4} fill={dark(1)} {...o} />
      <Rect x={80} y={46} width={8} height={12} rx={4} fill={dark(1)} {...o} />
    </G>
  ),
  dragon: ({ o, c, dark }) => (
    <G>
      <Path d="M28,78 Q6,82 4,64 L12,70 L10,60 Q18,72 30,68 Z" fill={c(0)} {...o} />
      <Path d="M44,56 Q40,22 64,14 Q58,34 70,40 Q60,44 56,56 Z" fill={c(1)} {...o} />
      <Ellipse cx={48} cy={74} rx={24} ry={18} fill={c(0)} {...o} />
      <Ellipse cx={50} cy={80} rx={12} ry={10} fill={tint(c(0), 0.45)} {...o} />
      <Rect x={34} y={86} width={10} height={10} rx={4} fill={dark(0)} {...o} />
      <Rect x={54} y={86} width={10} height={10} rx={4} fill={dark(0)} {...o} />
      <Path d="M70,38 L68,24 L76,32 Z" fill={c(2)} {...o} />
      <Path d="M82,38 L84,24 L88,34 Z" fill={c(2)} {...o} />
      <Ellipse cx={76} cy={50} rx={18} ry={15} fill={c(0)} {...o} />
      <Ellipse cx={88} cy={56} rx={8} ry={6} fill={tint(c(0), 0.3)} {...o} />
      {eye(76, 46, 3)}
      <Circle cx={90} cy={54} r={1.5} fill={INK} />
    </G>
  ),
  trophy: ({ o, c, dark }) => (
    <G>
      <Path d="M28,22 Q8,22 12,40 Q16,54 34,54" fill="none" {...o} strokeWidth={o.strokeWidth * 2.2} stroke={INK} />
      <Path d="M72,22 Q92,22 88,40 Q84,54 66,54" fill="none" {...o} strokeWidth={o.strokeWidth * 2.2} stroke={INK} />
      <Path d="M28,22 Q8,22 12,40 Q16,54 34,54" fill="none" stroke={c(1)} strokeWidth={o.strokeWidth} strokeLinecap="round" />
      <Path d="M72,22 Q92,22 88,40 Q84,54 66,54" fill="none" stroke={c(1)} strokeWidth={o.strokeWidth} strokeLinecap="round" />
      <Path d="M24,12 L76,12 Q76,58 50,64 Q24,58 24,12 Z" fill={c(0)} {...o} />
      <Rect x={44} y={62} width={12} height={14} fill={dark(0)} {...o} />
      <Rect x={28} y={76} width={44} height={10} rx={3} fill={c(2)} {...o} />
      <Rect x={22} y={86} width={56} height={10} rx={3} fill={dark(2)} {...o} />
      <Path d="M50,24 L53,32 L61,32 L55,37 L57,45 L50,40 L43,45 L45,37 L39,32 L47,32 Z" fill={SHINE} opacity={0.85} />
    </G>
  ),
};

function kitFor(filament: FilamentId, side: number): ToyKit {
  const strokeWidth = (Math.max(1.5, inkWidth(side * 1.4)) * 100) / Math.max(side, 1);
  const o: Outline = { stroke: INK, strokeWidth, strokeLinejoin: 'round', strokeLinecap: 'round' };
  const base = findFilament(filament)?.color ?? BRIGHT.red;
  const c = filament === 'rainbow' ? (i: number) => RAINBOW[i % RAINBOW.length] : (i: number) => (i === 0 ? base : i % 2 ? tint(base, 0.25) : shade(base, 0.08));
  return { o, c, dark: (i) => shade(c(i)) };
}

/** A printed toy in its filament colour, sitting on the bottom of its box. `glowing` adds a soft light (glow filament in the dark). */
export function PrintedToy({ toy, filament, width, height, glowing = false }: { toy: PrintToyId; filament: FilamentId; width: number; height: number; glowing?: boolean }) {
  const side = Math.min(width, height);
  const draw = TOYS[toy];
  if (!draw) return null;
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'flex-end' }} accessibilityElementsHidden importantForAccessibility="no">
      {glowing ? (
        <View
          style={{ position: 'absolute', width: side * 1.3, height: side * 1.3, bottom: -side * 0.15, borderRadius: side, backgroundColor: 'rgba(170, 255, 160, 0.45)' }}
        />
      ) : null}
      <Svg width={side} height={side} viewBox="-3 -3 106 106">
        {draw(kitFor(filament, side))}
      </Svg>
    </View>
  );
}

/** A print in progress: which toy, in what, and when it started (Date.now()). */
export interface PrintJob {
  toy: PrintToyId;
  filament: FilamentId;
  startedAt: number;
}

const FRAME = '#6F7C8F';
const FRAME_DARK = shade(FRAME);
const HEAD = '#F2F2F2';

/**
 * The 3D printer. While `job` is set it prints: the head zig-zags along its rail and climbs
 * as the toy grows up from the bed layer by layer, the spool turns, and a light blinks.
 */
export function Printer3D({ width: w, height: h, job }: { width: number; height: number; job: PrintJob | null }) {
  const { animate } = useMotion();
  const printing = !!job;
  const progress = useSharedValue(0);
  const sweep = useSharedValue(0);
  const blink = useSharedValue(1);

  // The build space on the bed, in pixels.
  const bedTop = h * 0.79;
  const buildW = w * 0.46;
  const buildH = h * 0.42;
  const buildLeft = (w - buildW) / 2;
  const toySide = Math.min(buildW, buildH);
  const headW = w * 0.2;
  const headH = h * 0.11;
  const nozzle = h * 0.035;

  useEffect(() => {
    if (!job) {
      cancelAnimation(progress);
      cancelAnimation(sweep);
      cancelAnimation(blink);
      progress.value = 0;
      sweep.value = 0;
      blink.value = 1;
      return;
    }
    const elapsed = Math.min(PRINT_MS, Math.max(0, Date.now() - job.startedAt));
    if (!animate) {
      progress.value = 1;
      return;
    }
    progress.value = elapsed / PRINT_MS;
    progress.value = withTiming(1, { duration: PRINT_MS - elapsed, easing: Easing.linear });
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }), -1, true);
    blink.value = withRepeat(withTiming(0.25, { duration: 380 }), -1, true);
    return () => {
      cancelAnimation(progress);
      cancelAnimation(sweep);
      cancelAnimation(blink);
    };
    // A new job (its start time) restarts the print.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.startedAt, animate]);

  // The toy shows from the bottom up, as far as it has printed.
  const reveal = useAnimatedStyle(() => ({ height: Math.max(0.0001, buildH * progress.value) }));
  // The rail and head ride up with the top layer; the head runs side to side along it.
  const rail = useAnimatedStyle(() => ({ top: bedTop - buildH * progress.value - headH - nozzle }));
  const head = useAnimatedStyle(() => ({ left: buildLeft + (buildW - headW) * (printing ? sweep.value : 0.5) }));
  const light = useAnimatedStyle(() => ({ opacity: blink.value }));
  // The fresh layer glows a little under the nozzle.
  const edge = useAnimatedStyle(() => ({ top: bedTop - buildH * progress.value - 1.5, opacity: progress.value < 1 ? 1 : 0 }));

  const o = { stroke: INK, strokeWidth: Math.max(1.5, inkWidth(h)), strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const spoolSize = w * 0.26;
  const spoolColor = job ? (job.filament === 'rainbow' ? RAINBOW[0] : findFilament(job.filament)?.color ?? BRIGHT.orange) : BRIGHT.orange;

  return (
    <View style={{ width: w, height: h }} accessibilityElementsHidden importantForAccessibility="no">
      {/* The frame: two posts, a top bar and a base with a little screen. */}
      <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Rect x={w * 0.07} y={h * 0.06} width={w * 0.09} height={h * 0.8} rx={3} fill={FRAME} {...o} />
        <Rect x={w * 0.84} y={h * 0.06} width={w * 0.09} height={h * 0.8} rx={3} fill={FRAME} {...o} />
        <Rect x={w * 0.04} y={h * 0.03} width={w * 0.92} height={h * 0.08} rx={4} fill={FRAME_DARK} {...o} />
        <Rect x={w * 0.17} y={bedTop} width={w * 0.66} height={h * 0.05} rx={2} fill={SOFT.stone} {...o} />
        <Rect x={w * 0.02} y={h * 0.84} width={w * 0.96} height={h * 0.15} rx={5} fill={FRAME} {...o} />
        <Rect x={w * 0.08} y={h * 0.87} width={w * 0.26} height={h * 0.09} rx={2} fill={printing ? '#9AD3F2' : '#3E3A5C'} {...o} />
        <Line x1={w * 0.5} y1={h * 0.915} x2={w * 0.76} y2={h * 0.915} stroke={FRAME_DARK} strokeWidth={o.strokeWidth} strokeLinecap="round" />
      </Svg>

      {/* The toy, growing up from the bed. */}
      {job ? (
        <Animated.View style={[{ position: 'absolute', left: buildLeft, width: buildW, bottom: h - bedTop, overflow: 'hidden' }, reveal]}>
          <View style={{ position: 'absolute', left: 0, bottom: 0, width: buildW, height: buildH, alignItems: 'center', justifyContent: 'flex-end' }}>
            <PrintedToy toy={job.toy} filament={job.filament} width={toySide} height={toySide} />
          </View>
        </Animated.View>
      ) : null}
      {job ? (
        <Animated.View
          style={[{ position: 'absolute', left: buildLeft + buildW * 0.15, width: buildW * 0.7, height: 3, borderRadius: 2, backgroundColor: 'rgba(255, 170, 60, 0.9)' }, edge]}
        />
      ) : null}

      {/* The rail across, with the print head on it. */}
      <Animated.View style={[{ position: 'absolute', left: w * 0.1, width: w * 0.8, height: headH + nozzle }, rail]}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: headH * 0.35, height: headH * 0.3, borderRadius: 3, backgroundColor: FRAME_DARK, borderWidth: 1.5, borderColor: INK }} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', width: headW, height: headH + nozzle }, rail, head]}>
        <Svg width={headW} height={headH + nozzle}>
          <Path d={`M${headW * 0.38},${headH - 1} L${headW * 0.62},${headH - 1} L${headW * 0.5},${headH + nozzle - 1} Z`} fill={SOFT.stone} {...o} />
          <Rect x={1} y={1} width={headW - 2} height={headH - 2} rx={4} fill={HEAD} {...o} />
          <Circle cx={headW * 0.5} cy={headH * 0.5} r={headH * 0.18} fill={printing ? BRIGHT.orange : SOFT.stone} />
        </Svg>
      </Animated.View>

      {/* The spool on top, feeding filament in. */}
      <Spin active={printing} style={{ position: 'absolute', left: w * 0.62, top: -spoolSize * 0.55, width: spoolSize, height: spoolSize }}>
        <Svg width={spoolSize} height={spoolSize} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={46} fill={spoolColor} stroke={INK} strokeWidth={6} />
          <Circle cx={50} cy={50} r={30} fill={tint(spoolColor, 0.25)} stroke={shade(spoolColor)} strokeWidth={4} />
          <Circle cx={50} cy={50} r={12} fill={SOFT.white} stroke={INK} strokeWidth={5} />
          <Line x1={50} y1={20} x2={50} y2={36} stroke={INK} strokeWidth={5} strokeLinecap="round" />
        </Svg>
      </Spin>

      {/* A light that blinks while printing. */}
      <Animated.View
        style={[
          { position: 'absolute', left: w * 0.82, top: h * 0.885, width: h * 0.06, height: h * 0.06, borderRadius: h, borderWidth: 1.5, borderColor: INK, backgroundColor: printing ? BRIGHT.green : SOFT.stone },
          light,
        ]}
      />
    </View>
  );
}
