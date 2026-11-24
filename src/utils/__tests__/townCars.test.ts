import { createMockNetwork } from '@/services/mockTransport';
import { TownSession } from '@/services/townSession';
import { CAR_VERSION, encodeMessage, HOST_ID, parseMessage, PROTOCOL_VERSION } from '@/utils/multiplayer/protocol';
import { buyCar, garageOf, hasCar, topSpeed } from '@/utils/garage';
import { CARS, STRIPE_ID } from '@/constants/cars';
import { isDoor, parkedAt, stopPoint, stopsOk, TOWN_LOTS } from '@/utils/townLayout';

const tick = () => new Promise((r) => setTimeout(r, 0));

async function joinAll(sessions: TownSession[]) {
  await sessions[0].host({ name: 'H', avatar: '🐼' });
  for (let i = 1; i < sessions.length; i++) {
    await sessions[i].discover({ name: `G${i}`, avatar: '🦊' });
    await sessions[i].join(sessions[i].getState().found[0].id);
  }
  await tick();
}

describe('cars over Nearby', () => {
  it('reads car and honk messages, and drops bad ones', () => {
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(CAR_VERSION);
    const car = { x: 100, y: 200, h: 90, k: 'car-bus', p: 3, st: true };
    expect(parseMessage(encodeMessage({ type: 'car', car }))).toEqual({ type: 'car', car });
    expect(parseMessage(encodeMessage({ type: 'honk', to: 'a', from: 'b' }))).toEqual({ type: 'honk', to: 'a', from: 'b' });
    expect(parseMessage(JSON.stringify({ type: 'car', car: { x: 'no', y: 1, h: 0, k: 'c', p: 0 } }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'car', car: { x: 1, y: 1, h: 0, k: 'c', p: 99 } }))).toBeNull();
  });

  it('every phone sees the other cars, never its own', async () => {
    const sessions = createMockNetwork(3).map((t) => new TownSession(() => t));
    await joinAll(sessions);
    const [host, a, b] = sessions;
    a.sendCar({ x: 10, y: 20, h: 0, k: 'car-round', p: 1 });
    host.sendCar({ x: 30, y: 40, h: 90, k: 'car-bus', p: 2 });
    await tick();
    const aId = a.getState().myId;
    expect(b.getState().cars[aId]).toMatchObject({ x: 10, y: 20 });
    expect(b.getState().cars[HOST_ID]).toMatchObject({ x: 30, k: 'car-bus' });
    expect(host.getState().cars[aId]).toMatchObject({ x: 10 });
    expect(a.getState().cars[aId]).toBeUndefined();
    expect(Object.keys(host.getState().cars)).not.toContain(HOST_ID);
  });

  it('passes a honk to the right friend', async () => {
    const sessions = createMockNetwork(3).map((t) => new TownSession(() => t));
    await joinAll(sessions);
    const [host, a, b] = sessions;
    a.honkAt(b.getState().myId);
    await tick();
    expect(b.getState().honked?.from).toBe(a.getState().myId);
    expect(host.getState().honked).toBeNull();
    b.honkAt(HOST_ID);
    await tick();
    expect(host.getState().honked?.from).toBe(b.getState().myId);
  });

  it('a friend who leaves takes their car with them', async () => {
    const sessions = createMockNetwork(3).map((t) => new TownSession(() => t));
    await joinAll(sessions);
    const [host, a, b] = sessions;
    a.setPlace('street');
    b.setPlace('street');
    host.setPlace('street');
    a.sendCar({ x: 10, y: 20, h: 0, k: 'car-round', p: 1 });
    await tick();
    const aId = a.getState().myId;
    expect(b.getState().cars[aId]).toBeDefined();
    a.leave();
    await tick();
    expect(host.getState().cars[aId]).toBeUndefined();
    expect(b.getState().cars[aId]).toBeUndefined();
  });
});

describe('garage', () => {
  const base = { grade: 3 as const, stars: 0, coins: 100, garage: undefined };

  it('starts little ones on tap-to-drive and older kids on the wheel', () => {
    expect(garageOf({ grade: 0, garage: undefined }).controls).toBe('tap');
    expect(garageOf({ grade: 3, garage: undefined }).controls).toBe('wheel');
    expect(garageOf({ grade: 3, garage: undefined }).car).toBe(CARS[0].id);
  });

  it('buys cars with coins, but star cars only come with stars', () => {
    const bus = buyCar(base, 'car-bus');
    expect(bus).toMatchObject({ ok: true, coins: 20 });
    expect(buyCar({ ...base, coins: 10 }, 'car-bus')).toEqual({ ok: false, reason: 'coins' });
    expect(buyCar(base, 'car-fire')).toEqual({ ok: false, reason: 'stars' });
    expect(hasCar({ ...base, stars: 50 }, CARS.find((c) => c.id === 'car-fire')!)).toBe(true);
    expect(buyCar(base, 'car-round')).toEqual({ ok: false, reason: 'have' });
    const stripe = buyCar(base, STRIPE_ID);
    expect(stripe.ok && stripe.garage.stripe).toBe(true);
  });

  it('the race car and 100 stars go faster', () => {
    const round = CARS[0];
    const racer = CARS.find((c) => c.id === 'car-racer')!;
    expect(topSpeed({ stars: 0 }, racer)).toBeGreaterThan(topSpeed({ stars: 0 }, round));
    expect(topSpeed({ stars: 100 }, round)).toBeGreaterThan(topSpeed({ stars: 0 }, round));
  });
});

describe('town layout', () => {
  it('every lot has a parking spot on a road, and parking there finds it', () => {
    expect(stopsOk()).toBe(true);
    for (const lot of TOWN_LOTS) expect(parkedAt(stopPoint(lot.stop))?.id).toBe(lot.id);
  });

  it('every building can be gone into', () => {
    const doors = TOWN_LOTS.filter((l) => isDoor(l.kind)).map((l) => l.kind).sort();
    expect(doors).toEqual(['bakery', 'farm', 'home', 'library', 'park', 'school', 'shop']);
  });
});
