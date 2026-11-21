import type { RoomItem } from '@/constants/room';

/**
 * The 3D printer in the buddies' home. Kids buy spools of filament with coins and print
 * small toys. Stars (never spent) unlock new toys and special filaments.
 */

/** The printer's room item id. */
export const PRINTER_ITEM = 'printer3d';

/** Coins for one spool of filament, and how many toys a spool makes. */
export const SPOOL_PRICE = 10;
export const PRINTS_PER_SPOOL = 3;

/** How long a print takes on screen. */
export const PRINT_MS = 8000;

/** A printed toy's room item id starts with this, then the toy and filament ids: "print-dino-red". */
export const PRINT_PREFIX = 'print-';

export type PrintToyId =
  | 'star'
  | 'heart'
  | 'boat'
  | 'cat'
  | 'dino'
  | 'raceCar'
  | 'rocket'
  | 'robot'
  | 'octopus'
  | 'castle'
  | 'dragon'
  | 'trophy';

export interface PrintToy {
  id: PrintToyId;
  name: string;
  /** For lists and screen readers. */
  emoji: string;
  /** Stars needed before it can be printed (stars are never spent). */
  stars: number;
  /** What a buddy does with it when it's tapped. */
  says: string;
  fx: string;
}

export const PRINT_TOYS: PrintToy[] = [
  { id: 'star', name: 'Star', emoji: '⭐', stars: 0, says: 'makes a wish on the star', fx: '✨' },
  { id: 'heart', name: 'Heart', emoji: '💖', stars: 0, says: 'gives the heart a hug', fx: '💕' },
  { id: 'boat', name: 'Boat', emoji: '⛵', stars: 0, says: 'sails the boat across the floor', fx: '🌊' },
  { id: 'cat', name: 'Cat', emoji: '🐱', stars: 0, says: 'hears the cat say meow', fx: '💬' },
  { id: 'dino', name: 'Dinosaur', emoji: '🦕', stars: 25, says: 'goes stomp, stomp with the dinosaur', fx: '👣' },
  { id: 'raceCar', name: 'Race car', emoji: '🏎️', stars: 25, says: 'races the car. Zoom!', fx: '💨' },
  { id: 'rocket', name: 'Rocket', emoji: '🚀', stars: 50, says: 'counts down 3, 2, 1, blast off', fx: '🚀' },
  { id: 'robot', name: 'Robot', emoji: '🤖', stars: 50, says: 'makes the robot beep and boop', fx: '⚡' },
  { id: 'octopus', name: 'Octopus', emoji: '🐙', stars: 100, says: 'counts the octopus legs: 8', fx: '🫧' },
  { id: 'castle', name: 'Castle', emoji: '🏰', stars: 100, says: 'plays king and queen at the castle', fx: '👑' },
  { id: 'dragon', name: 'Dragon', emoji: '🐉', stars: 175, says: 'flies with the friendly dragon', fx: '🔥' },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', stars: 275, says: 'holds up the trophy. Champion', fx: '🎉' },
];

export type FilamentId = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'white' | 'glow' | 'rainbow';

export interface Filament {
  id: FilamentId;
  name: string;
  /** The colour toys print in (rainbow uses RAINBOW instead). */
  color: string;
  stars: number;
}

export const FILAMENTS: Filament[] = [
  { id: 'red', name: 'Red', color: '#E8473F', stars: 0 },
  { id: 'blue', name: 'Blue', color: '#3A86E8', stars: 0 },
  { id: 'green', name: 'Green', color: '#3FB66B', stars: 0 },
  { id: 'yellow', name: 'Yellow', color: '#FFC93C', stars: 0 },
  { id: 'purple', name: 'Purple', color: '#8E5BD8', stars: 0 },
  { id: 'white', name: 'White', color: '#FFFDF8', stars: 0 },
  // Pale green by day; glows when the room's lights are off.
  { id: 'glow', name: 'Glow in the dark', color: '#C9F5C1', stars: 100 },
  { id: 'rainbow', name: 'Rainbow', color: '#EC5A9B', stars: 275 },
];

/** The colours a rainbow print cycles through, part by part. */
export const RAINBOW = ['#E8473F', '#F28C28', '#FFC93C', '#3FB66B', '#3A86E8', '#8E5BD8'];

export const findPrintToy = (id: string): PrintToy | undefined => PRINT_TOYS.find((t) => t.id === id);
export const findFilament = (id: string): Filament | undefined => FILAMENTS.find((f) => f.id === id);

/** The room item id for a toy printed in a filament. */
export const printId = (toy: PrintToyId, filament: FilamentId) => `${PRINT_PREFIX}${toy}-${filament}`;

/** Which toy and filament a printed item id is, or null when it isn't a printed toy. */
export function parsePrintId(id: string): { toy: PrintToy; filament: Filament } | null {
  if (!id.startsWith(PRINT_PREFIX)) return null;
  const [toyId, filamentId, extra] = id.slice(PRINT_PREFIX.length).split('-');
  const toy = toyId ? findPrintToy(toyId) : undefined;
  const filament = filamentId ? findFilament(filamentId) : undefined;
  return toy && filament && extra === undefined ? { toy, filament } : null;
}

const made = new Map<string, RoomItem>();

/** The room item for a printed toy (made on the fly, never sold in the shop), or undefined. */
export function printedItem(id: string): RoomItem | undefined {
  const cached = made.get(id);
  if (cached) return cached;
  const p = parsePrintId(id);
  if (!p) return undefined;
  const name = p.filament.id === 'glow' ? `Glowing ${p.toy.name.toLowerCase()}` : `${p.filament.name} ${p.toy.name.toLowerCase()}`;
  const item: RoomItem = {
    id,
    name,
    emoji: p.toy.emoji,
    price: 0,
    size: 0.1,
    group: 'toys',
    hidden: true,
    fx: p.toy.fx,
    says: p.toy.says,
  };
  made.set(id, item);
  return item;
}
