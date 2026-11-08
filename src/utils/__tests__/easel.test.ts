import { Chalkboard } from '@/services/chalkboard';
import { EaselBoard } from '@/services/easel';
import { createMockNetwork } from '@/services/mockTransport';
import { TownSession } from '@/services/townSession';
import {
  BLANK_PAGE,
  COLORING_PAGES,
  compactPicture,
  fillsOf,
  hasNumbers,
  labelAt,
  lastMine,
  MAX_SAVED_PICTURES,
  MAX_PAINT_ACTIONS,
  MAX_SAVED_POINTS,
  numberCheck,
  PAINT_COLORS,
  PAPER_H,
  PAPER_W,
  putAction,
  regionAt,
  savePicture,
  simplify,
  smoothPath,
  sumFor,
  type NumberLevel,
  type PaintAction,
  type SavedPicture,
} from '@/utils/easel';
import { hangPicture, removePicture } from '@/utils/room';
import { PICTURE_ITEM, PICTURE_KEY } from '@/constants/room';
import { encodeMessage, paintBatches, parseMessage } from '@/utils/multiplayer/protocol';
import type { Profile } from '@/types';

const tick = () => new Promise((r) => setTimeout(r, 0));

/** Works out a sum like "12 − 5" or "21 ÷ 3". */
function solve(sum: string): number {
  const [a, op, b] = sum.split(' ');
  const x = Number(a);
  const y = Number(b);
  return op === '+' ? x + y : op === '−' ? x - y : op === '×' ? x * y : x / y;
}

describe('coloring pages', () => {
  it.each(COLORING_PAGES.map((p) => [p.id, p] as const))('%s: every number sits inside its own area, in the paper', (_id, page) => {
    expect(page.regions[0].line).toBe(false);
    expect(hasNumbers(page)).toBe(true);
    page.regions.forEach((r, i) => {
      if (r.n === undefined) return;
      expect(r.n).toBeGreaterThanOrEqual(1);
      expect(r.n).toBeLessThan(PAINT_COLORS.length);
      const [x, y] = labelAt(r);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(PAPER_W);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(PAPER_H);
      // Tapping on the number fills that area, not one in front of it.
      expect(regionAt(page, x, y)).toBe(i);
    });
  });

  it('finds the front-most area under a finger, or the paper', () => {
    const house = COLORING_PAGES.find((p) => p.id === 'house')!;
    expect(regionAt(house, 375, 680)).toBe(house.regions.findIndex((r) => r.n === 6)); // the door, in front of the wall
    expect(regionAt(house, 5, 5)).toBe(0);
    expect(regionAt(BLANK_PAGE, 300, 300)).toBe(0);
  });

  it('writes sums that come out to each color number, the same on every phone', () => {
    for (const level of [0, 1, 2] as NumberLevel[]) {
      for (let n = 1; n < PAINT_COLORS.length; n++) {
        const sum = sumFor(n, level, `page:${n}`);
        expect(solve(sum)).toBe(n);
        expect(sumFor(n, level, `page:${n}`)).toBe(sum);
        if (level === 0) expect(sum).toContain('+');
        if (level === 2) expect(sum).toMatch(/[×÷]/);
      }
    }
  });
});

describe('a picture', () => {
  it('fills areas (the last fill wins) and Undo takes back only your own', () => {
    let actions: PaintAction[] = [];
    actions = putAction(actions, { id: 'mine1', k: 'f', r: 2, c: 3 });
    actions = putAction(actions, { id: 'friend1', k: 'f', r: 2, c: 5 });
    actions = putAction(actions, { id: 'mine2', k: 's', c: 1, w: 0, p: [1, 1] });
    actions = putAction(actions, { id: 'mine2', k: 's', c: 1, w: 0, p: [1, 1, 9, 9] });
    expect(actions).toHaveLength(3);
    expect(fillsOf(actions, 4)).toEqual([0, 0, 5, 0]);
    expect(lastMine(actions, 'mine')).toBe('mine2');
    expect(lastMine(actions, 'nobody')).toBeNull();
  });

  it('lets the oldest brush lines go when there are too many, but keeps the fills', () => {
    let actions: PaintAction[] = [{ id: 'fill', k: 'f', r: 1, c: 4 }];
    for (let i = 0; i < MAX_PAINT_ACTIONS + 10; i++) actions = putAction(actions, { id: `s${i}`, k: 's', c: 1, w: 1, p: [i % 700, 5] });
    expect(actions).toHaveLength(MAX_PAINT_ACTIONS);
    expect(actions[0].id).toBe('fill');
    expect(actions[1].id).toBe('s11');
  });

  it('checks a color-by-number page', () => {
    const page = COLORING_PAGES.find((p) => p.id === 'rocket')!;
    const numbered = page.regions.map((r, i) => [r, i] as const).filter(([r]) => r.n !== undefined);
    const all: PaintAction[] = numbered.map(([r, i]) => ({ id: `f${i}`, k: 'f', r: i, c: r.n! }));
    expect(numberCheck({ page: 'rocket', lv: 0, actions: all })).toEqual({ total: numbered.length, wrong: [] });
    expect(numberCheck({ page: 'rocket', lv: 0, actions: all.slice(1) }).wrong).toEqual([numbered[0][1]]);
  });

  it('draws one smooth path per line', () => {
    expect(smoothPath([10, 10])).toBe('M10 10L10.1 10');
    expect(smoothPath([0, 0, 10, 10])).toBe('M0 0L10 10');
    expect(smoothPath([0, 0, 10, 0, 20, 10], 2, 1)).toBe('M0 0Q20 0 30 5L40 10');
  });

  it('keeps saved pictures small', () => {
    const straight = Array.from({ length: 50 }, (_, i) => [i * 10, 100]).flat();
    expect(simplify(straight, 1.5)).toEqual([0, 100, 490, 100]);
    const wiggly = (seed: number) => Array.from({ length: 150 }, (_, i) => [(i * 5) % 750, 500 + Math.round(Math.sin(i + seed) * 200)]).flat();
    const actions: PaintAction[] = Array.from({ length: 200 }, (_, i) => ({ id: `s${i}`, k: 's' as const, c: 1, w: 1, p: wiggly(i) }));
    actions.push({ id: 'f1', k: 'f', r: 0, c: 2 }, { id: 'f2', k: 'f', r: 0, c: 3 });
    const small = compactPicture({ page: 'blank', lv: null, actions });
    const points = small.actions.reduce((n, a) => n + (a.k === 's' ? a.p.length / 2 : 0), 0);
    expect(points).toBeLessThanOrEqual(MAX_SAVED_POINTS);
    // Only the fill that shows is kept.
    expect(small.actions.filter((a) => a.k === 'f').map((a) => a.id)).toEqual(['f2']);
  });
});

describe('my pictures', () => {
  const pic = { page: 'house', lv: null, actions: [{ id: 'a', k: 'f' as const, r: 1, c: 4 }] };

  it('saves new pictures first, saves over an opened one, and makes room by letting the oldest one go', () => {
    let list: SavedPicture[] = [];
    for (let i = 0; i < MAX_SAVED_PICTURES; i++) list = savePicture(list, pic, `p${i}`, i).list;
    expect(list[0].id).toBe(`p${MAX_SAVED_PICTURES - 1}`);
    list = savePicture(list, pic, 'p3', 99).list;
    expect(list).toHaveLength(MAX_SAVED_PICTURES);
    expect(list[0]).toMatchObject({ id: 'p3', at: 99 });
    // p0 is hanging up, so p1 (the oldest one that isn't) makes room.
    const next = savePicture(list, pic, 'new', 100, new Set(['p0']));
    expect(next.dropped).toBe('p1');
    expect(next.list).toHaveLength(MAX_SAVED_PICTURES);
  });

  it("hangs a picture in the buddy's home once, and takes it down when it is thrown away", () => {
    const profile = { room: { paint: [], buddies: {}, things: [] } } as unknown as Profile;
    const hung = hangPicture(profile, 'abc');
    if (!hung.ok) throw new Error('should hang');
    expect(hung.profile.room.things).toEqual([expect.objectContaining({ key: `${PICTURE_KEY}abc`, itemId: PICTURE_ITEM, placed: true })]);
    expect(hangPicture(hung.profile, 'abc')).toEqual({ ok: false, reason: 'already' });
    expect(removePicture(hung.profile, 'abc').room.things).toEqual([]);
  });
});

describe('painting together', () => {
  function setup(count: number) {
    const net = createMockNetwork(count);
    const easels = net.map(() => new EaselBoard());
    const sessions = net.map((t, i) => new TownSession(() => t, new Chalkboard(), easels[i]));
    return { sessions, easels };
  }
  async function joinGuest(guest: TownSession, name: string) {
    await guest.discover({ name, avatar: '🦊' });
    await guest.join(guest.getState().found[0].id);
    await tick();
  }

  it('shares paint, undo and a fresh page with every phone', async () => {
    const { sessions, easels } = setup(3);
    const [host, a, b] = sessions;
    await host.host({ name: 'H', avatar: '🐼' });
    await joinGuest(a, 'A');
    await joinGuest(b, 'B');
    a.paint([{ id: 'a1', k: 's', c: 2, w: 1, p: [10, 10, 50, 60] }]);
    host.paint([{ id: 'h1', k: 'f', r: 0, c: 5 }]);
    await tick();
    for (const e of easels) expect(e.getPicture().actions.map((x) => x.id).sort()).toEqual(['a1', 'h1']);
    b.undoPaint('a1');
    await tick();
    for (const e of easels) expect(e.getPicture().actions.map((x) => x.id)).toEqual(['h1']);
    a.newPaper('turkey', 1);
    await tick();
    for (const e of easels) expect(e.getPicture()).toEqual({ page: 'turkey', lv: 1, actions: [] });
  });

  it("shows a friend who joins later the picture on the host's easel", async () => {
    const { sessions, easels } = setup(2);
    const [host, guest] = sessions;
    await host.host({ name: 'H', avatar: '🐼' });
    const many: PaintAction[] = Array.from({ length: 120 }, (_, i) => ({ id: `s${i}`, k: 's', c: 1, w: 2, p: Array.from({ length: 300 }, (_, j) => (j * 2) % 700) }));
    host.newPaper('cat', null, many);
    await joinGuest(guest, 'G');
    expect(easels[1].getPicture().page).toBe('cat');
    expect(easels[1].getPicture().actions).toHaveLength(120);
  });

  it('sends paint in batches small enough for Nearby, and only accepts sensible paint', () => {
    const big: PaintAction[] = Array.from({ length: 100 }, (_, i) => ({ id: `s${i}`, k: 's', c: 1, w: 2, p: Array.from({ length: 300 }, () => 700) }));
    for (const a of paintBatches(big)) {
      const text = encodeMessage({ type: 'paint', a });
      expect(text.length).toBeLessThan(30000);
      expect(parseMessage(text)).toEqual({ type: 'paint', a });
    }
    expect(paintBatches(big).flat()).toHaveLength(100);
    const bad = (a: unknown) => parseMessage(JSON.stringify({ type: 'paint', a: [a] }));
    expect(bad({ id: 'x', k: 's', c: 99, w: 0, p: [1, 1] })).toBeNull();
    expect(bad({ id: 'x', k: 's', c: 1, w: 7, p: [1, 1] })).toBeNull();
    expect(bad({ id: 'x', k: 's', c: 1, w: 0, p: [1, 2000] })).toBeNull();
    expect(bad({ id: 'x', k: 's', c: 1, w: 0, p: [1] })).toBeNull();
    expect(bad({ id: 'x', k: 'f', r: -1, c: 1 })).toBeNull();
    expect(bad({ id: 'x', k: 'f', r: 3, c: 1 })).toEqual({ type: 'paint', a: [{ id: 'x', k: 'f', r: 3, c: 1 }] });
    expect(parseMessage(JSON.stringify({ type: 'paint-page', page: 'nope', lv: null }))).toBeNull();
    expect(parseMessage(JSON.stringify({ type: 'paint-page', page: 'fish', lv: 2 }))).toEqual({ type: 'paint-page', page: 'fish', lv: 2 });
    expect(parseMessage(JSON.stringify({ type: 'paint-undo', id: 'a1' }))).toEqual({ type: 'paint-undo', id: 'a1' });
  });
});
