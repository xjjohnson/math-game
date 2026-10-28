/** Things a buddy's room can hold, bought with coins in the buddy's home. */
export interface RoomItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  /** Drawn size in the room, as a share of the room's height. */
  size: number;
}

export const ROOM_ITEMS: RoomItem[] = [
  { id: 'bowl', name: 'Food bowl', emoji: '🥣', price: 10, size: 0.12 },
  { id: 'ball', name: 'Ball', emoji: '⚽', price: 10, size: 0.1 },
  { id: 'duck', name: 'Rubber duck', emoji: '🦆', price: 10, size: 0.1 },
  { id: 'teddy', name: 'Teddy bear', emoji: '🧸', price: 15, size: 0.14 },
  { id: 'plant', name: 'Plant', emoji: '🪴', price: 15, size: 0.18 },
  { id: 'balloon', name: 'Balloon', emoji: '🎈', price: 15, size: 0.16 },
  { id: 'books', name: 'Books', emoji: '📚', price: 15, size: 0.12 },
  { id: 'car', name: 'Toy car', emoji: '🚗', price: 20, size: 0.12 },
  { id: 'kite', name: 'Kite', emoji: '🪁', price: 20, size: 0.16 },
  { id: 'cake', name: 'Cake', emoji: '🎂', price: 20, size: 0.13 },
  { id: 'lamp', name: 'Lamp', emoji: '🪔', price: 25, size: 0.12 },
  { id: 'clock', name: 'Clock', emoji: '🕰️', price: 25, size: 0.14 },
  { id: 'picture', name: 'Picture', emoji: '🖼️', price: 25, size: 0.18 },
  { id: 'chair', name: 'Chair', emoji: '🪑', price: 30, size: 0.2 },
  { id: 'guitar', name: 'Guitar', emoji: '🎸', price: 30, size: 0.2 },
  { id: 'tv', name: 'TV', emoji: '📺', price: 40, size: 0.2 },
  { id: 'bed', name: 'Bed', emoji: '🛏️', price: 40, size: 0.3 },
  { id: 'couch', name: 'Couch', emoji: '🛋️', price: 50, size: 0.3 },
  { id: 'piano', name: 'Piano', emoji: '🎹', price: 50, size: 0.22 },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', price: 60, size: 0.14 },
];

/** Free paint colors the player can switch between. */
export const WALL_COLORS = ['#F3E6D3', '#FBE3EA', '#DDEFFB', '#E3F3DC', '#EDE4FA', '#FFF3C4'];
export const FLOOR_COLORS = ['#C98F5E', '#E7CFC4', '#B9C7D9', '#A8C79A', '#D9B8E8', '#8D6E63'];

/** Most things one room can hold, so it stays tidy enough to play in. */
export const MAX_ROOM_THINGS = 30;

export function findRoomItem(id: string): RoomItem | undefined {
  return ROOM_ITEMS.find((item) => item.id === id);
}
