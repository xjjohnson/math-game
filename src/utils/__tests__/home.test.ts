import { CUPBOARDS, findRoomItem, GADGETS, HOME_AREAS, MONTH_NAMES, ROOM_SPAN, seasonOf, SURFACES } from '@/constants/room';
import { makeProfile } from '@/test/fixtures';
import type { Profile, RoomThing } from '@/types';
import { dropBuddy, dropThing, gadgetBox, homeSize, layoutHome, pieceAt, ridersOf, shelvesOf, surfaceLine, type Piece } from '@/utils/home';
import { BUDDY_KEY, buddiesHome, buyRoomItem, FIXTURE_KEY, placeBuddy, placeThing, setBuddyHome, setPlaced } from '@/utils/room';

const NOVEMBER = 10;
const MARCH = 2;
/** A phone held upright. */
const size = homeSize(400, 760);

function withThings(things: Omit<RoomThing, 'placed'>[], companion = 'puppy'): Profile {
  const p = makeProfile({ equipped: { ...makeProfile().equipped, companion } });
  return { ...p, room: { ...p.room, things: things.map((t) => ({ ...t, placed: true })) } };
}

function layout(p: Profile, open: string[] = []): Piece[] {
  return layoutHome(p.room, buddiesHome(p), size, new Set(open));
}

const piece = (pieces: Piece[], key: string) => {
  const found = pieces.find((p) => p.key === key);
  if (!found) throw new Error(`no piece ${key}`);
  return found;
};

/** How far to drag a piece so its bottom middle lands on `x`, `y` (pixels). */
const to = (p: Piece, x: number, y: number) => [x - p.x, y - p.y] as const;

describe('home layout', () => {
  it('fills a tall phone screen, with rooms a few screens wide', () => {
    expect(size.height).toBe(760);
    expect(size.screen).toBeGreaterThanOrEqual(400);
    expect(size.areaWidth).toBe(Math.round(size.screen * ROOM_SPAN));
    expect(size.width).toBe(size.areaWidth * HOME_AREAS.length);
    expect(size.unit).toBeLessThanOrEqual(760);
  });

  it('keeps every built-in inside its own room', () => {
    for (const f of [...CUPBOARDS, ...SURFACES]) {
      expect(f.left).toBeGreaterThanOrEqual(0);
      expect(f.left + f.width).toBeLessThanOrEqual(ROOM_SPAN);
    }
    for (const g of GADGETS) {
      const box = gadgetBox(g, size);
      const area = HOME_AREAS.findIndex((a) => a.id === g.area);
      expect(box.left).toBeGreaterThanOrEqual(area * size.areaWidth);
      expect(box.left + box.width).toBeLessThanOrEqual((area + 1) * size.areaWidth);
      expect(box.top).toBeGreaterThan(0);
    }
  });

  it('finds the piece under a finger, the one on top first', () => {
    const p = withThings([
      { key: 'table', itemId: 'table', x: 0.05, y: 0.9 },
      { key: 'cup', itemId: 'milk', x: 0.05, y: 0, on: 'table' },
    ]);
    const pieces = layoutHome(p.room, [], size, new Set());
    const cup = pieces.find((q) => q.key === 'cup')!;
    expect(pieceAt(pieces, cup.x, cup.y - 2)?.key).toBe('cup');
    expect(pieceAt(pieces, 1, 1)).toBeNull();
  });

  it('keeps things in shut cupboards hidden and shows them where they were put on the shelf', () => {
    const p = withThings([
      { key: 'a', itemId: 'milk', x: 0.2, y: 0, in: 'fridge', shelf: 1 },
      { key: 'b', itemId: 'apples', x: 0.8, y: 0, in: 'fridge', shelf: 1 },
    ]);
    expect(layout(p).some((x) => x.key === 'a')).toBe(false);
    const open = layout(p, ['fridge']);
    const a = piece(open, 'a');
    const b = piece(open, 'b');
    expect(a.stored).toBe(true);
    expect(a.y).toBeCloseTo(b.y);
    expect(b.x).toBeGreaterThan(a.x);
    const { inner, row } = shelvesOf(CUPBOARDS.find((c) => c.id === 'fridge')!, size);
    expect(b.x).toBeGreaterThan(row.left + row.width / 2);
    expect(a.y).toBeLessThanOrEqual(inner.top + inner.height);
    expect(a.y).toBeGreaterThan(inner.top + inner.height / 2);
  });

  it('sets things on tables and seats, and buddies on seats, riding along', () => {
    const p = withThings([
      { key: 'table', itemId: 'table', x: 0.15, y: 0.9 },
      { key: 'pie', itemId: 'pie', x: 0.15, y: 0.5, on: 'table' },
    ]);
    const pieces = layout(p);
    const table = piece(pieces, 'table');
    const pie = piece(pieces, 'pie');
    expect(pie.y).toBeCloseTo(table.y - table.height);
    expect(pie.parent).toBe('table');
    expect([...ridersOf(pieces, 'table')].sort()).toEqual(['pie', 'table']);
    // The pie is drawn after the table.
    expect(pieces.indexOf(pie)).toBeGreaterThan(pieces.indexOf(table));
  });

  it('puts held things at the buddy’s side, smaller than the buddy', () => {
    const p = withThings([{ key: 'ball', itemId: 'ball', x: 0, y: 0, on: `${BUDDY_KEY}puppy` }]);
    const pieces = layout(p);
    const buddy = piece(pieces, `${BUDDY_KEY}puppy`);
    const ball = piece(pieces, 'ball');
    expect(ball.x).toBeGreaterThan(buddy.x);
    expect(ball.height).toBeLessThanOrEqual(buddy.height / 2);
    expect(ball.parent).toBe(`${BUDDY_KEY}puppy`);
  });
});

describe('dropping things', () => {
  it('drops small things into an open cupboard, on the shelf under them', () => {
    const p = withThings([{ key: 'milk', itemId: 'milk', x: 0.5, y: 0.9 }]);
    const pieces = layout(p, ['fridge']);
    const milk = piece(pieces, 'milk');
    const { inner, band } = shelvesOf(CUPBOARDS.find((c) => c.id === 'fridge')!, size);
    const [dx, dy] = to(milk, inner.left + inner.width / 2, inner.top + band * 2 - 4);
    const kept = dropThing(pieces, milk, dx, dy, size, new Set(['fridge']));
    expect(kept).toMatchObject({ in: 'fridge', shelf: 1 });
    expect(kept.x).toBeCloseTo((inner.left + inner.width / 2 - shelvesOf(CUPBOARDS.find((c) => c.id === 'fridge')!, size).row.left) / shelvesOf(CUPBOARDS.find((c) => c.id === 'fridge')!, size).row.width);
    // A shut fridge takes nothing.
    expect(dropThing(pieces, milk, dx, dy, size, new Set()).in).toBeUndefined();
  });

  it('gives small things to a buddy to hold, but not furniture', () => {
    const p = withThings([
      { key: 'teddy', itemId: 'teddy', x: 0.05, y: 0.9 },
      { key: 'table', itemId: 'table', x: 0.05, y: 0.9 },
    ]);
    const pieces = layout(p);
    const buddy = piece(pieces, `${BUDDY_KEY}puppy`);
    const teddy = piece(pieces, 'teddy');
    const [dx, dy] = to(teddy, buddy.x, buddy.y - buddy.height * 0.2);
    expect(dropThing(pieces, teddy, dx, dy, size, new Set()).on).toBe(`${BUDDY_KEY}puppy`);
    const table = piece(pieces, 'table');
    const [tx, ty] = to(table, buddy.x, buddy.y - buddy.height * 0.2);
    expect(dropThing(pieces, table, tx, ty, size, new Set()).on).toBeUndefined();
  });

  it('sets things on a table top and on the kitchen counter', () => {
    const p = withThings([
      { key: 'table', itemId: 'table', x: 0.28, y: 0.95 },
      { key: 'cake', itemId: 'cake', x: 0.3, y: 0.9 },
    ]);
    const pieces = layout(p);
    const table = piece(pieces, 'table');
    const cake = piece(pieces, 'cake');
    const [dx, dy] = to(cake, table.x, table.y - table.height - 5);
    expect(dropThing(pieces, cake, dx, dy, size, new Set())).toMatchObject({ on: 'table' });

    const counter = surfaceLine(SURFACES.find((s) => s.id === 'counter')!, size);
    const [cx, cy] = to(cake, (counter.left + counter.right) / 2, counter.y + 10);
    const onCounter = dropThing(pieces, cake, cx, cy, size, new Set());
    expect(onCounter.on).toBe(`${FIXTURE_KEY}counter`);
    expect(onCounter.y * size.height).toBeCloseTo(counter.y);
  });

  it('sits a buddy on a couch, and leaves it standing on the open floor', () => {
    const p = withThings([{ key: 'couch', itemId: 'couch', x: 0.2, y: 0.95 }]);
    const pieces = layout(p);
    const couch = piece(pieces, 'couch');
    const buddy = piece(pieces, `${BUDDY_KEY}puppy`);
    const [dx, dy] = to(buddy, couch.x, couch.y - couch.height * 0.4);
    expect(dropBuddy(pieces, buddy, dx, dy, size).on).toBe('couch');
    const [fx, fy] = to(buddy, couch.x + size.areaWidth * 0.5, couch.y);
    expect(dropBuddy(pieces, buddy, fx, fy, size).on).toBeUndefined();
  });
});

describe('placing in the home', () => {
  it('moves what rests on a table with it', () => {
    const p = withThings([
      { key: 'table', itemId: 'table', x: 0.1, y: 0.9 },
      { key: 'pie', itemId: 'pie', x: 0.1, y: 0.7, on: 'table' },
    ]);
    const moved = placeThing(p, 'table', { x: 0.3, y: 0.9 });
    expect(moved.room.things.find((t) => t.key === 'pie')).toMatchObject({ on: 'table' });
    expect(moved.room.things.find((t) => t.key === 'pie')?.x).toBeCloseTo(0.3);
  });

  it('lets a buddy hold one thing at a time', () => {
    const p = withThings([
      { key: 'ball', itemId: 'ball', x: 0.1, y: 0.9 },
      { key: 'duck', itemId: 'duck', x: 0.1, y: 0.9 },
    ]);
    const one = placeThing(p, 'ball', { x: 0.1, y: 0.8, on: `${BUDDY_KEY}puppy` });
    const two = placeThing(one, 'duck', { x: 0.1, y: 0.8, on: `${BUDDY_KEY}puppy` });
    expect(two.room.things.find((t) => t.key === 'ball')?.on).toBeUndefined();
    expect(two.room.things.find((t) => t.key === 'duck')?.on).toBe(`${BUDDY_KEY}puppy`);
  });

  it('keeps things in cupboards, and takes them out loose', () => {
    const p = withThings([{ key: 'milk', itemId: 'milk', x: 0.5, y: 0.9 }]);
    const kept = placeThing(p, 'milk', { x: 0.6, y: 0, in: 'fridge', shelf: 1 });
    expect(kept.room.things[0].x).toBe(0.6);
    expect(kept.room.things[0]).toMatchObject({ in: 'fridge', shelf: 1, y: 0.9 });
    const out = placeThing(kept, 'milk', { x: 0.4, y: 0.92 });
    expect(out.room.things[0].in).toBeUndefined();
    expect(out.room.things[0].shelf).toBeUndefined();
  });

  it('drops riders when a seat goes in the toy box or a buddy naps', () => {
    let p = withThings([
      { key: 'couch', itemId: 'couch', x: 0.2, y: 0.95 },
      { key: 'teddy', itemId: 'teddy', x: 0.2, y: 0.8, on: 'couch' },
    ]);
    p = setBuddyHome(p, 'kitty', true);
    p = placeBuddy(p, 'kitty', { x: 0.2, y: 0.8, on: 'couch' });
    p = placeThing(p, 'teddy', { x: 0.2, y: 0.8, on: `${BUDDY_KEY}kitty` });
    expect(p.room.buddies.kitty.on).toBe('couch');
    const away = setPlaced(p, 'couch', false);
    expect(away.room.buddies.kitty.on).toBeUndefined();
    expect(away.room.buddies.kitty.y).toBe(0.95);
    const napped = setBuddyHome(p, 'kitty', false);
    expect(napped.room.things.find((t) => t.key === 'teddy')?.on).toBeUndefined();
  });

  it('moving a buddy on a seat off it stands it up', () => {
    let p = withThings([{ key: 'chair', itemId: 'chair', x: 0.2, y: 0.95 }]);
    p = placeBuddy(p, 'puppy', { x: 0.2, y: 0.8, on: 'chair' });
    expect(p.room.buddies.puppy.on).toBe('chair');
    p = placeBuddy(p, 'puppy', { x: 0.25, y: 0.9 });
    expect(p.room.buddies.puppy).toEqual({ x: 0.25, y: 0.9 });
  });
});

describe('Thanksgiving', () => {
  it('sells Thanksgiving things in November only', () => {
    expect(seasonOf(NOVEMBER)).toBe('thanksgiving');
    expect(seasonOf(9)).toBe('halloween');
    expect(seasonOf(MARCH)).toBeNull();
    expect(MONTH_NAMES[findRoomItem('turkey')!.month!]).toBe('November');
    expect(buyRoomItem(makeProfile({ coins: 50 }), 'turkey', 'k', 0, MARCH)).toEqual({ ok: false, reason: 'season' });
    expect(buyRoomItem(makeProfile({ coins: 50 }), 'turkey', 'k', 0, NOVEMBER).ok).toBe(true);
  });
});
