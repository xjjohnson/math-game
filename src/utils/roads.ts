/**
 * The town's roads as a little network, and how a car drives along it.
 *
 * Cars never leave the road: a car is always on one stretch of road between two
 * crossings (an "edge"), going one way, in the right-hand lane. At a crossing it
 * turns the way the driver steers (or the way its route says), along a smooth
 * curve; at the roundabout it goes round the fountain, never through it.
 *
 * Everything here is plain numbers in map points, so it is easy to test.
 */

export type Pt = { x: number; y: number };

/** Road width, kerb to kerb. */
export const ROAD_W = 80;
/** How far right of the middle line a car drives. */
export const LANE = 20;
/** The roundabout: its middle, the island's radius and the lane cars go round in. */
export const ROUNDABOUT = { x: 800, y: 600, island: 62, lane: 84, road: 118 } as const;
/** Normal driving speed and the faster gear, in map points a second. */
export const SPEED = 170;
export const FAST_SPEED = 260;
/** Map size. */
export const TOWN_W = 1600;
export const TOWN_H = 1300;

/** Crossings, by id. 'c' is the roundabout. */
export const NODES: Record<string, Pt> = {
  nw: { x: 200, y: 200 },
  n: { x: 800, y: 200 },
  ne: { x: 1400, y: 200 },
  w: { x: 200, y: 600 },
  c: { x: 800, y: 600 },
  e: { x: 1400, y: 600 },
  sw: { x: 200, y: 1000 },
  s: { x: 800, y: 1000 },
  se: { x: 1400, y: 1000 },
};
export type NodeId = keyof typeof NODES & string;

/** Two-way stretches of road between crossings. */
export const EDGES: [string, string][] = [
  ['nw', 'n'],
  ['n', 'ne'],
  ['w', 'c'],
  ['c', 'e'],
  ['sw', 's'],
  ['s', 'se'],
  ['nw', 'w'],
  ['w', 'sw'],
  ['n', 'c'],
  ['c', 's'],
  ['ne', 'e'],
  ['e', 'se'],
];

/** Crossings each crossing leads to. */
export const LINKS: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [a, b] of EDGES) {
    (out[a] ??= []).push(b);
    (out[b] ??= []).push(a);
  }
  return out;
})();

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Length of the straight edge between two crossings, middle to middle. */
export const edgeLength = (from: string, to: string) => dist(NODES[from], NODES[to]);

/** How far from a crossing's middle the straight part of the road stops and the turn begins. */
export const turnRoom = (node: string) => (node === 'c' ? ROUNDABOUT.road : ROAD_W / 2 + 6);

/** Unit direction from one crossing to the next. */
function dir(from: string, to: string): Pt {
  const a = NODES[from];
  const b = NODES[to];
  const l = dist(a, b) || 1;
  return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
}

/** The right-hand side of a direction on screen (y points down). */
const rightOf = (d: Pt): Pt => ({ x: -d.y, y: d.x });

/** A spot in the right-hand lane, `d` points along the edge from `from`. */
export function lanePoint(from: string, to: string, d: number): Pt {
  const u = dir(from, to);
  const r = rightOf(u);
  const a = NODES[from];
  return { x: a.x + u.x * d + r.x * LANE, y: a.y + u.y * d + r.y * LANE };
}

/** Heading in degrees (0 = right, 90 = down) of travel from one crossing to the next. */
export function headingOf(from: string, to: string): number {
  const u = dir(from, to);
  return (Math.atan2(u.y, u.x) * 180) / Math.PI;
}

/** -180..180: how far `b` turns from `a`. */
export function turnAngle(a: number, b: number): number {
  let t = b - a;
  while (t > 180) t -= 360;
  while (t <= -180) t += 360;
  return t;
}

/** Which way a turn goes: -1 left, 0 straight on, 1 right, 2 back the way you came. */
export function turnKind(prev: string, node: string, next: string): -1 | 0 | 1 | 2 {
  if (next === prev) return 2;
  const t = turnAngle(headingOf(prev, node), headingOf(node, next));
  if (Math.abs(t) < 30) return 0;
  return t > 0 ? 1 : -1;
}

/**
 * Where to go at the next crossing for a driver steering `steer` (-1 left, 0 straight, 1 right).
 * Never back the way you came unless it is the only way. Straight on if the steer can't be done.
 */
export function pickExit(prev: string, node: string, steer: number): string {
  const options = (LINKS[node] ?? []).filter((n) => n !== prev);
  if (!options.length) return prev;
  const want = steer < -0.3 ? -1 : steer > 0.3 ? 1 : 0;
  const kinds = options.map((n) => ({ n, k: turnKind(prev, node, n) }));
  return (kinds.find((o) => o.k === want) ?? kinds.find((o) => o.k === 0) ?? kinds[0]).n;
}

/** Points along a path, with the distance to each, for walking along it. */
export interface Path {
  pts: Pt[];
  at: number[];
  length: number;
}

function makePath(pts: Pt[]): Path {
  const at = [0];
  for (let i = 1; i < pts.length; i++) at.push(at[i - 1] + dist(pts[i - 1], pts[i]));
  return { pts, at, length: at[at.length - 1] };
}

/** Where along a path `s` points is, and which way it faces there (degrees). */
export function walkPath(p: Path, s: number): { pt: Pt; heading: number } {
  const t = Math.max(0, Math.min(p.length, s));
  let i = 1;
  while (i < p.at.length - 1 && p.at[i] < t) i++;
  const a = p.pts[i - 1];
  const b = p.pts[i];
  const seg = p.at[i] - p.at[i - 1] || 1;
  const pt = lerp(a, b, (t - p.at[i - 1]) / seg);
  return { pt, heading: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
}

/**
 * The curve a car follows through crossing `node`, coming from `prev` and leaving for `next`:
 * from where the straight road ends on the way in to where it starts on the way out.
 */
export function turnPath(prev: string, node: string, next: string): Path {
  const room = turnRoom(node);
  const start = lanePoint(prev, node, edgeLength(prev, node) - room);
  const end = lanePoint(node, next, room);
  if (node === 'c') return makePath(roundaboutPoints(start, end));
  const kind = turnKind(prev, node, next);
  if (kind === 0) return makePath([start, end]);
  // Back the way you came (only where there is no other way): through the middle and out.
  if (kind === 2) return makePath([start, NODES[node], end]);
  // A corner: a smooth curve with its bend where the two lanes cross.
  const u1 = dir(prev, node);
  const u2 = dir(node, next);
  const r1 = rightOf(u1);
  const r2 = rightOf(u2);
  const m = NODES[node];
  // Where the incoming lane line meets the outgoing one.
  const ctrl = { x: m.x + r1.x * LANE + r2.x * LANE, y: m.y + r1.y * LANE + r2.y * LANE };
  const pts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const a = lerp(start, ctrl, t);
    const b = lerp(ctrl, end, t);
    pts.push(lerp(a, b, t));
  }
  return makePath(pts);
}

/** Round the fountain, anticlockwise as you look at the map, from `start` to `end`. */
function roundaboutPoints(start: Pt, end: Pt): Pt[] {
  const { x, y, lane } = ROUNDABOUT;
  const a0 = Math.atan2(start.y - y, start.x - x);
  const a1 = Math.atan2(end.y - y, end.x - x);
  // Anticlockwise on screen means the angle goes down (y points down).
  let sweep = a0 - a1;
  while (sweep <= 0.2) sweep += Math.PI * 2;
  const steps = Math.max(6, Math.round(sweep * 10));
  const pts: Pt[] = [start];
  for (let i = 0; i <= steps; i++) {
    const a = a0 - (sweep * i) / steps;
    pts.push({ x: x + Math.cos(a) * lane, y: y + Math.sin(a) * lane });
  }
  pts.push(end);
  return pts;
}

/** Where a car is: on a straight stretch, or partway through a crossing. */
export type CarPos =
  | { kind: 'road'; from: string; to: string; d: number }
  | { kind: 'turn'; prev: string; node: string; next: string; s: number };

/** Where a car is on the map and which way it faces. */
export function placeOf(pos: CarPos): { pt: Pt; heading: number } {
  if (pos.kind === 'road') return { pt: lanePoint(pos.from, pos.to, pos.d), heading: headingOf(pos.from, pos.to) };
  return walkPath(turnPath(pos.prev, pos.node, pos.next), pos.s);
}

/**
 * Moves a car `step` points on. When it reaches a crossing, `chooseNext(prev, node)` says
 * which way it goes. Returns the new position.
 */
export function advance(pos: CarPos, step: number, chooseNext: (prev: string, node: string) => string): CarPos {
  let p = pos;
  let left = step;
  for (let guard = 0; guard < 8 && left > 0; guard++) {
    if (p.kind === 'road') {
      const stop = edgeLength(p.from, p.to) - turnRoom(p.to);
      if (p.d + left < stop) return { ...p, d: p.d + left };
      left -= Math.max(0, stop - p.d);
      p = { kind: 'turn', prev: p.from, node: p.to, next: chooseNext(p.from, p.to), s: 0 };
    } else {
      const len = turnPath(p.prev, p.node, p.next).length;
      if (p.s + left < len) return { ...p, s: p.s + left };
      left -= Math.max(0, len - p.s);
      p = { kind: 'road', from: p.node, to: p.next, d: turnRoom(p.node) };
    }
  }
  return p;
}

/** Turns the car round where it is, into the other lane. */
export function turnAround(pos: CarPos): CarPos {
  if (pos.kind === 'road') {
    const len = edgeLength(pos.from, pos.to);
    const d = Math.min(len - turnRoom(pos.from) - 1, Math.max(turnRoom(pos.to) + 1, len - pos.d));
    return { kind: 'road', from: pos.to, to: pos.from, d };
  }
  // In a crossing: finish heading out on the road it was turning onto, facing back.
  return { kind: 'road', from: pos.next, to: pos.node, d: edgeLength(pos.node, pos.next) - turnRoom(pos.node) - 1 };
}

/** The nearest spot on any road to a point, as a road position (either direction). */
export function nearestRoad(p: Pt): { from: string; to: string; d: number; gap: number } {
  let best = { from: 'nw', to: 'n', d: 0, gap: Infinity };
  for (const [a, b] of EDGES) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      const len = edgeLength(from, to);
      const lo = turnRoom(from);
      const hi = len - turnRoom(to);
      const u = dir(from, to);
      const s = NODES[from];
      const d = Math.max(lo, Math.min(hi, (p.x - s.x) * u.x + (p.y - s.y) * u.y));
      const q = lanePoint(from, to, d);
      const gap = dist(p, q);
      if (gap < best.gap) best = { from, to, d, gap };
    }
  }
  return best;
}

/** A place a car can drive to and stop: on road `from`->`to`, `d` points along. */
export interface RoadSpot {
  from: string;
  to: string;
  d: number;
}

/**
 * The shortest drive to `goal`: the crossings to go through, in order (empty when the goal is
 * on the road ahead), and how far it is. A car can't turn back on the spot, so a goal just
 * behind it means driving round the block.
 */
export function planRoute(pos: CarPos, goal: RoadSpot): { via: string[]; length: number } {
  // Where the car next arrives, and how far until then.
  let start: { prev: string; node: string; gone: number };
  if (pos.kind === 'road') {
    if (pos.from === goal.from && pos.to === goal.to && goal.d >= pos.d) return { via: [], length: goal.d - pos.d };
    start = { prev: pos.from, node: pos.to, gone: edgeLength(pos.from, pos.to) - pos.d };
  } else {
    // Already turning: it will come out on (node -> next).
    const out = turnPath(pos.prev, pos.node, pos.next).length - pos.s;
    if (pos.node === goal.from && pos.next === goal.to) return { via: [pos.next], length: out + goal.d - turnRoom(pos.node) };
    start = { prev: pos.node, node: pos.next, gone: out + edgeLength(pos.node, pos.next) - turnRoom(pos.node) };
  }
  // Dijkstra over (came-from, at) pairs, since which way you face matters.
  type State = { prev: string; node: string; cost: number; via: string[] };
  const best = new Map<string, number>();
  const open: State[] = [{ prev: start.prev, node: start.node, cost: start.gone, via: [start.node] }];
  let found: { via: string[]; length: number } | null = null;
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const cur = open.shift()!;
    if (found && cur.cost >= found.length) break;
    const key = `${cur.prev}>${cur.node}`;
    if ((best.get(key) ?? Infinity) <= cur.cost) continue;
    best.set(key, cur.cost);
    for (const next of LINKS[cur.node] ?? []) {
      // No turning back at a crossing unless it is the only way on.
      const ways = (LINKS[cur.node] ?? []).filter((n) => n !== cur.prev);
      if (next === cur.prev && ways.length) continue;
      if (cur.node === goal.from && next === goal.to) {
        const total = cur.cost + goal.d;
        if (!found || total < found.length) found = { via: cur.via, length: total };
        continue;
      }
      open.push({ prev: cur.node, node: next, cost: cur.cost + edgeLength(cur.node, next), via: [...cur.via, next] });
    }
  }
  return found ?? { via: [], length: 0 };
}

/** Points along a planned drive, for the dotted line on the map. */
export function routePoints(pos: CarPos, goal: RoadSpot, via: string[]): Pt[] {
  const pts: Pt[] = [placeOf(pos).pt];
  let prev = pos.kind === 'road' ? pos.from : pos.node;
  let node = pos.kind === 'road' ? pos.to : pos.next;
  if (pos.kind === 'turn') {
    pts.push(...turnPath(pos.prev, pos.node, pos.next).pts.slice(-1));
    prev = pos.node;
    node = pos.next;
  }
  for (let i = pos.kind === 'turn' ? 1 : 0; i < via.length; i++) {
    const next = i + 1 < via.length ? via[i + 1] : goal.to;
    if (via[i] !== node) break;
    pts.push(...turnPath(prev, node, next).pts);
    prev = node;
    node = next;
  }
  pts.push(lanePoint(goal.from, goal.to, goal.d));
  return pts;
}

/** How far a car still has to go along its route to the goal (for slowing down as it arrives). */
export function leftToGo(pos: CarPos, goal: RoadSpot, via: string[]): number {
  if (pos.kind === 'road' && pos.from === goal.from && pos.to === goal.to && goal.d >= pos.d) return goal.d - pos.d;
  return planRoute(pos, goal).length || (via.length ? Infinity : 0);
}
