import { findRoomItem, FLOOR_COLORS, HOME_AREAS, inSeason, MAX_ROOM_THINGS, ROOM_SPAN, WALL_COLORS } from '@/constants/room';
import type { AreaPaint, BuddySpot, Profile, Room, RoomSpot, RoomThing } from '@/types';

/** Where the floor starts, as a share of the room's height. */
export const FLOOR_LINE = 0.66;

export const AREA_COUNT = HOME_AREAS.length;

/** Pieces in the room are keyed by thing key, or by this plus the buddy's item id. */
export const BUDDY_KEY = 'buddy:';

/** A thing resting on a built-in ledge has `on` set to this plus the ledge's id. */
export const FIXTURE_KEY = 'fixture:';

export function emptyRoom(): Room {
  return { paint: HOME_AREAS.map((a) => ({ ...a.paint })), buddies: {}, things: [] };
}

/** An area's paint, or what it starts with. */
export function paintOf(room: Room, area: number): AreaPaint {
  return room.paint[area] ?? HOME_AREAS[area]?.paint ?? { wall: 0, floor: 0 };
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

/** Versions 8 to 10 had three areas, each one screen wide. */
const OLD_AREAS = 3;

/**
 * Turns a one-room layout into the three-area home of version 8: it becomes the living
 * room (the first area), keeping its paint, its things and where the buddy stood.
 */
export function upgradeRoom(room: Room | OneRoom | undefined, buddyId: string | null): Room {
  if (!room) return emptyRoom();
  if ('paint' in room) return room;
  const toHome = (x: number) => x / OLD_AREAS;
  const home: Room = { paint: [0, 1, 2].map(() => ({ wall: 0, floor: 0 })), buddies: {}, things: [] };
  home.paint[0] = { wall: room.wall ?? 0, floor: room.floor ?? 0 };
  if (buddyId && room.buddy) home.buddies[buddyId] = { x: toHome(room.buddy.x), y: room.buddy.y };
  home.things = (room.things ?? []).map((t) => ({ ...t, x: toHome(t.x) }));
  return home;
}

/**
 * Version 11 made each area ROOM_SPAN screens wide and added more areas. Everything keeps
 * its spot in the first screen of its area, next to the built-ins it was by.
 */
export function widenHome(room: Room): Room {
  const widen = (x: number) => {
    const area = Math.min(OLD_AREAS - 1, Math.max(0, Math.floor(x * OLD_AREAS)));
    return (area + (x * OLD_AREAS - area) / ROOM_SPAN) / AREA_COUNT;
  };
  const buddies: Room['buddies'] = {};
  for (const [id, spot] of Object.entries(room.buddies)) buddies[id] = { ...spot, x: widen(spot.x) };
  return {
    paint: HOME_AREAS.map((a, i) => room.paint[i] ?? { ...a.paint }),
    buddies,
    things: room.things.map((t) => (t.in ? t : { ...t, x: widen(t.x) })),
  };
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

/**
 * A spot on the floor, nudged by `n` so new things don't stack exactly: by `at` (a share
 * of the home's width, like the middle of the screen) or else the middle of the area.
 */
function floorSpot(area: number, n: number, at?: number): RoomSpot {
  const nudge = (((n * 0.17) % 0.4) - 0.2) / AREA_COUNT / ROOM_SPAN;
  return { x: (at ?? areaCenter(area)) + nudge, y: 0.88 };
}

/** Buys a thing and sets it down on the floor of the area in view. */
export function buyRoomItem(
  profile: Profile,
  itemId: string,
  key: string,
  area = 0,
  month = new Date().getMonth(),
  at?: number,
): RoomBuyResult {
  const item = findRoomItem(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (!inSeason(item, month)) return { ok: false, reason: 'season' };
  if (profile.room.things.length >= MAX_ROOM_THINGS) return { ok: false, reason: 'full' };
  if (profile.coins < item.price) return { ok: false, reason: 'coins' };
  const spot = floorSpot(area, profile.room.things.length, at);
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

/** Where a dropped thing or buddy ends up. */
export interface Placement extends RoomSpot {
  /** What it rests on, as in RoomThing.on (buddies only sit on seats). */
  on?: string;
  /** Cupboard and shelf, for a thing kept inside one. */
  in?: string;
  shelf?: number;
}

/** A thing with nothing under it and in no cupboard. */
function loose(t: RoomThing, spot: RoomSpot): RoomThing {
  return { key: t.key, itemId: t.itemId, placed: t.placed, x: spot.x, y: spot.y };
}

/** Moves whatever rests on `key` (and what rests on those) by the same amount. */
function shiftRiders(room: Room, key: string, dx: number, dy: number, depth = 0): Room {
  if ((dx === 0 && dy === 0) || depth > 4) return room;
  let next = room;
  for (const t of room.things) {
    if (t.on !== key) continue;
    next = { ...next, things: next.things.map((o) => (o.key === t.key ? { ...o, x: o.x + dx, y: o.y + dy } : o)) };
    next = shiftRiders(next, t.key, dx, dy, depth + 1);
  }
  for (const [id, spot] of Object.entries(room.buddies)) {
    if (spot.on !== key) continue;
    next = { ...next, buddies: { ...next.buddies, [id]: { ...spot, x: spot.x + dx, y: spot.y + dy } } };
    next = shiftRiders(next, BUDDY_KEY + id, dx, dy, depth + 1);
  }
  return next;
}

/** What rests on `key` falls off onto the floor below `spot`. */
function dropRiders(room: Room, key: string, spot: RoomSpot): Room {
  const buddies = { ...room.buddies };
  for (const [id, b] of Object.entries(room.buddies)) {
    if (b.on === key) buddies[id] = { x: b.x, y: spot.y };
  }
  return {
    ...room,
    buddies,
    things: room.things.map((t) => (t.on === key ? loose(t, { x: t.x, y: spot.y }) : t)),
  };
}

function buddySpot(profile: Profile, id: string): BuddySpot | undefined {
  return buddiesHome(profile).find((b) => b.id === id)?.spot;
}

/**
 * Sets a thing down: loose, on a table, seat or ledge, held by a buddy, or in a cupboard.
 * What rests on it rides along, and a buddy that already held something lets it go.
 */
export function placeThing(profile: Profile, key: string, place: Placement): Profile {
  const thing = profile.room.things.find((t) => t.key === key);
  if (!thing) return profile;
  let room = profile.room;
  if (place.in) {
    // In a cupboard, x is how far along the shelf it sits (0 to 1).
    const along = { x: Math.min(1, Math.max(0, place.x)), y: thing.y };
    const kept: RoomThing = { ...loose(thing, along), in: place.in, shelf: place.shelf ?? 0 };
    return withRoom(profile, { things: room.things.map((t) => (t.key === key ? kept : t)) });
  }
  const spot = clampSpot(place);
  if (place.on?.startsWith(BUDDY_KEY)) {
    const holder = buddySpot(profile, place.on.slice(BUDDY_KEY.length));
    room = {
      ...room,
      things: room.things.map((t) => (t.on === place.on && t.key !== key ? loose(t, holder ?? t) : t)),
    };
  }
  const moved: RoomThing = { ...loose(thing, spot), ...(place.on ? { on: place.on } : {}) };
  room = { ...room, things: room.things.map((t) => (t.key === key ? moved : t)) };
  // Something coming out of a cupboard carries nothing; otherwise its riders follow.
  if (!thing.in) room = shiftRiders(room, key, spot.x - thing.x, spot.y - thing.y);
  return withRoom(profile, room);
}

/** Sets a buddy down, standing or on a seat. What it holds comes along. */
export function placeBuddy(profile: Profile, buddyId: string, place: Placement): Profile {
  const before = buddySpot(profile, buddyId);
  const spot = clampSpot(place);
  const next: BuddySpot = place.on ? { ...spot, on: place.on } : spot;
  let room: Room = { ...profile.room, buddies: { ...profile.room.buddies, [buddyId]: next } };
  if (before) room = shiftRiders(room, BUDDY_KEY + buddyId, spot.x - before.x, spot.y - before.y);
  return withRoom(profile, room);
}

/** Moves a thing, or a buddy when `key` is BUDDY_KEY plus its id. */
export function moveInRoom(profile: Profile, key: string, place: Placement): Profile {
  if (key.startsWith(BUDDY_KEY)) return placeBuddy(profile, key.slice(BUDDY_KEY.length), place);
  return placeThing(profile, key, place);
}

/** Puts a thing in the toy box, or takes it back out into the area in view. */
export function setPlaced(profile: Profile, key: string, placed: boolean, area = 0, at?: number): Profile {
  const thing = profile.room.things.find((t) => t.key === key);
  if (!thing) return profile;
  const room = placed ? profile.room : dropRiders(profile.room, key, thing);
  const spot = placed ? floorSpot(area, 1, at) : thing;
  return withRoom(profile, {
    ...room,
    things: room.things.map((t) => (t.key === key ? { ...loose(t, spot), placed } : t)),
  });
}

/** Paints an area's wall or floor one of the free colors. */
export function setPaint(profile: Profile, part: 'wall' | 'floor', color: number, area = 0): Profile {
  const count = part === 'wall' ? WALL_COLORS.length : FLOOR_COLORS.length;
  const paint: AreaPaint[] = HOME_AREAS.map((_, i) => paintOf(profile.room, i));
  paint[area] = { ...paint[area], [part]: Math.min(count - 1, Math.max(0, color)) };
  return withRoom(profile, { paint });
}

/** Buddies in the home and where they stand. The buddy in use is always there. */
export function buddiesHome(profile: Profile): { id: string; spot: BuddySpot }[] {
  const home = Object.entries(profile.room.buddies).map(([id, spot]) => ({ id, spot }));
  const using = profile.equipped.companion;
  if (using && !profile.room.buddies[using]) home.push({ id: using, spot: floorSpot(0, 0) });
  return home;
}

/** Invites a buddy over (standing in the area in view) or sends it off for a nap. */
export function setBuddyHome(profile: Profile, buddyId: string, home: boolean, area = 0, at?: number): Profile {
  const { [buddyId]: spot, ...others } = profile.room.buddies;
  if (!home) {
    if (buddyId === profile.equipped.companion || !spot) return profile;
    return withRoom(profile, { ...dropRiders(profile.room, BUDDY_KEY + buddyId, spot), buddies: others });
  }
  if (spot) return profile;
  const n = Object.keys(profile.room.buddies).length + 2;
  return withRoom(profile, { buddies: { ...profile.room.buddies, [buddyId]: { ...floorSpot(area, n, at), y: 0.92 } } });
}
