import { ingredientIndex, MADE_SLOTS } from '@/utils/bakery';
import { SHELF_BOOKS } from '@/utils/libraryBooks';
import type { TownPlace } from '@/utils/multiplayer/protocol';
import type { Spot } from '@/utils/multiplayer/scene';

/**
 * The things inside each community building that anyone can pick up and move:
 * pencils and books at school, cans and fruit in the shop, bowls and pastries in the bakery, books in the
 * library, ducks and toys in the park, animals and eggs on the farm. All numbers are shares of the room's
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
  /** Library: which book this is (see libraryBooks.ts); tap it to read it. */
  book?: number;
  /** Drawn this many times the usual size (a cow, a tractor). */
  scale?: number;
  /** Farm: an animal, and what it says when it's tapped. */
  says?: string;
  /** Farm: an egg; dropped in the egg basket it goes in and a new one is back in the nest. */
  egg?: boolean;
  /** Farm: the egg basket itself. */
  eggBasket?: boolean;
  /** Farm: food an animal can eat (drop it on one). */
  food?: boolean;
}

/** A row of shelves inside one cabinet: the cabinet runs from x0 to x1, with a shelf at each height in rows. */
export interface Shelves {
  x0: number;
  x1: number;
  top: number;
  rows: number[];
}

// --- School ---
export const SCHOOL = {
  /** The chalkboard you can draw on, with its chalk tray along the bottom. */
  board: { x0: 0.1, x1: 0.42, top: 0.1, bottom: 0.52 },
  teacher: { x0: 0.45, x1: 0.55, top: 0.46 },
  /** Pupils' desks: each one's left and right edge; all the same height. */
  desks: [
    [0.585, 0.635],
    [0.66, 0.71],
    [0.735, 0.785],
  ] as [number, number][],
  deskTop: 0.5,
  /** The color corner: the easel (tap it to paint) and a little crayon table. */
  color: { x0: 0.82, x1: 0.98 },
  crayonTable: { x0: 0.885, x1: 0.975, top: 0.5 },
};

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
  swings: { x0: 0.07, x1: 0.21, top: 0.12 },
  slide: { x0: 0.24, x1: 0.37, top: 0.34 },
  sandbox: { x0: 0.41, x1: 0.55, y0: 0.66, y1: 0.78 },
  pond: { x0: 0.59, x1: 0.75, y0: 0.66, y1: 0.82 },
  tree: { x: 0.83, top: 0.16, branches: [0.3, 0.43] },
  blanket: { x0: 0.88, x1: 0.98, y0: 0.7, y1: 0.82 },
};

// --- Farm ---
export const FARM = {
  /** The red barn, with a hay loft inside, and the silo beside it. */
  barn: { x0: 0.03, x1: 0.23, top: 0.12, loft: 0.3 },
  silo: { x0: 0.24, x1: 0.285, top: 0.1 },
  /** The hen house: a roof to stand on and two rows of nest boxes. */
  coop: { x0: 0.31, x1: 0.45, top: 0.24, rows: [0.39, 0.53] } as Shelves,
  /** The animal pen's fence, with a mud puddle inside it. */
  pen: { x0: 0.5, x1: 0.73 },
  mud: { x0: 0.53, x1: 0.66, y0: 0.72, y1: 0.85 },
  pond: { x0: 0.755, x1: 0.865, y0: 0.67, y1: 0.8 },
  /** The vegetable patch: rows of soil with food growing. */
  garden: { x0: 0.88, x1: 0.985, y0: 0.64, y1: 0.75 },
};

/** How many screens wide each inside place is. */
export const INSIDE_SCREENS: Record<InsidePlace, number> = { school: 3, shop: 3, bakery: 3, library: 3, park: 3.4, farm: 3.4 };

const shelfSurfaces = (s: Shelves): Surface[] => [
  { x0: s.x0 + 0.005, x1: s.x1 - 0.005, y: s.top },
  ...s.rows.map((y) => ({ x0: s.x0 + 0.005, x1: s.x1 - 0.005, y })),
];

export const SURFACES: Record<InsidePlace, Surface[]> = {
  school: [
    { x0: SCHOOL.board.x0 + 0.01, x1: SCHOOL.board.x1 - 0.01, y: SCHOOL.board.bottom + 0.015 },
    { ...SCHOOL.teacher, y: SCHOOL.teacher.top },
    ...SCHOOL.desks.map(([x0, x1]) => ({ x0, x1, y: SCHOOL.deskTop })),
    { ...SCHOOL.crayonTable, y: SCHOOL.crayonTable.top },
  ],
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
  farm: [
    { x0: FARM.barn.x0 + 0.02, x1: FARM.barn.x1 - 0.02, y: FARM.barn.loft },
    ...shelfSurfaces(FARM.coop),
  ],
};

const row = (emojis: string[], x0: number, x1: number, y: number, tag: string): PropDef[] =>
  emojis.map((emoji, i) => ({ id: `${tag}${i}`, emoji, y, x: x0 + ((i + 0.5) * (x1 - x0)) / emojis.length }));

/** The open book on the reading rug is the library guide. */
export const GUIDE_BOOK = SHELF_BOOKS;

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
    ).map((b, i) => ({ ...b, book: caseIndex * 9 + r * 3 + i })),
  );
};

/** The bakery's mixing bowl: drop ingredients in, then slide it into the hot oven. */
export const BOWL: PropDef = { id: 'bowl', emoji: '🥣', x: 0.225, y: BAKERY.counter.top, big: true, bowl: true };
/** A switch that says a finished treat is waiting in this slot (y says which treat). */
/** The switch that keeps what is in the bowl: x is the contents as a number between 0 and 1, y is 1 once it's mixed. */
export const BOWL_SWITCH = 'bowl';
export const madeSwitch = (slot: number): string => `made-${slot}`;

const asIngredient = (keys: string[]) => (p: PropDef, i: number): PropDef => ({ ...p, ingredient: ingredientIndex(keys[i]) });

/** The farm's nest boxes, three to a row: where each one's middle is. */
export const nestX = (i: number): number => FARM.coop.x0 + ((i + 0.5) * (FARM.coop.x1 - FARM.coop.x0)) / 3;

/** The egg basket on the farm: drop eggs in it to count them. */
export const EGG_BASKET: PropDef = { id: 'basket', emoji: '🧺', x: 0.475, y: 0.8, scale: 1.5, eggBasket: true };
/** The switch that keeps how many eggs are in the basket: x is the count over EGG_BASKET_MAX. */
export const EGG_BASKET_SWITCH = 'basket';
export const EGG_BASKET_MAX = 30;
export const eggsToUnit = (n: number): number => clamp(Math.round(n), 0, EGG_BASKET_MAX) / EGG_BASKET_MAX;
export const unitToEggs = (u: number): number => clamp(Math.round(u * EGG_BASKET_MAX), 0, EGG_BASKET_MAX);

const animal = (id: string, emoji: string, x: number, y: number, says: string, scale = 1.5): PropDef => ({ id, emoji, x, y, says, scale });
const food = (id: string, emoji: string, x: number, y: number): PropDef => ({ id, emoji, x, y, food: true });
const egg = (id: string, x: number, y: number): PropDef => ({ id, emoji: '🥚', x, y, egg: true });

const FARM_PROPS: PropDef[] = [
  // In the barn: hay up in the loft, a cat asleep beside it, the horse and the cow below.
  food('hay1', '🌾', 0.07, FARM.barn.loft),
  food('hay2', '🌾', 0.11, FARM.barn.loft),
  animal('cat', '🐈', 0.18, FARM.barn.loft, 'Meow!', 1.1),
  animal('horse', '🐎', 0.08, 0.8, 'Neigh!', 2),
  animal('cow', '🐄', 0.18, 0.86, 'Moo!', 2),
  // The hen house: a rooster on the roof, hens on their nests, and eggs to collect.
  animal('rooster', '🐓', 0.38, FARM.coop.top, 'Cock-a-doodle-doo!', 1.2),
  animal('hen1', '🐔', nestX(0), FARM.coop.rows[0], 'Cluck cluck!', 1.1),
  egg('egg1', nestX(1), FARM.coop.rows[0]),
  animal('hen2', '🐔', nestX(2), FARM.coop.rows[0], 'Cluck cluck!', 1.1),
  egg('egg2', nestX(0), FARM.coop.rows[1]),
  egg('egg3', nestX(1), FARM.coop.rows[1]),
  animal('hen3', '🐔', nestX(2), FARM.coop.rows[1], 'Cluck cluck!', 1.1),
  animal('chick1', '🐥', 0.34, 0.7, 'Peep peep!', 0.9),
  animal('chick2', '🐤', 0.39, 0.73, 'Peep!', 0.9),
  EGG_BASKET,
  // The pen: a pig in the mud, a sheep and a goat.
  animal('pig', '🐖', 0.6, 0.8, 'Oink oink!', 1.7),
  animal('sheep', '🐑', 0.535, 0.68, 'Baa!', 1.6),
  animal('goat', '🐐', 0.69, 0.71, 'Maa!', 1.6),
  animal('turkey', '🦃', 0.7, 0.88, 'Gobble gobble!', 1.4),
  // The duck pond.
  animal('duck1', '🦆', 0.785, 0.74, 'Quack!', 1.2),
  animal('duck2', '🦆', 0.835, 0.77, 'Quack quack!', 1.2),
  animal('dog', '🐕', 0.8, 0.9, 'Woof woof!', 1.4),
  // The vegetable patch, with a rabbit, and the tractor.
  food('carrot1', '🥕', 0.895, 0.7),
  food('carrot2', '🥕', 0.915, 0.7),
  food('corn', '🌽', 0.94, 0.7),
  food('lettuce', '🥬', 0.965, 0.7),
  food('apple', '🍎', 0.875, 0.88),
  animal('bunny', '🐇', 0.9, 0.82, 'Sniff sniff!', 1.2),
  { id: 'tractor', emoji: '🚜', x: 0.95, y: 0.86, scale: 2.2 },
  { id: 'fly', emoji: '🦋', x: 0.5, y: 0.4, float: true },
  { id: 'bee', emoji: '🐝', x: 0.93, y: 0.52, float: true },
];

export const PLACE_PROPS: Record<InsidePlace, PropDef[]> = {
  school: [
    ...row(['🍎', '📚', '🖊️'], SCHOOL.teacher.x0, SCHOOL.teacher.x1, SCHOOL.teacher.top, 't'),
    ...SCHOOL.desks.flatMap(([x0, x1], i) =>
      row([['✏️', '📓'], ['📏', '📒'], ['✂️', '📘']][i], x0, x1, SCHOOL.deskTop, `d${i}`),
    ),
    ...row(['🖍️', '🖌️', '🎨'], SCHOOL.crayonTable.x0, SCHOOL.crayonTable.x1, SCHOOL.crayonTable.top, 'c'),
    { id: 'globe', emoji: '🌍', x: 0.52, y: 0.84 },
    { id: 'bag', emoji: '🎒', x: 0.63, y: 0.86 },
    { id: 'ball', emoji: '🏀', x: 0.77, y: 0.88 },
  ],
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
    { id: 'open', emoji: '📖', x: 0.68, y: 0.84, book: GUIDE_BOOK },
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
  farm: FARM_PROPS,
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

/** Whether an egg let go at `s` lands in the egg basket sitting at `basket`. */
export function onBasket(s: Spot, basket: Spot): boolean {
  return Math.abs(s.x - basket.x) <= 0.035 && s.y >= basket.y - 0.2 && s.y <= basket.y + 0.05;
}

/** Whether food let go at `s` is on the animal standing at `at` (somewhere over its body). */
export function onAnimal(s: Spot, at: Spot, scale = 1.5): boolean {
  return Math.abs(s.x - at.x) <= 0.012 * scale + 0.01 && s.y >= at.y - 0.08 * scale && s.y <= at.y + 0.04;
}

const inOval = (s: Spot, o: { x0: number; x1: number; y0: number; y1: number }): boolean => {
  const cx = (o.x0 + o.x1) / 2;
  const cy = (o.y0 + o.y1) / 2;
  return ((s.x - cx) / ((o.x1 - o.x0) / 2)) ** 2 + ((s.y - cy) / ((o.y1 - o.y0) / 2)) ** 2 <= 1;
};
/** Whether a spot is in the farm's mud puddle (an animal there rolls about in it). */
export const inMud = (s: Spot): boolean => inOval(s, FARM.mud);
/** Whether a spot is in the farm's duck pond (an animal there floats and bobs). */
export const inFarmPond = (s: Spot): boolean => inOval(s, FARM.pond);

/** Whether an ingredient let go at `s` lands in the mixing bowl sitting at `bowl`. */
export function onBowl(s: Spot, bowl: Spot): boolean {
  return Math.abs(s.x - bowl.x) <= 0.04 && s.y >= bowl.y - 0.2 && s.y <= bowl.y + 0.05;
}

/** Whether the bowl sitting at `s` is on the stand mixer, where tapping the mixer mixes it. */
export function onMixer(s: Spot): boolean {
  const m = BAKERY.mixer;
  return s.x >= m.x0 - 0.01 && s.x <= m.x1 + 0.01 && Math.abs(s.y - BAKERY.counter.top) <= 0.02;
}
export const MIXER_MIDDLE = (BAKERY.mixer.x0 + BAKERY.mixer.x1) / 2;

/** How tall the stand mixer stands on the counter, as a share of the room's height. */
export const MIXER_TALL = 0.17;
/**
 * Where a buddy hangs off the stand mixer: holding on under the end of its top arm, over the
 * bowl. A buddy at exactly this spot is drawn hanging from it, not standing.
 */
export const MIXER_HANG: Spot = { x: BAKERY.mixer.x1 - 0.012, y: BAKERY.counter.top - MIXER_TALL * 0.73 };

/** Whether a buddy at `s` is hanging off the mixer. */
export function onMixerHang(s: Spot): boolean {
  return Math.abs(s.x - MIXER_HANG.x) < 0.002 && Math.abs(s.y - MIXER_HANG.y) < 0.002;
}

/** Whether a buddy let go at `s` (its feet) grabs onto the mixer: over it or just above the counter by it. */
export function grabsMixer(s: Spot): boolean {
  const m = BAKERY.mixer;
  return s.x >= m.x0 - 0.02 && s.x <= m.x1 + 0.03 && s.y >= BAKERY.counter.top - 0.26 && s.y <= BAKERY.counter.top + 0.04;
}

/** Whether a spot is inside the bakery oven, where things bake while it's on. */
export function inOven(s: Spot): boolean {
  const o = BAKERY.oven;
  return s.x > o.x0 && s.x < o.x1 && s.y > o.top + 0.02 && s.y <= FLOOR;
}
