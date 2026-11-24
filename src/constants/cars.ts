/**
 * Cars to drive round the town. All drawn in code (components/community/CarDrawing.tsx),
 * in the game's own outlined style. Two are free; the rest cost coins or come with stars.
 */

export type CarShape = 'round' | 'pickup' | 'icecream' | 'bus' | 'fire' | 'van' | 'tractor' | 'racer';

export interface CarKind {
  id: string;
  name: string;
  shape: CarShape;
  /** Its first paint colour (an index into CAR_PAINTS). */
  paint: number;
  /** How you get it. Stars are never spent: having that many unlocks it. */
  cost: { free: true } | { coins: number } | { stars: number };
  /** Drives a little faster or slower than other cars. */
  speed?: number;
  /** Seats for buddies (the player's own figure is drawn as the driver). */
  seats: number;
  /** A sentence for the car menu. */
  blurb: string;
}

export const CAR_PAINTS = ['#3A86E8', '#E8473F', '#3FB66B', '#FFC93C', '#F28C28', '#8E5BD8', '#EC5A9B', '#FFFDF8'] as const;
/** Paint names, for the screen reader. */
export const PAINT_NAMES = ['Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'White'] as const;
/** The rainbow stripe costs coins once, then any car can have it. */
export const STRIPE_PRICE = 30;
export const STRIPE_ID = 'car-stripe';

export const CARS: CarKind[] = [
  { id: 'car-round', name: 'Little round car', shape: 'round', paint: 0, cost: { free: true }, seats: 1, blurb: 'Small, bouncy and always ready.' },
  { id: 'car-pickup', name: 'Pickup truck', shape: 'pickup', paint: 1, cost: { free: true }, seats: 2, blurb: 'Buddies ride in the back.' },
  { id: 'car-icecream', name: 'Ice cream van', shape: 'icecream', paint: 6, cost: { coins: 60 }, seats: 1, blurb: 'The horn plays a little tune.' },
  { id: 'car-bus', name: 'School bus', shape: 'bus', paint: 3, cost: { coins: 80 }, seats: 3, blurb: 'Room for every buddy.' },
  { id: 'car-van', name: 'Bakery van', shape: 'van', paint: 4, cost: { coins: 60 }, seats: 1, blurb: 'Smells like fresh bread.' },
  { id: 'car-tractor', name: 'Farm tractor', shape: 'tractor', paint: 2, cost: { coins: 50 }, speed: 0.8, seats: 1, blurb: 'Slow, bumpy and very strong.' },
  { id: 'car-fire', name: 'Fire truck', shape: 'fire', paint: 1, cost: { stars: 50 }, seats: 2, blurb: 'Lights flash when you honk.' },
  { id: 'car-racer', name: 'Race car', shape: 'racer', paint: 4, cost: { stars: 175 }, speed: 1.25, seats: 1, blurb: 'The fastest car in town.' },
];

export const DEFAULT_CAR = CARS[0].id;

export const findCar = (id: string | undefined): CarKind => CARS.find((c) => c.id === id) ?? CARS[0];
