import { findRoomItem, FLOOR_COLORS, HOME_AREAS, inSeason, MAX_ROOM_THINGS, WALL_COLORS } from '@/constants/room';
import type { AreaPaint, Profile, Room, RoomSpot } from '@/types';

/** Where the floor starts, as a share of the room's height. */
export const FLOOR_LINE = 0.66;

export const AREA_COUNT = HOME_AREAS.length;

/** Pieces in the room are keyed by thing key, or by this plus the buddy's item id. */
export const BUDDY_KEY = 'buddy:';

export function emptyRoom(): Room {
  return { paint: HOME_AREAS.map(() => ({ wall: 0, floor: 0 })), buddies: {}, things: [] };
}

/** The middle of an area, as a share of the whole home's width. */
export function areaCenter(area: number): number {
  return (area + 0.5) / AREA_COUNT;
}

/** Which area a spot across the home falls in. */
export function areaAt(x: number): number {
  return Math.min(AREA_COUNT - 1, Math.max(0, Math.floor(x * AREA_COUNT)));
}

/** The one-room layout before version 8, which had a single buddy spot. */
interface OneRoom {
  wall: number;
  floor: number;
  buddy: RoomSpot;
  things: Room['things'];
}

/**
 * Turns a one-room layout into the home: it becomes the living room (the first area),
 * keeping its paint, its things and where the buddy stood.
 */
export function upgradeRoom(room: Room | OneRoom | undefined, buddyId: string | null): Room {
  if (!room) return emptyRoom();
  if ('paint' in room) return room;
  const toHome = (x: number) => x / AREA_COUNT;
  const home = emptyRoom();
  home.paint[0] = { wall: room.wall ?? 0, floor: room.floor ?? 0 };
  if (buddyId && room.buddy) home.buddies[buddyId] = { x: toHome(room.buddy.x), y: room.buddy.y };
  home.things = (room.things ?? []).map((t) => ({ ...t, x: toHome(t.x) }));
  return home;
}

export type RoomBuyResult =
  | { ok: true; profile: Profile }
  | { ok: false; reason: 'unknown' | 'coins' | 'full' | 'season' };

/** Keeps a spot inside the home, with feet no higher than the wall allows. */
export function clampSpot(spot: RoomSpot): RoomSpot {
  const edge = 0.05 / AREA_COUNT;
  return {
    x: Math.min(1 - edge, Math.max(edge, spot.x)),
    y: Math.min(0.98, Math.max(0.2, spot.y)),
  };
}

function withRoom(profile: Profile, room: Partial<Room>): Profile {
  return { ...profile, room: { ...profile.room, ...room } };
}

/** A spot near the middle of an area's floor, nudged by `n` so new things don't stack exactly. */
function floorSpot(area: number, n: number): RoomSpot {
  return { x: areaCenter(area) + (((n * 0.17) % 0.4) - 0.2) / AREA_COUNT, y: 0.88 };
}

/** Buys a thing and sets it down on the floor of the area in view. */
export function buyRoomItem(
  profile: Profile,
  itemId: string,
  key: string,
  area = 0,
  month = new Date().getMonth(),
): RoomBuyResult {
  const item = findRoomItem(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (!inSeason(item, month)) return { ok: false, reason: 'season' };
  if (profile.room.things.length >= MAX_ROOM_THINGS) return { ok: false, reason: 'full' };
  if (profile.coins < item.price) return { ok: false, reason: 'coins' };
  const spot = floorSpot(area, profile.room.things.length);
  return {
    ok: true,
    profile: {
      ...withRoom(profile, {
        things: [...profile.room.things, { key, itemId, ...spot, placed: true }],
      }),
      coins: profile.coins - item.price,
    },
  };
}

/** Moves a thing, or a buddy when `key` is BUDDY_KEY plus its id. */
export function moveInRoom(profile: Profile, key: string, spot: RoomSpot): Profile {
  const to = clampSpot(spot);
  if (key.startsWith(BUDDY_KEY)) {
    const id = key.slice(BUDDY_KEY.length);
    return withRoom(profile, { buddies: { ...profile.room.buddies, [id]: to } });
  }
  return withRoom(profile, {
    things: profile.room.things.map((t) => (t.key === key ? { ...t, ...to } : t)),
  });
}

/** Puts a thing in the toy box, or takes it back out into the area in view. */
export function setPlaced(profile: Profile, key: string, placed: boolean, area = 0): Profile {
  return withRoom(profile, {
    things: profile.room.things.map((t) =>
      t.key === key ? { ...t, placed, ...(placed ? floorSpot(area, 1) : {}) } : t,
    ),
  });
}

/** Steps an area's wall or floor to the next free paint color. */
export function nextPaint(profile: Profile, part: 'wall' | 'floor', area = 0): Profile {
  const count = part === 'wall' ? WALL_COLORS.length : FLOOR_COLORS.length;
  const paint: AreaPaint[] = HOME_AREAS.map((_, i) => profile.room.paint[i] ?? { wall: 0, floor: 0 });
  paint[area] = { ...paint[area], [part]: (paint[area][part] + 1) % count };
  return withRoom(profile, { paint });
}

/** Buddies in the home and where they stand. The buddy in use is always there. */
export function buddiesHome(profile: Profile): { id: string; spot: RoomSpot }[] {
  const home = Object.entries(profile.room.buddies).map(([id, spot]) => ({ id, spot }));
  const using = profile.equipped.companion;
  if (using && !profile.room.buddies[using]) home.push({ id: using, spot: floorSpot(0, 0) });
  return home;
}

/** Invites a buddy over (standing in the area in view) or sends it off for a nap. */
export function setBuddyHome(profile: Profile, buddyId: string, home: boolean, area = 0): Profile {
  const { [buddyId]: spot, ...others } = profile.room.buddies;
  if (!home) {
    if (buddyId === profile.equipped.companion) return profile;
    return withRoom(profile, { buddies: others });
  }
  if (spot) return profile;
  const n = Object.keys(profile.room.buddies).length + 2;
  return withRoom(profile, { buddies: { ...profile.room.buddies, [buddyId]: { ...floorSpot(area, n), y: 0.92 } } });
}
