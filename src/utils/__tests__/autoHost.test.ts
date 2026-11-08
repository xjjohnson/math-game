import { createMockNetwork } from '@/services/mockTransport';
import { TownSession } from '@/services/townSession';
import { advertName, GAME_MARK, newToken, shouldYield, shownName, tokenOf, YIELD_AFTER_MS } from '@/utils/multiplayer/autoHost';
import { TOWN_MARK } from '@/utils/multiplayer/protocol';

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

describe('community auto-connect', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('hosts once and stays the host, without starting over', async () => {
    const [t] = createMockNetwork(1);
    const hosting = jest.spyOn(t, 'host');
    const session = new TownSession(() => t);
    void session.auto({ name: 'Solo', avatar: '🐼' });
    await jest.advanceTimersByTimeAsync(120000);
    expect(session.getState().status).toBe('hosting');
    expect(hosting).toHaveBeenCalledTimes(1);
    session.stop();
  });

  it('two phones that started together end up in one visit', async () => {
    const net = createMockNetwork(2);
    const [a, b] = net.map((t) => new TownSession(() => t));
    void a.auto({ name: 'A', avatar: '🐼' });
    await jest.advanceTimersByTimeAsync(8000);
    expect(a.getState().status).toBe('hosting');
    // B starts hosting by hand, so there are two hosts; A has nobody yet, so it gives way.
    await b.host({ name: 'B', avatar: '🦊' });
    await jest.advanceTimersByTimeAsync(YIELD_AFTER_MS + 10000);
    expect(a.getState().status).toBe('joined');
    expect(b.getState().people).toHaveLength(0); // nobody has picked a place yet
    a.stop();
    b.stop();
  });

  it('a host with friends stays the host when another host shows up', async () => {
    const net = createMockNetwork(3);
    const [a, friend, b] = net.map((t) => new TownSession(() => t));
    void a.auto({ name: 'A', avatar: '🐼' });
    await jest.advanceTimersByTimeAsync(8000);
    void friend.auto({ name: 'F', avatar: '🐸' });
    await jest.advanceTimersByTimeAsync(8000);
    expect(friend.getState().status).toBe('joined');
    await b.host({ name: 'B', avatar: '🦊' });
    await jest.advanceTimersByTimeAsync(YIELD_AFTER_MS + 10000);
    expect(a.getState().status).toBe('hosting');
    expect(friend.getState().status).toBe('joined');
    a.stop();
    friend.stop();
    b.stop();
  });

  it('stops searching once phones are connected, and a host looks again when its friends leave', async () => {
    const net = createMockNetwork(2);
    const looking = (i: number) => (net[i] as unknown as { looking: boolean }).looking;
    const [a, friend] = net.map((t) => new TownSession(() => t));
    void a.auto({ name: 'A', avatar: '🐼' });
    await jest.advanceTimersByTimeAsync(8000);
    expect(a.getState().status).toBe('hosting');
    expect(looking(0)).toBe(true);
    void friend.auto({ name: 'F', avatar: '🐸' });
    await jest.advanceTimersByTimeAsync(8000);
    expect(friend.getState().status).toBe('joined');
    // Searching makes Nearby connections flaky, so both phones stop.
    expect(looking(1)).toBe(false);
    expect(looking(0)).toBe(false);
    friend.stop();
    await jest.advanceTimersByTimeAsync(3000);
    expect(a.getState().status).toBe('hosting');
    expect(looking(0)).toBe(true);
    a.stop();
  });
});
