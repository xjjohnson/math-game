import { createMockNetwork } from '@/services/mockTransport';
import { TownSession } from '@/services/townSession';
import { makeProfile } from '@/test/fixtures';
import { homeSnapshot, parseHomeSnapshot } from '@/utils/homeVisit';
import {
  BAKERY,
  FLOOR,
  inOven,
  PLACE_PROPS,
  propPieceId,
  settle,
  SHOP,
  switchPieceId,
} from '@/utils/multiplayer/placeProps';
import { encodeMessage, type GameMessage, HOST_ID, MAX_SPOTS, parseMessage } from '@/utils/multiplayer/protocol';

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
      // Each thing, a baked switch for things that bake, and a few switches.
      total += list.length + list.filter((p) => p.bakeTo).length + 4;
    }
    // Plus every player and their buddies.
    expect(total + 8 * 4).toBeLessThanOrEqual(MAX_SPOTS);
  });

  it('drops a thing onto the shelf under it, or the floor', () => {
    const shelf = SHOP.shelvesA;
    // Let go just above the middle shelf: it lands on it.
    expect(settle('shop', {}, 0.2, shelf.rows[1] - 0.03)).toEqual({ x: 0.2, y: shelf.rows[1] });
    // Let go between shelves: it falls to the next one down.
    expect(settle('shop', {}, 0.2, shelf.rows[1] + 0.02).y).toBe(shelf.rows[2]);
    // Nothing under it on the wall: it falls to the floor.
    expect(settle('shop', {}, 0.45, 0.2).y).toBeCloseTo(FLOOR + 0.04);
    // On the floor it stays where it's put.
    expect(settle('shop', {}, 0.5, 0.8)).toEqual({ x: 0.5, y: 0.8 });
    // A kite stays up in the sky.
    expect(settle('park', { float: true }, 0.3, 0.12)).toEqual({ x: 0.3, y: 0.12 });
  });

  it('knows what is in the oven', () => {
    expect(inOven({ x: (BAKERY.oven.x0 + BAKERY.oven.x1) / 2, y: BAKERY.oven.rack })).toBe(true);
    expect(inOven({ x: (BAKERY.oven.x0 + BAKERY.oven.x1) / 2, y: BAKERY.oven.top })).toBe(false);
    expect(inOven({ x: 0.2, y: BAKERY.counter.top })).toBe(false);
  });

  it('lets anyone move the things in a room, and every phone sees it', async () => {
    const net = createMockNetwork(3);
    const sessions = net.map((t) => new TownSession(() => t));
    const [host, a, b] = sessions;
    await joinAll(sessions);
    for (const s of sessions) s.setPlace('shop');
    await tick();
    const can = propPieceId('shop', 'a0');
    a.moveTo(can, 0.5, 0.45);
    b.moveTo(switchPieceId('shop', 'fridge'), 1, 0);
    await tick();
    for (const s of sessions) {
      expect(s.getState().spots[can]).toEqual({ x: 0.5, y: 0.45 });
      expect(s.getState().spots[switchPieceId('shop', 'fridge')]).toEqual({ x: 1, y: 0 });
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
  const withHome = (name: string) => () => homeSnapshot(makeProfile({ name }));

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

  it('checks homes sent by other phones', () => {
    const snap = homeSnapshot(makeProfile({ name: 'Ava' }))!;
    expect(parseHomeSnapshot(JSON.parse(JSON.stringify(snap)))).not.toBeNull();
    const msg: GameMessage = { type: 'home', of: 'p1', for: 'p2', home: snap };
    expect(parseMessage(encodeMessage(msg))).toEqual(JSON.parse(encodeMessage(msg)));
    expect(parseMessage(encodeMessage({ type: 'home-ask', of: 'p1' }))).toEqual({ type: 'home-ask', of: 'p1' });
    expect(parseMessage(encodeMessage({ type: 'home', of: 'p1', home: null }))).toEqual({ type: 'home', of: 'p1', home: null });
    expect(parseMessage(JSON.stringify({ type: 'home', of: 'p1', home: { name: 'x' } }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'home', of: 'p1', home: { ...snap, room: { ...snap.room, things: 'lots' } } }))).toBeNull();
  });
});
