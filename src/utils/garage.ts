import { CAR_PAINTS, CARS, DEFAULT_CAR, findCar, STRIPE_ID, STRIPE_PRICE, type CarKind } from '@/constants/cars';
import { FAST_SPEED, SPEED } from '@/utils/roads';
import type { Garage, Grade, Profile } from '@/types';

/** How a player steers: tap where to go, or a wheel and a Go pedal. */
export type DriveControls = 'tap' | 'wheel';

/** Little ones tap where to go; from grade 2 up the wheel is the start. */
export function defaultControls(grade: Grade): DriveControls {
  return grade <= 1 ? 'tap' : 'wheel';
}

/** The player's garage, filled in for players who have never opened it. */
export function garageOf(profile: Pick<Profile, 'garage' | 'grade'>): Required<Garage> {
  const g = profile.garage ?? {};
  const car = findCar(g.car);
  return {
    car: car.id,
    paint: typeof g.paint === 'number' && g.paint >= 0 && g.paint < CAR_PAINTS.length ? g.paint : car.paint,
    stripe: !!g.stripe,
    controls: g.controls ?? defaultControls(profile.grade),
    owned: g.owned ?? [],
  };
}

/** Whether a player can drive a car now: free, bought, or enough stars. */
export function hasCar(profile: Pick<Profile, 'garage' | 'grade' | 'stars'>, car: CarKind): boolean {
  if ('free' in car.cost) return true;
  if ('stars' in car.cost) return profile.stars >= car.cost.stars;
  return garageOf(profile).owned.includes(car.id);
}

export type CarBuy = { ok: true; garage: Garage; coins: number } | { ok: false; reason: 'have' | 'coins' | 'stars' | 'unknown' };

/** Buying a car (or the rainbow stripe, STRIPE_ID) with coins. */
export function buyCar(profile: Pick<Profile, 'garage' | 'grade' | 'stars' | 'coins'>, id: string): CarBuy {
  const g = garageOf(profile);
  if (id === STRIPE_ID) {
    if (g.owned.includes(STRIPE_ID)) return { ok: false, reason: 'have' };
    if (profile.coins < STRIPE_PRICE) return { ok: false, reason: 'coins' };
    return { ok: true, garage: { ...g, owned: [...g.owned, STRIPE_ID], stripe: true }, coins: profile.coins - STRIPE_PRICE };
  }
  const car = CARS.find((c) => c.id === id);
  if (!car) return { ok: false, reason: 'unknown' };
  if (hasCar(profile, car)) return { ok: false, reason: 'have' };
  if ('stars' in car.cost) return { ok: false, reason: 'stars' };
  if (!('coins' in car.cost) || profile.coins < car.cost.coins) return { ok: false, reason: 'coins' };
  return { ok: true, garage: { ...g, owned: [...g.owned, car.id], car: car.id, paint: car.paint }, coins: profile.coins - car.cost.coins };
}

/** Top speed for a car: the race car (or 100 stars, Number Ninja) gets the fast gear. */
export function topSpeed(profile: Pick<Profile, 'stars'>, car: CarKind): number {
  const base = profile.stars >= 100 ? FAST_SPEED : SPEED;
  return Math.round(base * (car.speed ?? 1));
}

export { DEFAULT_CAR };
