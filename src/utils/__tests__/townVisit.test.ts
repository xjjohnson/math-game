import { createMockNetwork } from '@/services/mockTransport';
import { TownSession } from '@/services/townSession';
import { clampSpot, defaultSpot, spotFor } from '@/utils/multiplayer/scene';
import { encodeMessage, type GameMessage, HOST_ID, MIN_GAME_VERSION, parseMessage, PROTOCOL_VERSION } from '@/utils/multiplayer/protocol';

const tick = () => new Promise((r) => setTimeout(r, 0));

function setup(count: number) {
  const net = createMockNetwork(count);
  const sessions = net.map((t) => new TownSession(() => t));
  return { net, sessions };
}

async function joinAll(sessions: TownSession[], names: string[]) {
  await sessions[0].host({ name: names[0], avatar: '🐼' });
  for (let i = 1; i < sessions.length; i++) {
    await sessions[i].discover({ name: names[i], avatar: '🦊' });
    const found = sessions[i].getState().found[0];
    await sessions[i].join(found.id);
  }
  await tick();
}

describe('community visits', () => {
  it('shows two players in the same building to each other', async () => {
    const { sessions } = setup(2);
    const [host, guest] = sessions;
    await joinAll(sessions, ['Ava', 'Ben']);
    host.setPlace('bakery');
    guest.setPlace('bakery');
    await tick();
    for (const s of sessions) {
      const here = s.getState().people.filter((p) => p.place === 'bakery').map((p) => p.name).sort();
      expect(here).toEqual(['Ava', 'Ben']);
    }
    expect(guest.getState().myId).not.toBe(HOST_ID);
  });

  it('updates when someone walks to another building or leaves', async () => {
    const { sessions } = setup(3);
    const [host, a, b] = sessions;
    await joinAll(sessions, ['H', 'A', 'B']);
    host.setPlace('street');
    a.setPlace('bakery');
    b.setPlace('bakery');
    await tick();
    expect(host.getState().people).toHaveLength(3);
    a.setPlace('park');
    await tick();
    expect(b.getState().people.find((p) => p.name === 'A')?.place).toBe('park');
    b.setPlace(null);
    await tick();
    expect(host.getState().people.map((p) => p.name).sort()).toEqual(['A', 'H']);
    a.leave();
    await tick();
    expect(host.getState().people.map((p) => p.name)).toEqual(['H']);
  });

  it('only clears a place if the phone is still there', async () => {
    const { sessions } = setup(2);
    await joinAll(sessions, ['H', 'G']);
    const [host, guest] = sessions;
    guest.setPlace('street');
    guest.setPlace('shop');
    guest.clearPlace('street');
    await tick();
    expect(host.getState().people.find((p) => p.name === 'G')?.place).toBe('shop');
  });

  it('sends waves to everyone', async () => {
    const { sessions } = setup(3);
    await joinAll(sessions, ['H', 'A', 'B']);
    sessions[1].wave();
    await tick();
    const aId = sessions[1].getState().myId;
    expect(sessions[2].getState().waves[aId]).toBeDefined();
    expect(sessions[0].getState().waves[aId]).toBeDefined();
  });

  it('turns away a phone that is too old for the community', async () => {
    const net = createMockNetwork(2);
    const host = new TownSession(() => net[0]);
    await host.host({ name: 'H', avatar: '🐼' });
    await net[1].discover();
    const peer = await new Promise<string>((res) => {
      net[1].on('peerFound', (p) => res(p.id));
      net[1].discover();
    });
    const got: string[] = [];
    net[1].on('message', ({ message }) => got.push(message.type));
    await net[1].connect('Old', peer);
    await net[1].send({ type: 'hello', version: MIN_GAME_VERSION, name: 'Old', avatar: '🐢' });
    await tick();
    expect(got).toContain('bye');
    expect(host.getState().notice).toMatch(/newest/);
  });
});

describe('protocol v5 messages', () => {
  it('round-trips the new messages and ignores bad ones', () => {
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(5);
    const town: GameMessage = { type: 'town', people: [{ id: 'x', name: 'Ava', avatar: '🐼', place: 'bakery' }] };
    expect(parseMessage(encodeMessage(town))).toEqual(town);
    expect(parseMessage(encodeMessage({ type: 'town', people: [] }))).toEqual({ type: 'town', people: [] });
    expect(parseMessage(encodeMessage({ type: 'visit', place: null }))).toEqual({ type: 'visit', place: null });
    expect(parseMessage(JSON.stringify({ type: 'visit', place: 'moon' }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'town', people: [{ id: 'x', name: 'A', avatar: 'a', place: 'moon' }] }))).toBeNull();
    expect(parseMessage(encodeMessage({ type: 'hi', playerId: 'x' }))).toEqual({ type: 'hi', playerId: 'x' });
  });
});

describe('shared scene', () => {
  it('lets anyone drag anyone and every phone sees it', async () => {
    const { sessions } = setup(3);
    const [host, a, b] = sessions;
    await joinAll(sessions, ['H', 'A', 'B']);
    host.setPlace('bakery');
    a.setPlace('bakery');
    b.setPlace('bakery');
    await tick();
    const bId = b.getState().myId;
    a.moveTo(bId, 0.25, 0.5); // A drags B
    await tick();
    for (const s of sessions) expect(s.getState().spots[bId]).toEqual({ x: 0.25, y: 0.5 });
    host.moveTo(a.getState().myId, 0.9, 0.2);
    await tick();
    expect(b.getState().spots[a.getState().myId]).toEqual({ x: 0.9, y: 0.2 });
  });

  it('gives late arrivals the current spots and resets a spot when someone changes place', async () => {
    const { sessions } = setup(2);
    const [host, guest] = sessions;
    await joinAll(sessions, ['H', 'G']);
    host.setPlace('park');
    guest.setPlace('park');
    host.moveTo(HOST_ID, 0.3, 0.4);
    await tick();
    guest.setPlace('shop');
    guest.setPlace('park');
    await tick();
    expect(guest.getState().spots[HOST_ID]).toEqual({ x: 0.3, y: 0.4 });
    host.setPlace('bakery');
    await tick();
    expect(host.getState().spots[HOST_ID]).toBeUndefined();
  });

  it('keeps tokens inside the scene and parses move messages', () => {
    expect(clampSpot(-1, 2)).toEqual({ x: 0.08, y: 0.92 });
    expect(spotFor(undefined, 0, 2)).toEqual(defaultSpot(0, 2));
    expect(parseMessage(encodeMessage({ type: 'move', id: 'x', x: 0.5, y: 1 }))).toEqual({ type: 'move', id: 'x', x: 0.5, y: 1 });
    expect(parseMessage(JSON.stringify({ type: 'move', id: 'x', x: 3, y: 0 }))).toBeNull();
  });
});
