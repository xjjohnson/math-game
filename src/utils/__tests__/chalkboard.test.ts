import { Chalkboard, MAX_STROKES } from '@/services/chalkboard';
import { createMockNetwork } from '@/services/mockTransport';
import { TownSession } from '@/services/townSession';
import { encodeMessage, type GameMessage, MAX_CHALK_POINTS, parseMessage, PROTOCOL_VERSION, SCHOOL_VERSION } from '@/utils/multiplayer/protocol';

const tick = () => new Promise((r) => setTimeout(r, 0));

function setup(count: number) {
  const net = createMockNetwork(count);
  const boards = net.map(() => new Chalkboard());
  const sessions = net.map((t, i) => new TownSession(() => t, boards[i]));
  return { sessions, boards };
}

async function joinGuest(host: TownSession, guest: TownSession, name: string) {
  await guest.discover({ name, avatar: '🦊' });
  await guest.join(guest.getState().found[0].id);
  await tick();
}

describe('school chalkboard', () => {
  it('keeps lines, grows them in place and wipes clean', () => {
    const b = new Chalkboard();
    b.put({ id: 'a', c: 1, p: [0, 0] });
    b.put({ id: 'a', c: 1, p: [0, 0, 10, 10] });
    b.put({ id: 'b', c: 2, p: [5, 5] });
    expect(b.getStrokes().map((s) => s.p.length)).toEqual([4, 2]);
    for (let i = 0; i < MAX_STROKES + 5; i++) b.put({ id: `x${i}`, c: 1, p: [1, 1] });
    expect(b.getStrokes()).toHaveLength(MAX_STROKES);
    b.wipe();
    expect(b.getStrokes()).toEqual([]);
  });

  it('shares what anyone draws with every phone, and a wipe too', async () => {
    const { sessions, boards } = setup(3);
    const [host, a, b] = sessions;
    await host.host({ name: 'H', avatar: '🐼' });
    await joinGuest(host, a, 'A');
    await joinGuest(host, b, 'B');
    a.drawChalk({ id: 'a1', c: 3, p: [100, 100, 200, 250] });
    host.drawChalk({ id: 'h1', c: 1, p: [500, 500] });
    await tick();
    for (const board of boards) expect(board.getStrokes().map((s) => s.id).sort()).toEqual(['a1', 'h1']);
    b.wipeChalk();
    await tick();
    for (const board of boards) expect(board.getStrokes()).toEqual([]);
  });

  it("shows a friend who joins later what is already on the host's board", async () => {
    const { sessions, boards } = setup(2);
    const [host, guest] = sessions;
    boards[1].put({ id: 'old', c: 1, p: [1, 1] });
    await host.host({ name: 'H', avatar: '🐼' });
    host.drawChalk({ id: 'h1', c: 2, p: [10, 10, 20, 20] });
    await joinGuest(host, guest, 'G');
    expect(boards[1].getStrokes().map((s) => s.id)).toEqual(['h1']);
  });

  it('only accepts sensible chalk messages', () => {
    const ok: GameMessage = { type: 'chalk', stroke: { id: 's', c: 1, p: [0, 1000] } };
    expect(parseMessage(encodeMessage(ok))).toEqual(ok);
    expect(parseMessage(JSON.stringify({ type: 'chalk', stroke: { id: 's', c: 99, p: [0, 0] } }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'chalk', stroke: { id: 's', c: 1, p: [0] } }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'chalk', stroke: { id: 's', c: 1, p: [0, 2000] } }))).toBeNull();
    const long = Array.from({ length: MAX_CHALK_POINTS * 2 + 2 }, () => 5);
    expect(parseMessage(JSON.stringify({ type: 'chalk', stroke: { id: 's', c: 1, p: long } }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'chalk-wipe' }))).toEqual({ type: 'chalk-wipe' });
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(SCHOOL_VERSION);
  });
});
