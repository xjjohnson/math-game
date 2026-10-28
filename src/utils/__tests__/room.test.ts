import { MAX_ROOM_THINGS } from '@/constants/room';
import { makeProfile } from '@/test/fixtures';
import { buyRoomItem, clampSpot, moveInRoom, nextPaint, setPlaced } from '@/utils/room';

describe('buddy room', () => {
  it('buys a thing, places it on the floor and spends coins', () => {
    const r = buyRoomItem(makeProfile({ coins: 50 }), 'bed', 'k1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.coins).toBe(10);
    expect(r.profile.room.things).toEqual([expect.objectContaining({ key: 'k1', itemId: 'bed', placed: true })]);
  });

  it('refuses unknown things, short coins and a full room', () => {
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

  it('moves things and the buddy, kept inside the room', () => {
    const bought = buyRoomItem(makeProfile({ coins: 50 }), 'ball', 'k1');
    if (!bought.ok) throw new Error('buy failed');
    const moved = moveInRoom(bought.profile, 'k1', { x: 2, y: -1 });
    expect(moved.room.things[0]).toMatchObject({ x: 0.95, y: 0.2 });
    expect(moveInRoom(moved, 'buddy', { x: 0.3, y: 0.7 }).room.buddy).toEqual({ x: 0.3, y: 0.7 });
    expect(clampSpot({ x: 0.5, y: 0.5 })).toEqual({ x: 0.5, y: 0.5 });
  });

  it('puts things away and takes them out again', () => {
    const bought = buyRoomItem(makeProfile({ coins: 50 }), 'ball', 'k1');
    if (!bought.ok) throw new Error('buy failed');
    const away = setPlaced(bought.profile, 'k1', false);
    expect(away.room.things[0].placed).toBe(false);
    expect(setPlaced(away, 'k1', true).room.things[0].placed).toBe(true);
  });

  it('cycles paint colors', () => {
    const p = makeProfile();
    expect(nextPaint(p, 'wall').room.wall).toBe(1);
    expect(nextPaint(p, 'floor').room.floor).toBe(1);
  });
});
