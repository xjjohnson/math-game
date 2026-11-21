import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/AppText';
import { INK, shade, tint } from '@/constants/artStyle';
import { colors, radius, spacing } from '@/constants/theme';
import type { Money, Picture, Shape2D, Shape3D } from '@/types';

/**
 * Draws a question's picture: things to count, ten-frames, number bonds,
 * base-ten blocks, number lines, arrays, tape diagrams, clocks, money, rulers,
 * shapes, grids and fractions. All drawn in code, in the game's own style.
 */
export function QuestionPicture({
  picture,
  width = 320,
  flashMs,
  color = colors.primary,
}: {
  picture: Picture;
  width?: number;
  /** Hide the picture after this long, with a button to look again. */
  flashMs?: number;
  color?: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [looks, setLooks] = useState(0);
  useEffect(() => {
    if (!flashMs) return;
    setHidden(false);
    const id = setTimeout(() => setHidden(true), flashMs);
    return () => clearTimeout(id);
  }, [flashMs, looks]);

  if (hidden) {
    return (
      <Pressable
        onPress={() => setLooks((n) => n + 1)}
        accessibilityRole="button"
        accessibilityLabel="Look again"
        style={[styles.hidden, { width, height: width * 0.5 }]}
      >
        <Text style={styles.hiddenText}>👀 Look again</Text>
      </Pressable>
    );
  }
  return (
    <View accessible accessibilityLabel={describe(picture)} style={styles.wrap}>
      <Drawing picture={picture} width={width} color={color} />
    </View>
  );
}

/** A short spoken description, for screen readers. */
export function describe(picture: Picture): string {
  switch (picture.kind) {
    case 'things':
      return `${picture.count} things`;
    case 'compare':
      return `${picture.left} on the left and ${picture.right} on the right`;
    case 'tenFrames':
      return `ten-frame with ${picture.filled} filled`;
    case 'bond':
      return `number bond, whole ${picture.whole ?? 'missing'}, parts ${picture.parts.map((p) => p ?? 'missing').join(' and ')}`;
    case 'blocks':
      return `${picture.hundreds} hundreds, ${picture.tens} tens and ${picture.ones} ones`;
    case 'sequence':
      return picture.items.map((n) => n ?? 'blank').join(', ');
    case 'numberLine':
      return `number line from ${picture.min} to ${picture.max}`;
    case 'array':
      return `${picture.rows} rows of ${picture.cols}`;
    case 'groups':
      return `${picture.groups} groups${picture.each ? ` of ${picture.each}` : ''}`;
    case 'pairs':
      return `${picture.count} counters in pairs`;
    case 'tape':
      return 'a bar model';
    case 'clock':
      return 'a clock';
    case 'money':
      return 'coins and bills';
    case 'ruler':
      return `a ${picture.thing} on a ruler`;
    case 'shape2d':
    case 'shape3d':
      return 'a shape';
    case 'grid':
      return picture.show === 'squares' ? 'a rectangle on squares' : `a rectangle ${picture.width} by ${picture.height}`;
    case 'fraction':
      return `a shape cut into ${picture.parts} parts`;
    case 'fractionBars':
      return 'two fraction bars';
    case 'fractionLine':
      return `a number line cut into ${picture.parts} parts`;
  }
}

const SECOND = '#FF9800';
const FONT = 'Lexend_700Bold';

function Drawing({ picture, width, color }: { picture: Picture; width: number; color: string }) {
  switch (picture.kind) {
    case 'things':
      return <Things {...picture} width={width} />;
    case 'compare':
      return <CompareGroups {...picture} width={width} />;
    case 'tenFrames':
      return <TenFrames {...picture} width={width} color={color} />;
    case 'bond':
      return <Bond {...picture} width={width} color={color} />;
    case 'blocks':
      return <Blocks {...picture} width={width} color={color} />;
    case 'sequence':
      return <Sequence items={picture.items} width={width} color={color} />;
    case 'numberLine':
      return <NumberLine {...picture} width={width} color={color} />;
    case 'array':
      return <Counters rows={picture.rows} cols={picture.cols} width={width} color={color} />;
    case 'groups':
      return <Groups {...picture} width={width} color={color} />;
    case 'pairs':
      return <Pairs count={picture.count} width={width} color={color} />;
    case 'tape':
      return <Tape {...picture} width={width} color={color} />;
    case 'clock':
      return <Clock {...picture} width={width} />;
    case 'money':
      return <MoneyRow items={picture.items} width={width} />;
    case 'ruler':
      return <Ruler {...picture} width={width} />;
    case 'shape2d':
      return <Shape2DView shape={picture.shape} fill={picture.color ?? color} width={width} />;
    case 'shape3d':
      return <Shape3DView shape={picture.shape} fill={picture.color ?? color} width={width} />;
    case 'grid':
      return <GridDrawing cols={picture.width} rows={picture.height} show={picture.show} color={color} size={width} />;
    case 'fraction':
      return <FractionShape {...picture} width={width} color={color} />;
    case 'fractionBars':
      return <FractionBars bars={picture.bars} width={width} color={color} />;
    case 'fractionLine':
      return <FractionLine {...picture} width={width} color={color} />;
  }
}

// ---------- counting ----------

/** Spots for counting: a tidy but not-in-rows scatter, the same every time for a count. */
function scatterSpots(count: number, w: number, h: number): [number, number][] {
  const cols = Math.ceil(Math.sqrt(count * (w / h)));
  const rows = Math.ceil(count / cols);
  const cw = w / cols;
  const ch = h / rows;
  return Array.from({ length: count }, (_, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    // Small fixed wobble so they don't look like a times array.
    const jx = (((i * 37) % 11) / 11 - 0.5) * cw * 0.35;
    const jy = (((i * 53) % 7) / 7 - 0.5) * ch * 0.35;
    return [cw * (c + 0.5) + jx, ch * (r + 0.5) + jy];
  });
}

const DICE: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]],
};

function Things({ count, emoji, layout, crossed = 0, width }: Extract<Picture, { kind: 'things' }> & { width: number }) {
  if (layout === 'dice' && count <= 6) {
    const s = Math.min(width * 0.55, 200);
    return (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        <Rect x={4} y={4} width={92} height={92} rx={16} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
        {DICE[count].map(([x, y], i) => (
          <Circle key={i} cx={8 + x * 84} cy={8 + y * 84} r={9} fill={INK} />
        ))}
      </Svg>
    );
  }
  if (layout === 'frame') return <TenFrames kind="tenFrames" filled={count} width={width} color={colors.primary} frames={count > 10 ? 2 : 1} />;
  const h = width * (count > 10 ? 0.6 : 0.5);
  const spots = layout === 'row' ? Array.from({ length: count }, (_, i): [number, number] => [((i + 0.5) * width) / count, h / 2]) : scatterSpots(count, width, h);
  const size = Math.min(44, (width / Math.ceil(Math.sqrt(count * 2))) * 0.8);
  return (
    <Svg width={width} height={h}>
      {spots.map(([x, y], i) => (
        <G key={i}>
          <SvgText x={x} y={y + size * 0.35} fontSize={size} textAnchor="middle">
            {emoji}
          </SvgText>
          {i >= count - crossed ? <Line x1={x - size / 2} y1={y + size / 2} x2={x + size / 2} y2={y - size / 2} stroke="#D32F2F" strokeWidth={4} /> : null}
        </G>
      ))}
    </Svg>
  );
}

function CompareGroups({ left, right, emoji, width }: Extract<Picture, { kind: 'compare' }> & { width: number }) {
  const half = width / 2 - 8;
  const h = width * 0.5;
  const size = 30;
  const group = (n: number, x0: number) =>
    scatterSpots(n, half - 16, h - 16).map(([x, y], i) => (
      <SvgText key={i} x={x0 + 8 + x} y={8 + y + size * 0.35} fontSize={size} textAnchor="middle">
        {emoji}
      </SvgText>
    ));
  return (
    <Svg width={width} height={h}>
      <Rect x={1} y={1} width={half} height={h - 2} rx={14} fill="#FFF8E1" stroke={INK} strokeWidth={2} />
      <Rect x={half + 15} y={1} width={half} height={h - 2} rx={14} fill="#E3F2FD" stroke={INK} strokeWidth={2} />
      {group(left, 0)}
      {group(right, half + 14)}
    </Svg>
  );
}

function TenFrames({ filled, extra = 0, frames, width, color }: Extract<Picture, { kind: 'tenFrames' }> & { width: number; color: string }) {
  const n = frames ?? Math.max(1, Math.ceil((filled + extra) / 10));
  const cell = Math.min(44, (width - 8) / 5);
  const fw = cell * 5;
  const h = n * (cell * 2 + 10);
  return (
    <Svg width={fw + 4} height={h}>
      {Array.from({ length: n }, (_, f) => (
        <G key={f} y={f * (cell * 2 + 10)}>
          {Array.from({ length: 10 }, (_, i) => {
            const k = f * 10 + i;
            const x = 2 + (i % 5) * cell;
            const y = 2 + Math.floor(i / 5) * cell;
            return (
              <G key={i}>
                <Rect x={x} y={y} width={cell} height={cell} fill="#FFFFFF" stroke={INK} strokeWidth={2} />
                {k < filled + extra ? (
                  <Circle cx={x + cell / 2} cy={y + cell / 2} r={cell * 0.36} fill={k < filled ? color : SECOND} />
                ) : null}
              </G>
            );
          })}
        </G>
      ))}
    </Svg>
  );
}

function Bond({ whole, parts, width, color }: Extract<Picture, { kind: 'bond' }> & { width: number; color: string }) {
  const w = Math.min(width, 280);
  const h = w * 0.72;
  const r = w * 0.14;
  const spots: [number, number, number | null][] = [
    [w / 2, r + 4, whole],
    [w * 0.22, h - r - 4, parts[0]],
    [w * 0.78, h - r - 4, parts[1]],
  ];
  return (
    <Svg width={w} height={h}>
      <Line x1={spots[0][0]} y1={spots[0][1]} x2={spots[1][0]} y2={spots[1][1]} stroke={INK} strokeWidth={4} />
      <Line x1={spots[0][0]} y1={spots[0][1]} x2={spots[2][0]} y2={spots[2][1]} stroke={INK} strokeWidth={4} />
      {spots.map(([x, y, n], i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r={r} fill={n === null ? '#FFFFFF' : i === 0 ? tint(color, 0.6) : '#FFF3E0'} stroke={INK} strokeWidth={4} strokeDasharray={n === null ? '8,6' : undefined} />
          <SvgText x={x} y={y + r * 0.35} fontSize={r} fontWeight="900" fill={INK} textAnchor="middle" fontFamily={FONT}>
            {n === null ? '?' : String(n)}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

/** Hundreds as flats, tens as rods, ones as cubes. */
function Blocks({ hundreds, tens, ones, crossed, traded, width, color }: Extract<Picture, { kind: 'blocks' }> & { width: number; color: string }) {
  const u = Math.max(5, Math.min(9, width / ((hundreds * 11 + tens + 2) * 1.4 + 6)));
  const gap = u * 0.6;
  const items: { kind: 'h' | 't' | 'o'; crossed: boolean }[] = [];
  const cross = { hundreds: crossed?.hundreds ?? 0, tens: crossed?.tens ?? 0, ones: crossed?.ones ?? 0 };
  for (let i = 0; i < hundreds; i++) items.push({ kind: 'h', crossed: i >= hundreds - cross.hundreds });
  for (let i = 0; i < tens; i++) items.push({ kind: 't', crossed: i >= tens - cross.tens });
  const flatW = u * 10;
  const rodH = u * 10;
  let x = 2;
  const drawn: React.ReactNode[] = [];
  items.forEach((it, i) => {
    if (it.kind === 'h') {
      drawn.push(
        <G key={`h${i}`}>
          <Rect x={x} y={2} width={flatW} height={flatW} fill={tint(color, 0.45)} stroke={INK} strokeWidth={1.5} />
          {Array.from({ length: 9 }, (_, k) => (
            <G key={k}>
              <Line x1={x + (k + 1) * u} y1={2} x2={x + (k + 1) * u} y2={2 + flatW} stroke={shade(color, 0.1)} strokeWidth={0.8} />
              <Line x1={x} y1={2 + (k + 1) * u} x2={x + flatW} y2={2 + (k + 1) * u} stroke={shade(color, 0.1)} strokeWidth={0.8} />
            </G>
          ))}
          {it.crossed ? <Line x1={x} y1={2 + flatW} x2={x + flatW} y2={2} stroke="#D32F2F" strokeWidth={3} /> : null}
        </G>,
      );
      x += flatW + gap;
    } else {
      drawn.push(
        <G key={`t${i}`}>
          <Rect x={x} y={2} width={u} height={rodH} fill={tint('#27AE60', 0.3)} stroke={INK} strokeWidth={1.5} />
          {Array.from({ length: 9 }, (_, k) => (
            <Line key={k} x1={x} y1={2 + (k + 1) * u} x2={x + u} y2={2 + (k + 1) * u} stroke={shade('#27AE60', 0.2)} strokeWidth={0.8} />
          ))}
          {it.crossed ? <Line x1={x - 2} y1={2 + rodH} x2={x + u + 2} y2={2} stroke="#D32F2F" strokeWidth={3} /> : null}
        </G>,
      );
      x += u + gap;
    }
  });
  // Ones as small cubes in columns of 5, after a little space.
  x += gap;
  const startOnes = x;
  for (let i = 0; i < ones; i++) {
    const cx = startOnes + Math.floor(i / 5) * (u + 3);
    const cy = 2 + (i % 5) * (u + 3);
    const isCrossed = i >= ones - cross.ones;
    const isTraded = traded === 'ten' && i >= ones - 10;
    drawn.push(
      <G key={`o${i}`}>
        <Rect x={cx} y={cy} width={u} height={u} fill={isTraded ? '#FFE0B2' : '#FFCA28'} stroke={INK} strokeWidth={1.2} />
        {isCrossed ? <Line x1={cx - 1} y1={cy + u + 1} x2={cx + u + 1} y2={cy - 1} stroke="#D32F2F" strokeWidth={2.5} /> : null}
      </G>,
    );
  }
  const onesW = ones ? (Math.floor((ones - 1) / 5) + 1) * (u + 3) : 0;
  const totalW = Math.max(startOnes + onesW + 2, 40);
  const h = Math.max(hundreds ? flatW : 0, tens ? rodH : 0, ones ? 5 * (u + 3) : 0) + 4;
  return (
    <Svg width={totalW} height={h}>
      {drawn}
    </Svg>
  );
}

function Sequence({ items, width, color }: { items: (number | null)[]; width: number; color: string }) {
  const n = items.length;
  const box = Math.min(64, (width - (n - 1) * 8) / n);
  const w = n * box + (n - 1) * 8;
  const longest = Math.max(...items.map((v) => String(v ?? '').length), 1);
  const font = Math.min(box * 0.5, (box * 1.6) / longest);
  return (
    <Svg width={w} height={box + 4}>
      {items.map((v, i) => (
        <G key={i} x={i * (box + 8)}>
          <Rect x={1} y={2} width={box - 2} height={box - 2} rx={10} fill={v === null ? '#FFFFFF' : tint(color, 0.75)} stroke={v === null ? color : INK} strokeWidth={v === null ? 3 : 2} strokeDasharray={v === null ? '6,5' : undefined} />
          <SvgText x={box / 2} y={box / 2 + font * 0.38} fontSize={font} fontWeight="900" fill={INK} textAnchor="middle" fontFamily={FONT}>
            {v === null ? '?' : String(v)}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

function NumberLine({ min, max, step, dot, hops, start, labels, hideEnd, width, color }: Extract<Picture, { kind: 'numberLine' }> & { width: number; color: string }) {
  const pad = 20;
  // Spots the hops start from and land on get their numbers written under them.
  const stops: number[] = [];
  if (hops && start !== undefined) {
    stops.push(start);
    hops.forEach((hop) => stops.push(stops[stops.length - 1] + hop));
  }
  const h = hops?.length ? 110 : 70;
  const y = h - 34;
  const ticks = Math.round((max - min) / step);
  const xAt = (v: number) => pad + ((v - min) / (max - min)) * (width - 2 * pad);
  const arcs: React.ReactNode[] = [];
  if (hops && start !== undefined) {
    let at = start;
    hops.forEach((hop, i) => {
      const x1 = xAt(at);
      const x2 = xAt(at + hop);
      const mid = (x1 + x2) / 2;
      arcs.push(
        <G key={i}>
          <Path d={`M ${x1} ${y - 4} Q ${mid} ${y - 60} ${x2} ${y - 4}`} stroke={i % 2 ? SECOND : color} strokeWidth={3} fill="none" />
          <SvgText x={mid} y={y - 38} fontSize={13} fontWeight="900" fill={i % 2 ? SECOND : color} textAnchor="middle">
            {hop > 0 ? `+${hop}` : String(hop)}
          </SvgText>
        </G>,
      );
      at += hop;
    });
  }
  return (
    <Svg width={width} height={h}>
      <Line x1={pad - 10} y1={y} x2={width - pad + 10} y2={y} stroke={INK} strokeWidth={3} />
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = min + i * step;
        const nearStop = stops.some((s) => Math.abs(xAt(s) - xAt(v)) < 22);
        const showLabel = labels || ((i === 0 || i === ticks) && !nearStop);
        return (
          <G key={i}>
            <Line x1={xAt(v)} y1={y - 8} x2={xAt(v)} y2={y + 8} stroke={INK} strokeWidth={2} />
            {showLabel ? (
              <SvgText x={xAt(v)} y={y + 24} fontSize={13} fontWeight="700" fill={INK} textAnchor="middle">
                {String(v)}
              </SvgText>
            ) : null}
          </G>
        );
      })}
      {arcs}
      {stops.map((s, i) => {
        const hidden = hideEnd && i === stops.length - 1 && i > 0;
        return (
          <G key={`stop${i}`}>
            <Line x1={xAt(s)} y1={y - 10} x2={xAt(s)} y2={y + 10} stroke={INK} strokeWidth={3} />
            {labels ? null : (
              <SvgText x={xAt(s)} y={y + 26} fontSize={15} fontWeight="900" fill={hidden ? SECOND : INK} textAnchor="middle">
                {hidden ? '?' : String(s)}
              </SvgText>
            )}
          </G>
        );
      })}
      {dot !== undefined ? <Circle cx={xAt(dot)} cy={y} r={8} fill={color} stroke={INK} strokeWidth={2} /> : null}
    </Svg>
  );
}

function Counters({ rows, cols, width, color }: { rows: number; cols: number; width: number; color: string }) {
  const cell = Math.min(40, (width - 4) / cols, 220 / rows);
  return (
    <Svg width={cols * cell + 4} height={rows * cell + 4}>
      {Array.from({ length: rows * cols }, (_, i) => (
        <Circle
          key={i}
          cx={2 + ((i % cols) + 0.5) * cell}
          cy={2 + (Math.floor(i / cols) + 0.5) * cell}
          r={cell * 0.38}
          fill={Math.floor(i / cols) % 2 ? SECOND : color}
          stroke={INK}
          strokeWidth={1.5}
        />
      ))}
    </Svg>
  );
}

function Groups({ groups, each, width, color }: Extract<Picture, { kind: 'groups' }> & { width: number; color: string }) {
  const perRow = Math.min(groups, 3);
  const rows = Math.ceil(groups / perRow);
  const gw = Math.min(110, (width - (perRow - 1) * 10) / perRow);
  return (
    <Svg width={perRow * gw + (perRow - 1) * 10} height={rows * gw + (rows - 1) * 10}>
      {Array.from({ length: groups }, (_, g) => {
        const gx = (g % perRow) * (gw + 10);
        const gy = Math.floor(g / perRow) * (gw + 10);
        const spots = scatterSpots(each, gw * 0.6, gw * 0.6);
        return (
          <G key={g}>
            <Circle cx={gx + gw / 2} cy={gy + gw / 2} r={gw / 2 - 2} fill="#FFFDE7" stroke={INK} strokeWidth={2.5} />
            {spots.map(([x, y], i) => (
              <Circle key={i} cx={gx + gw * 0.2 + x} cy={gy + gw * 0.2 + y} r={Math.min(9, gw / 9)} fill={color} />
            ))}
          </G>
        );
      })}
    </Svg>
  );
}

function Pairs({ count, width, color }: { count: number; width: number; color: string }) {
  const cols = Math.ceil(count / 2);
  const cell = Math.min(36, (width - 4) / cols);
  return (
    <Svg width={cols * cell + 4} height={cell * 2 + 8}>
      {Array.from({ length: count }, (_, i) => {
        const c = Math.floor(i / 2);
        const r = i % 2;
        const alone = i === count - 1 && count % 2 === 1;
        return (
          <Circle
            key={i}
            cx={2 + (c + 0.5) * cell}
            cy={4 + (r + 0.5) * cell}
            r={cell * 0.38}
            fill={alone ? SECOND : color}
            stroke={INK}
            strokeWidth={1.5}
          />
        );
      })}
    </Svg>
  );
}

function Tape({ whole, parts, label, width, color }: Extract<Picture, { kind: 'tape' }> & { width: number; color: string }) {
  const known = parts.filter((p): p is number => p !== null);
  const total = whole ?? known.reduce((s, p) => s + p, 0);
  const missing = Math.max(0, total - known.reduce((s, p) => s + p, 0));
  const sizes = parts.map((p) => (p === null ? missing || total / 3 : p));
  const sum = sizes.reduce((s, p) => s + p, 0) || 1;
  const w = width - 8;
  let x = 4;
  return (
    <Svg width={width} height={label ? 108 : 92}>
      {/* The whole, above the bar. */}
      <Path d={`M 4 28 L 4 18 L ${w + 4} 18 L ${w + 4} 28`} stroke={INK} strokeWidth={2} fill="none" />
      <SvgText x={width / 2} y={13} fontSize={16} fontWeight="900" fill={INK} textAnchor="middle" fontFamily={FONT}>
        {whole === null ? '?' : String(whole)}
      </SvgText>
      {parts.map((p, i) => {
        const pw = (sizes[i] / sum) * w;
        const node = (
          <G key={i}>
            <Rect x={x} y={34} width={pw} height={40} fill={p === null ? '#FFFFFF' : i % 2 ? '#FFE0B2' : tint(color, 0.6)} stroke={INK} strokeWidth={2.5} strokeDasharray={p === null ? '7,5' : undefined} />
            <SvgText x={x + pw / 2} y={60} fontSize={18} fontWeight="900" fill={INK} textAnchor="middle" fontFamily={FONT}>
              {p === null ? '?' : String(p)}
            </SvgText>
          </G>
        );
        x += pw;
        return node;
      })}
      {label ? (
        <SvgText x={width / 2} y={98} fontSize={14} fill={INK} textAnchor="middle">
          {label}
        </SvgText>
      ) : null}
    </Svg>
  );
}

// ---------- time, money, measuring ----------

/** A clock face. `size` sets it exactly; `ghost` adds faded hands at another time (to compare with a miss). */
export function Clock({
  hour,
  minute,
  width,
  size,
  ghost,
}: {
  hour: number;
  minute: number;
  width: number;
  size?: number;
  ghost?: { hour: number; minute: number };
}) {
  const s = size ?? Math.min(width * 0.7, 230);
  const c = 50;
  const minuteAngle = (minute / 60) * 2 * Math.PI;
  const hourAngle = (((hour % 12) + minute / 60) / 12) * 2 * Math.PI;
  const hand = (angle: number, len: number) => [c + Math.sin(angle) * len, c - Math.cos(angle) * len];
  const [mx, my] = hand(minuteAngle, 36);
  const [hx, hy] = hand(hourAngle, 23);
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      <Circle cx={c} cy={c} r={47} fill="#FFFFFF" stroke={INK} strokeWidth={4} />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * 2 * Math.PI;
        const big = i % 5 === 0;
        const [x1, y1] = hand(a, big ? 40 : 42.5);
        const [x2, y2] = hand(a, 45);
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={big ? 1.6 : 0.7} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = hand(((i + 1) / 12) * 2 * Math.PI, 33);
        return (
          <SvgText key={i} x={x} y={y + 3.6} fontSize={10} fontWeight="900" fill={INK} textAnchor="middle" fontFamily={FONT}>
            {String(i + 1)}
          </SvgText>
        );
      })}
      {ghost
        ? (() => {
            const [gmx, gmy] = hand((ghost.minute / 60) * 2 * Math.PI, 36);
            const [ghx, ghy] = hand((((ghost.hour % 12) + ghost.minute / 60) / 12) * 2 * Math.PI, 23);
            return (
              <G opacity={0.35}>
                <Line x1={c} y1={c} x2={ghx} y2={ghy} stroke="#757575" strokeWidth={4.5} strokeLinecap="round" />
                <Line x1={c} y1={c} x2={gmx} y2={gmy} stroke="#757575" strokeWidth={2.8} strokeLinecap="round" />
              </G>
            );
          })()
        : null}
      <Line x1={c} y1={c} x2={hx} y2={hy} stroke="#1565C0" strokeWidth={4.5} strokeLinecap="round" />
      <Line x1={c} y1={c} x2={mx} y2={my} stroke="#D32F2F" strokeWidth={2.8} strokeLinecap="round" />
      <Circle cx={c} cy={c} r={3} fill={INK} />
    </Svg>
  );
}

export const COIN: Partial<Record<Money, { r: number; fill: string; text: string }>> = {
  1: { r: 17, fill: '#C77B3C', text: '1¢' },
  5: { r: 19.5, fill: '#B0B6BC', text: '5¢' },
  10: { r: 16, fill: '#C9CED3', text: '10¢' },
  25: { r: 22, fill: '#BFC5CA', text: '25¢' },
};

function MoneyRow({ items, width }: { items: Money[]; width: number }) {
  const nodes: React.ReactNode[] = [];
  let x = 4;
  let y = 4;
  let rowH = 0;
  let used = 0;
  // Coins keep their real size order (the dime is smallest) but are drawn big enough to read.
  const scale = 1.5;
  items.forEach((m, i) => {
    const base = COIN[m];
    const coin = base ? { ...base, r: base.r * scale } : undefined;
    const w = coin ? coin.r * 2 : 92;
    const h = coin ? coin.r * 2 : 44;
    if (x + w > width - 4) {
      x = 4;
      y += rowH + 8;
      rowH = 0;
    }
    if (coin) {
      nodes.push(
        <G key={i}>
          <Circle cx={x + coin.r} cy={y + coin.r} r={coin.r} fill={coin.fill} stroke={shade(coin.fill, 0.35)} strokeWidth={2.5} />
          <Circle cx={x + coin.r} cy={y + coin.r} r={coin.r - 4} fill="none" stroke={tint(coin.fill, 0.4)} strokeWidth={1} />
          <SvgText x={x + coin.r} y={y + coin.r + 5} fontSize={coin.r * 0.7} fontWeight="900" fill={INK} textAnchor="middle" fontFamily={FONT}>
            {coin.text}
          </SvgText>
        </G>,
      );
    } else {
      nodes.push(
        <G key={i}>
          <Rect x={x} y={y} width={w} height={h} rx={4} fill="#C8E6C9" stroke="#2E7D32" strokeWidth={2.5} />
          <Ellipse cx={x + w / 2} cy={y + h / 2} rx={14} ry={15} fill="#A5D6A7" stroke="#2E7D32" strokeWidth={1} />
          <SvgText x={x + 12} y={y + 15} fontSize={12} fontWeight="900" fill="#1B5E20" textAnchor="middle">
            {String(m / 100)}
          </SvgText>
          <SvgText x={x + w / 2} y={y + h / 2 + 6} fontSize={17} fontWeight="900" fill="#1B5E20" textAnchor="middle" fontFamily={FONT}>
            {`$${m / 100}`}
          </SvgText>
        </G>,
      );
    }
    x += w + 8;
    used = Math.max(used, x);
    rowH = Math.max(rowH, h);
  });
  // Only as wide as the coins, so the card centres them.
  return (
    <Svg width={Math.min(width, used)} height={y + rowH + 6}>
      {nodes}
    </Svg>
  );
}

const THING_COLOR: Record<Extract<Picture, { kind: 'ruler' }>['thing'], string> = {
  pencil: '#FBC02D',
  crayon: '#E53935',
  worm: '#F48FB1',
  key: '#B0BEC5',
  leaf: '#66BB6A',
};

function Ruler({ length, unit, thing, width }: Extract<Picture, { kind: 'ruler' }> & { width: number }) {
  const units = unit === 'in' ? 7 : 15;
  const pad = 14;
  const u = (width - 2 * pad) / units;
  const top = 10;
  const tx = pad;
  const tw = length * u;
  const c = THING_COLOR[thing];
  const object =
    thing === 'pencil' || thing === 'crayon' ? (
      <G>
        <Rect x={tx} y={top + 4} width={tw - 18} height={20} fill={c} stroke={INK} strokeWidth={2} />
        <Polygon points={`${tx + tw - 18},${top + 4} ${tx + tw},${top + 14} ${tx + tw - 18},${top + 24}`} fill={thing === 'pencil' ? '#FFE0B2' : c} stroke={INK} strokeWidth={2} />
      </G>
    ) : thing === 'worm' ? (
      <Rect x={tx} y={top + 6} width={tw} height={16} rx={8} fill={c} stroke={INK} strokeWidth={2} />
    ) : thing === 'key' ? (
      <G>
        <Circle cx={tx + 11} cy={top + 14} r={10} fill={c} stroke={INK} strokeWidth={2} />
        <Rect x={tx + 20} y={top + 10} width={tw - 20} height={8} fill={c} stroke={INK} strokeWidth={2} />
      </G>
    ) : (
      <Ellipse cx={tx + tw / 2} cy={top + 14} rx={tw / 2} ry={11} fill={c} stroke={INK} strokeWidth={2} />
    );
  const ry = top + 36;
  return (
    <Svg width={width} height={ry + 66}>
      {object}
      <Line x1={tx} y1={top} x2={tx} y2={ry} stroke="#90A4AE" strokeWidth={1} strokeDasharray="3,3" />
      <Line x1={tx + tw} y1={top} x2={tx + tw} y2={ry} stroke="#90A4AE" strokeWidth={1} strokeDasharray="3,3" />
      <Rect x={pad - 8} y={ry} width={width - 2 * pad + 16} height={42} rx={4} fill="#FFE082" stroke={INK} strokeWidth={2} />
      {Array.from({ length: units * 2 + 1 }, (_, i) => {
        const x = pad + (i * u) / 2;
        const whole = i % 2 === 0;
        return (
          <G key={i}>
            <Line x1={x} y1={ry} x2={x} y2={ry + (whole ? 16 : 9)} stroke={INK} strokeWidth={whole ? 2 : 1} />
            {whole ? (
              <SvgText x={x} y={ry + 32} fontSize={13} fontWeight="700" fill={INK} textAnchor="middle">
                {String(i / 2)}
              </SvgText>
            ) : null}
          </G>
        );
      })}
      <SvgText x={width / 2} y={ry + 60} fontSize={13} fontWeight="700" fill={INK} textAnchor="middle">
        {unit === 'in' ? 'inches' : 'centimeters'}
      </SvgText>
    </Svg>
  );
}

// ---------- shapes ----------

function polygonPoints(sides: number, cx: number, cy: number, r: number, turn = -Math.PI / 2): string {
  return Array.from({ length: sides }, (_, i) => {
    const a = turn + (i / sides) * 2 * Math.PI;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(' ');
}

function Shape2DView({ shape, fill, width }: { shape: Shape2D; fill: string; width: number }) {
  const s = Math.min(width * 0.6, 200);
  const stroke = { stroke: INK, strokeWidth: 4, fill };
  const body = (() => {
    switch (shape) {
      case 'circle':
        return <Circle cx={50} cy={50} r={42} {...stroke} />;
      case 'oval':
        return <Ellipse cx={50} cy={50} rx={44} ry={30} {...stroke} />;
      case 'square':
        return <Rect x={12} y={12} width={76} height={76} {...stroke} />;
      case 'rectangle':
        return <Rect x={4} y={24} width={92} height={52} {...stroke} />;
      case 'triangle':
        return <Polygon points={polygonPoints(3, 50, 58, 44)} {...stroke} />;
      case 'pentagon':
        return <Polygon points={polygonPoints(5, 50, 52, 44)} {...stroke} />;
      case 'hexagon':
        return <Polygon points={polygonPoints(6, 50, 50, 44, 0)} {...stroke} />;
      case 'rhombus':
        return <Polygon points="50,6 90,50 50,94 10,50" {...stroke} />;
      case 'trapezoid':
        return <Polygon points="28,22 72,22 96,80 4,80" {...stroke} />;
    }
  })();
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      {body}
    </Svg>
  );
}

function Shape3DView({ shape, fill, width }: { shape: Shape3D; fill: string; width: number }) {
  const s = Math.min(width * 0.6, 200);
  const light = tint(fill, 0.35);
  const dark = shade(fill, 0.25);
  const line = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const };
  const body = (() => {
    switch (shape) {
      case 'cube':
        return (
          <G>
            <Polygon points="20,32 62,32 62,82 20,82" fill={fill} {...line} />
            <Polygon points="20,32 40,14 82,14 62,32" fill={light} {...line} />
            <Polygon points="62,32 82,14 82,64 62,82" fill={dark} {...line} />
          </G>
        );
      case 'box':
        return (
          <G>
            <Polygon points="8,40 66,40 66,82 8,82" fill={fill} {...line} />
            <Polygon points="8,40 30,22 90,22 66,40" fill={light} {...line} />
            <Polygon points="66,40 90,22 90,64 66,82" fill={dark} {...line} />
          </G>
        );
      case 'sphere':
        return (
          <G>
            <Circle cx={50} cy={50} r={40} fill={fill} {...line} />
            <Ellipse cx={36} cy={36} rx={12} ry={8} fill={light} />
            <Path d="M 10 50 Q 50 66 90 50" fill="none" stroke={dark} strokeWidth={2} strokeDasharray="4,4" />
          </G>
        );
      case 'cone':
        return (
          <G>
            <Path d="M 50 8 L 86 80 A 36 10 0 0 1 14 80 Z" fill={fill} {...line} />
            <Ellipse cx={50} cy={80} rx={36} ry={10} fill={dark} {...line} />
          </G>
        );
      case 'cylinder':
        return (
          <G>
            <Path d="M 18 22 L 18 78 A 32 10 0 0 0 82 78 L 82 22" fill={fill} {...line} />
            <Ellipse cx={50} cy={22} rx={32} ry={10} fill={light} {...line} />
          </G>
        );
      case 'pyramid':
        return (
          <G>
            <Polygon points="50,8 14,78 58,90" fill={fill} {...line} />
            <Polygon points="50,8 58,90 88,72" fill={dark} {...line} />
          </G>
        );
    }
  })();
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      {body}
    </Svg>
  );
}

function GridDrawing({ cols, rows, show, color, size }: { cols: number; rows: number; show: 'squares' | 'sides'; color: string; size: number }) {
  const pad = show === 'sides' ? 30 : 6;
  const cell = Math.min((size - 2 * pad) / cols, 200 / rows, 40);
  const w = cols * cell;
  const h = rows * cell;
  return (
    <Svg width={w + 2 * pad} height={h + 2 * pad}>
      <Rect x={pad} y={pad} width={w} height={h} fill={tint(color, 0.7)} stroke={INK} strokeWidth={3} />
      {show === 'squares'
        ? Array.from({ length: cols - 1 + rows - 1 }, (_, i) =>
            i < cols - 1 ? (
              <Line key={i} x1={pad + (i + 1) * cell} y1={pad} x2={pad + (i + 1) * cell} y2={pad + h} stroke={INK} strokeWidth={1} />
            ) : (
              <Line key={i} x1={pad} y1={pad + (i - cols + 2) * cell} x2={pad + w} y2={pad + (i - cols + 2) * cell} stroke={INK} strokeWidth={1} />
            ),
          )
        : (
          <G>
            <SvgText x={pad + w / 2} y={pad - 8} fontSize={16} fontWeight="900" fill={INK} textAnchor="middle" fontFamily={FONT}>
              {String(cols)}
            </SvgText>
            <SvgText x={pad + w / 2} y={pad + h + 22} fontSize={16} fontWeight="900" fill={INK} textAnchor="middle" fontFamily={FONT}>
              {String(cols)}
            </SvgText>
            <SvgText x={pad - 10} y={pad + h / 2 + 6} fontSize={16} fontWeight="900" fill={INK} textAnchor="end" fontFamily={FONT}>
              {String(rows)}
            </SvgText>
            <SvgText x={pad + w + 10} y={pad + h / 2 + 6} fontSize={16} fontWeight="900" fill={INK} textAnchor="start" fontFamily={FONT}>
              {String(rows)}
            </SvgText>
          </G>
        )}
    </Svg>
  );
}

// ---------- fractions ----------

function FractionShape({ parts, shaded, shape, width, color }: Extract<Picture, { kind: 'fraction' }> & { width: number; color: string }) {
  if (shape === 'circle') {
    const s = Math.min(width * 0.6, 200);
    const c = 50;
    const r = 44;
    return (
      <Svg width={s} height={s} viewBox="0 0 100 100">
        {Array.from({ length: parts }, (_, i) => {
          const a1 = -Math.PI / 2 + (i / parts) * 2 * Math.PI;
          const a2 = -Math.PI / 2 + ((i + 1) / parts) * 2 * Math.PI;
          const large = a2 - a1 > Math.PI ? 1 : 0;
          const d = `M ${c} ${c} L ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)} A ${r} ${r} 0 ${large} 1 ${c + r * Math.cos(a2)} ${c + r * Math.sin(a2)} Z`;
          return <Path key={i} d={d} fill={i < shaded ? color : '#FFFFFF'} stroke={INK} strokeWidth={2.5} />;
        })}
      </Svg>
    );
  }
  return <FractionBars bars={[{ parts, shaded }]} width={width} color={color} />;
}

function FractionBars({ bars, width, color }: { bars: { parts: number; shaded: number }[]; width: number; color: string }) {
  const w = width - 8;
  return (
    <Svg width={width} height={bars.length * 56}>
      {bars.map((bar, b) => (
        <G key={b} y={b * 56}>
          {Array.from({ length: bar.parts }, (_, i) => (
            <Rect
              key={i}
              x={4 + (i * w) / bar.parts}
              y={4}
              width={w / bar.parts}
              height={44}
              fill={i < bar.shaded ? (b % 2 ? SECOND : color) : '#FFFFFF'}
              stroke={INK}
              strokeWidth={2.5}
            />
          ))}
        </G>
      ))}
    </Svg>
  );
}

function FractionLine({ parts, at, wholes = 1, width, color }: Extract<Picture, { kind: 'fractionLine' }> & { width: number; color: string }) {
  const pad = 22;
  const y = 30;
  const total = parts * wholes;
  const xAt = (k: number) => pad + (k / total) * (width - 2 * pad);
  return (
    <Svg width={width} height={70}>
      <Line x1={pad - 10} y1={y} x2={width - pad + 10} y2={y} stroke={INK} strokeWidth={3} />
      {Array.from({ length: total + 1 }, (_, k) => {
        const whole = k % parts === 0;
        return (
          <G key={k}>
            <Line x1={xAt(k)} y1={y - (whole ? 12 : 8)} x2={xAt(k)} y2={y + (whole ? 12 : 8)} stroke={INK} strokeWidth={whole ? 3 : 2} />
            {whole ? (
              <SvgText x={xAt(k)} y={y + 30} fontSize={16} fontWeight="900" fill={INK} textAnchor="middle" fontFamily={FONT}>
                {String(k / parts)}
              </SvgText>
            ) : null}
          </G>
        );
      })}
      <Circle cx={xAt(at)} cy={y} r={9} fill={color} stroke={INK} strokeWidth={2} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  hidden: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    padding: spacing.md,
  },
  hiddenText: { fontSize: 22, fontWeight: '800', color: colors.primary },
});
