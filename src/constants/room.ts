/** The parts of the buddy's home, left to right. The home scrolls sideways through them. */
export type AreaId = 'living' | 'kitchen' | 'bedroom';

export interface HomeArea {
  id: AreaId;
  name: string;
  emoji: string;
}

export const HOME_AREAS: HomeArea[] = [
  { id: 'living', name: 'Living room', emoji: '🛋️' },
  { id: 'kitchen', name: 'Kitchen', emoji: '🍳' },
  { id: 'bedroom', name: 'Bedroom', emoji: '🛏️' },
];

/** Holidays with their own shop shelf, sold only in their month. */
export type Season = 'halloween' | 'thanksgiving';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const OCTOBER = 9;
const NOVEMBER = 10;

export const SEASONS: Record<Season, { month: number; name: string }> = {
  halloween: { month: OCTOBER, name: 'Halloween' },
  thanksgiving: { month: NOVEMBER, name: 'Thanksgiving' },
};

/** The holiday in this month (0 = January), if there is one. */
export function seasonOf(month: number): Season | null {
  const found = (Object.keys(SEASONS) as Season[]).find((s) => SEASONS[s].month === month);
  return found ?? null;
}

/** Shelves of the "Add things" shop. */
export type RoomItemGroup = 'furniture' | 'living' | 'kitchen' | 'bedroom' | 'toys' | Season;

export const ROOM_ITEM_GROUPS: { id: RoomItemGroup; name: string }[] = [
  { id: 'thanksgiving', name: '🦃 Thanksgiving' },
  { id: 'halloween', name: '🎃 Halloween' },
  { id: 'furniture', name: '🪑 Furniture' },
  { id: 'living', name: '📺 Living' },
  { id: 'kitchen', name: '🍕 Kitchen' },
  { id: 'bedroom', name: '🪞 Bedroom' },
  { id: 'toys', name: '⚽ Toys' },
];

/** Furniture drawn with shapes, for the pieces with no good emoji. */
export type FurnitureShape = 'table' | 'coffeeTable' | 'nightstand' | 'stool' | 'bench' | 'beanbag';

/** Things a buddy's home can hold, bought with coins in the buddy's home. */
export interface RoomItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  /** Drawn height in the room, as a share of the room's size unit. */
  size: number;
  group: RoomItemGroup;
  /** Month (0 = January) the shop sells it in; sold all year without one. Owned ones stay. */
  month?: number;
  /** Drawn with shapes; `emoji` is then only for lists. */
  draw?: FurnitureShape;
  /** Width compared to its height; 1 when left out. */
  wide?: number;
  /** Buddies (and small things) can sit on it, this far up its height (0 to 1). */
  seat?: number;
  /** Buddies on it go to sleep. */
  sleep?: boolean;
  /** Small things can stand on top, this far up its height. */
  top?: number;
  /** Tapping it turns its light on and off. */
  light?: boolean;
  /** Pops up when it is tapped. */
  fx?: string;
  /** What the buddy says when it is tapped. */
  says?: string;
}

export const ROOM_ITEMS: RoomItem[] = [
  // Furniture to sit on and put things on
  { id: 'couch', name: 'Couch', emoji: '🛋️', price: 50, size: 0.34, group: 'furniture', seat: 0.45 },
  { id: 'chair', name: 'Chair', emoji: '🪑', price: 30, size: 0.24, group: 'furniture', seat: 0.5 },
  { id: 'table', name: 'Table', emoji: '🟫', price: 40, size: 0.2, group: 'furniture', draw: 'table', wide: 1.7, top: 1 },
  {
    id: 'coffeeTable',
    name: 'Coffee table',
    emoji: '🟫',
    price: 30,
    size: 0.11,
    group: 'furniture',
    draw: 'coffeeTable',
    wide: 2,
    top: 1,
  },
  {
    id: 'nightstand',
    name: 'Nightstand',
    emoji: '🟫',
    price: 25,
    size: 0.17,
    group: 'furniture',
    draw: 'nightstand',
    wide: 0.9,
    top: 1,
  },
  { id: 'stool', name: 'Stool', emoji: '🪑', price: 20, size: 0.17, group: 'furniture', draw: 'stool', wide: 0.7, seat: 1 },
  { id: 'bench', name: 'Bench', emoji: '🪑', price: 30, size: 0.14, group: 'furniture', draw: 'bench', wide: 2.2, seat: 0.75 },
  {
    id: 'beanbag',
    name: 'Beanbag',
    emoji: '🫘',
    price: 25,
    size: 0.15,
    group: 'furniture',
    draw: 'beanbag',
    wide: 1.4,
    seat: 0.65,
  },
  // Living room
  { id: 'tv', name: 'TV', emoji: '📺', price: 40, size: 0.2, group: 'living', fx: '🎬', says: 'loves this show' },
  { id: 'piano', name: 'Piano', emoji: '🎹', price: 50, size: 0.22, group: 'living', fx: '🎶', says: 'plays a song' },
  { id: 'radio', name: 'Radio', emoji: '📻', price: 25, size: 0.13, group: 'living', fx: '🎵', says: 'dances to the music' },
  { id: 'clock', name: 'Clock', emoji: '🕰️', price: 25, size: 0.14, group: 'living', fx: '⏰', says: 'hears tick, tock' },
  { id: 'picture', name: 'Picture', emoji: '🖼️', price: 25, size: 0.18, group: 'living' },
  { id: 'plant', name: 'Plant', emoji: '🪴', price: 15, size: 0.18, group: 'living', fx: '💧', says: 'waters the plant' },
  { id: 'lamp', name: 'Lamp', emoji: '🪔', price: 25, size: 0.12, group: 'living', light: true },
  { id: 'fish', name: 'Fish bowl', emoji: '🐠', price: 30, size: 0.12, group: 'living', fx: '🫧', says: 'waves at the fish' },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', price: 60, size: 0.14, group: 'living', fx: '🌟' },
  // Kitchen
  { id: 'bowl', name: 'Food bowl', emoji: '🥣', price: 10, size: 0.12, group: 'kitchen' },
  { id: 'pan', name: 'Frying pan', emoji: '🍳', price: 15, size: 0.12, group: 'kitchen', fx: '🔥', says: 'cooks an egg' },
  { id: 'teapot', name: 'Teapot', emoji: '🫖', price: 15, size: 0.12, group: 'kitchen', fx: '♨️', says: 'makes tea' },
  { id: 'plate', name: 'Dinner plate', emoji: '🍽️', price: 15, size: 0.12, group: 'kitchen' },
  { id: 'bread', name: 'Bread', emoji: '🍞', price: 10, size: 0.1, group: 'kitchen' },
  { id: 'apples', name: 'Apples', emoji: '🍎', price: 10, size: 0.09, group: 'kitchen' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', price: 15, size: 0.1, group: 'kitchen' },
  { id: 'cookies', name: 'Cookies', emoji: '🍪', price: 10, size: 0.09, group: 'kitchen' },
  { id: 'cupcake', name: 'Cupcake', emoji: '🧁', price: 15, size: 0.1, group: 'kitchen' },
  { id: 'cake', name: 'Cake', emoji: '🎂', price: 20, size: 0.13, group: 'kitchen', fx: '🕯️', says: 'makes a wish' },
  { id: 'honey', name: 'Honey jar', emoji: '🍯', price: 15, size: 0.1, group: 'kitchen' },
  { id: 'milk', name: 'Milk', emoji: '🥛', price: 10, size: 0.1, group: 'kitchen' },
  // Bedroom
  { id: 'bed', name: 'Bed', emoji: '🛏️', price: 40, size: 0.3, group: 'bedroom', seat: 0.45, sleep: true },
  { id: 'mirror', name: 'Mirror', emoji: '🪞', price: 30, size: 0.2, group: 'bedroom', fx: '✨', says: 'makes a silly face' },
  { id: 'dresser', name: 'Dresser', emoji: '🗄️', price: 35, size: 0.22, group: 'bedroom', top: 0.95 },
  { id: 'nightlight', name: 'Night light', emoji: '💡', price: 15, size: 0.11, group: 'bedroom', light: true },
  { id: 'books', name: 'Books', emoji: '📚', price: 15, size: 0.12, group: 'bedroom', fx: '📖', says: 'reads a story' },
  { id: 'backpack', name: 'Backpack', emoji: '🎒', price: 20, size: 0.13, group: 'bedroom' },
  { id: 'dolls', name: 'Nesting dolls', emoji: '🪆', price: 20, size: 0.12, group: 'bedroom' },
  { id: 'teddy', name: 'Teddy bear', emoji: '🧸', price: 15, size: 0.14, group: 'bedroom', fx: '💕', says: 'hugs the teddy' },
  { id: 'guitar', name: 'Guitar', emoji: '🎸', price: 30, size: 0.2, group: 'bedroom', fx: '🎵', says: 'strums the guitar' },
  // Toys and fun
  { id: 'ball', name: 'Ball', emoji: '⚽', price: 10, size: 0.1, group: 'toys', fx: '💫', says: 'kicks the ball' },
  { id: 'duck', name: 'Rubber duck', emoji: '🦆', price: 10, size: 0.1, group: 'toys', fx: '💦', says: 'hears quack, quack' },
  { id: 'car', name: 'Toy car', emoji: '🚗', price: 20, size: 0.12, group: 'toys', fx: '💨', says: 'goes vroom' },
  { id: 'kite', name: 'Kite', emoji: '🪁', price: 20, size: 0.16, group: 'toys', fx: '🌬️' },
  { id: 'balloon', name: 'Balloon', emoji: '🎈', price: 15, size: 0.16, group: 'toys' },
  { id: 'blocks', name: 'Blocks', emoji: '🧱', price: 15, size: 0.11, group: 'toys', fx: '🏰', says: 'builds a castle' },
  { id: 'yoyo', name: 'Yo-yo', emoji: '🪀', price: 10, size: 0.1, group: 'toys', fx: '🌀' },
  { id: 'game', name: 'Video game', emoji: '🎮', price: 30, size: 0.11, group: 'toys', fx: '👾', says: 'plays a game' },
  { id: 'drum', name: 'Drum', emoji: '🥁', price: 25, size: 0.14, group: 'toys', fx: '💥', says: 'plays the drum' },
  // Halloween, sold in October only
  { id: 'pumpkin', name: 'Jack-o’-lantern', emoji: '🎃', price: 15, size: 0.14, group: 'halloween', month: OCTOBER, light: true },
  { id: 'ghost', name: 'Friendly ghost', emoji: '👻', price: 20, size: 0.16, group: 'halloween', month: OCTOBER, fx: '💬', says: 'hears the ghost say Boo!' },
  { id: 'bat', name: 'Bat', emoji: '🦇', price: 15, size: 0.12, group: 'halloween', month: OCTOBER },
  { id: 'web', name: 'Spider web', emoji: '🕸️', price: 10, size: 0.18, group: 'halloween', month: OCTOBER },
  { id: 'spider', name: 'Spider', emoji: '🕷️', price: 10, size: 0.1, group: 'halloween', month: OCTOBER },
  { id: 'candy', name: 'Candy', emoji: '🍬', price: 10, size: 0.09, group: 'halloween', month: OCTOBER },
  { id: 'lollipop', name: 'Lollipop', emoji: '🍭', price: 10, size: 0.12, group: 'halloween', month: OCTOBER },
  { id: 'broom', name: 'Witch’s broom', emoji: '🧹', price: 20, size: 0.2, group: 'halloween', month: OCTOBER, fx: '🌙', says: 'zooms on the broom' },
  { id: 'crystal', name: 'Crystal ball', emoji: '🔮', price: 25, size: 0.12, group: 'halloween', month: OCTOBER, fx: '✨', says: 'sees the future' },
  { id: 'candle', name: 'Spooky candle', emoji: '🕯️', price: 15, size: 0.12, group: 'halloween', month: OCTOBER, light: true },
  // Thanksgiving, sold in November only
  { id: 'turkey', name: 'Turkey', emoji: '🦃', price: 25, size: 0.18, group: 'thanksgiving', month: NOVEMBER, fx: '💬', says: 'hears gobble, gobble' },
  { id: 'pie', name: 'Pumpkin pie', emoji: '🥧', price: 15, size: 0.1, group: 'thanksgiving', month: NOVEMBER },
  { id: 'corn', name: 'Corn', emoji: '🌽', price: 10, size: 0.1, group: 'thanksgiving', month: NOVEMBER },
  { id: 'drumstick', name: 'Drumstick', emoji: '🍗', price: 15, size: 0.1, group: 'thanksgiving', month: NOVEMBER },
  { id: 'sweetPotato', name: 'Sweet potato', emoji: '🍠', price: 10, size: 0.1, group: 'thanksgiving', month: NOVEMBER },
  { id: 'harvest', name: 'Harvest basket', emoji: '🧺', price: 20, size: 0.13, group: 'thanksgiving', month: NOVEMBER },
  { id: 'leaves', name: 'Fall leaves', emoji: '🍂', price: 10, size: 0.1, group: 'thanksgiving', month: NOVEMBER, fx: '🍁', says: 'jumps in the leaves' },
  { id: 'maple', name: 'Maple leaf', emoji: '🍁', price: 10, size: 0.1, group: 'thanksgiving', month: NOVEMBER },
  { id: 'acorn', name: 'Acorn', emoji: '🌰', price: 10, size: 0.08, group: 'thanksgiving', month: NOVEMBER },
  { id: 'sunflower', name: 'Sunflower', emoji: '🌻', price: 15, size: 0.17, group: 'thanksgiving', month: NOVEMBER },
];

/** Free paint colors the player can switch between. */
export const WALL_COLORS = ['#F3E6D3', '#FBE3EA', '#DDEFFB', '#E3F3DC', '#EDE4FA', '#FFF3C4', '#FFD8B5', '#3E3A5C'];
export const FLOOR_COLORS = ['#C98F5E', '#E7CFC4', '#B9C7D9', '#A8C79A', '#D9B8E8', '#8D6E63', '#F2F2F2', '#2F2B40'];

/** Most things the whole home can hold, so it stays tidy enough to play in. */
export const MAX_ROOM_THINGS = 80;

/** Drawn height of a buddy, as a share of the room's size unit. */
export const BUDDY_SIZE = 0.38;

export function findRoomItem(id: string): RoomItem | undefined {
  return ROOM_ITEMS.find((item) => item.id === id);
}

/** True when the shop sells the item in this month (0 = January). */
export function inSeason(item: RoomItem, month: number): boolean {
  return item.month === undefined || item.month === month;
}

/** Small things can be held, kept in cupboards and set on tables, shelves and seats. */
export function isSmall(item: RoomItem): boolean {
  return !item.draw && item.seat === undefined && item.top === undefined && item.size <= 0.2;
}

/**
 * Built-in pieces of each room. Across, `left` and `width` are shares of the area's width;
 * up, `bottom` (above the floor line) and `height` are in the room's size unit.
 */
export interface FixtureSpot {
  area: AreaId;
  left: number;
  width: number;
  bottom: number;
  height: number;
}

export type CupboardKind = 'cupboard' | 'fridge' | 'freezer' | 'oven' | 'wardrobe';

/** A built-in with a door that opens onto shelves things can be kept on. */
export interface Cupboard extends FixtureSpot {
  id: string;
  name: string;
  kind: CupboardKind;
  shelves: number;
  /** Door panels drawn when it is shut. */
  doors: number;
}

export const CUPBOARDS: Cupboard[] = [
  { id: 'upper', name: 'cupboard', kind: 'cupboard', area: 'kitchen', left: 0.06, width: 0.54, bottom: 0.47, height: 0.25, shelves: 2, doors: 3 },
  { id: 'underLeft', name: 'cupboard', kind: 'cupboard', area: 'kitchen', left: 0.075, width: 0.16, bottom: 0.02, height: 0.19, shelves: 1, doors: 1 },
  { id: 'oven', name: 'oven', kind: 'oven', area: 'kitchen', left: 0.25, width: 0.17, bottom: 0.02, height: 0.19, shelves: 1, doors: 1 },
  { id: 'underRight', name: 'cupboard', kind: 'cupboard', area: 'kitchen', left: 0.43, width: 0.16, bottom: 0.02, height: 0.19, shelves: 1, doors: 1 },
  { id: 'freezer', name: 'freezer', kind: 'freezer', area: 'kitchen', left: 0.68, width: 0.24, bottom: 0.38, height: 0.2, shelves: 1, doors: 1 },
  { id: 'fridge', name: 'fridge', kind: 'fridge', area: 'kitchen', left: 0.68, width: 0.24, bottom: 0, height: 0.37, shelves: 2, doors: 1 },
  { id: 'wardrobe', name: 'wardrobe', kind: 'wardrobe', area: 'bedroom', left: 0.64, width: 0.3, bottom: 0, height: 0.62, shelves: 3, doors: 2 },
];

/** A built-in ledge small things can stand on, `bottom` up from the floor line. */
export interface Surface {
  id: string;
  area: AreaId;
  left: number;
  width: number;
  bottom: number;
  /** Drops this far below the ledge still land on it (a counter's front), in size units. */
  depth: number;
}

export const SURFACES: Surface[] = [
  { id: 'livingSill', area: 'living', left: 0.5, width: 0.44, bottom: 0.27, depth: 0.04 },
  { id: 'counter', area: 'kitchen', left: 0.06, width: 0.54, bottom: 0.26, depth: 0.2 },
  { id: 'bedSill', area: 'bedroom', left: 0.04, width: 0.34, bottom: 0.33, depth: 0.04 },
  { id: 'wallShelf', area: 'bedroom', left: 0.41, width: 0.19, bottom: 0.44, depth: 0.04 },
];

export function findCupboard(id: string): Cupboard | undefined {
  return CUPBOARDS.find((c) => c.id === id);
}
