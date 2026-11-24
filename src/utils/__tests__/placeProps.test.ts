import { createMockNetwork } from '@/services/mockTransport';
import { TownSession } from '@/services/townSession';
import { makeProfile } from '@/test/fixtures';
import { assembleHome, homeParts, MAX_HOME_BYTES, parseHomePart, type HomePart } from '@/utils/homeVisit';
import { buildRoom, STRIP_AREAS } from '@/utils/room';
import {
  BAKERY,
  FLOOR,
  LIBRARY,
  BOWL,
  BOWL_SWITCH,
  inOven,
  madeSwitch,
  onBowl,
  onMixer,
  MIXER_MIDDLE,
  PLACE_PROPS,
  propPieceId,
  settle,
  SCHOOL,
  switchPieceId,
} from '@/utils/multiplayer/placeProps';
import { encodeMessage, type GameMessage, HOST_ID, MAX_SPOTS, parseMessage } from '@/utils/multiplayer/protocol';

import { addToMask, bake, ingredientIndex, madeRecipe, madeToUnit, maskToUnit, recipeFor, unitToMade, unitToMask } from '@/utils/bakery';

const tick = () => new Promise((r) => setTimeout(r, 0));

async function joinAll(sessions: TownSession[]) {
  await sessions[0].host({ name: 'H', avatar: '🐼' });
  for (let i = 1; i < sessions.length; i++) {
    await sessions[i].discover({ name: `G${i}`, avatar: '🦊' });
    await sessions[i].join(sessions[i].getState().found[0].id);
  }
  await tick();
}

describe('things in the community rooms', () => {
  it('has unique things in every place, inside the room, and few enough to send', () => {
    let total = 0;
    for (const list of Object.values(PLACE_PROPS)) {
      const ids = list.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const p of list) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(1);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(1);
      }
      // Each thing, a baked switch for things that bake, a switch for the bowl and each finished treat, and a few switches.
      total += list.length + list.filter((p) => p.bakeTo).length + list.filter((p) => p.made !== undefined).length + 5;
    }
    // Plus every player and their buddies.
    expect(total + 8 * 4).toBeLessThanOrEqual(MAX_SPOTS);
  });

  it('drops a thing onto the shelf under it, or the floor', () => {
    const shelf = LIBRARY.cases[0];
    // Let go just above the middle shelf: it lands on it.
    expect(settle('library', {}, 0.15, shelf.rows[1] - 0.03)).toEqual({ x: 0.15, y: shelf.rows[1] });
    // Let go between shelves: it falls to the next one down.
    expect(settle('library', {}, 0.15, shelf.rows[1] + 0.02).y).toBe(shelf.rows[2]);
    // Over a school desk it lands on the desk.
    const [x0, x1] = SCHOOL.desks[0];
    expect(settle('school', {}, (x0 + x1) / 2, SCHOOL.deskTop - 0.1).y).toBe(SCHOOL.deskTop);
    // Nothing under it on the wall: it falls to the floor.
    expect(settle('school', {}, 0.8, 0.2).y).toBeCloseTo(FLOOR + 0.04);
    // On the floor it stays where it's put.
    expect(settle('school', {}, 0.5, 0.8)).toEqual({ x: 0.5, y: 0.8 });
    // A kite stays up in the sky.
    expect(settle('park', { float: true }, 0.3, 0.12)).toEqual({ x: 0.3, y: 0.12 });
  });

  it('knows what is in the oven', () => {
    expect(inOven({ x: (BAKERY.oven.x0 + BAKERY.oven.x1) / 2, y: BAKERY.oven.rack })).toBe(true);
    expect(inOven({ x: (BAKERY.oven.x0 + BAKERY.oven.x1) / 2, y: BAKERY.oven.top })).toBe(false);
    expect(inOven({ x: 0.2, y: BAKERY.counter.top })).toBe(false);
  });

  it('knows when food is let go over the mixing bowl', () => {
    const bowl = { x: BOWL.x, y: BOWL.y };
    expect(onBowl({ x: bowl.x, y: bowl.y - 0.08 }, bowl)).toBe(true);
    expect(onBowl({ x: bowl.x + 0.03, y: bowl.y }, bowl)).toBe(true);
    expect(onBowl({ x: bowl.x + 0.1, y: bowl.y }, bowl)).toBe(false);
    expect(onBowl({ x: bowl.x, y: bowl.y + 0.2 }, bowl)).toBe(false);
  });

  it('knows when the bowl is on the mixer', () => {
    expect(onMixer({ x: MIXER_MIDDLE, y: BAKERY.counter.top })).toBe(true);
    expect(onMixer({ x: BOWL.x + 0.05, y: BAKERY.counter.top })).toBe(false);
    expect(onMixer({ x: MIXER_MIDDLE, y: 0.8 })).toBe(false);
  });

  it('shares the bowl and a finished treat with every phone', async () => {
    const net = createMockNetwork(2);
    const sessions = net.map((t) => new TownSession(() => t));
    const [host, guest] = sessions;
    await joinAll(sessions);
    for (const s of sessions) s.setPlace('bakery');
    await tick();
    const mask = addToMask(addToMask(0, ingredientIndex('flour')), ingredientIndex('butter'));
    guest.moveTo(switchPieceId('bakery', BOWL_SWITCH), maskToUnit(mask), 0);
    await tick();
    host.moveTo(switchPieceId('bakery', madeSwitch(0)), 1, madeToUnit(recipeFor(mask)));
    await tick();
    for (const s of sessions) {
      const spots = s.getState().spots;
      expect(bake(unitToMask(spots[switchPieceId('bakery', BOWL_SWITCH)].x))?.name).toBe('Croissants');
      expect(madeRecipe(unitToMade(spots[switchPieceId('bakery', madeSwitch(0))].y) as number).name).toBe('Croissants');
    }
  });

  it('lets anyone move the things in a room, and every phone sees it', async () => {
    const net = createMockNetwork(3);
    const sessions = net.map((t) => new TownSession(() => t));
    const [host, a, b] = sessions;
    await joinAll(sessions);
    for (const s of sessions) s.setPlace('school');
    await tick();
    const can = propPieceId('school', 't0');
    a.moveTo(can, 0.5, 0.45);
    b.moveTo(switchPieceId('school', 'bell'), 1, 0);
    await tick();
    for (const s of sessions) {
      expect(s.getState().spots[can]).toEqual({ x: 0.5, y: 0.45 });
      expect(s.getState().spots[switchPieceId('school', 'bell')]).toEqual({ x: 1, y: 0 });
    }
    host.moveTo(can, 0.6, 0.3);
    await tick();
    expect(b.getState().spots[can]).toEqual({ x: 0.6, y: 0.3 });
    // A phone that arrives later gets the room as it is now, people first.
    b.setPlace('street');
    await tick();
    expect(b.getState().spots[can]).toEqual({ x: 0.6, y: 0.3 });
  });
});

describe("visiting a friend's buddy home", () => {
  const withHome = (name: string) => () => homeParts(makeProfile({ name }));

  it('shows the host the home of a guest, and a guest the home of the host', async () => {
    const net = createMockNetwork(2);
    const [host, guest] = net.map((t) => new TownSession(() => t));
    await joinAll([host, guest]);
    host.setHomeSource(withHome('Hana'));
    guest.setHomeSource(withHome('Gus'));
    host.askHome(guest.getState().myId, 'Gus');
    await tick();
    expect(host.getState().home?.status).toBe('ready');
    expect(host.getState().home?.snap?.name).toBe('Gus');
    guest.askHome(HOST_ID, 'Hana');
    await tick();
    expect(guest.getState().home?.snap?.name).toBe('Hana');
    guest.closeHome();
    expect(guest.getState().home).toBeNull();
  });

  it('passes a home from one guest to another through the host', async () => {
    const net = createMockNetwork(3);
    const sessions = net.map((t) => new TownSession(() => t));
    const [, a, b] = sessions;
    await joinAll(sessions);
    b.setHomeSource(withHome('Bea'));
    a.askHome(b.getState().myId, 'Bea');
    await tick();
    await tick();
    expect(a.getState().home?.status).toBe('ready');
    expect(a.getState().home?.snap?.name).toBe('Bea');
  });

  it("says so when a friend's phone can't show its home", async () => {
    jest.useFakeTimers();
    try {
      const net = createMockNetwork(2);
      const [host, guest] = net.map((t) => new TownSession(() => t));
      const hosting = host.host({ name: 'H', avatar: '🐼' });
      await jest.runAllTimersAsync();
      await hosting;
      const joining = guest.discover({ name: 'G', avatar: '🦊' });
      await jest.runAllTimersAsync();
      await joining;
      await guest.join(guest.getState().found[0].id);
      await jest.runAllTimersAsync();
      // No home source on the guest: it answers with none.
      host.askHome(guest.getState().myId, 'G');
      await jest.runAllTimersAsync();
      expect(host.getState().home?.status).toBe('none');
    } finally {
      jest.useRealTimers();
    }
  });

  /** A big home: 30 rooms, each with 25 things in it. */
  const bigHome = () => {
    let p = makeProfile({ name: 'Max', coins: 99999 });
    while (p.house.length < 30) {
      const r = buildRoom(p, 'bedroom');
      if (!r.ok) throw new Error('build failed');
      p = r.profile;
    }
    const things = p.house.flatMap((_, room) =>
      Array.from({ length: 25 }, (_, i) => ({ key: `t${room}-${i}`, itemId: 'teddy', placed: true, x: room + 0.1 + i * 0.03, y: 0.9 })),
    );
    return { ...p, room: { ...p.room, things } };
  };

  it('sends a big home in parts small enough for Nearby, and puts it back together', () => {
    const p = bigHome();
    const parts = homeParts(p);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) {
      expect(JSON.stringify(part).length).toBeLessThanOrEqual(MAX_HOME_BYTES + 40);
      expect(part.parts).toBe(parts.length);
      expect(parseHomePart(JSON.parse(JSON.stringify(part)))).not.toBeNull();
    }
    expect(parts.flatMap((x) => x.rooms)).toEqual(p.house.map((r) => r.id));
    // The first part alone shows the home, with the other rooms still on their way.
    const first = assembleHome(new Map([[0, parts[0]]]))!;
    expect(first.house).toEqual(p.house);
    expect(first.arriving).toEqual(p.house.map((r) => r.id).filter((id) => !parts[0].rooms.includes(id)));
    const all = assembleHome(new Map(parts.map((x) => [x.part, x] as [number, HomePart])))!;
    expect(all.arriving).toEqual([]);
    expect(all.room.things).toHaveLength(p.room.things.length);
    // Nothing shows before the first part.
    expect(assembleHome(new Map([[1, parts[1]]]))).toBeNull();
  });

  it('shows a big home on a friend\'s phone room by room', async () => {
    const net = createMockNetwork(2);
    const [host, guest] = net.map((t) => new TownSession(() => t));
    await joinAll([host, guest]);
    const p = bigHome();
    guest.setHomeSource(() => homeParts(p));
    host.askHome(guest.getState().myId, 'Max');
    for (let i = 0; i < 6; i++) await tick();
    const home = host.getState().home;
    expect(home?.status).toBe('ready');
    expect(home?.snap?.house).toHaveLength(30);
    expect(home?.snap?.arriving).toEqual([]);
    expect(home?.snap?.room.things).toHaveLength(p.room.things.length);
  });

  it('reads a home sent the old way by a phone on an older version', () => {
    const share = (slot: number, x: number) => (slot + x) / STRIP_AREAS;
    const old = {
      name: 'Old',
      room: {
        paint: Array.from({ length: STRIP_AREAS }, () => ({ wall: 1, floor: 1 })),
        buddies: { pup: { x: share(1, 0.5), y: 0.9 } },
        things: [{ key: 'k', itemId: 'bed', placed: true, x: share(6, 0.2), y: 0.9 }],
      },
      buddies: [{ id: 'pup', emoji: '🐶', gift: null, name: 'Pup', spot: { x: share(1, 0.5), y: 0.9 }, fur: '#fff', belly: '#eee', dressed: {} }],
      homeRooms: ['study'],
      homeOrder: ['living', 'kitchen', 'bedroom', 'bathroom', 'playroom', 'backyard', 'study'],
    };
    const part = parseHomePart(JSON.parse(JSON.stringify(old)))!;
    expect(part.plan?.house.map((r) => r.id)).toEqual(['living', 'kitchen', 'bedroom', 'bathroom', 'playroom', 'study']);
    expect(part.things[0].x).toBeCloseTo(5.2);
    expect(part.plan?.buddies[0].spot.x).toBeCloseTo(1.5);
    const snap = assembleHome(new Map([[0, part]]))!;
    expect(snap.arriving).toEqual([]);
  });

  it('checks homes sent by other phones', () => {
    const snap = homeParts(makeProfile({ name: 'Ava' }))[0];
    expect(parseHomePart(JSON.parse(JSON.stringify(snap)))).not.toBeNull();
    const msg: GameMessage = { type: 'home', of: 'p1', for: 'p2', home: snap };
    expect(parseMessage(encodeMessage(msg))).toEqual(JSON.parse(encodeMessage(msg)));
    expect(parseMessage(encodeMessage({ type: 'home-ask', of: 'p1' }))).toEqual({ type: 'home-ask', of: 'p1' });
    expect(parseMessage(encodeMessage({ type: 'home', of: 'p1', home: null }))).toEqual({ type: 'home', of: 'p1', home: null });
    expect(parseMessage(JSON.stringify({ type: 'home', of: 'p1', home: { name: 'x' } }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'home', of: 'p1', home: { ...snap, things: 'lots' } }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'home', of: 'p1', home: { ...snap, plan: { ...snap.plan, house: [{ id: 'x', look: 'castle' }] } } }))).toBeNull();
  });
});
