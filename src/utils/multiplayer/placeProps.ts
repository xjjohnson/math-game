import { ingredientIndex, MADE_SLOTS } from '@/utils/bakery';
import type { TownPlace } from '@/utils/multiplayer/protocol';
import type { Spot } from '@/utils/multiplayer/scene';

/**
 * The things inside each community building that anyone can pick up and move:
 * cans and fruit in the shop, bowls and pastries in the bakery, books in the
 * library, ducks and toys in the park. All numbers are shares of the room's
 * width (x) and height (y), so every phone puts them in the same place.
 *
 * The furniture they sit on is listed here too, so the drawing and the
 * "where does it land" rule always agree.
 */

/** Where a room's back wall meets its floor, as a share of its height. */
export const FLOOR = 0.6;

export type InsidePlace = Exclude<TownPlace, 'street'>;

/** Something a prop can rest on: a shelf or counter top running from x0 to x1 at height y. */
export interface Surface {
  x0: number;
  x1: number;
  y: number;
}

export interface PropDef {
  /** Unique inside its place. */
  id: string;
  emoji: string;
  /** Where its bottom middle starts out. */
  x: number;
  y: number;
  /** Stays where it is let go, in the air too (a kite, a butterfly). */
  float?: boolean;
  /** What it turns into after a few seconds in the hot oven. */
  bakeTo?: string;
  /** Drawn bigger (a shopping cart, a picnic basket). */
  big?: boolean;
  /** Bakery: which ingredient this is (a bit number); dropped on the mixing bowl it goes in and the thing springs back. */
  ingredient?: number;
  /** Bakery: the mixing bowl itself. */
  bowl?: boolean;
  /** Bakery: one of the spare places a finished treat appears (only drawn while its switch says there is one). */
  made?: number;
}

/** A row of shelves inside one cabinet: the cabinet runs from x0 to x1, with a shelf at each height in rows. */
export interface Shelves {
  x0: number;
  x1: number;
  top: number;
  rows: number[];
}

// --- Corner shop ---
export const SHOP = {
  shelvesA: { x0: 0.09, x1: 0.29, top: 0.16, rows: [0.27, 0.4, 0.53] } as Shelves,
  fridge: { x0: 0.33, x1: 0.43, top: 0.16, rows: [0.29, 0.42, 0.55] } as Shelves,
  shelvesB: { x0: 0.47, x1: 0.65, top: 0.2, rows: [0.3, 0.45] } as Shelves,
  stand: { x0: 0.69, x1: 0.79, top: 0.48 },
  counter: { x0: 0.83, x1: 0.97, top: 0.45 },
};

// --- Bakery ---
export const BAKERY = {
  counter: { x0: 0.08, x1: 0.4, top: 0.45 },
  mixer: { x0: 0.1, x1: 0.19 },
  wallShelf: { x0: 0.09, x1: 0.39, y: 0.27 },
  oven: { x0: 0.44, x1: 0.56, top: 0.22, rack: 0.47 },
  caseBox: { x0: 0.6, x1: 0.8, top: 0.3, rows: [0.43, 0.56] } as Shelves,
  rack: { x0: 0.84, x1: 0.97, top: 0.16, rows: [0.27, 0.41] } as Shelves,
};

// --- Library ---
export const LIBRARY = {
  cases: [
    { x0: 0.08, x1: 0.22, top: 0.18, rows: [0.3, 0.42, 0.54] },
    { x0: 0.25, x1: 0.39, top: 0.18, rows: [0.3, 0.42, 0.54] },
    { x0: 0.42, x1: 0.56, top: 0.18, rows: [0.3, 0.42, 0.54] },
  ] as Shelves[],
  nook: { x0: 0.59, x1: 0.71 },
  desk: { x0: 0.74, x1: 0.97, top: 0.46 },
  computers: [0.79, 0.91],
};

// --- Park ---
export const PARK = {
  swings: { x0: 0.08, x1: 0.2, top: 0.3 },
  slide: { x0: 0.24, x1: 0.37, top: 0.34 },
  sandbox: { x0: 0.41, x1: 0.55, y0: 0.66, y1: 0.78 },
  pond: { x0: 0.59, x1: 0.75, y0: 0.66, y1: 0.82 },
  tree: { x: 0.83, top: 0.16, branches: [0.3, 0.43] },
  blanket: { x0: 0.88, x1: 0.98, y0: 0.7, y1: 0.82 },
};

/** How many screens wide each inside place is. */
export const INSIDE_SCREENS: Record<InsidePlace, number> = { shop: 3, bakery: 3, library: 3, park: 3.4 };

const shelfSurfaces = (s: Shelves): Surface[] => [
  { x0: s.x0 + 0.005, x1: s.x1 - 0.005, y: s.top },
  ...s.rows.map((y) => ({ x0: s.x0 + 0.005, x1: s.x1 - 0.005, y })),
];

export const SURFACES: Record<InsidePlace, Surface[]> = {
  shop: [
    ...shelfSurfaces(SHOP.shelvesA),
    ...shelfSurfaces(SHOP.fridge).slice(1),
    ...shelfSurfaces(SHOP.shelvesB).slice(1),
    { ...SHOP.stand, y: SHOP.stand.top },
    { ...SHOP.counter, y: SHOP.counter.top },
  ],
  bakery: [
    { ...BAKERY.counter, y: BAKERY.counter.top },
    { ...BAKERY.wallShelf },
    { x0: BAKERY.oven.x0, x1: BAKERY.oven.x1, y: BAKERY.oven.top },
    { x0: BAKERY.oven.x0 + 0.015, x1: BAKERY.oven.x1 - 0.015, y: BAKERY.oven.rack },
    ...shelfSurfaces(BAKERY.caseBox),
    ...shelfSurfaces(BAKERY.rack).slice(1),
  ],
  library: [
    ...LIBRARY.cases.flatMap(shelfSurfaces),
    { ...LIBRARY.desk, y: LIBRARY.desk.top },
  ],
  park: [
    { x0: PARK.slide.x0, x1: PARK.slide.x0 + 0.05, y: PARK.slide.top },
    ...PARK.tree.branches.map((y, i) => ({ x0: PARK.tree.x - 0.055 + i * 0.01, x1: PARK.tree.x + 0.055 - i * 0.01, y })),
  ],
};

const row = (emojis: string[], x0: number, x1: number, y: number, tag: string): PropDef[] =>
  emojis.map((emoji, i) => ({ id: `${tag}${i}`, emoji, y, x: x0 + ((i + 0.5) * (x1 - x0)) / emojis.length }));

const BOOKS = ['📕', '📗', '📘', '📙', '📔', '📓', '📒'];
const books = (caseIndex: number): PropDef[] => {
  const c = LIBRARY.cases[caseIndex];
  return c.rows.flatMap((y, r) =>
    row(
      Array.from({ length: 3 }, (_, i) => BOOKS[(caseIndex * 3 + r * 2 + i) % BOOKS.length]),
      c.x0 + 0.01,
      c.x1 - 0.01,
      y,
      `k${caseIndex}${r}`,
    ),
  );
};

/** The bakery's mixing bowl: drop ingredients in, then slide it into the hot oven. */
export const BOWL: PropDef = { id: 'bowl', emoji: '🥣', x: 0.225, y: BAKERY.counter.top, big: true, bowl: true };
/** A switch that says a finished treat is waiting in this slot (y says which treat). */
/** The switch that keeps what is in the bowl (x is the contents as a number between 0 and 1). */
export const BOWL_SWITCH = 'bowl';
export const madeSwitch = (slot: number): string => `made-${slot}`;

const asIngredient = (keys: string[]) => (p: PropDef, i: number): PropDef => ({ ...p, ingredient: ingredientIndex(keys[i]) });

export const PLACE_PROPS: Record<InsidePlace, PropDef[]> = {
  shop: [
    ...row(['🥫', '🥫', '🧂', '🍯'], SHOP.shelvesA.x0, SHOP.shelvesA.x1, SHOP.shelvesA.rows[0], 'a'),
    ...row(['🍪', '🍫', '🍬', '🥨'], SHOP.shelvesA.x0, SHOP.shelvesA.x1, SHOP.shelvesA.rows[1], 'b'),
    ...row(['🧻', '🧼', '🧽'], SHOP.shelvesA.x0, SHOP.shelvesA.x1, SHOP.shelvesA.rows[2], 'c'),
    ...row(['🥛', '🧃'], SHOP.fridge.x0, SHOP.fridge.x1, SHOP.fridge.rows[0], 'f'),
    ...row(['🧀', '🥚'], SHOP.fridge.x0, SHOP.fridge.x1, SHOP.fridge.rows[1], 'g'),
    ...row(['🧈', '🍦'], SHOP.fridge.x0, SHOP.fridge.x1, SHOP.fridge.rows[2], 'h'),
    ...row(['🍞', '🥐', '🥯', '🥖'], SHOP.shelvesB.x0, SHOP.shelvesB.x1, SHOP.shelvesB.rows[0], 'd'),
    ...row(['🍚', '🫖', '🥜'], SHOP.shelvesB.x0, SHOP.shelvesB.x1, SHOP.shelvesB.rows[1], 'e'),
    ...row(['🍎', '🍌', '🍊'], SHOP.stand.x0, SHOP.stand.x1, SHOP.stand.top, 'p'),
    { id: 'melon', emoji: '🍉', x: 0.72, y: 0.68 },
    { id: 'carrot', emoji: '🥕', x: 0.77, y: 0.7 },
    { id: 'bag', emoji: '🛍️', x: 0.86, y: SHOP.counter.top },
    { id: 'cart', emoji: '🛒', x: 0.55, y: 0.82, big: true },
    { id: 'basket', emoji: '🧺', x: 0.2, y: 0.8 },
  ],
  bakery: [
    BOWL,
    ...row(['🥚', '🥛', '🧈', '🍓'], 0.29, 0.4, BAKERY.counter.top, 'i').map(asIngredient(['egg', 'milk', 'butter', 'berry'])),
    ...row(['🍯', '🧂', '🫙', '🍫', '🌾', '🍬', '🍌', '🍎'], BAKERY.wallShelf.x0, BAKERY.wallShelf.x1, BAKERY.wallShelf.y, 'j').map(
      asIngredient(['honey', 'salt', 'jam', 'choc', 'flour', 'sugar', 'banana', 'apple']),
    ),
    { id: 'dough1', emoji: '🫓', x: 0.475, y: BAKERY.oven.top, bakeTo: '🥖' },
    { id: 'dough2', emoji: '🫓', x: 0.525, y: BAKERY.oven.top, bakeTo: '🍞' },
    ...row(['🧁', '🍰', '🥧'], BAKERY.caseBox.x0, BAKERY.caseBox.x1, BAKERY.caseBox.top, 't'),
    ...row(['🥐', '🍩', '🍪', '🥨'], BAKERY.caseBox.x0, BAKERY.caseBox.x1, BAKERY.caseBox.rows[0], 'u'),
    ...row(['🍩', '🧁', '🍮', '🍪'], BAKERY.caseBox.x0, BAKERY.caseBox.x1, BAKERY.caseBox.rows[1], 'v'),
    ...row(['🍞', '🥖'], BAKERY.rack.x0, BAKERY.rack.x1, BAKERY.rack.rows[0], 'r'),
    ...row(['🥯', '🥐'], BAKERY.rack.x0, BAKERY.rack.x1, BAKERY.rack.rows[1], 's'),
    { id: 'tray', emoji: '🍽️', x: 0.66, y: 0.8 },
    ...Array.from({ length: MADE_SLOTS }, (_, i): PropDef => ({ id: `made${i}`, emoji: '🍰', x: BOWL.x, y: BAKERY.counter.top, made: i })),
  ],
  library: [
    ...books(0),
    ...books(1),
    ...books(2),
    { id: 'globe', emoji: '🌍', x: 0.15, y: LIBRARY.cases[0].top },
    { id: 'plant', emoji: '🪴', x: 0.32, y: LIBRARY.cases[1].top },
    { id: 'clock', emoji: '⏰', x: 0.49, y: LIBRARY.cases[2].top },
    { id: 'phones', emoji: '🎧', x: 0.85, y: LIBRARY.desk.top },
    { id: 'pencil', emoji: '✏️', x: 0.96, y: LIBRARY.desk.top },
    { id: 'teddy', emoji: '🧸', x: 0.63, y: 0.78 },
    { id: 'open', emoji: '📖', x: 0.68, y: 0.84 },
  ],
  park: [
    { id: 'bucket', emoji: '🪣', x: 0.44, y: 0.73 },
    { id: 'shell', emoji: '🐚', x: 0.49, y: 0.76 },
    { id: 'crab', emoji: '🦀', x: 0.53, y: 0.72 },
    { id: 'duck1', emoji: '🦆', x: 0.63, y: 0.76 },
    { id: 'duck2', emoji: '🦆', x: 0.68, y: 0.79 },
    { id: 'frog', emoji: '🐸', x: 0.72, y: 0.74 },
    ...row(['🍎', '🍎', '🐿️'], PARK.tree.x - 0.05, PARK.tree.x + 0.05, PARK.tree.branches[0], 'n'),
    ...row(['🍎', '🐦'], PARK.tree.x - 0.04, PARK.tree.x + 0.04, PARK.tree.branches[1], 'o'),
    { id: 'basket', emoji: '🧺', x: 0.9, y: 0.77, big: true },
    { id: 'sandwich', emoji: '🥪', x: 0.94, y: 0.75 },
    { id: 'melon', emoji: '🍉', x: 0.965, y: 0.79 },
    { id: 'ball', emoji: '⚽', x: 0.4, y: 0.88 },
    { id: 'dog', emoji: '🐕', x: 0.2, y: 0.86 },
    { id: 'kite', emoji: '🪁', x: 0.3, y: 0.14, float: true },
    { id: 'balloon', emoji: '🎈', x: 0.62, y: 0.22, float: true },
    { id: 'fly', emoji: '🦋', x: 0.5, y: 0.42, float: true },
    { id: 'bee', emoji: '🐝', x: 0.92, y: 0.5, float: true },
    ...row(['🌻', '🌷', '🌼'], 0.555, 0.59, 0.64, 'w'),
  ],
};

/** Every prop's piece id starts with this, so the host knows anyone may move it. */
export const PROP_MARK = '~';
export const propPieceId = (place: InsidePlace, id: string): string => `${PROP_MARK}${place}:${id}`;
/** A switch (an oven, a swing, a lamp) is kept as a piece too: x is 1 when it's on. */
export const switchPieceId = (place: InsidePlace, name: string): string => `${PROP_MARK}${place}:sw:${name}`;
/** Whether a prop has been baked: also kept as a switch. */
export const bakedSwitch = (propId: string): string => `baked-${propId}`;
export const isSharedPiece = (pieceId: string): boolean => pieceId.startsWith(PROP_MARK);

export const isInside = (place: TownPlace): place is InsidePlace => place !== 'street';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Where a prop lands when it's let go: on the floor it stays where it is put;
 * up the wall it drops onto the nearest shelf or counter below, or to the
 * floor if there is none. Floating things stay put.
 */
export function settle(place: InsidePlace, prop: Pick<PropDef, 'float'>, x: number, y: number): Spot {
  const cx = clamp(x, 0.01, 0.99);
  if (prop.float) return { x: cx, y: clamp(y, 0.1, 0.95) };
  if (y >= FLOOR + 0.02) return { x: cx, y: Math.min(0.95, y) };
  const below = SURFACES[place]
    .filter((s) => cx >= s.x0 && cx <= s.x1 && s.y >= y - 0.015)
    .sort((a, b) => a.y - b.y)[0];
  return { x: cx, y: below ? below.y : FLOOR + 0.04 };
}

/** Whether an ingredient let go at `s` lands in the mixing bowl sitting at `bowl`. */
export function onBowl(s: Spot, bowl: Spot): boolean {
  return Math.abs(s.x - bowl.x) <= 0.04 && s.y >= bowl.y - 0.2 && s.y <= bowl.y + 0.05;
}

/** Whether a spot is inside the bakery oven, where things bake while it's on. */
export function inOven(s: Spot): boolean {
  const o = BAKERY.oven;
  return s.x > o.x0 && s.x < o.x1 && s.y > o.top + 0.02 && s.y <= FLOOR;
}
