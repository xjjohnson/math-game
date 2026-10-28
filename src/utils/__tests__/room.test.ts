import { findRoomItem, HOME_AREAS, MAX_ROOM_THINGS, ROOM_SPAN } from '@/constants/room';
import type { Room } from '@/types';
import { makeProfile } from '@/test/fixtures';
import {
  areaAt,
  BUDDY_KEY,
  buddiesHome,
  buyRoomItem,
  clampSpot,
  moveInRoom,
  setBuddyHome,
  setPaint,
  setPlaced,
  upgradeRoom,
  widenHome,
} from '@/utils/room';

const OCTOBER = 9;
const MARCH = 2;

describe('buddy home', () => {
  it('buys a thing, places it in the area in view and spends coins', () => {
    const r = buyRoomItem(makeProfile({ coins: 50 }), 'bed', 'k1', 2, MARCH);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.coins).toBe(10);
    expect(r.profile.room.things).toEqual([expect.objectContaining({ key: 'k1', itemId: 'bed', placed: true })]);
    expect(areaAt(r.profile.room.things[0].x)).toBe(2);
  });

  it('refuses unknown things, short coins and a full home', () => {
    expect(buyRoomItem(makeProfile({ coins: 50 }), 'nope', 'k')).toEqual({ ok: false, reason: 'unknown' });
    expect(buyRoomItem(makeProfile({ coins: 5 }), 'bed', 'k')).toEqual({ ok: false, reason: 'coins' });
    const p = makeProfile({ coins: 999 });
    const things = Array.from({ length: MAX_ROOM_THINGS }, (_, i) => ({
      key: `k${i}`,
      itemId: 'ball',
      x: 0.5,
      y: 0.9,
      placed: true,
    }));
    expect(buyRoomItem({ ...p, room: { ...p.room, things } }, 'ball', 'x')).toEqual({ ok: false, reason: 'full' });
  });

  it('sells Halloween things in October only', () => {
    expect(findRoomItem('pumpkin')?.month).toBe(OCTOBER);
    expect(buyRoomItem(makeProfile({ coins: 50 }), 'pumpkin', 'k', 0, MARCH)).toEqual({
      ok: false,
      reason: 'season',
    });
    expect(buyRoomItem(makeProfile({ coins: 50 }), 'pumpkin', 'k', 0, OCTOBER).ok).toBe(true);
  });

  it('moves things and buddies anywhere in the home, kept inside it', () => {
    const bought = buyRoomItem(makeProfile({ coins: 50 }), 'ball', 'k1', 0, MARCH);
    if (!bought.ok) throw new Error('buy failed');
    const moved = moveInRoom(bought.profile, 'k1', { x: 2, y: -1 });
    expect(moved.room.things[0].x).toBeGreaterThan(0.98);
    expect(moved.room.things[0].y).toBe(0.2);
    expect(moveInRoom(moved, `${BUDDY_KEY}puppy`, { x: 0.7, y: 0.7 }).room.buddies.puppy).toEqual({ x: 0.7, y: 0.7 });
    expect(clampSpot({ x: 0.5, y: 0.5 })).toEqual({ x: 0.5, y: 0.5 });
  });

  it('puts things away and takes them out again into the area in view', () => {
    const bought = buyRoomItem(makeProfile({ coins: 50 }), 'ball', 'k1', 0, MARCH);
    if (!bought.ok) throw new Error('buy failed');
    const away = setPlaced(bought.profile, 'k1', false);
    expect(away.room.things[0].placed).toBe(false);
    const back = setPlaced(away, 'k1', true, 1).room.things[0];
    expect(back.placed).toBe(true);
    expect(areaAt(back.x)).toBe(1);
  });

  it('paints each area on its own', () => {
    const p = makeProfile();
    const kitchen = setPaint(p, 'wall', 3, 1).room.paint;
    expect(kitchen[1].wall).toBe(3);
    expect(kitchen[0].wall).toBe(0);
    expect(setPaint(p, 'floor', 99, 2).room.paint[2].floor).toBe(7);
  });

  it('has several buddies home, always including the one in use', () => {
    const p = makeProfile({ equipped: { ...makeProfile().equipped, companion: 'puppy' } });
    expect(buddiesHome(p).map((b) => b.id)).toEqual(['puppy']);
    const two = setBuddyHome(p, 'kitty', true, 1);
    expect(buddiesHome(two).map((b) => b.id).sort()).toEqual(['kitty', 'puppy']);
    expect(areaAt(two.room.buddies.kitty.x)).toBe(1);
    expect(buddiesHome(setBuddyHome(two, 'kitty', false)).map((b) => b.id)).toEqual(['puppy']);
    // The buddy in use can't be sent away.
    expect(setBuddyHome(two, 'puppy', false)).toBe(two);
  });

  it('turns the old one-room layout into the living room', () => {
    const home = upgradeRoom(
      { wall: 3, floor: 2, buddy: { x: 0.6, y: 0.8 }, things: [{ key: 'k', itemId: 'bed', x: 0.9, y: 0.9, placed: true }] },
      'puppy',
    );
    expect(home.paint[0]).toEqual({ wall: 3, floor: 2 });
    expect(home.paint).toHaveLength(3);
    expect(home.buddies.puppy.x).toBeCloseTo(0.2);
    expect(home.buddies.puppy.y).toBe(0.8);
    expect(home.things[0].x).toBeCloseTo(0.3);
    expect(upgradeRoom(home, 'puppy')).toBe(home);
  });

  it('keeps everything by its own room when the rooms get wider', () => {
    const old: Room = {
      paint: [{ wall: 1, floor: 1 }, { wall: 2, floor: 2 }, { wall: 3, floor: 3 }],
      buddies: { puppy: { x: 0.5, y: 0.8, on: 'couch' } },
      things: [
        { key: 'a', itemId: 'bed', x: 0.9, y: 0.9, placed: true },
        { key: 'b', itemId: 'milk', x: 0.4, y: 0, placed: true, in: 'fridge', shelf: 1 },
      ],
    };
    const home = widenHome(old);
    expect(home.paint).toHaveLength(HOME_AREAS.length);
    expect(home.paint[2]).toEqual({ wall: 3, floor: 3 });
    expect(home.paint[3]).toEqual(HOME_AREAS[3].paint);
    // The middle of the old kitchen is half a screen into the new one.
    expect(areaAt(home.buddies.puppy.x)).toBe(1);
    expect(home.buddies.puppy.x).toBeCloseTo((1 + 0.5 / ROOM_SPAN) / HOME_AREAS.length);
    expect(home.buddies.puppy.on).toBe('couch');
    expect(areaAt(home.things[0].x)).toBe(2);
    // Things on cupboard shelves keep their spot along the shelf.
    expect(home.things[1]).toEqual(old.things[1]);
  });
});
