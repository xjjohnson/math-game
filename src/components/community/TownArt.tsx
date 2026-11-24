import { memo, type ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { INK, shade, SHADOW, tint } from '@/constants/artStyle';
import { EDGES, NODES, ROAD_W, ROUNDABOUT, TOWN_H, TOWN_W } from '@/utils/roads';
import { stopPoint, TOWN_LOTS, type TownLot } from '@/utils/townLayout';

const GRASS = '#9FD07A';
const GRASS_LIGHT = '#B3DC8E';
const PAVEMENT = '#EAE2D3';
const ROAD = '#8A8F98';
const LINE = '#FFF1A8';
const WHITE = '#FFFDF8';
const KERB = 10;

/** Trees: x, y (where the trunk meets the ground), size, a leaf colour. */
const TREES: [number, number, number, string][] = [
  [60, 80, 34, '#6FBF5A'],
  [330, 100, 30, '#5DAE4F'],
  [520, 90, 36, '#6FBF5A'],
  [1080, 100, 30, '#5DAE4F'],
  [1260, 80, 36, '#6FBF5A'],
  [1530, 90, 30, '#5DAE4F'],
  [70, 420, 34, '#5DAE4F'],
  [1530, 420, 34, '#6FBF5A'],
  [60, 820, 30, '#6FBF5A'],
  [1540, 820, 30, '#5DAE4F'],
  [300, 330, 26, '#7CC765'],
  [700, 330, 26, '#5DAE4F'],
  [900, 320, 26, '#7CC765'],
  [1300, 330, 26, '#5DAE4F'],
  [740, 740, 26, '#7CC765'],
  [880, 760, 26, '#6FBF5A'],
  [70, 1180, 36, '#6FBF5A'],
  [1500, 1180, 36, '#5DAE4F'],
  [1380, 1260, 28, '#7CC765'],
  [200, 1270, 28, '#6FBF5A'],
];

/** Street lamps: they light up at night. */
export const LAMPS: [number, number][] = [
  [255, 250],
  [745, 250],
  [855, 250],
  [1345, 250],
  [255, 650],
  [1345, 650],
  [745, 955],
  [855, 955],
  [255, 1050],
  [1345, 1050],
];

/** Pale patches so the grass isn't flat. */
const PATCHES: [number, number, number][] = [
  [120, 140, 90],
  [1480, 300, 110],
  [640, 1180, 120],
  [1300, 1150, 90],
  [460, 760, 80],
  [1180, 380, 70],
];

/**
 * The whole town drawn once, from above with a little tilt: grass, pavements, roads with
 * lines and zebra crossings, the roundabout, trees, lamps, the pond and every building.
 * Things that move (cars, smoke, water, ducks) are drawn on top by DriveTown.
 */
export const TownArt = memo(function TownArt({ night = false }: { night?: boolean }) {
  return (
    <Svg width={TOWN_W} height={TOWN_H} viewBox={`0 0 ${TOWN_W} ${TOWN_H}`}>
      <Rect x={0} y={0} width={TOWN_W} height={TOWN_H} fill={GRASS} />
      {PATCHES.map(([x, y, r], i) => (
        <Ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.7} fill={GRASS_LIGHT} />
      ))}
      <Roads />
      <Pond />
      {TOWN_LOTS.map((lot) => (
        <ParkingBay key={`bay-${lot.id}`} lot={lot} />
      ))}
      {/* Back to front, so nearer things overlap farther ones. */}
      {[
        ...TREES.map(([x, y, r, c]) => ({ y, node: <Tree key={`t${x}-${y}`} x={x} y={y} r={r} color={c} /> })),
        ...LAMPS.map(([x, y]) => ({ y, node: <Lamp key={`l${x}-${y}`} x={x} y={y} night={night} /> })),
        ...TOWN_LOTS.map((lot) => ({ y: lot.y, node: <Lot key={lot.id} lot={lot} night={night} /> })),
      ]
        .sort((a, b) => a.y - b.y)
        .map((t) => t.node)}
    </Svg>
  );
});

function Roads() {
  const half = ROAD_W / 2;
  const straight: ReactNode[] = [];
  const lines: ReactNode[] = [];
  for (const [a, b] of EDGES) {
    const p = NODES[a];
    const q = NODES[b];
    const x = Math.min(p.x, q.x);
    const y = Math.min(p.y, q.y);
    const horiz = p.y === q.y;
    const w = horiz ? Math.abs(q.x - p.x) : ROAD_W;
    const h = horiz ? ROAD_W : Math.abs(q.y - p.y);
    straight.push(
      <Rect key={`pv${a}${b}`} x={(horiz ? x : x - half) - KERB} y={(horiz ? y - half : y) - KERB} width={w + KERB * 2} height={h + KERB * 2} fill={PAVEMENT} />,
    );
    lines.push(<Rect key={`rd${a}${b}`} x={horiz ? x : x - half} y={horiz ? y - half : y} width={w} height={h} fill={ROAD} />);
    // Dashed middle line, stopping short of the crossings.
    const len = horiz ? w : h;
    const room = (n: string) => (n === 'c' ? ROUNDABOUT.road + 10 : half + 14);
    for (let s = room(horiz ? (p.x < q.x ? a : b) : p.y < q.y ? a : b); s < len - room(horiz ? (p.x < q.x ? b : a) : p.y < q.y ? b : a) - 20; s += 56) {
      lines.push(
        horiz ? (
          <Rect key={`d${a}${b}${s}`} x={x + s} y={y - 3} width={26} height={6} rx={3} fill={LINE} />
        ) : (
          <Rect key={`d${a}${b}${s}`} x={x - 3} y={y + s} width={6} height={26} rx={3} fill={LINE} />
        ),
      );
    }
  }
  // Crossings: a square of road, plus zebra stripes on the way in.
  const crossings = Object.entries(NODES)
    .filter(([id]) => id !== 'c')
    .map(([id, n]) => (
      <G key={`x${id}`}>
        <Rect x={n.x - half - KERB} y={n.y - half - KERB} width={ROAD_W + KERB * 2} height={ROAD_W + KERB * 2} rx={16} fill={PAVEMENT} />
        <Rect x={n.x - half} y={n.y - half} width={ROAD_W} height={ROAD_W} fill={ROAD} />
      </G>
    ));
  const zebras: ReactNode[] = [];
  for (const [id, n] of Object.entries(NODES)) {
    if (id === 'c') continue;
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const has = EDGES.some(([a, b]) => {
        const other = a === id ? b : b === id ? a : null;
        if (!other) return false;
        const o = NODES[other];
        return Math.sign(o.x - n.x) === dx && Math.sign(o.y - n.y) === dy;
      });
      if (!has) continue;
      for (let i = -3; i <= 3; i++) {
        const along = half + 8;
        zebras.push(
          dx === 0 ? (
            <Rect key={`z${id}${dx}${dy}${i}`} x={n.x + i * 11 - 3.5} y={n.y + dy * along - (dy < 0 ? 16 : 0)} width={7} height={16} fill={WHITE} opacity={0.9} />
          ) : (
            <Rect key={`z${id}${dx}${dy}${i}`} x={n.x + dx * along - (dx < 0 ? 16 : 0)} y={n.y + i * 11 - 3.5} width={16} height={7} fill={WHITE} opacity={0.9} />
          ),
        );
      }
    }
  }
  const { x, y, island, road } = ROUNDABOUT;
  return (
    <G>
      {straight}
      {crossings}
      <Circle cx={x} cy={y} r={road + KERB} fill={PAVEMENT} />
      {lines}
      <Circle cx={x} cy={y} r={road} fill={ROAD} />
      {zebras}
      {/* The island: grass, flowers and the fountain's basin. */}
      <Circle cx={x} cy={y} r={island} fill="#8CC56A" stroke={INK} strokeWidth={3} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Circle key={i} cx={x + Math.cos((i * Math.PI) / 4) * (island - 12)} cy={y + Math.sin((i * Math.PI) / 4) * (island - 12)} r={5} fill={['#F7B6C2', '#FBE38E', '#FFFDF8'][i % 3]} stroke={INK} strokeWidth={1.5} />
      ))}
      <Circle cx={x} cy={y} r={36} fill="#CFC8C0" stroke={INK} strokeWidth={3} />
      <Circle cx={x} cy={y} r={28} fill="#7FCBEF" />
      {/* Little arrows round the roundabout, showing the way cars go. */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const r = ROUNDABOUT.lane;
        const cx = x + Math.cos(a) * r;
        const cy = y + Math.sin(a) * r;
        const deg = (a * 180) / Math.PI - 90;
        return <Path key={i} d="M-7 -5 L7 0 L-7 5 Z" fill={WHITE} opacity={0.85} transform={`translate(${cx} ${cy}) rotate(${deg})`} />;
      })}
    </G>
  );
}

function Pond() {
  return (
    <G>
      <Ellipse cx={1290} cy={1180} rx={110} ry={58} fill="#7FCBEF" stroke={INK} strokeWidth={3} />
      <Ellipse cx={1260} cy={1166} rx={50} ry={16} fill="#B5DDF5" opacity={0.8} />
      {/* Reeds. */}
      {[1190, 1200, 1384].map((rx, i) => (
        <G key={i}>
          <Line x1={rx} y1={1160} x2={rx} y2={1130} stroke="#5DAE4F" strokeWidth={3} />
          <Ellipse cx={rx} cy={1130} rx={4} ry={9} fill="#A8743E" stroke={INK} strokeWidth={1.5} />
        </G>
      ))}
    </G>
  );
}

function ParkingBay({ lot }: { lot: TownLot }) {
  if (lot.kind === 'soon') return null;
  const s = stopPoint(lot.stop);
  return <Rect x={s.x - 36} y={s.y - 18} width={72} height={36} rx={6} fill="none" stroke={WHITE} strokeWidth={3} strokeDasharray="8 6" opacity={0.9} />;
}

function Tree({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const trunk = 16;
  return (
    <G>
      <Ellipse cx={x} cy={y + 2} rx={r * 0.9} ry={r * 0.3} fill={SHADOW} />
      <Rect x={x - 6} y={y - trunk} width={12} height={trunk} fill="#A8743E" stroke={INK} strokeWidth={3} />
      <Circle cx={x} cy={y - trunk - r * 0.7} r={r} fill={color} stroke={INK} strokeWidth={3} />
      <Circle cx={x - r * 0.35} cy={y - trunk - r} r={r * 0.3} fill={tint(color, 0.3)} />
    </G>
  );
}

function Lamp({ x, y, night }: { x: number; y: number; night: boolean }) {
  return (
    <G>
      {night ? <Circle cx={x} cy={y - 30} r={30} fill="#FFE28A" opacity={0.35} /> : null}
      <Ellipse cx={x} cy={y + 1} rx={8} ry={3} fill={SHADOW} />
      <Rect x={x - 3} y={y - 30} width={6} height={30} fill="#5F6B7A" stroke={INK} strokeWidth={2} />
      <Circle cx={x} cy={y - 32} r={8} fill={night ? '#FFF1A8' : '#FFE28A'} stroke={INK} strokeWidth={3} />
    </G>
  );
}

/** Everything that stands on a lot: a building, the car wash, the pump, or a "Coming soon" sign. */
function Lot({ lot, night }: { lot: TownLot; night: boolean }) {
  const { x, y, w, depth, color, kind } = lot;
  const WALL = 40;
  const top = y - WALL;
  const roofY = top - depth + WALL;
  const roofH = depth - WALL;
  const wall = color;
  const roof = shade(color, 0.32);
  const lit = night ? '#FFE28A' : '#CFEAF8';
  const parts: ReactNode[] = [];
  parts.push(<Ellipse key="sh" cx={x + w / 2} cy={y + 4} rx={w * 0.58} ry={14} fill={SHADOW} />);

  if (kind === 'soon') {
    parts.push(
      <Rect key="dirt" x={x} y={y - depth} width={w} height={depth} rx={12} fill="#D9C7A6" stroke={INK} strokeWidth={3} strokeDasharray="10 8" />,
      <Rect key="post" x={x + w / 2 - 4} y={y - depth / 2 - 10} width={8} height={40} fill="#A8743E" stroke={INK} strokeWidth={2} />,
      <Rect key="board" x={x + w / 2 - 60} y={y - depth / 2 - 44} width={120} height={38} rx={8} fill={WHITE} stroke={INK} strokeWidth={3} />,
      <SvgText key="t" x={x + w / 2} y={y - depth / 2 - 19} fontSize={17} fontFamily="Lexend_700Bold" fill={INK} textAnchor="middle">
        Coming soon
      </SvgText>,
    );
    return <G>{parts}</G>;
  }

  if (kind === 'park') {
    parts.push(
      <Ellipse key="lawn" cx={x + w / 2} cy={y - depth / 2} rx={w / 2} ry={depth / 2} fill="#8CC56A" stroke={INK} strokeWidth={3} />,
      // Fence posts along the front.
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => <Rect key={`f${i}`} x={x + 20 + i * ((w - 40) / 6) - 3} y={y - 22} width={6} height={18} fill={WHITE} stroke={INK} strokeWidth={1.5} />),
      // Swings.
      <Path key="sw" d={`M${x + 34} ${y - 70} l0 -56 l56 0 l0 56`} fill="none" stroke={INK} strokeWidth={5} strokeLinejoin="round" />,
      <Line key="sw1" x1={x + 52} y1={y - 126} x2={x + 52} y2={y - 96} stroke={INK} strokeWidth={2} />,
      <Rect key="sws" x={x + 44} y={y - 98} width={16} height={6} rx={2} fill="#E8473F" stroke={INK} strokeWidth={2} />,
      // Slide.
      <Path key="sl" d={`M${x + w - 80} ${y - 50} q30 -30 44 -80`} fill="none" stroke="#F28C28" strokeWidth={9} strokeLinecap="round" />,
      <Path key="sll" d={`M${x + w - 36} ${y - 130} l10 0 l0 76`} fill="none" stroke={INK} strokeWidth={4} />,
      // Sandpit and a bench.
      <Ellipse key="sand" cx={x + w / 2} cy={y - 60} rx={30} ry={16} fill="#FBE38E" stroke={INK} strokeWidth={2} />,
      <Rect key="bench" x={x + w / 2 - 34} y={y - 140} width={68} height={12} rx={4} fill="#D9A66B" stroke={INK} strokeWidth={2} />,
    );
    parts.push(sign(lot, y - depth - 6));
    return <G>{parts}</G>;
  }

  if (kind === 'wash') {
    parts.push(
      <Rect key="w" x={x} y={y - depth} width={w} height={depth} rx={10} fill={tint(color, 0.4)} stroke={INK} strokeWidth={3} />,
      <Rect key="arch" x={x + 30} y={y - depth + 14} width={w - 60} height={depth - 28} rx={8} fill="#5F6B7A" stroke={INK} strokeWidth={3} />,
      // Brushes.
      ...[0, 1].map((i) => <Rect key={`b${i}`} x={x + 44 + i * (w - 104)} y={y - depth + 22} width={16} height={depth - 44} rx={8} fill="#3A86E8" stroke={INK} strokeWidth={2} />),
      ...[0, 1, 2, 3].map((i) => <Circle key={`bb${i}`} cx={x + 70 + i * 12} cy={y - depth + 30 + (i % 2) * 14} r={7} fill={WHITE} stroke="#7FCBEF" strokeWidth={2} />),
    );
    parts.push(sign(lot, y - depth - 6));
    return <G>{parts}</G>;
  }

  if (kind === 'pump') {
    parts.push(
      <Rect key="roof" x={x} y={y - depth} width={w} height={depth * 0.45} rx={6} fill={WHITE} stroke={INK} strokeWidth={3} />,
      <Rect key="stripe" x={x} y={y - depth + depth * 0.3} width={w} height={8} fill={color} />,
      <Rect key="pump" x={x + w / 2 - 18} y={y - depth * 0.55} width={36} height={depth * 0.55} rx={6} fill={color} stroke={INK} strokeWidth={3} />,
      <Rect key="screen" x={x + w / 2 - 11} y={y - depth * 0.5} width={22} height={14} rx={3} fill={night ? '#FFE28A' : '#CFEAF8'} stroke={INK} strokeWidth={2} />,
      <Path key="hose" d={`M${x + w / 2 + 18} ${y - depth * 0.3} q18 6 10 26`} fill="none" stroke={INK} strokeWidth={4} />,
    );
    parts.push(sign(lot, y - depth - 6));
    return <G>{parts}</G>;
  }

  // A building: roof seen from above, then its front wall with a door and windows.
  const pitched = kind === 'home' || kind === 'farm' || kind === 'bakery';
  if (pitched) {
    parts.push(
      <Path key="roof" d={`M${x - 8} ${top} L${x + w + 8} ${top} L${x + w - 12} ${roofY} L${x + 12} ${roofY} Z`} fill={roof} stroke={INK} strokeWidth={3} strokeLinejoin="round" />,
      <Line key="ridge" x1={x + 16} y1={(top + roofY) / 2} x2={x + w - 16} y2={(top + roofY) / 2} stroke={shade(roof, 0.2)} strokeWidth={3} />,
      // Roof tiles.
      ...[0.25, 0.75].map((f) => <Line key={`tl${f}`} x1={x + 10} y1={top - roofH * f} x2={x + w - 10} y2={top - roofH * f} stroke={shade(roof, 0.12)} strokeWidth={2} />),
    );
  } else {
    parts.push(
      <Rect key="roof" x={x - 4} y={roofY} width={w + 8} height={roofH} rx={6} fill={tint(color, 0.55)} stroke={INK} strokeWidth={3} />,
      <Rect key="vent" x={x + 14} y={roofY + roofH * 0.25} width={w * 0.2} height={roofH * 0.35} rx={3} fill="#CFC8C0" stroke={INK} strokeWidth={2} />,
    );
  }
  parts.push(
    <Rect key="wall" x={x} y={top} width={w} height={WALL} fill={wall} stroke={INK} strokeWidth={3} />,
    <Rect key="wallsh" x={x + 2} y={y - 8} width={w - 4} height={6} fill={shade(wall)} />,
  );
  // Windows either side of the door.
  for (const f of [0.12, 0.72]) {
    parts.push(<Rect key={`win${f}`} x={x + w * f} y={top + 8} width={w * 0.16} height={18} rx={4} fill={lit} stroke={INK} strokeWidth={2.5} />);
  }
  const dw = Math.max(22, w * 0.16);
  parts.push(
    <Rect key="door" x={x + w / 2 - dw / 2} y={y - 32} width={dw} height={32} rx={6} fill="#A8743E" stroke={INK} strokeWidth={3} />,
    <Circle key="knob" cx={x + w / 2 + dw / 4} cy={y - 16} r={2.5} fill="#FFC93C" />,
  );
  // Each building's own touch.
  if (kind === 'shop') {
    for (let i = 0; i < 6; i++) {
      parts.push(<Path key={`aw${i}`} d={`M${x + (i * w) / 6} ${top} h${w / 6} v12 q${-w / 12} 8 ${-w / 6} 0 Z`} fill={i % 2 ? WHITE : '#E8473F'} stroke={INK} strokeWidth={2} />);
    }
  }
  if (kind === 'school') {
    const cx = x + w / 2;
    parts.push(
      <Rect key="tower" x={cx - 18} y={roofY - 34} width={36} height={38} fill={tint(color, 0.55)} stroke={INK} strokeWidth={3} />,
      <Path key="towerroof" d={`M${cx - 24} ${roofY - 34} L${cx} ${roofY - 58} L${cx + 24} ${roofY - 34} Z`} fill={shade(color, 0.3)} stroke={INK} strokeWidth={3} />,
      <Circle key="bell" cx={cx} cy={roofY - 16} r={8} fill="#FFC93C" stroke={INK} strokeWidth={2} />,
      <Line key="flagpole" x1={x + w - 20} y1={roofY + 10} x2={x + w - 20} y2={roofY - 40} stroke={INK} strokeWidth={3} />,
      <Path key="flag" d={`M${x + w - 20} ${roofY - 40} h26 l-6 8 l6 8 h-26 Z`} fill="#E8473F" stroke={INK} strokeWidth={2} />,
    );
  }
  if (kind === 'library') {
    for (let i = 0; i < 4; i++) {
      const cx = x + 14 + (i * (w - 28)) / 3;
      parts.push(<Rect key={`col${i}`} x={cx - 5} y={top + 4} width={10} height={WALL - 10} fill={WHITE} stroke={INK} strokeWidth={2} />);
    }
    parts.push(<Path key="ped" d={`M${x - 6} ${top + 2} L${x + w / 2} ${top - 16} L${x + w + 6} ${top + 2} Z`} fill="#F3DDB3" stroke={INK} strokeWidth={3} />);
    // An open book on the roof.
    parts.push(
      <Path key="book" d={`M${x + w / 2} ${roofY + roofH / 2 + 10} q-20 -10 -36 -4 v-20 q16 -6 36 4 q20 -10 36 -4 v20 q-16 -6 -36 4 Z`} fill={WHITE} stroke={INK} strokeWidth={2.5} />,
    );
  }
  if (kind === 'bakery') {
    parts.push(
      <Rect key="chim" x={x + w - 36} y={roofY - 20} width={18} height={32} fill="#CFC8C0" stroke={INK} strokeWidth={3} />,
      <Ellipse key="loaf" cx={x + w / 2 - 10} cy={top - roofH * 0.5} rx={24} ry={13} fill="#E9A85C" stroke={INK} strokeWidth={2.5} />,
      <Path key="cuts" d={`M${x + w / 2 - 20} ${top - roofH * 0.5 - 8} l-3 16 M${x + w / 2 - 10} ${top - roofH * 0.5 - 10} l-3 20 M${x + w / 2} ${top - roofH * 0.5 - 8} l-3 16`} stroke={INK} strokeWidth={2} />,
      // Drive-through window on the side.
      <Rect key="dt" x={x + w - 2} y={top + 6} width={22} height={26} rx={4} fill={lit} stroke={INK} strokeWidth={2.5} />,
    );
  }
  if (kind === 'farm') {
    parts.push(
      <Path key="x" d={`M${x + w / 2 - 12} ${y - 32} l24 32 M${x + w / 2 + 12} ${y - 32} l-24 32`} stroke={WHITE} strokeWidth={3} />,
      <Rect key="silo" x={x + w + 6} y={top - roofH - 20} width={30} height={WALL + roofH + 20} rx={14} fill="#CFC8C0" stroke={INK} strokeWidth={3} />,
      <Path key="silotop" d={`M${x + w + 6} ${top - roofH - 6} q15 -26 30 0`} fill={shade('#CFC8C0', 0.2)} stroke={INK} strokeWidth={3} />,
    );
  }
  if (kind === 'home') {
    parts.push(
      <Path
        key="heart"
        d={`M${x + w / 2} ${top - roofH * 0.35} c-4 -8 -18 -10 -18 2 c0 8 10 14 18 20 c8 -6 18 -12 18 -20 c0 -12 -14 -10 -18 -2 Z`}
        fill={WHITE}
        stroke={INK}
        strokeWidth={2.5}
      />,
      <Rect key="chim" x={x + 22} y={roofY - 14} width={16} height={24} fill="#CFC8C0" stroke={INK} strokeWidth={3} />,
    );
  }
  parts.push(sign(lot, (kind === 'school' ? roofY - 62 : roofY - 6)));
  return <G>{parts}</G>;
}

/** The name on a round white sign above the lot. */
function sign(lot: TownLot, y: number): ReactNode {
  const tw = lot.name.length * 9.5 + 26;
  const cx = lot.x + lot.w / 2;
  return (
    <G key="sign">
      <Rect x={cx - tw / 2} y={y - 28} width={tw} height={30} rx={15} fill={WHITE} stroke={INK} strokeWidth={2.5} />
      <SvgText x={cx} y={y - 7} fontSize={17} fontFamily="Lexend_700Bold" fill={INK} textAnchor="middle">
        {lot.name}
      </SvgText>
    </G>
  );
}
