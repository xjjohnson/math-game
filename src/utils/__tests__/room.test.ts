import { builtInsOf, findBuiltInSeat, findCupboard, findRoomItem, HOME_AREAS, MAX_ROOMS, MAX_THINGS_PER_ROOM, ROOM_SPAN, roomPrice, STARTING_ROOMS } from '@/constants/room';
import type { Profile, Room } from '@/types';
import { makeProfile } from '@/test/fixtures';
import {
  addExtraRooms,
  areaAt,
  BUDDY_KEY,
  buddiesHome,
  buildRoom,
  buyRoomItem,
  canRemoveRoom,
  clampSpot,
  defaultRoomName,
  moveInRoom,
  moveRoom,
  moveRoomTo,
  nextRoomPrice,
  ownsArea,
  removeRoom,
  renameRoom,
  roomName,
  setBuddyHome,
  setPaint,
  setPlaced,
  STRIP_AREAS,
  stripToHouse,
  upgradeRoom,
  widenHome,
} from '@/utils/room';

const OCTOBER = 9;
const MARCH = 2;
const at = (p: Profile, x: number) => areaAt(x, p.house.length);
/** Which area of the old ten-room strip a share falls in. */
const stripAt = (x: number) => Math.min(STRIP_AREAS - 1, Math.floor(x * STRIP_AREAS));

describe('buddy home', () => {
  it('buys a thing, places it in the room in view and spends coins', () => {
    const r = buyRoomItem(makeProfile({ coins: 50 }), 'bed', 'k1', 2, MARCH);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.coins).toBe(10);
    expect(r.profile.room.things).toEqual([expect.objectContaining({ key: 'k1', itemId: 'bed', placed: true })]);
    expect(at(r.profile, r.profile.room.things[0].x)).toBe(2);
  });

  it('refuses unknown things, short coins and a full home', () => {
    expect(buyRoomItem(makeProfile({ coins: 50 }), 'nope', 'k')).toEqual({ ok: false, reason: 'unknown' });
    expect(buyRoomItem(makeProfile({ coins: 5 }), 'bed', 'k')).toEqual({ ok: false, reason: 'coins' });
    const p = makeProfile({ coins: 999 });
    const things = Array.from({ length: MAX_THINGS_PER_ROOM * p.house.length }, (_, i) => ({
      key: `k${i}`,
      itemId: 'ball',
      x: 0.5,
      y: 0.9,
      placed: true,
    }));
    expect(buyRoomItem({ ...p, room: { ...p.room, things } }, 'ball', 'x')).toEqual({ ok: false, reason: 'full' });
    // One more room makes room for more things.
    const built = buildRoom({ ...p, room: { ...p.room, things } }, 'bedroom');
    if (!built.ok) throw new Error('build failed');
    expect(buyRoomItem(built.profile, 'ball', 'x').ok).toBe(true);
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
    const moved = moveInRoom(bought.profile, 'k1', { x: 20, y: -1 });
    expect(moved.room.things[0].x).toBeCloseTo(STARTING_ROOMS.length - 0.05);
    expect(moved.room.things[0].y).toBe(0.2);
    expect(moveInRoom(moved, `${BUDDY_KEY}puppy`, { x: 3.3, y: 0.7 }).room.buddies.puppy).toEqual({ x: 3.3, y: 0.7 });
    expect(clampSpot({ x: 0.5, y: 0.5 }, 5)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('puts things away and takes them out again into the room in view', () => {
    const bought = buyRoomItem(makeProfile({ coins: 50 }), 'ball', 'k1', 0, MARCH);
    if (!bought.ok) throw new Error('buy failed');
    const away = setPlaced(bought.profile, 'k1', false);
    expect(away.room.things[0].placed).toBe(false);
    const back = setPlaced(away, 'k1', true, 1).room.things[0];
    expect(back.placed).toBe(true);
    expect(at(away, back.x)).toBe(1);
  });

  it('paints each room on its own', () => {
    const p = makeProfile();
    const kitchen = setPaint(p, 'wall', 3, 1).room.paint;
    expect(kitchen[1].wall).toBe(3);
    expect(kitchen[0].wall).toBe(0);
    expect(setPaint(p, 'floor', 99, 2).room.paint[2].floor).toBe(7);
    expect(setPaint(p, 'floor', 1, 9)).toBe(p);
  });

  it('has several buddies home, always including the one in use', () => {
    const p = makeProfile({ equipped: { ...makeProfile().equipped, companion: 'puppy' } });
    expect(buddiesHome(p).map((b) => b.id)).toEqual(['puppy']);
    const two = setBuddyHome(p, 'kitty', true, 1);
    expect(buddiesHome(two).map((b) => b.id).sort()).toEqual(['kitty', 'puppy']);
    expect(at(two, two.room.buddies.kitty.x)).toBe(1);
    expect(buddiesHome(setBuddyHome(two, 'kitty', false)).map((b) => b.id)).toEqual(['puppy']);
    // The buddy in use can't be sent away.
    expect(setBuddyHome(two, 'puppy', false)).toBe(two);
  });
});

describe('older homes', () => {
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
    expect(home.paint).toHaveLength(STRIP_AREAS);
    expect(home.paint[2]).toEqual({ wall: 3, floor: 3 });
    expect(home.paint[3]).toEqual(HOME_AREAS[3].paint);
    // The middle of the old kitchen is half a screen into the new one.
    expect(stripAt(home.buddies.puppy.x)).toBe(1);
    expect(home.buddies.puppy.x).toBeCloseTo((1 + 0.5 / ROOM_SPAN) / STRIP_AREAS);
    expect(home.buddies.puppy.on).toBe('couch');
    expect(stripAt(home.things[0].x)).toBe(2);
    // Things on cupboard shelves keep their spot along the shelf.
    expect(home.things[1]).toEqual(old.things[1]);
  });

  it('kept things where they were when the for-sale rooms were added', () => {
    const old: Room = { paint: HOME_AREAS.slice(0, 5).map((a) => ({ ...a.paint })), buddies: {}, things: [{ key: 'a', itemId: 'bed', x: 0.5, y: 0.9, placed: true }] };
    const home = addExtraRooms(old);
    expect(home.paint).toHaveLength(STRIP_AREAS);
    expect(home.things[0].x).toBeCloseTo((0.5 * 5) / STRIP_AREAS);
    expect(stripAt(home.things[0].x)).toBe(2);
  });

  it('turns the ten-room strip into a list of the rooms that were there, nothing moving in its room', () => {
    // Order: garage moved to the front, then the usual order. Bought: garage and study.
    const order = ['garage', 'living', 'kitchen', 'bedroom', 'bathroom', 'playroom', 'backyard', 'study', 'bedroom2', 'bedroom3'];
    const share = (slot: number, inRoom: number) => (slot + inRoom) / STRIP_AREAS;
    const paint = order.map((_, i) => ({ wall: i % 8, floor: 0 }));
    const old: Room = {
      paint,
      buddies: { puppy: { x: share(7, 0.25), y: 0.8 }, lost: { x: share(6, 0.5), y: 0.9 } },
      things: [
        { key: 'car', itemId: 'bed', x: share(0, 0.6), y: 0.9, placed: true },
        { key: 'desk', itemId: 'bed', x: share(7, 0.9), y: 0.9, placed: true },
        { key: 'kept', itemId: 'milk', x: 0.4, y: 0, placed: true, in: 'fridge' },
      ],
    };
    const { house, room } = stripToHouse({ room: old, homeRooms: ['garage', 'study'], homeOrder: order });
    expect(house.map((r) => r.id)).toEqual(['garage', 'living', 'kitchen', 'bedroom', 'bathroom', 'playroom', 'study']);
    expect(house.every((r) => r.id === r.look)).toBe(true);
    expect(room.paint).toEqual([0, 1, 2, 3, 4, 5, 7].map((i) => paint[i]));
    expect(room.things[0].x).toBeCloseTo(0.6);
    expect(room.things[1].x).toBeCloseTo(6.9);
    expect(room.things[2]).toEqual(old.things[2]);
    expect(room.buddies.puppy.x).toBeCloseTo(6.25);
    // Someone left in a room for sale comes to the first room.
    expect(room.buddies.lost.x).toBeCloseTo(0.5);
  });

  it('starts a strip with no order or rooms bought as the five starting rooms', () => {
    const p = makeProfile();
    const { house } = stripToHouse({ room: addExtraRooms(widenHome(p.room, 5)) });
    expect(house.map((r) => r.id)).toEqual(STARTING_ROOMS);
  });
});

describe('building rooms', () => {
  it('builds a room on the end for coins, each one costing a bit more, and moves nothing', () => {
    const start = makeProfile({ coins: 1000 });
    const bought = buyRoomItem(start, 'bed', 'k1', 4, MARCH);
    if (!bought.ok) throw new Error('buy failed');
    const r = buildRoom(bought.profile, 'bedroom');
    if (!r.ok) throw new Error('build failed');
    expect(r.profile.coins).toBe(bought.profile.coins - roomPrice(0));
    expect(r.profile.house).toHaveLength(6);
    expect(r.room).toEqual({ id: 'r1', look: 'bedroom2', name: 'Bedroom 2' });
    expect(r.profile.room.things[0].x).toBe(bought.profile.room.things[0].x);
    expect(r.profile.room.paint).toHaveLength(6);
    expect(nextRoomPrice(r.profile)).toBe(roomPrice(1));
    const again = buildRoom(r.profile, 'bedroom');
    if (!again.ok) throw new Error('build failed');
    expect(again.room).toEqual({ id: 'r2', look: 'bedroom3', name: 'Bedroom 3' });
    expect(defaultRoomName(again.profile.house, 'bedroom')).toBe('Bedroom 4');
  });

  it('prices rooms from 80 up by 20, never past 300', () => {
    expect([0, 1, 2, 10, 50].map(roomPrice)).toEqual([80, 100, 120, 280, 300]);
  });

  it('allows one backyard, which keeps its own id', () => {
    const r = buildRoom(makeProfile({ coins: 500 }), 'backyard', 'Garden');
    if (!r.ok) throw new Error('build failed');
    expect(r.room).toEqual({ id: 'backyard', look: 'backyard', name: 'Garden' });
    expect(buildRoom(r.profile, 'backyard')).toEqual({ ok: false, reason: 'once' });
  });

  it('refuses short coins, unknown kinds and a house that is as big as it gets', () => {
    expect(buildRoom(makeProfile({ coins: 10 }), 'study')).toEqual({ ok: false, reason: 'coins' });
    expect(buildRoom(makeProfile({ coins: 999 }), 'castle' as never)).toEqual({ ok: false, reason: 'unknown' });
    const big = makeProfile({ coins: 99999, house: Array.from({ length: MAX_ROOMS }, (_, i) => ({ id: `r${i}`, look: 'study' as const })) });
    expect(buildRoom(big, 'study')).toEqual({ ok: false, reason: 'full' });
  });

  it('gives built rooms their own built-ins', () => {
    const r = buildRoom(makeProfile({ coins: 500 }), 'kitchen');
    if (!r.ok) throw new Error('build failed');
    const built = builtInsOf(r.profile.house);
    const fridges = built.cupboards.filter((c) => c.kind === 'fridge');
    expect(fridges.map((c) => c.id)).toEqual(['fridge', 'r1~fridge']);
    expect(fridges[1].area).toBe('r1');
    expect(findCupboard('r1~fridge')).toEqual(fridges[1]);
    const bath = buildRoom(r.profile, 'bathroom');
    if (!bath.ok) throw new Error('build failed');
    expect(findBuiltInSeat('r2~inTub')).toEqual(expect.objectContaining({ area: 'r2', appliance: 'r2~tub' }));
    expect(builtInsOf(bath.profile.house).seats.find((s) => s.id === 'r2~inTub')?.appliance).toBe('r2~tub');
  });

  it('names a room, and a blank name keeps the old one', () => {
    const p = makeProfile();
    const named = renameRoom(p, 2, '  Big   sister room  ');
    expect(roomName(named.house[2])).toBe('Big sister room');
    expect(roomName(renameRoom(named, 2, '   ').house[2])).toBe('Big sister room');
    expect(renameRoom(named, 2, 'Bedroom').house[2]).toEqual({ id: 'bedroom', look: 'bedroom' });
  });
});

describe('moving and taking away rooms', () => {
  const withThings = () => {
    const base = makeProfile();
    const painted = setPaint(base, 'wall', 4, 1);
    return {
      ...painted,
      room: {
        ...painted.room,
        buddies: { b1: { x: 1.5, y: 0.8 } },
        things: [
          { key: 't0', itemId: 'bed', placed: true, x: 0.5, y: 0.8 },
          { key: 't1', itemId: 'bed', placed: true, x: 1.25, y: 0.8 },
          { key: 't3', itemId: 'bed', placed: true, x: 3.5, y: 0.8 },
        ],
      },
    };
  };

  it('swaps a room with its neighbor, carrying paint, things and buddies', () => {
    const profile = withThings();
    const moved = moveRoom(profile, 1, -1);
    expect(moved.house.slice(0, 2).map((r) => r.id)).toEqual(['kitchen', 'living']);
    expect(moved.room.paint[0].wall).toBe(4);
    const x = (k: string) => moved.room.things.find((t) => t.key === k)!.x;
    expect(x('t0')).toBeCloseTo(1.5);
    expect(x('t1')).toBeCloseTo(0.25);
    expect(x('t3')).toBeCloseTo(3.5);
    expect(moved.room.buddies.b1.x).toBeCloseTo(0.5);
    // Moving it back puts everything where it was.
    const back = moveRoom(moved, 0, 1);
    expect(back.house).toEqual(profile.house);
    expect(back.room.things.map((t) => t.x)).toEqual(profile.room.things.map((t) => t.x).map((v) => expect.closeTo(v, 6)));
    expect(back.room.paint).toEqual(profile.room.paint);
  });

  it('moves a room further along, the rooms between shifting over', () => {
    const profile = withThings();
    const moved = moveRoomTo(profile, 0, 3);
    expect(moved.house.map((r) => r.id)).toEqual(['kitchen', 'bedroom', 'bathroom', 'living', 'playroom']);
    const x = (k: string) => moved.room.things.find((t) => t.key === k)!.x;
    expect(x('t0')).toBeCloseTo(3.5);
    expect(x('t1')).toBeCloseTo(0.25);
    expect(x('t3')).toBeCloseTo(2.5);
  });

  it('does nothing at either end and keeps things in cupboards put', () => {
    const profile = makeProfile();
    expect(moveRoom(profile, 0, -1)).toBe(profile);
    expect(moveRoom(profile, profile.house.length - 1, 1)).toBe(profile);
    const withIn = { ...profile, room: { ...profile.room, things: [{ key: 'c', itemId: 'bed', placed: true, x: 0.3, y: 0.5, in: 'fridge' }] } };
    expect(moveRoom(withIn, 0, 1).room.things[0].x).toBe(0.3);
  });

  it('takes a built room away: its things go to the toy box, its buddies to the first room, later rooms shift over', () => {
    let p = makeProfile({ coins: 1000 });
    for (const kind of ['kitchen', 'study'] as const) {
      const r = buildRoom(p, kind);
      if (!r.ok) throw new Error('build failed');
      p = r.profile;
    }
    expect(canRemoveRoom(p, 0)).toBe(false);
    expect(canRemoveRoom(p, 5)).toBe(true);
    expect(ownsArea(p, 6)).toBe(true);
    p = {
      ...p,
      room: {
        ...p.room,
        buddies: { kitty: { x: 5.5, y: 0.9 } },
        things: [
          { key: 'gone', itemId: 'bed', placed: true, x: 5.2, y: 0.9 },
          { key: 'shelf', itemId: 'milk', placed: true, x: 0.5, y: 0, in: 'r1~fridge' },
          { key: 'paw', itemId: 'ball', placed: true, x: 5.5, y: 0.8, on: BUDDY_KEY + 'kitty' },
          { key: 'study', itemId: 'bed', placed: true, x: 6.7, y: 0.9 },
          { key: 'home', itemId: 'bed', placed: true, x: 1.1, y: 0.9 },
        ],
      },
    };
    const after = removeRoom(p, 5);
    expect(after.house.map((r) => r.id)).toEqual([...STARTING_ROOMS, 'r2']);
    expect(after.room.paint).toHaveLength(6);
    expect(after.coins).toBe(p.coins);
    const t = (k: string) => after.room.things.find((x) => x.key === k)!;
    expect(t('gone').placed).toBe(false);
    expect(t('shelf').placed).toBe(false);
    expect(t('study').x).toBeCloseTo(5.7);
    expect(t('home').x).toBe(1.1);
    expect(at(after, after.room.buddies.kitty.x)).toBe(0);
    expect(t('paw')).toEqual(expect.objectContaining({ placed: true, on: BUDDY_KEY + 'kitty', x: after.room.buddies.kitty.x }));
    // The starting rooms stay.
    expect(removeRoom(after, 1)).toBe(after);
  });
});
