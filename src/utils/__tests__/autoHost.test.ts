import { createMockNetwork } from '@/services/mockTransport';
import { Chalkboard } from '@/services/chalkboard';
import { EaselBoard } from '@/services/easel';
import type { Transport } from '@/services/multiplayer';
import { joinableVisits, TownSession } from '@/services/townSession';
import { advertName, GAME_MARK, newToken, shouldYield, shownName, tokenOf, YIELD_AFTER_MS } from '@/utils/multiplayer/autoHost';
import { HOST_ID, TOWN_MARK } from '@/utils/multiplayer/protocol';

describe('join or host', () => {
  it('puts a tag in the advertised name and reads it back', () => {
    const tag = newToken(() => 0.5);
    expect(tag).toMatch(/^[0-9a-z]{4}$/);
    const name = advertName(TOWN_MARK, tag, '🐼 Ava');
    expect(name.startsWith(TOWN_MARK)).toBe(true);
    expect(tokenOf(name, TOWN_MARK)).toBe(tag);
    expect(shownName(name, TOWN_MARK)).toBe('🐼 Ava');
    // Older phones advertise with no tag.
    expect(tokenOf(`${TOWN_MARK} 🐼 Ava`, TOWN_MARK)).toBeNull();
    expect(shownName(`${TOWN_MARK} 🐼 Ava`, TOWN_MARK)).toBe('🐼 Ava');
    expect(tokenOf(advertName(GAME_MARK, 'ab12', 'Ben'), TOWN_MARK)).toBeNull();
  });

  it('lets exactly one of two lonely hosts give way', () => {
    expect(shouldYield('aaaa', 'bbbb', 0)).toBe(true);
    expect(shouldYield('bbbb', 'aaaa', 0)).toBe(false);
    // A host still there after a while has friends and won't give way, so join it.
    expect(shouldYield('bbbb', 'aaaa', YIELD_AFTER_MS)).toBe(true);
    // Older phones start over by themselves and join us, so don't chase them.
    expect(shouldYield('aaaa', null, 0)).toBe(false);
    expect(shouldYield('aaaa', null, 99999)).toBe(false);
    expect(shouldYield('aaaa', 'aaaa', 99999)).toBe(false);
  });
});

describe('community: offer a visit, join with one tap', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const open = async (s: TownSession, name: string) => {
    await s.open({ name, avatar: '🐼' });
  };
  /** Every status a session goes through, to check nothing flips to "off" (which clears the screen). */
  const statuses = (s: TownSession) => {
    const seen: string[] = [];
    s.subscribe(() => {
      const now = s.getState().status;
      if (seen[seen.length - 1] !== now) seen.push(now);
    });
    return seen;
  };
  /** Pretend the radio link between two phones dropped, while both apps are still open. */
  const dropLink = (a: Transport, b: Transport) => {
    const ma = a as unknown as { links: Set<unknown>; emit: (e: string, p: unknown) => void; id: string };
    const mb = b as unknown as { links: Set<unknown>; emit: (e: string, p: unknown) => void; id: string };
    ma.links.delete(mb);
    mb.links.delete(ma);
    ma.emit('disconnected', { id: mb.id });
    mb.emit('disconnected', { id: ma.id });
  };

  it('hosts once and never joins or starts over by itself, even with a friend nearby', async () => {
    const net = createMockNetwork(2);
    const hosting = jest.spyOn(net[0], 'host');
    const [a, b] = net.map((t) => new TownSession(() => t));
    await open(a, 'A');
    await open(b, 'B');
    await jest.advanceTimersByTimeAsync(120000);
    expect(a.getState().status).toBe('hosting');
    expect(b.getState().status).toBe('hosting');
    expect(hosting).toHaveBeenCalledTimes(1);
    // Each phone can see the other's visit, to join with a tap.
    expect(joinableVisits(a.getState()).map((v) => v.shown)).toEqual(['🐼 B']);
    a.stop();
    b.stop();
  });

  it('joins with one tap, without clearing the screen on the way', async () => {
    const net = createMockNetwork(2);
    const [a, b] = net.map((t) => new TownSession(() => t));
    await open(a, 'A');
    await open(b, 'B');
    const seen = statuses(b);
    b.setPlace('park');
    void b.joinVisit(joinableVisits(b.getState())[0].name);
    await jest.advanceTimersByTimeAsync(2000);
    expect(b.getState().status).toBe('joined');
    expect(b.getState().joining).toBeNull();
    expect(seen).not.toContain('off');
    // Once a friend is in, the host has nobody to ask about.
    expect(joinableVisits(a.getState())).toEqual([]);
    expect(a.getState().people.map((p) => p.name)).toEqual(['B']);
    a.stop();
    b.stop();
  });

  it("keeps your own person, chalk lines and picture when you join a friend", async () => {
    const net = createMockNetwork(2);
    const boards = [new Chalkboard(), new Chalkboard()];
    const easels = [new EaselBoard(), new EaselBoard()];
    const [a, b] = net.map((t, i) => new TownSession(() => t, boards[i], easels[i]));
    await open(a, 'A');
    await open(b, 'B');
    a.drawChalk({ id: 'a1', c: 0, p: [10, 10, 20, 20] });
    b.setPlace('school');
    b.moveTo(HOST_ID, 0.3, 0.4);
    b.drawChalk({ id: 'b1', c: 0, p: [50, 50, 60, 60] });
    b.paint([{ id: 'p1', k: 'f', r: 1, c: 2 }]);
    void b.joinVisit(joinableVisits(b.getState())[0].name);
    await jest.advanceTimersByTimeAsync(4000);
    const me = b.getState().myId;
    expect(me).not.toBe(HOST_ID);
    expect(b.getState().spots[me]).toEqual({ x: 0.3, y: 0.4 });
    expect(a.getState().spots[me]).toEqual({ x: 0.3, y: 0.4 });
    expect(boards.map((board) => board.getStrokes().map((s) => s.id).sort())).toEqual([['a1', 'b1'], ['a1', 'b1']]);
    // The host's easel was blank, so B's picture goes up for both.
    for (const easel of easels) expect(easel.getPicture().actions.map((x) => x.id)).toEqual(['p1']);
    a.stop();
    b.stop();
  });

  it('two friends tapping Join on each other at the same moment end up in one visit', async () => {
    const net = createMockNetwork(2);
    const [a, b] = net.map((t) => new TownSession(() => t));
    await open(a, 'A');
    await open(b, 'B');
    const toB = joinableVisits(a.getState())[0].name;
    const toA = joinableVisits(b.getState())[0].name;
    void a.joinVisit(toB);
    void b.joinVisit(toA);
    await jest.advanceTimersByTimeAsync(30000);
    const roles = [a.getState().status, b.getState().status].sort();
    expect(roles).toEqual(['hosting', 'joined']);
    a.stop();
    b.stop();
  });

  it('a dropped link gets back in quietly, and the friend stays on screen meanwhile', async () => {
    const net = createMockNetwork(2);
    const [a, b] = net.map((t) => new TownSession(() => t));
    await open(a, 'A');
    await open(b, 'B');
    a.setPlace('park');
    b.setPlace('park');
    void b.joinVisit(joinableVisits(b.getState())[0].name);
    await jest.advanceTimersByTimeAsync(2000);
    expect(a.getState().people).toHaveLength(2);
    const seen = statuses(b);
    dropLink(net[0], net[1]);
    expect(a.getState().people).toHaveLength(2);
    expect(b.getState().reconnecting).toBe(true);
    expect(b.getState().people).toHaveLength(2);
    await jest.advanceTimersByTimeAsync(3000);
    expect(b.getState().reconnecting).toBe(false);
    expect(b.getState().status).toBe('joined');
    expect(seen).not.toContain('off');
    await jest.advanceTimersByTimeAsync(20000);
    // The old link's grace time ran out without taking the friend away.
    expect(a.getState().people.map((p) => p.name).sort()).toEqual(['A', 'B']);
    expect(b.getState().people.map((p) => p.name).sort()).toEqual(['A', 'B']);
    a.stop();
    b.stop();
  });

  it('when the host closes the visit, the friend carries on alone with a visit of their own', async () => {
    const net = createMockNetwork(2);
    const [a, b] = net.map((t) => new TownSession(() => t));
    await open(a, 'A');
    await open(b, 'B');
    b.setPlace('bakery');
    void b.joinVisit(joinableVisits(b.getState())[0].name);
    await jest.advanceTimersByTimeAsync(2000);
    a.stop();
    await jest.advanceTimersByTimeAsync(20000);
    expect(b.getState().status).toBe('hosting');
    expect(b.getState().people.map((p) => p.name)).toEqual(['B']);
    expect(b.getState().notice).toMatch(/closed the visit|Lost the visit/);
    b.stop();
  });

  it('stops searching once phones are connected, and a host looks again when its friends leave', async () => {
    const net = createMockNetwork(2);
    const looking = (i: number) => (net[i] as unknown as { looking: boolean }).looking;
    const [a, b] = net.map((t) => new TownSession(() => t));
    await open(a, 'A');
    expect(looking(0)).toBe(true);
    await open(b, 'B');
    void b.joinVisit(joinableVisits(b.getState())[0].name);
    await jest.advanceTimersByTimeAsync(2000);
    expect(b.getState().status).toBe('joined');
    // Searching makes Nearby connections flaky, so both phones stop.
    expect(looking(1)).toBe(false);
    expect(looking(0)).toBe(false);
    b.stop();
    await jest.advanceTimersByTimeAsync(3000);
    expect(a.getState().status).toBe('hosting');
    expect(looking(0)).toBe(true);
    a.stop();
  });

  it('"Not now" is remembered while the app is open', async () => {
    const net = createMockNetwork(2);
    const [a, b] = net.map((t) => new TownSession(() => t));
    await open(a, 'A');
    await open(b, 'B');
    const name = joinableVisits(b.getState())[0].name;
    b.skip(name);
    b.stop();
    await open(b, 'B');
    expect(b.getState().skipped).toEqual([name]);
    a.stop();
    b.stop();
  });
});
