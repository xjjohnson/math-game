import { BUILDINGS, type BuildingId } from '@/utils/town';
import { edgeLength, lanePoint, NODES, type Pt, type RoadSpot } from '@/utils/roads';

/** What stands on a lot: a building you can go into, a drive-up stop, or an empty lot for later. */
export type LotKind = BuildingId | 'home' | 'wash' | 'pump' | 'soon';

export interface TownLot {
  id: string;
  kind: LotKind;
  name: string;
  color: string;
  /** Front left corner of the building on the ground, its width and how deep it goes back. */
  x: number;
  y: number;
  w: number;
  depth: number;
  /** Where a car stops for it. */
  stop: RoadSpot;
}

/** A stop on the road in front of a spot along the x axis, between crossings `a` and `b`. */
function stopAt(from: string, to: string, x: number): RoadSpot {
  const a = NODES[from];
  return { from, to, d: Math.abs(x - a.x) };
}

const color = (id: BuildingId) => BUILDINGS.find((b) => b.id === id)!.color;
const name = (id: BuildingId) => BUILDINGS.find((b) => b.id === id)!.name;

/**
 * Buildings face the road below them, and a car going left along that road (the lane nearest
 * the doors) stops at the door. The car wash and the gas pump sit below the bottom road and take
 * the lane going right.
 */
export const TOWN_LOTS: TownLot[] = [
  { id: 'school', kind: 'school', name: name('school'), color: color('school'), x: 270, y: 540, w: 210, depth: 150, stop: stopAt('c', 'w', 375) },
  { id: 'shop', kind: 'shop', name: name('shop'), color: color('shop'), x: 520, y: 540, w: 160, depth: 130, stop: stopAt('c', 'w', 600) },
  { id: 'bakery', kind: 'bakery', name: name('bakery'), color: color('bakery'), x: 920, y: 540, w: 170, depth: 130, stop: stopAt('e', 'c', 1005) },
  { id: 'library', kind: 'library', name: name('library'), color: color('library'), x: 1130, y: 540, w: 200, depth: 150, stop: stopAt('e', 'c', 1230) },
  { id: 'park', kind: 'park', name: name('park'), color: color('park'), x: 260, y: 940, w: 230, depth: 200, stop: stopAt('s', 'sw', 375) },
  { id: 'soon-1', kind: 'soon', name: 'Coming soon', color: '#CFC8C0', x: 540, y: 940, w: 160, depth: 130, stop: stopAt('s', 'sw', 620) },
  { id: 'home', kind: 'home', name: 'Buddy home', color: '#EC5A9B', x: 910, y: 940, w: 170, depth: 140, stop: stopAt('se', 's', 995) },
  { id: 'farm', kind: 'farm', name: name('farm'), color: color('farm'), x: 1130, y: 940, w: 200, depth: 150, stop: stopAt('se', 's', 1230) },
  { id: 'wash', kind: 'wash', name: 'Car wash', color: '#7FCBEF', x: 300, y: 1210, w: 170, depth: 110, stop: stopAt('sw', 's', 385) },
  { id: 'pump', kind: 'pump', name: 'Gas pump', color: '#E8473F', x: 560, y: 1190, w: 120, depth: 80, stop: stopAt('sw', 's', 620) },
  { id: 'soon-2', kind: 'soon', name: 'Coming soon', color: '#CFC8C0', x: 1080, y: 1220, w: 170, depth: 120, stop: stopAt('s', 'se', 1165) },
];

/** Lots you can go into (buildings and the buddy home). */
export const isDoor = (kind: LotKind): kind is BuildingId | 'home' => kind !== 'wash' && kind !== 'pump' && kind !== 'soon';

/** Where a stop is on the map. */
export const stopPoint = (s: RoadSpot): Pt => lanePoint(s.from, s.to, s.d);

/** How close (map points) a stopped car must be to count as parked at a lot. */
export const PARK_RANGE = 46;

/** The lot a car at `p` is parked at, if any. */
export function parkedAt(p: Pt): TownLot | null {
  let best: TownLot | null = null;
  let gap = PARK_RANGE;
  for (const lot of TOWN_LOTS) {
    const s = stopPoint(lot.stop);
    const g = Math.hypot(s.x - p.x, s.y - p.y);
    if (g < gap) {
      gap = g;
      best = lot;
    }
  }
  return best;
}

/** The lot under a tap on the map (its building, or its parking spot), if any. */
export function lotAt(p: Pt): TownLot | null {
  return (
    TOWN_LOTS.find((l) => p.x >= l.x - 10 && p.x <= l.x + l.w + 10 && p.y >= l.y - l.depth - 40 && p.y <= l.y + 30) ?? null
  );
}

/** Sanity: every stop is on its road, clear of the crossings. */
export function stopsOk(): boolean {
  return TOWN_LOTS.every((l) => l.stop.d > 60 && l.stop.d < edgeLength(l.stop.from, l.stop.to) - 60);
}

/** Where a player's car starts: by their buddy home. */
export const START_STOP: RoadSpot = TOWN_LOTS.find((l) => l.id === 'home')!.stop;
