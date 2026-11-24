import {
  findArea,
  findCupboard,
  findRoomItem,
  FLOOR_COLORS,
  type AreaId,
  HOME_AREAS,
  inSeason,
  kindOf,
  MAX_ROOMS,
  MAX_THINGS_PER_ROOM,
  PICTURE_ITEM,
  PICTURE_KEY,
  ROOM_KINDS,
  ROOM_NAME_MAX,
  ROOM_SPAN,
  roomPrice,
  STARTING_ROOMS,
  type RoomKind,
  WALL_COLORS,
} from '@/constants/room';
import type { AreaPaint, BuddySpot, HouseRoom, Profile, Room, RoomSpot, RoomThing } from '@/types';

/** Where the floor starts, as a share of the room's height. */
export const FLOOR_LINE = 0.66;

/** Pieces in the room are keyed by thing key, or by this plus the buddy's item id. */
export const BUDDY_KEY = 'buddy:';

/** A thing resting on a built-in ledge has `on` set to this plus the ledge's id. */
export const FIXTURE_KEY = 'fixture:';

/** The rooms a new home has. */
export function startingHouse(): HouseRoom[] {
  return STARTING_ROOMS.map((id) => ({ id, look: id }));
}

export function emptyRoom(): Room {
  return { paint: STARTING_ROOMS.map((id) => ({ ...(findArea(id)?.paint ?? { wall: 0, floor: 0 }) })), buddies: {}, things: [] };
}

/** A room's paint (`area` is its place in the home), or what its look starts with. */
export function paintOf(room: Room, area: number, look?: AreaId): AreaPaint {
  return room.paint[area] ?? (look ? findArea(look)?.paint : undefined) ?? HOME_AREAS[area]?.paint ?? { wall: 0, floor: 0 };
}

/** The name a room shows: the one the player gave it, or its look's. */
export function roomName(room: HouseRoom): string {
  return room.name ?? findArea(room.look)?.name ?? 'Room';
}

export function roomEmoji(room: HouseRoom): string {
  return findArea(room.look)?.emoji ?? kindOf(room.look).emoji;
}

/** The middle of a room, in rooms across the home. */
export function areaCenter(area: number): number {
  return area + 0.5;
}

/** Which room a spot across the home falls in, for a home of `count` rooms. */
export function areaAt(x: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor(x)));
}

/** Things this home can hold: so many for each room. */
export function thingLimit(profile: Profile): number {
  return MAX_THINGS_PER_ROOM * profile.house.length;
}

// --- Older homes, for the profile migrations ---

/** The one-room layout before version 8, which had a single buddy spot. */
interface OneRoom {
  wall: number;
  floor: number;
  buddy: RoomSpot;
  things: Room['things'];
}

/** Versions 8 to 10 had three areas, each one screen wide. */
const OLD_AREAS = 3;

/** Versions 13 to 16 had a strip of ten areas (five of them for sale), and spots were shares of the whole strip. */
export const STRIP_AREAS = 10;

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
export function widenHome(room: Room, areas = STRIP_AREAS): Room {
  const widen = (x: number) => {
    const area = Math.min(OLD_AREAS - 1, Math.max(0, Math.floor(x * OLD_AREAS)));
    return (area + (x * OLD_AREAS - area) / ROOM_SPAN) / areas;
  };
  const buddies: Room['buddies'] = {};
  for (const [id, spot] of Object.entries(room.buddies)) buddies[id] = { ...spot, x: widen(spot.x) };
  return {
    paint: HOME_AREAS.slice(0, areas).map((a, i) => room.paint[i] ?? { ...a.paint }),
    buddies,
    things: room.things.map((t) => (t.in ? t : { ...t, x: widen(t.x) })),
  };
}

/** Areas the home had from version 11 until the extra rooms came in version 12. */
export const AREAS_BEFORE_EXTRA_ROOMS = 5;

/**
 * Version 12 added areas on the end. Positions are a share of the home's width, so they
 * shrink to keep everything where it was, and the new areas get their starting paint.
 */
export function addExtraRooms(room: Room, from = AREAS_BEFORE_EXTRA_ROOMS): Room {
  const scale = (x: number) => (x * from) / STRIP_AREAS;
  const buddies: Room['buddies'] = {};
  for (const [id, spot] of Object.entries(room.buddies)) buddies[id] = { ...spot, x: scale(spot.x) };
  return {
    paint: HOME_AREAS.slice(0, STRIP_AREAS).map((a, i) => room.paint[i] ?? { ...a.paint }),
    buddies,
    things: room.things.map((t) => (t.in ? t : { ...t, x: scale(t.x) })),
  };
}

/** The strip's areas left to right in a version 13 to 16 order list. */
function stripOrder(order?: string[]): AreaId[] {
  const strip = HOME_AREAS.slice(0, STRIP_AREAS).map((a) => a.id);
  const list: AreaId[] = [];
  for (const id of order ?? []) {
    const a = strip.find((h) => h === id);
    if (a && !list.includes(a)) list.push(a);
  }
  for (const a of strip) if (!list.includes(a)) list.push(a);
  return list;
}

/** What a version 16 profile kept about its rooms. */
export interface StripRooms {
  room: Room;
  homeRooms?: string[];
  homeOrder?: string[];
}

/**
 * Version 17 lets a home have any number of rooms. The strip's rooms that were there (the
 * free ones and the ones bought) become the home's rooms, in the same order; rooms still for
 * sale are left out (they can be built now). Spots turn from shares of the strip into rooms
 * across the home, so everything stays exactly where it was in its room.
 */
export function stripToHouse(saved: StripRooms): { house: HouseRoom[]; room: Room } {
  const order = stripOrder(saved.homeOrder);
  const bought = new Set(saved.homeRooms ?? []);
  const kept = order.filter((id) => STARTING_ROOMS.includes(id) || bought.has(id));
  const slotOf = new Map(kept.map((id, i) => [order.indexOf(id), i]));
  const move = (x: number) => {
    const at = x * STRIP_AREAS;
    const old = Math.min(STRIP_AREAS - 1, Math.max(0, Math.floor(at)));
    const slot = slotOf.get(old);
    // Nothing could be set down in a room for sale; anything there anyway goes to the first room.
    return slot === undefined ? areaCenter(0) : slot + (at - old);
  };
  const room = saved.room;
  const buddies: Room['buddies'] = {};
  for (const [id, spot] of Object.entries(room.buddies)) buddies[id] = { ...spot, x: move(spot.x) };
  return {
    house: kept.map((id) => ({ id, look: id })),
    room: {
      paint: kept.map((id) => room.paint[order.indexOf(id)] ?? { ...(findArea(id)?.paint ?? { wall: 0, floor: 0 }) }),
      buddies,
      things: room.things.map((t) => (t.in ? t : { ...t, x: move(t.x) })),
    },
  };
}

// --- Changing the home's rooms ---

/** Moves every spot from one arrangement of rooms to another: `slotFor` gives each old room's new place, or null if it is gone. */
function reslot(room: Room, slotFor: (old: number) => number | null): Room {
  const at = (x: number): number | null => {
    const old = Math.max(0, Math.floor(x));
    const now = slotFor(old);
    return now === null ? null : now + (x - old);
  };
  const buddies: Room['buddies'] = {};
  for (const [id, spot] of Object.entries(room.buddies)) {
    const x = at(spot.x);
    buddies[id] = x === null ? { x: areaCenter(0), y: 0.92 } : { ...spot, x };
  }
  return {
    ...room,
    buddies,
    things: room.things.map((t) => {
      if (t.in) return t;
      const x = at(t.x);
      return x === null ? t : { ...t, x };
    }),
  };
}

/**
 * Moves the room in slot `from` to slot `to`; the rooms in between shift over one. Its paint
 * and everything standing or sitting in it go along, so the room moves whole. Things inside
 * cupboards go along with their cupboard.
 */
export function moveRoomTo(profile: Profile, from: number, to: number): Profile {
  const n = profile.house.length;
  if (from === to || from < 0 || from >= n || to < 0 || to >= n) return profile;
  const ids = profile.house.map((_, i) => i);
  const [picked] = ids.splice(from, 1);
  ids.splice(to, 0, picked);
  // ids[newSlot] = oldSlot
  const newSlot = new Map(ids.map((old, i) => [old, i]));
  const room = reslot(profile.room, (old) => newSlot.get(old) ?? old);
  const paint = ids.map((old) => paintOf(profile.room, old, profile.house[old].look));
  return {
    ...profile,
    house: ids.map((old) => profile.house[old]),
    room: { ...room, paint },
  };
}

/** Swaps the room in `slot` with its neighbor (-1 is left, 1 is right). */
export function moveRoom(profile: Profile, slot: number, dir: -1 | 1): Profile {
  return moveRoomTo(profile, slot, slot + dir);
}

/** Rooms the profile can use: every room in the home. */
export function ownsArea(profile: Profile, area: number): boolean {
  return area >= 0 && area < profile.house.length;
}

export type BuildRoomResult =
  | { ok: true; profile: Profile; room: HouseRoom }
  | { ok: false; reason: 'unknown' | 'once' | 'full' | 'coins' };

/** Coins the next room costs. */
export function nextRoomPrice(profile: Profile): number {
  return roomPrice(Math.max(0, profile.house.length - STARTING_ROOMS.length));
}

/** Rooms of a kind already in the home. */
export function roomsOfKind(house: HouseRoom[], kind: RoomKind): HouseRoom[] {
  return house.filter((r) => kindOf(r.look).id === kind);
}

/** The name a new room of this kind gets if the player doesn't pick one: "Bedroom 4". */
export function defaultRoomName(house: HouseRoom[], kind: RoomKind): string {
  const info = ROOM_KINDS.find((k) => k.id === kind);
  const base = info?.name ?? 'Room';
  const taken = new Set(house.map(roomName));
  let n = roomsOfKind(house, kind).length + 1;
  if (n === 1 && !taken.has(base)) return base;
  while (taken.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

/** A tidy room name: trimmed, short, never blank. */
export function cleanRoomName(name: string | undefined, fallback: string): string {
  const s = (name ?? '').replace(/\s+/g, ' ').trim().slice(0, ROOM_NAME_MAX);
  return s || fallback;
}

/** Builds a new room on the end of the home, with coins. Nothing already in the home moves. */
export function buildRoom(profile: Profile, kind: RoomKind, name?: string): BuildRoomResult {
  const info = ROOM_KINDS.find((k) => k.id === kind);
  if (!info) return { ok: false, reason: 'unknown' };
  const same = roomsOfKind(profile.house, kind);
  if (info.once && same.length) return { ok: false, reason: 'once' };
  if (profile.house.length >= MAX_ROOMS) return { ok: false, reason: 'full' };
  const price = nextRoomPrice(profile);
  if (profile.coins < price) return { ok: false, reason: 'coins' };
  // Each new room of a kind takes the next look, so bedrooms come in turns of three.
  const built = same.filter((r) => !STARTING_ROOMS.includes(r.id as AreaId)).length;
  const look = info.looks[built % info.looks.length];
  // The backyard keeps its own id, so the tree house and slide are the ones it always had.
  const used = new Set(profile.house.map((r) => r.id));
  let id: string = look;
  if (info.once ? used.has(id) : true) {
    let n = 1;
    while (used.has(`r${n}`)) n++;
    id = `r${n}`;
  }
  const room: HouseRoom = { id, look, name: cleanRoomName(name, defaultRoomName(profile.house, kind)) };
  if (room.name === findArea(look)?.name && id === look) delete room.name;
  return {
    ok: true,
    room,
    profile: {
      ...profile,
      coins: profile.coins - price,
      house: [...profile.house, room],
      room: {
        ...profile.room,
        paint: [...profile.house.map((r, i) => paintOf(profile.room, i, r.look)), { ...(findArea(look)?.paint ?? { wall: 0, floor: 0 }) }],
      },
    },
  };
}

/** Gives the room in `slot` a new name. */
export function renameRoom(profile: Profile, slot: number, name: string): Profile {
  const room = profile.house[slot];
  if (!room) return profile;
  const fallback = findArea(room.look)?.name ?? 'Room';
  const named = cleanRoomName(name, roomName(room));
  const next: HouseRoom = { ...room, name: named };
  if (named === fallback && room.id === room.look) delete next.name;
  return { ...profile, house: profile.house.map((r, i) => (i === slot ? next : r)) };
}

/** The rooms a home starts with can't be taken away. */
export function canRemoveRoom(profile: Profile, slot: number): boolean {
  const room = profile.house[slot];
  return !!room && !STARTING_ROOMS.includes(room.id as AreaId) && profile.house.length > 1;
}

/**
 * Takes a built room away. Everything in it (and in its cupboards) goes to the toy box, the
 * buddies in it go to the first room, and the rooms after it shift over. No coins come back.
 */
export function removeRoom(profile: Profile, slot: number): Profile {
  if (!canRemoveRoom(profile, slot)) return profile;
  const gone = profile.house[slot];
  const count = profile.house.length;
  const inGone = (x: number) => areaAt(x, count) === slot;
  const movedBuddies = new Set(Object.entries(profile.room.buddies).filter(([, s]) => inGone(s.x)).map(([id]) => id));
  const things = profile.room.things.map((t): RoomThing => {
    if (!t.placed) return t;
    const inCupboard = t.in ? findCupboard(t.in)?.area === gone.id : false;
    const heldByMover = t.on?.startsWith(BUDDY_KEY) && movedBuddies.has(t.on.slice(BUDDY_KEY.length));
    if (heldByMover) return t;
    if (inCupboard || (!t.in && inGone(t.x))) return { key: t.key, itemId: t.itemId, placed: false, x: 0, y: 0.88 };
    return t;
  });
  let room: Room = { ...profile.room, things };
  room = reslot(room, (old) => (old === slot ? null : old > slot ? old - 1 : old));
  // Buddies from the gone room stand in the first room, and what they held comes along.
  const buddies = { ...room.buddies };
  let n = 0;
  for (const id of movedBuddies) {
    const spot = { ...floorSpot(0, n++), y: 0.92 };
    buddies[id] = spot;
  }
  room = {
    ...room,
    buddies,
    things: room.things.map((t) =>
      t.placed && t.on?.startsWith(BUDDY_KEY) && movedBuddies.has(t.on.slice(BUDDY_KEY.length)) ? { ...t, x: buddies[t.on.slice(BUDDY_KEY.length)].x } : t,
    ),
    paint: profile.house.map((r, i) => paintOf(profile.room, i, r.look)).filter((_, i) => i !== slot),
  };
  return { ...profile, house: profile.house.filter((_, i) => i !== slot), room };
}

export type RoomBuyResult =
  | { ok: false; reason: 'unknown' | 'coins' | 'full' | 'season' }
  | { ok: true; profile: Profile };

/** Keeps a spot inside a home of `count` rooms, with feet no higher than the wall allows. */
export function clampSpot(spot: RoomSpot, count: number): RoomSpot {
  const edge = 0.05;
  return {
    x: Math.min(count - edge, Math.max(edge, spot.x)),
    y: Math.min(0.98, Math.max(0.2, spot.y)),
  };
}

function withRoom(profile: Profile, room: Partial<Room>): Profile {
  return { ...profile, room: { ...profile.room, ...room } };
}

/**
 * A spot on the floor, nudged by `n` so new things don't stack exactly: by `at` (in rooms
 * across the home, like the middle of the screen) or else the middle of the room.
 */
function floorSpot(area: number, n: number, at?: number): RoomSpot {
  const nudge = (((n * 0.17) % 0.4) - 0.2) / ROOM_SPAN;
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
  if (!ownsArea(profile, area)) {
    area = 0;
    at = undefined;
  }
  if (!item) return { ok: false, reason: 'unknown' };
  if (!inSeason(item, month)) return { ok: false, reason: 'season' };
  if (profile.room.things.length >= thingLimit(profile)) return { ok: false, reason: 'full' };
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
  const spot = clampSpot(place, profile.house.length);
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
  const spot = clampSpot(place, profile.house.length);
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
  if (!ownsArea(profile, area)) {
    area = 0;
    at = undefined;
  }
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
  if (!ownsArea(profile, area)) return profile;
  const paint: AreaPaint[] = profile.house.map((r, i) => paintOf(profile.room, i, r.look));
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
  if (!ownsArea(profile, area)) {
    area = 0;
    at = undefined;
  }
  const n = Object.keys(profile.room.buddies).length + 2;
  return withRoom(profile, { buddies: { ...profile.room.buddies, [buddyId]: { ...floorSpot(area, n, at), y: 0.92 } } });
}

/** Hangs a picture from the School easel on the wall of the first room. Does nothing if it is already up or the home is full. */
export function hangPicture(profile: Profile, pictureId: string): { ok: true; profile: Profile } | { ok: false; reason: 'already' | 'full' } {
  const key = PICTURE_KEY + pictureId;
  const there = profile.room.things.find((t) => t.key === key);
  if (there?.placed) return { ok: false, reason: 'already' };
  if (there) return { ok: true, profile: setPlaced(profile, key, true, 0) };
  if (profile.room.things.length >= thingLimit(profile)) return { ok: false, reason: 'full' };
  const spot = { x: floorSpot(0, profile.room.things.length).x, y: 0.5 };
  return { ok: true, profile: withRoom(profile, { things: [...profile.room.things, { key, itemId: PICTURE_ITEM, ...spot, placed: true }] }) };
}

/** Takes a picture down for good (it was deleted from My pictures). */
export function removePicture(profile: Profile, pictureId: string): Profile {
  const key = PICTURE_KEY + pictureId;
  if (!profile.room.things.some((t) => t.key === key)) return profile;
  const room = dropRiders(profile.room, key, { x: 0, y: 0.88 });
  return withRoom(profile, { ...room, things: room.things.filter((t) => t.key !== key) });
}
