import { FLOOR, PARK } from '@/utils/multiplayer/placeProps';
import type { Spot } from '@/utils/multiplayer/scene';

/**
 * The park's playground: where people and buddies can be put to play. Drop
 * someone near a swing and they sit on it and swing; near the slide and they
 * climb the ladder and slide down; up in the tree and they sit on a branch;
 * in the pond and they swim.
 *
 * Everything is worked out from a piece's spot alone (shares of the room, like
 * the rest of the community), so every phone on a visit sees the same thing
 * without any new messages.
 */

export type Ride =
  | { kind: 'swing'; seat: number }
  | { kind: 'ladder' }
  | { kind: 'slide' }
  | { kind: 'branch' }
  | { kind: 'swim' };

const SW = PARK.swings;
const SL = PARK.slide;

/** How many swings hang on the swing set. */
export const SWING_COUNT = 2;
/** The name of a swing's push switch (and of the swing in the drawing). */
export const swingName = (seat: number): string => `swing${seat}`;
/** Where swing `seat` hangs, across the room. */
export const swingX = (seat: number): number => SW.x0 + (SW.x1 - SW.x0) * (seat ? 0.68 : 0.32);
/** Where the swing ropes hang from (just under the top bar). */
export const SWING_PIVOT = SW.top + 0.015;
/** Where someone sitting on a swing has their spot: the top of the seat. */
export const SWING_SEAT_Y = FLOOR - 0.035;

/** The slide's ladder, its top, and its chute down to the grass. */
export const LADDER_X = SL.x0 + 0.025;
export const LADDER_FOOT: Spot = { x: LADDER_X, y: FLOOR + 0.04 };
export const CHUTE = { x0: SL.x0 + 0.05, y0: SL.top, x1: SL.x1, y1: FLOOR };
/** Where a slider steps off onto the grass at the bottom. */
export const SLIDE_OFF: Spot = { x: SL.x1 + 0.025, y: FLOOR + 0.06 };

/** The branches in the tree, as surfaces someone can sit on. */
export const BRANCHES = PARK.tree.branches.map((y, i) => ({ y, x0: PARK.tree.x - 0.05 + i * 0.01, x1: PARK.tree.x + 0.05 - i * 0.01 }));

const near = (a: number, b: number, e = 0.002) => Math.abs(a - b) <= e;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Where the chute is at `x`, as a height share. */
export function chuteY(x: number): number {
  const t = (x - CHUTE.x0) / (CHUTE.x1 - CHUTE.x0);
  return CHUTE.y0 + clamp(t, 0, 1) * (CHUTE.y1 - CHUTE.y0);
}

/** Whether a spot is in the pond (an oval). */
export function inPond(s: Spot): boolean {
  const p = PARK.pond;
  const cx = (p.x0 + p.x1) / 2;
  const cy = (p.y0 + p.y1) / 2;
  const rx = (p.x1 - p.x0) / 2;
  const ry = (p.y1 - p.y0) / 2;
  return ((s.x - cx) / rx) ** 2 + ((s.y - cy) / ry) ** 2 <= 1;
}

/** What someone standing at this spot is doing in the park, if anything. */
export function rideAt(s: Spot): Ride | null {
  for (let seat = 0; seat < SWING_COUNT; seat++) {
    if (near(s.y, SWING_SEAT_Y) && near(s.x, swingX(seat))) return { kind: 'swing', seat };
  }
  if (BRANCHES.some((b) => near(s.y, b.y) && s.x >= b.x0 - 0.002 && s.x <= b.x1 + 0.002)) return { kind: 'branch' };
  if (s.y < FLOOR + 0.04 - 0.001) {
    if (near(s.x, LADDER_X) && s.y >= SL.top - 0.002) return { kind: 'ladder' };
    if (s.x >= CHUTE.x0 - 0.03 && s.x <= CHUTE.x1 + 0.002 && near(s.y, s.x < CHUTE.x0 ? CHUTE.y0 : chuteY(s.x), 0.004)) return { kind: 'slide' };
  }
  if (inPond(s)) return { kind: 'swim' };
  return null;
}

/** Whether a spot is somewhere in the park a person can be off the ground (so it isn't pulled back to the floor). */
export const offGround = (s: Spot): boolean => {
  const r = rideAt(s);
  return !!r && r.kind !== 'swim';
};

/** Keeps a person or buddy in the park while they're carried: they can be lifted up to the swings and the tree. */
export const carryInPark = (s: Spot): Spot => ({ x: clamp(s.x, 0.02, 0.98), y: clamp(s.y, 0.12, 0.97) });

export interface Landing {
  spot: Spot;
  /** They were dropped at the slide: climb up and slide down. */
  slide?: boolean;
}

/**
 * Where a person or buddy let go at `s` in the park ends up: on a free swing,
 * on a branch of the tree, at the foot of the slide ladder (to climb it), or
 * on the grass. `taken` lists the swings someone else is sitting on.
 */
export function parkLanding(s: Spot, taken: number[] = []): Landing {
  for (let seat = 0; seat < SWING_COUNT; seat++) {
    if (taken.includes(seat)) continue;
    if (Math.abs(s.x - swingX(seat)) <= 0.03 && s.y >= SW.top && s.y <= FLOOR + 0.1) return { spot: { x: swingX(seat), y: SWING_SEAT_Y } };
  }
  if (s.x >= SL.x0 - 0.01 && s.x <= SL.x1 + 0.005 && s.y <= FLOOR + 0.1) return { spot: LADDER_FOOT, slide: true };
  if (Math.abs(s.x - PARK.tree.x) <= 0.075 && s.y >= PARK.tree.top - 0.05 && s.y < FLOOR - 0.02) {
    const b = [...BRANCHES].sort((a, c) => Math.abs(a.y - s.y) - Math.abs(c.y - s.y))[0];
    return { spot: { x: clamp(s.x, b.x0, b.x1), y: b.y } };
  }
  return { spot: { x: clamp(s.x, 0.02, 0.98), y: clamp(s.y, FLOOR + 0.04, 0.97) } };
}

/** The whole trip down the slide, one spot per step: up the ladder, across the top, down the chute (faster and faster), and off. */
export function slidePath(): Spot[] {
  const path: Spot[] = [];
  const climb = 10;
  for (let i = 1; i <= climb; i++) path.push({ x: LADDER_X, y: LADDER_FOOT.y + ((SL.top - LADDER_FOOT.y) * i) / climb });
  path.push({ x: LADDER_X, y: SL.top });
  path.push({ x: (LADDER_X + CHUTE.x0) / 2, y: SL.top });
  const down = 14;
  for (let i = 0; i <= down; i++) {
    const t = (i / down) ** 1.6;
    const x = CHUTE.x0 + t * (CHUTE.x1 - CHUTE.x0);
    path.push({ x, y: chuteY(x) });
  }
  path.push(SLIDE_OFF);
  return path;
}
