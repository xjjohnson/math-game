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

/** Shelves of the "Add things" shop. */
export type RoomItemGroup = 'living' | 'kitchen' | 'bedroom' | 'toys' | 'halloween';

export const ROOM_ITEM_GROUPS: { id: RoomItemGroup; name: string }[] = [
  { id: 'halloween', name: '🎃 Halloween' },
  { id: 'living', name: '📺 Living' },
  { id: 'kitchen', name: '🍕 Kitchen' },
  { id: 'bedroom', name: '🪞 Bedroom' },
  { id: 'toys', name: '⚽ Toys' },
];

/** Things a buddy's home can hold, bought with coins in the buddy's home. */
export interface RoomItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  /** Drawn size in the room, as a share of the room's height. */
  size: number;
  group: RoomItemGroup;
  /** Month (0 = January) the shop sells it in; sold all year without one. Owned ones stay. */
  month?: number;
}

const OCTOBER = 9;

export const ROOM_ITEMS: RoomItem[] = [
  // Living room
  { id: 'couch', name: 'Couch', emoji: '🛋️', price: 50, size: 0.3, group: 'living' },
  { id: 'tv', name: 'TV', emoji: '📺', price: 40, size: 0.2, group: 'living' },
  { id: 'chair', name: 'Chair', emoji: '🪑', price: 30, size: 0.2, group: 'living' },
  { id: 'piano', name: 'Piano', emoji: '🎹', price: 50, size: 0.22, group: 'living' },
  { id: 'radio', name: 'Radio', emoji: '📻', price: 25, size: 0.13, group: 'living' },
  { id: 'clock', name: 'Clock', emoji: '🕰️', price: 25, size: 0.14, group: 'living' },
  { id: 'picture', name: 'Picture', emoji: '🖼️', price: 25, size: 0.18, group: 'living' },
  { id: 'plant', name: 'Plant', emoji: '🪴', price: 15, size: 0.18, group: 'living' },
  { id: 'lamp', name: 'Lamp', emoji: '🪔', price: 25, size: 0.12, group: 'living' },
  { id: 'fish', name: 'Fish bowl', emoji: '🐠', price: 30, size: 0.12, group: 'living' },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', price: 60, size: 0.14, group: 'living' },
  // Kitchen
  { id: 'bowl', name: 'Food bowl', emoji: '🥣', price: 10, size: 0.12, group: 'kitchen' },
  { id: 'pan', name: 'Frying pan', emoji: '🍳', price: 15, size: 0.12, group: 'kitchen' },
  { id: 'teapot', name: 'Teapot', emoji: '🫖', price: 15, size: 0.12, group: 'kitchen' },
  { id: 'plate', name: 'Dinner plate', emoji: '🍽️', price: 15, size: 0.12, group: 'kitchen' },
  { id: 'bread', name: 'Bread', emoji: '🍞', price: 10, size: 0.1, group: 'kitchen' },
  { id: 'apples', name: 'Apples', emoji: '🍎', price: 10, size: 0.09, group: 'kitchen' },
  { id: 'pizza', name: 'Pizza', emoji: '🍕', price: 15, size: 0.1, group: 'kitchen' },
  { id: 'cookies', name: 'Cookies', emoji: '🍪', price: 10, size: 0.09, group: 'kitchen' },
  { id: 'cupcake', name: 'Cupcake', emoji: '🧁', price: 15, size: 0.1, group: 'kitchen' },
  { id: 'cake', name: 'Cake', emoji: '🎂', price: 20, size: 0.13, group: 'kitchen' },
  { id: 'honey', name: 'Honey jar', emoji: '🍯', price: 15, size: 0.1, group: 'kitchen' },
  { id: 'milk', name: 'Milk', emoji: '🥛', price: 10, size: 0.1, group: 'kitchen' },
  // Bedroom
  { id: 'bed', name: 'Bed', emoji: '🛏️', price: 40, size: 0.3, group: 'bedroom' },
  { id: 'mirror', name: 'Mirror', emoji: '🪞', price: 30, size: 0.2, group: 'bedroom' },
  { id: 'dresser', name: 'Dresser', emoji: '🗄️', price: 35, size: 0.22, group: 'bedroom' },
  { id: 'nightlight', name: 'Night light', emoji: '💡', price: 15, size: 0.11, group: 'bedroom' },
  { id: 'books', name: 'Books', emoji: '📚', price: 15, size: 0.12, group: 'bedroom' },
  { id: 'backpack', name: 'Backpack', emoji: '🎒', price: 20, size: 0.13, group: 'bedroom' },
  { id: 'dolls', name: 'Nesting dolls', emoji: '🪆', price: 20, size: 0.12, group: 'bedroom' },
  { id: 'teddy', name: 'Teddy bear', emoji: '🧸', price: 15, size: 0.14, group: 'bedroom' },
  { id: 'guitar', name: 'Guitar', emoji: '🎸', price: 30, size: 0.2, group: 'bedroom' },
  // Toys and fun
  { id: 'ball', name: 'Ball', emoji: '⚽', price: 10, size: 0.1, group: 'toys' },
  { id: 'duck', name: 'Rubber duck', emoji: '🦆', price: 10, size: 0.1, group: 'toys' },
  { id: 'car', name: 'Toy car', emoji: '🚗', price: 20, size: 0.12, group: 'toys' },
  { id: 'kite', name: 'Kite', emoji: '🪁', price: 20, size: 0.16, group: 'toys' },
  { id: 'balloon', name: 'Balloon', emoji: '🎈', price: 15, size: 0.16, group: 'toys' },
  { id: 'blocks', name: 'Blocks', emoji: '🧱', price: 15, size: 0.11, group: 'toys' },
  { id: 'yoyo', name: 'Yo-yo', emoji: '🪀', price: 10, size: 0.1, group: 'toys' },
  { id: 'game', name: 'Video game', emoji: '🎮', price: 30, size: 0.11, group: 'toys' },
  { id: 'drum', name: 'Drum', emoji: '🥁', price: 25, size: 0.14, group: 'toys' },
  // Halloween, sold in October only
  { id: 'pumpkin', name: 'Jack-o’-lantern', emoji: '🎃', price: 15, size: 0.14, group: 'halloween', month: OCTOBER },
  { id: 'ghost', name: 'Friendly ghost', emoji: '👻', price: 20, size: 0.16, group: 'halloween', month: OCTOBER },
  { id: 'bat', name: 'Bat', emoji: '🦇', price: 15, size: 0.12, group: 'halloween', month: OCTOBER },
  { id: 'web', name: 'Spider web', emoji: '🕸️', price: 10, size: 0.18, group: 'halloween', month: OCTOBER },
  { id: 'spider', name: 'Spider', emoji: '🕷️', price: 10, size: 0.1, group: 'halloween', month: OCTOBER },
  { id: 'candy', name: 'Candy', emoji: '🍬', price: 10, size: 0.09, group: 'halloween', month: OCTOBER },
  { id: 'lollipop', name: 'Lollipop', emoji: '🍭', price: 10, size: 0.12, group: 'halloween', month: OCTOBER },
  { id: 'broom', name: 'Witch’s broom', emoji: '🧹', price: 20, size: 0.22, group: 'halloween', month: OCTOBER },
  { id: 'crystal', name: 'Crystal ball', emoji: '🔮', price: 25, size: 0.12, group: 'halloween', month: OCTOBER },
  { id: 'candle', name: 'Spooky candle', emoji: '🕯️', price: 15, size: 0.12, group: 'halloween', month: OCTOBER },
];

/** Free paint colors the player can switch between. */
export const WALL_COLORS = ['#F3E6D3', '#FBE3EA', '#DDEFFB', '#E3F3DC', '#EDE4FA', '#FFF3C4', '#FFD8B5', '#3E3A5C'];
export const FLOOR_COLORS = ['#C98F5E', '#E7CFC4', '#B9C7D9', '#A8C79A', '#D9B8E8', '#8D6E63', '#F2F2F2', '#2F2B40'];

/** Most things the whole home can hold, so it stays tidy enough to play in. */
export const MAX_ROOM_THINGS = 60;

export function findRoomItem(id: string): RoomItem | undefined {
  return ROOM_ITEMS.find((item) => item.id === id);
}

/** True when the shop sells the item in this month (0 = January). */
export function inSeason(item: RoomItem, month: number): boolean {
  return item.month === undefined || item.month === month;
}
