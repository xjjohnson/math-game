import {
  APPLIANCES,
  BUDDY_SIZE,
  FORT,
  BUILT_IN_SEATS,
  type BuiltInSeat,
  CUPBOARDS,
  findBuiltInSeat,
  findCupboard,
  type Gadget,
  findRoomItem,
  HOME_AREAS,
  isSmall,
  ROOM_SPAN,
  SURFACES,
  type Cupboard,
  type FixtureSpot,
  type RoomItem,
  type Surface,
} from '@/constants/room';
import type { BuddySpot, Room, RoomThing } from '@/types';
import { AREA_COUNT, BUDDY_KEY, FIXTURE_KEY, FLOOR_LINE, type Placement } from '@/utils/room';

/** The home's size in pixels, worked out from the space it has on screen. */
export interface HomeSize {
  /** All the areas side by side. */
  width: number;
  height: number;
  /** One phone screen's worth of home, from the height, so it keeps its shape on wide screens. */
  screen: number;
  /** One area: ROOM_SPAN screens. */
  areaWidth: number;
  /** Things are sized by this, so they keep their shape on tall and wide screens alike. */
  unit: number;
  /** Where the wall meets the floor. */
  floorY: number;
  /** Area ids left to right; built-ins sit in their room wherever it is. */
  order: string[];
}

export function homeSize(viewWidth: number, viewHeight: number, order: string[] = HOME_AREAS.map((a) => a.id)): HomeSize {
  const unit = Math.round(Math.min(viewHeight, viewWidth * 1.15));
  // Sized from the height, not the width, so a wide tablet shows more of the room rather than
  // stretching it; the room is still far wider than any screen.
  const screen = Math.round(unit * 1.05);
  const areaWidth = Math.round(screen * ROOM_SPAN);
  return {
    width: areaWidth * AREA_COUNT,
    height: Math.round(viewHeight),
    screen,
    areaWidth,
    unit,
    floorY: Math.round(viewHeight * FLOOR_LINE),
    order,
  };
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

function areaIndex(id: string, size: HomeSize): number {
  return Math.max(0, size.order.indexOf(id));
}

/** A built-in's box across the whole home. */
export function fixtureBox(f: FixtureSpot, size: HomeSize): Box {
  return {
    left: areaIndex(f.area, size) * size.areaWidth + f.left * size.screen,
    width: f.width * size.screen,
    top: size.floorY - (f.bottom + f.height) * size.unit,
    height: f.height * size.unit,
  };
}

/** Inside a cupboard: the space behind the door, each shelf's height and how many fit on one. */
export interface Shelves {
  inner: Box;
  /** Where things line up, clear of the open doors. */
  row: { left: number; width: number };
  band: number;
  capacity: number;
}

export function shelvesOf(c: Cupboard, size: HomeSize): Shelves {
  const box = fixtureBox(c, size);
  const pad = Math.max(5, Math.round(size.unit * 0.014));
  const inner = { left: box.left + pad, top: box.top + pad, width: box.width - pad * 2, height: box.height - pad * 2 };
  const band = inner.height / c.shelves;
  // Open doors swing out past the sides, so the whole inside is shelf.
  const row = { left: inner.left + band * 0.1, width: inner.width - band * 0.2 };
  return { inner, row, band, capacity: Math.max(1, Math.floor(row.width / (band * 0.85))) };
}

/** A ledge's height and its left and right ends. */
export function surfaceLine(s: Surface, size: HomeSize): { y: number; left: number; right: number } {
  const left = areaIndex(s.area, size) * size.areaWidth + s.left * size.screen;
  return { y: size.floorY - s.bottom * size.unit, left, right: left + s.width * size.screen };
}

/** Where a buddy sits in a built-in seat, its left and right ends, and the rim it hides behind. */
export function seatLine(s: BuiltInSeat, size: HomeSize): { y: number; left: number; right: number; rimY: number } {
  const left = areaIndex(s.area, size) * size.areaWidth + s.left * size.screen;
  const y = size.floorY - s.bottom * size.unit;
  return { y, left, right: left + s.width * size.screen, rimY: size.floorY - (s.rim ?? s.bottom) * size.unit };
}

/** A built-in thing to tap, as a square box. */
export function gadgetBox(g: Gadget, size: HomeSize): Box {
  const side = g.size * size.unit;
  return {
    left: areaIndex(g.area, size) * size.areaWidth + g.x * size.screen - side / 2,
    top: size.floorY - g.bottom * size.unit - side,
    width: side,
    height: side,
  };
}

/** Which piece, if any, is under a point in the home; the one drawn on top wins. */
export function pieceAt(pieces: Piece[], x: number, y: number): Piece | null {
  for (let i = pieces.length - 1; i >= 0; i--) {
    if (inside(x, y, boxOf(pieces[i]))) return pieces[i];
  }
  return null;
}

/** Something drawn in the home. `x`, `y` is the middle of its bottom edge, in pixels. */
export interface Piece {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  buddyId?: string;
  thing?: RoomThing;
  item?: RoomItem;
  /** What it rests on or is held by. */
  parent?: string;
  /** Kept in an open cupboard. */
  stored?: boolean;
  /** Sitting in a built-in seat: its id, and how much of its bottom is hidden behind the seat's front. */
  builtIn?: string;
  sunk?: number;
  /** Draw order: the bottom of what it stands on, so a buddy on a couch draws with the couch. */
  rootY: number;
  depth: number;
}

export interface BuddyAt {
  id: string;
  spot: BuddySpot;
  /** For a person: how tall they stand in their box (PersonLook.height). Holding follows their hand. */
  personHeight?: number;
}

/**
 * Where a person's hand is, from the middle of their box: sideways, and up from the feet,
 * as shares of their drawn height. Matches the arm drawn in PersonFigure.
 */
export const PERSON_HAND = { side: 0.2, up: 0.35 } as const;

function clampAround(x: number, center: number, half: number): number {
  return half <= 0 ? center : Math.min(center + half, Math.max(center - half, x));
}

/** The height on a table or seat where things rest, in pixels. */
export function ledgeOf(p: Piece): number | null {
  const lift = p.item?.top ?? p.item?.seat;
  return lift === undefined ? null : p.y - p.height * lift;
}

/**
 * Lays out every buddy and placed thing: things on tables, seats and ledges rest on them,
 * held things sit at the buddy's side and things in open cupboards line up on the shelves.
 * Things in shut cupboards are left out. Sorted back to front.
 */
export function layoutHome(room: Room, buddies: BuddyAt[], size: HomeSize, open: ReadonlySet<string>): Piece[] {
  const { width: W, height: H, unit } = size;
  const things = new Map(room.things.filter((t) => t.placed).map((t) => [t.key, t]));
  const buddyAt = new Map(buddies.map((b) => [BUDDY_KEY + b.id, b]));
  const done = new Map<string, Piece | null>();
  const visiting = new Set<string>();
  const place = (key: string): Piece | null => {
    if (done.has(key)) return done.get(key) ?? null;
    if (visiting.has(key)) return null;
    visiting.add(key);
    const piece = build(key);
    visiting.delete(key);
    done.set(key, piece);
    return piece;
  };

  const build = (key: string): Piece | null => {
    const b = buddyAt.get(key);
    if (b) {
      const px = BUDDY_SIZE * unit;
      let x = b.spot.x * W;
      let y = b.spot.y * H;
      const fixed = b.spot.on?.startsWith(FIXTURE_KEY) ? findBuiltInSeat(b.spot.on.slice(FIXTURE_KEY.length)) : undefined;
      if (fixed) {
        const line = seatLine(fixed, size);
        x = clampAround(x, (line.left + line.right) / 2, (line.right - line.left) / 2);
        const sunk = Math.max(0, line.y - line.rimY);
        const side = px * (fixed.scale ?? 1);
        return { key, x, y: line.y, width: side, height: side, buddyId: b.id, builtIn: fixed.id, sunk, rootY: size.floorY, depth: 0 };
      }
      const seat = b.spot.on && !b.spot.on.startsWith(FIXTURE_KEY) ? place(b.spot.on) : null;
      const ledge = seat?.item?.seat !== undefined ? ledgeOf(seat) : null;
      if (seat && ledge !== null) {
        y = ledge;
        x = clampAround(x, seat.x, seat.width / 2 - px * 0.3);
        return { key, x, y, width: px, height: px, buddyId: b.id, parent: seat.key, rootY: seat.rootY, depth: seat.depth + 1 };
      }
      return { key, x, y, width: px, height: px, buddyId: b.id, rootY: y, depth: 0 };
    }
    const t = things.get(key);
    const item = t && findRoomItem(t.itemId);
    if (!t || !item) return null;
    let h = item.size * unit;
    let w = h * (item.wide ?? 1);

    if (t.in) {
      const c = findCupboard(t.in);
      if (!c || !open.has(c.id)) return null;
      const { inner, row, band } = shelvesOf(c, size);
      const shelf = Math.min(c.shelves - 1, Math.max(0, t.shelf ?? 0));
      h = Math.min(h, band * 0.78);
      w = h;
      // Right where it was dropped along the shelf, kept inside the cupboard.
      const x = clampAround(row.left + Math.min(1, Math.max(0, t.x)) * row.width, row.left + row.width / 2, (row.width - w) / 2);
      const y = inner.top + band * (shelf + 1) - 3;
      return { key, x, y, width: w, height: h, thing: t, item, stored: true, rootY: y, depth: 0 };
    }

    let x = t.x * W;
    let y = t.y * H;
    let parent: Piece | null = null;
    if (t.on?.startsWith(FIXTURE_KEY)) {
      const s = SURFACES.find((f) => FIXTURE_KEY + f.id === t.on);
      if (s) {
        const line = surfaceLine(s, size);
        y = line.y;
        x = clampAround(x, (line.left + line.right) / 2, (line.right - line.left - w) / 2);
      }
    } else if (t.on?.startsWith(BUDDY_KEY)) {
      parent = place(t.on);
      if (parent) {
        const person = buddyAt.get(t.on)?.personHeight;
        if (person !== undefined) {
          // In a person's hand: the middle of the thing sits at the end of the arm.
          const u = parent.height * person;
          h = Math.min(h, u * 0.32);
          w = h * (item.wide ?? 1);
          x = parent.x + u * PERSON_HAND.side;
          y = parent.y - u * PERSON_HAND.up + h * 0.4;
        } else {
          // In the buddy's paw, at the end of its arm.
          h = Math.min(h, parent.height * 0.42);
          w = h * (item.wide ?? 1);
          x = parent.x + parent.width * 0.26;
          y = parent.y - parent.height * 0.2;
        }
      }
    } else if (t.on) {
      parent = place(t.on);
      const ledge = parent ? ledgeOf(parent) : null;
      if (parent && ledge !== null) {
        y = ledge;
        x = clampAround(x, parent.x, (parent.width - w) / 2);
      } else {
        parent = null;
      }
    }
    return {
      key,
      x,
      y,
      width: w,
      height: h,
      thing: t,
      item,
      parent: parent?.key,
      rootY: parent ? parent.rootY : y,
      depth: parent ? parent.depth + 1 : 0,
    };
  };

  const pieces = [...buddyAt.keys(), ...things.keys()]
    .map(place)
    .filter((p): p is Piece => p !== null);
  return pieces.sort((a, b) => a.rootY - b.rootY || a.depth - b.depth);
}

function inside(x: number, y: number, box: Box): boolean {
  return x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height;
}

/** What can be touched of a piece: not the part hidden behind a bathtub's or toilet's front. */
function boxOf(p: Piece): Box {
  return { left: p.x - p.width / 2, top: p.y - p.height, width: p.width, height: p.height - (p.sunk ?? 0) };
}

/** Keys of everything resting on `key`, and on those, and so on. */
export function ridersOf(pieces: Piece[], key: string): Set<string> {
  const found = new Set([key]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of pieces) {
      if (p.parent && found.has(p.parent) && !found.has(p.key)) {
        found.add(p.key);
        grew = true;
      }
    }
  }
  return found;
}

/**
 * Where a thing lands after being dragged by `dx`, `dy` pixels. Small things go into an
 * open cupboard, into a buddy's hands, onto a table or seat, or onto a built-in ledge,
 * in that order; anything else stays where it was dropped.
 */
export function dropThing(
  pieces: Piece[],
  piece: Piece,
  dx: number,
  dy: number,
  size: HomeSize,
  open: ReadonlySet<string>,
): Placement {
  const baseX = piece.x + dx;
  const baseY = piece.y + dy;
  const free = { x: baseX / size.width, y: baseY / size.height };
  if (!piece.item || !isSmall(piece.item)) return free;
  const midY = baseY - piece.height / 2;

  for (const c of CUPBOARDS) {
    if (!open.has(c.id)) continue;
    const { inner, row, band, capacity } = shelvesOf(c, size);
    if (!inside(baseX, midY, inner)) continue;
    const want = Math.min(c.shelves - 1, Math.max(0, Math.floor((midY - inner.top) / band)));
    const order = Array.from({ length: c.shelves }, (_, i) => i).sort(
      (a, b) => Math.abs(a - want) - Math.abs(b - want),
    );
    for (const shelf of order) {
      const used = pieces.filter(
        (p) => p.key !== piece.key && p.thing?.in === c.id && (p.thing.shelf ?? 0) === shelf,
      ).length;
      // Along the shelf, as a share of its width, so it stays where it was dropped.
      if (used < capacity) return { x: (baseX - row.left) / row.width, y: free.y, in: c.id, shelf };
    }
  }

  const holder = pieces.filter((p) => p.buddyId && inside(baseX, midY, boxOf(p))).pop();
  if (holder) return { ...free, on: holder.key };

  const rest = pieces
    .filter((p) => {
      const ledge = ledgeOf(p);
      if (p.key === piece.key || p.stored || ledge === null) return false;
      return Math.abs(baseX - p.x) <= p.width / 2 && baseY >= ledge - size.unit * 0.15 && baseY <= p.y;
    })
    .pop();
  if (rest) return { x: free.x, y: (ledgeOf(rest) ?? baseY) / size.height, on: rest.key };

  for (const s of SURFACES) {
    const line = surfaceLine(s, size);
    if (baseX < line.left || baseX > line.right) continue;
    if (baseY >= line.y - size.unit * 0.12 && baseY <= line.y + size.unit * s.depth) {
      return { x: free.x, y: line.y / size.height, on: FIXTURE_KEY + s.id };
    }
  }
  return free;
}

/**
 * Where a buddy lands after being dragged: on a seat if it is dropped on one, in a built-in
 * (the bathtub, the toilet, the ball pit, a swing, the tree house) if it is dropped over one, or standing.
 */
export function dropBuddy(pieces: Piece[], piece: Piece, dx: number, dy: number, size: HomeSize): Placement {
  const baseX = piece.x + dx;
  const baseY = piece.y + dy;
  const seat = pieces
    .filter((p) => {
      if (p.item?.seat === undefined) return false;
      const ledge = ledgeOf(p) ?? p.y;
      return Math.abs(baseX - p.x) <= p.width / 2 && baseY >= ledge - size.unit * 0.2 && baseY <= p.y + size.unit * 0.05;
    })
    .pop();
  if (seat) return { x: baseX / size.width, y: (ledgeOf(seat) ?? baseY) / size.height, on: seat.key };
  // Of the built-ins it is over, the one whose rim is nearest (the top or bottom bunk); a swing someone else is on is full.
  let best: { s: BuiltInSeat; line: ReturnType<typeof seatLine>; far: number } | null = null;
  for (const s of BUILT_IN_SEATS) {
    const line = seatLine(s, size);
    if (baseX < line.left || baseX > line.right) continue;
    if (baseY < line.rimY - size.unit * 0.25 || baseY > size.floorY + size.unit * 0.04) continue;
    if (s.one && pieces.some((p) => p.key !== piece.key && p.buddyId && p.builtIn === s.id)) continue;
    const far = Math.abs(baseY - line.rimY);
    if (!best || far < best.far) best = { s, line, far };
  }
  if (best) return { x: baseX / size.width, y: best.line.y / size.height, on: FIXTURE_KEY + best.s.id };
  // Let go in the air (over the wall), it falls down onto the floor.
  return { x: baseX / size.width, y: Math.max(baseY, size.floorY + size.unit * 0.05) / size.height };
}

/**
 * The trip down the backyard slide, in pixels across the home: from the top of the chute at the
 * fort's edge to its foot, then where the buddy stands on the grass after.
 */
export function slideTrip(size: HomeSize): { top: { x: number; y: number }; foot: { x: number; y: number }; off: { x: number; y: number } } {
  const scape = APPLIANCES.find((a) => a.kind === 'playScape');
  if (!scape) return { top: { x: 0, y: 0 }, foot: { x: 0, y: 0 }, off: { x: 0, y: 0 } };
  const box = fixtureBox(scape, size);
  const top = { x: box.left + box.width * FORT.width, y: box.top + box.height * FORT.platform };
  const foot = { x: box.left + box.width * 0.97, y: size.floorY };
  return { top, foot, off: { x: foot.x + size.screen * 0.06, y: size.floorY + size.unit * 0.05 } };
}
