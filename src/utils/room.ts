import { findRoomItem, FLOOR_COLORS, MAX_ROOM_THINGS, WALL_COLORS } from '@/constants/room';
import type { Profile, Room, RoomSpot } from '@/types';

/** Where the floor starts, as a share of the room's height. */
export const FLOOR_LINE = 0.66;

export function emptyRoom(): Room {
  return { wall: 0, floor: 0, buddy: { x: 0.5, y: 0.9 }, things: [] };
}

export type RoomBuyResult =
  | { ok: true; profile: Profile }
  | { ok: false; reason: 'unknown' | 'coins' | 'full' };

/** Keeps a spot inside the room, with feet no higher than the wall allows. */
export function clampSpot(spot: RoomSpot): RoomSpot {
  return {
    x: Math.min(0.95, Math.max(0.05, spot.x)),
    y: Math.min(0.98, Math.max(0.2, spot.y)),
  };
}

function withRoom(profile: Profile, room: Partial<Room>): Profile {
  return { ...profile, room: { ...profile.room, ...room } };
}

/** Buys a thing and sets it down in the middle of the floor. */
export function buyRoomItem(profile: Profile, itemId: string, key: string): RoomBuyResult {
  const item = findRoomItem(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (profile.room.things.length >= MAX_ROOM_THINGS) return { ok: false, reason: 'full' };
  if (profile.coins < item.price) return { ok: false, reason: 'coins' };
  // Spread new things out a little so they don't stack exactly.
  const x = 0.3 + ((profile.room.things.length * 0.17) % 0.4);
  return {
    ok: true,
    profile: {
      ...withRoom(profile, {
        things: [...profile.room.things, { key, itemId, x, y: 0.88, placed: true }],
      }),
      coins: profile.coins - item.price,
    },
  };
}

/** Moves a thing, or the buddy when `key` is "buddy". */
export function moveInRoom(profile: Profile, key: string, spot: RoomSpot): Profile {
  const to = clampSpot(spot);
  if (key === 'buddy') return withRoom(profile, { buddy: to });
  return withRoom(profile, {
    things: profile.room.things.map((t) => (t.key === key ? { ...t, ...to } : t)),
  });
}

/** Puts a thing in the toy box, or takes it back out into the room. */
export function setPlaced(profile: Profile, key: string, placed: boolean): Profile {
  return withRoom(profile, {
    things: profile.room.things.map((t) =>
      t.key === key ? { ...t, placed, ...(placed ? { x: 0.5, y: 0.88 } : {}) } : t,
    ),
  });
}

/** Steps the wall or floor to the next free paint color. */
export function nextPaint(profile: Profile, part: 'wall' | 'floor'): Profile {
  const count = part === 'wall' ? WALL_COLORS.length : FLOOR_COLORS.length;
  return withRoom(profile, { [part]: (profile.room[part] + 1) % count });
}
