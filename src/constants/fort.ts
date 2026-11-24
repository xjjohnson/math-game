import type { RoomItem } from '@/constants/room';

/**
 * The blanket fort in the buddies' home. It's bought folded up; the first time it's tapped,
 * one fort check question sets it up. After that it is a built fort whose item id names its
 * blanket ("fort-stars"), so nothing new is saved on the profile. Stars (never spent) unlock
 * more things inside.
 */

/** The fort as bought: a folded blanket and two chairs, waiting to be set up. */
export const FORT_ITEM = 'blanketFort';
export const FORT_PRICE = 120;

/** A built fort's room item id starts with this, then the blanket's id: "fort-stars". */
export const FORT_PREFIX = 'fort-';

export type BlanketId = 'stars' | 'stripes' | 'plaid' | 'dots' | 'rainbow' | 'quilt';

export interface Blanket {
  id: BlanketId;
  name: string;
  /** The blanket's main colour, and the colours of its pattern. */
  base: string;
  marks: string[];
}

export const BLANKETS: Blanket[] = [
  { id: 'stars', name: 'Starry night', base: '#3C4F9E', marks: ['#FFD54F', '#FFF3B0'] },
  { id: 'stripes', name: 'Stripes', base: '#F7E9D2', marks: ['#E8473F', '#3A86E8'] },
  { id: 'plaid', name: 'Plaid', base: '#C9473F', marks: ['#7A1F1A', '#F4C9A8'] },
  { id: 'dots', name: 'Polka dots', base: '#7FC8A9', marks: ['#FFFDF8', '#2E7D62'] },
  { id: 'rainbow', name: 'Rainbow', base: '#FFC93C', marks: ['#E8473F', '#F28C28', '#FFC93C', '#3FB66B', '#3A86E8', '#8E5BD8'] },
  { id: 'quilt', name: 'Patchwork quilt', base: '#F3D9B1', marks: ['#E58FA8', '#8FB8E5', '#F2C45A', '#93C98F', '#C3A1E0'] },
];

export const DEFAULT_BLANKET: BlanketId = 'stars';

/** Things inside the fort that stars unlock. */
export type FortExtraId = 'lights' | 'puppets' | 'sleepover' | 'tunnel';

export interface FortExtra {
  id: FortExtraId;
  name: string;
  stars: number;
}

export const FORT_EXTRAS: FortExtra[] = [
  { id: 'lights', name: 'String lights', stars: 25 },
  { id: 'puppets', name: 'Shadow puppets', stars: 50 },
  { id: 'sleepover', name: 'Glow stars and a sleepover moon', stars: 100 },
  { id: 'tunnel', name: 'A flag and a tunnel room', stars: 175 },
];

export const findBlanket = (id: string): Blanket | undefined => BLANKETS.find((b) => b.id === id);

/** The room item id for a fort built with a blanket. */
export const fortId = (blanket: BlanketId) => `${FORT_PREFIX}${blanket}`;

/** Which blanket a built fort's item id has, or null when it isn't a built fort. */
export function parseFortId(id: string): Blanket | null {
  if (!id.startsWith(FORT_PREFIX)) return null;
  return findBlanket(id.slice(FORT_PREFIX.length)) ?? null;
}

/** Either kind of fort: folded up (to set up) or built. */
export const isFort = (id: string | undefined): boolean => !!id && (id === FORT_ITEM || parseFortId(id) !== null);

/** How the fort sits in the room: wide and low, with buddies sitting in its doorway. */
export const FORT_SHAPE = { size: 0.46, wide: 1.55, seat: 0.06 } as const;

const made = new Map<string, RoomItem>();

/** The room item for a built fort (made on the fly; the shop sells the folded one), or undefined. */
export function builtFortItem(id: string): RoomItem | undefined {
  const cached = made.get(id);
  if (cached) return cached;
  const blanket = parseFortId(id);
  if (!blanket) return undefined;
  const item: RoomItem = {
    id,
    name: 'Blanket fort',
    emoji: '⛺',
    price: 0,
    group: 'toys',
    hidden: true,
    ...FORT_SHAPE,
  };
  made.set(id, item);
  return item;
}
