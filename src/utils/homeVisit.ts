import type { Dressed } from '@/components/BuddyFigure';
import type { HomeBuddy } from '@/components/BuddyRoom';
import { BODY_COLORS, DEFAULT_BODY, findWearable } from '@/constants/wardrobe';
import { itemsIn } from '@/constants/shop';
import type { AreaPaint, HouseRoom, Profile, Room, RoomThing } from '@/types';
import { buddyHearts, buddyLevel, giftForLevel } from '@/utils/buddy';
import { findArea, findCupboard, MAX_ROOMS, MAX_THINGS_PER_ROOM, ROOM_SPAN } from '@/constants/room';
import { areaAt, BUDDY_KEY, buddiesHome, stripToHouse } from '@/utils/room';
import { owns } from '@/utils/shop';
import { clothOf, lookOf, moodOf, outfitOf } from '@/utils/wardrobe';

/** A buddy's outfit as things to draw. */
export function dressedOf(profile: Profile, buddyId: string): Dressed {
  const outfit = outfitOf(profile, buddyId);
  const emoji = (id?: string) => (id ? findWearable(id)?.emoji : undefined);
  return {
    hat: emoji(outfit.hat),
    face: emoji(outfit.face),
    neck: emoji(outfit.neck),
    feet: outfit.feet,
    shirt: outfit.shirt ? findWearable(outfit.shirt)?.color : undefined,
  };
}

/** A person buddy's looks and clothes, ready to draw; undefined for animals. */
export function personOf(profile: Profile, buddyId: string): HomeBuddy['person'] {
  const look = lookOf(profile, buddyId);
  if (!look) return undefined;
  const outfit = outfitOf(profile, buddyId);
  return {
    look,
    dressed: {
      hat: outfit.hat,
      face: outfit.face,
      neck: outfit.neck,
      feet: outfit.feet,
      top: clothOf(outfit.shirt),
      legs: clothOf(outfit.legs),
    },
  };
}

/** The buddies at home, ready for the buddy home to draw. */
export function homeBuddiesOf(profile: Profile): HomeBuddy[] {
  const owned = itemsIn('companion').filter((item) => owns(profile, item));
  return buddiesHome(profile).flatMap(({ id, spot }) => {
    const item = owned.find((o) => o.id === id);
    if (!item || item.category !== 'companion') return [];
    const body = BODY_COLORS[id] ?? DEFAULT_BODY;
    return [
      {
        id,
        emoji: item.companion.emoji,
        gift: giftForLevel(buddyLevel(buddyHearts(profile, id))),
        name: item.name,
        spot,
        ...body,
        dressed: dressedOf(profile, id),
        person: personOf(profile, id),
        outfit: outfitOf(profile, id),
        mood: moodOf(profile, id),
      },
    ];
  });
}

/** Pieces that came along on a visit start with this, so they never mix up with the friend's own buddies. */
export const GUEST_PREFIX = 'guest~';
/** The visitor themselves, in a friend's home. */
export const GUEST_ME = GUEST_PREFIX + 'me';

/**
 * Who comes along to a friend's home: you, plus the buddies you picked in Bring
 * (or the buddy you use, if you never picked), drawn just as they look at home:
 * same body colors, same clothes. They stand in a row just inside the front
 * door, in the first screen of the first room, so you see yourselves arrive.
 */
export function guestsOf(profile: Profile, brought: string[], chosen: boolean): HomeBuddy[] {
  const owned = itemsIn('companion').filter((item) => owns(profile, item));
  const items = chosen
    ? brought.flatMap((v) => owned.filter((o) => o.category === 'companion' && o.companion.emoji === v).slice(0, 1))
    : owned.filter((o) => o.id === profile.equipped.companion);
  const avatarItem = owned.find((o) => o.category === 'companion' && o.companion.emoji === profile.avatar);
  const meBody = (avatarItem && BODY_COLORS[avatarItem.id]) ?? DEFAULT_BODY;
  const screen = 1 / ROOM_SPAN;
  const spot = (n: number) => ({ x: (0.28 + 0.14 * n) * screen, y: 0.92 });
  const me: HomeBuddy = { id: GUEST_ME, emoji: profile.avatar, gift: null, name: 'You', spot: spot(0), ...meBody, dressed: {} };
  const pals = items.flatMap((item, i): HomeBuddy[] => {
    if (item.category !== 'companion') return [];
    return [
      {
        id: GUEST_PREFIX + item.id,
        emoji: item.companion.emoji,
        gift: giftForLevel(buddyLevel(buddyHearts(profile, item.id))),
        name: `Your ${item.name}`,
        spot: spot(i + 1),
        ...(BODY_COLORS[item.id] ?? DEFAULT_BODY),
        dressed: dressedOf(profile, item.id),
        person: personOf(profile, item.id),
      },
    ];
  });
  return [me, ...pals];
}

/** A friend's buddy home, put together from the parts their phone sent. */
export interface HomeSnapshot {
  name: string;
  house: HouseRoom[];
  room: Room;
  buddies: HomeBuddy[];
  /** Room ids whose things haven't come yet. */
  arriving: string[];
}

/** The home itself without its things: sent first, so the friend can walk in straight away. */
export interface HomePlan {
  name: string;
  house: HouseRoom[];
  paint: AreaPaint[];
  /** Buddies at home, with where they stand. */
  buddies: HomeBuddy[];
}

/**
 * One piece of a home sent over Nearby (protocol v12): the first carries the plan, and
 * each carries the things of some rooms, so a home of any size fits.
 */
export interface HomePart {
  part: number;
  parts: number;
  plan?: HomePlan;
  /** Rooms whose things are all in this part (some may have none). */
  rooms: string[];
  things: RoomThing[];
}

/** Nearby sends at most 32 KB in one go; each part stays well under it. */
export const MAX_HOME_BYTES = 20000;

const round = (v: number) => Math.round(v * 10000) / 10000;

/** Which room a thing belongs to, for sending it with that room. */
function roomOfThing(profile: Profile, t: RoomThing): number {
  const count = profile.house.length;
  if (t.in) {
    const area = findCupboard(t.in)?.area;
    const i = profile.house.findIndex((r) => r.id === area);
    return i < 0 ? 0 : i;
  }
  if (t.on?.startsWith(BUDDY_KEY)) {
    const b = buddiesHome(profile).find((x) => BUDDY_KEY + x.id === t.on);
    if (b) return areaAt(b.spot.x, count);
  }
  return areaAt(t.x, count);
}

/** This player's home in parts small enough to send, rooms in order from the front door. Things in the toy box are left out. */
export function homeParts(profile: Profile): HomePart[] {
  const plan: HomePlan = {
    name: profile.name,
    house: profile.house,
    paint: profile.house.map((r, i) => profile.room.paint[i] ?? findArea(r.look)?.paint ?? { wall: 0, floor: 0 }),
    buddies: homeBuddiesOf(profile),
  };
  const byRoom: RoomThing[][] = profile.house.map(() => []);
  for (const t of profile.room.things) {
    if (!t.placed) continue;
    byRoom[roomOfThing(profile, t)]?.push({ ...t, x: round(t.x), y: round(t.y) });
  }
  const parts: Omit<HomePart, 'parts'>[] = [];
  let current: Omit<HomePart, 'parts'> = { part: 0, plan, rooms: [], things: [] };
  const sizeOf = (p: object) => JSON.stringify(p).length + 40;
  if (sizeOf(current) > MAX_HOME_BYTES) return [];
  profile.house.forEach((r, i) => {
    const things = byRoom[i];
    const next = { ...current, rooms: [...current.rooms, r.id], things: [...current.things, ...things] };
    if (sizeOf(next) <= MAX_HOME_BYTES || current.rooms.length === 0) {
      current = next;
    } else {
      parts.push(current);
      current = { part: parts.length, rooms: [r.id], things };
    }
  });
  parts.push(current);
  // A room too full to send on its own is sent without its things rather than not at all.
  const fitted = parts.map((p) => (sizeOf(p) <= MAX_HOME_BYTES ? p : { ...p, things: [] }));
  return fitted.map((p) => ({ ...p, parts: fitted.length }));
}

/** Puts the parts that came so far together; null until the first part (with the plan) is here. */
export function assembleHome(parts: ReadonlyMap<number, HomePart>): HomeSnapshot | null {
  const first = parts.get(0);
  const plan = first?.plan;
  if (!first || !plan) return null;
  const got = new Set<string>();
  const things: RoomThing[] = [];
  for (const p of parts.values()) {
    if (p.parts !== first.parts) continue;
    p.rooms.forEach((r) => got.add(r));
    things.push(...p.things);
  }
  const buddies: Room['buddies'] = {};
  for (const b of plan.buddies) buddies[b.id] = b.spot;
  return {
    name: plan.name,
    house: plan.house,
    room: { paint: plan.paint, buddies, things },
    buddies: plan.buddies,
    arriving: plan.house.map((r) => r.id).filter((id) => !got.has(id)),
  };
}

// --- reading one from another phone ---

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max = 64): v is string => typeof v === 'string' && v.length <= max;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Only plain, small JSON: strings, numbers, booleans and null, not too deep. */
function plain(v: unknown, depth = 0): boolean {
  if (depth > 6) return false;
  if (v === null || typeof v === 'boolean' || isNum(v)) return true;
  if (typeof v === 'string') return v.length <= 64;
  if (Array.isArray(v)) return v.length <= 200 && v.every((x) => plain(x, depth + 1));
  if (isObj(v)) return Object.keys(v).length <= 40 && Object.values(v).every((x) => plain(x, depth + 1));
  return false;
}

const isSpot = (v: unknown) => isObj(v) && isNum(v.x) && isNum(v.y);

const isPaint = (p: unknown) => isObj(p) && isNum(p.wall) && isNum(p.floor);
const LOOKS = new Set(['living', 'kitchen', 'bedroom', 'bathroom', 'playroom', 'backyard', 'study', 'garage', 'bedroom2', 'bedroom3']);

function thingsOk(things: unknown, most: number): things is RoomThing[] {
  return (
    Array.isArray(things) &&
    things.length <= most &&
    things.every((t) => isObj(t) && isStr(t.key) && isStr(t.itemId) && typeof t.placed === 'boolean' && isNum(t.x) && isNum(t.y))
  );
}

function buddiesOk(buddies: unknown): buddies is HomeBuddy[] {
  return (
    Array.isArray(buddies) &&
    buddies.length <= 60 &&
    buddies.every(
      (b) =>
        isObj(b) &&
        isStr(b.id) &&
        isStr(b.emoji) &&
        isStr(b.name, 40) &&
        isSpot(b.spot) &&
        isStr(b.fur) &&
        isStr(b.belly) &&
        isObj(b.dressed) &&
        (b.gift === null || isStr(b.gift)) &&
        (b.person === undefined || (isObj(b.person) && isObj(b.person.look) && isObj(b.person.dressed))),
    )
  );
}

/** Checks a part of a home sent by another phone, or returns null if it doesn't look right. */
export function parseHomePart(v: unknown): HomePart | null {
  if (!isObj(v)) return null;
  // A phone on protocol v11 or older sends its whole home in one go, the old way.
  if (!('part' in v)) return parseOldHome(v);
  const { part, parts, rooms, things, plan } = v;
  if (!isNum(part) || !isNum(parts) || part < 0 || parts < 1 || part >= parts || parts > MAX_ROOMS) return null;
  if (!Array.isArray(rooms) || rooms.length > MAX_ROOMS || !rooms.every((r) => isStr(r))) return null;
  if (!thingsOk(things, MAX_THINGS_PER_ROOM * MAX_ROOMS)) return null;
  if (!things.every((t) => plain(t))) return null;
  if (plan !== undefined) {
    if (!isObj(plan) || !isStr(plan.name, 40)) return null;
    const { house, paint, buddies } = plan;
    if (!Array.isArray(house) || house.length < 1 || house.length > MAX_ROOMS) return null;
    if (!house.every((r) => isObj(r) && isStr(r.id, 24) && isStr(r.look) && LOOKS.has(r.look) && (r.name === undefined || isStr(r.name, 40)))) return null;
    if (!Array.isArray(paint) || paint.length > MAX_ROOMS || !paint.every(isPaint)) return null;
    if (!buddiesOk(buddies) || !buddies.every((b) => plain(b))) return null;
  }
  return v as unknown as HomePart;
}

/** A whole home in the old way (one message, spots as shares of a ten-room strip), as a one-part home. */
function parseOldHome(v: Record<string, unknown>): HomePart | null {
  const old = parseHomeSnapshot(v);
  if (!old) return null;
  const { house, room } = stripToHouse({ room: old.room, homeRooms: old.homeRooms, homeOrder: old.homeOrder });
  const buddies = old.buddies.map((b) => ({ ...b, spot: room.buddies[b.id] ?? b.spot }));
  return {
    part: 0,
    parts: 1,
    plan: { name: old.name, house, paint: room.paint, buddies },
    rooms: house.map((r) => r.id),
    things: room.things,
  };
}

/** A whole home as phones on protocol v11 and older send it. */
interface OldHomeSnapshot {
  name: string;
  room: Room;
  buddies: HomeBuddy[];
  homeRooms: string[];
  homeOrder?: string[];
}

/** Checks a home sent by another phone, or returns null if it doesn't look right. */
function parseHomeSnapshot(v: unknown): OldHomeSnapshot | null {
  if (!isObj(v) || !plain(v)) return null;
  const { name, room, buddies, homeRooms } = v;
  if (!isStr(name, 40) || !isObj(room) || !Array.isArray(buddies) || !Array.isArray(homeRooms)) return null;
  if (!homeRooms.every((r) => isStr(r))) return null;
  if (v.homeOrder !== undefined && !(Array.isArray(v.homeOrder) && v.homeOrder.every((r) => isStr(r)))) return null;
  const { paint, things } = room;
  if (!Array.isArray(paint) || !paint.every((p) => isObj(p) && isNum(p.wall) && isNum(p.floor))) return null;
  if (!isObj(room.buddies) || !Object.values(room.buddies).every(isSpot)) return null;
  if (!Array.isArray(things) || things.length > 120) return null;
  const thingsOk = things.every(
    (t) => isObj(t) && isStr(t.key) && isStr(t.itemId) && typeof t.placed === 'boolean' && isNum(t.x) && isNum(t.y),
  );
  if (!thingsOk) return null;
  const buddiesOk = buddies.every(
    (b) =>
      isObj(b) &&
      isStr(b.id) &&
      isStr(b.emoji) &&
      isStr(b.name, 40) &&
      isSpot(b.spot) &&
      isStr(b.fur) &&
      isStr(b.belly) &&
      isObj(b.dressed) &&
      (b.gift === null || isStr(b.gift)) &&
      (b.person === undefined || (isObj(b.person) && isObj(b.person.look) && isObj(b.person.dressed))),
  );
  if (!buddiesOk) return null;
  // The old home's buddies stood on its strip; turn them along with everything else.
  const old = v as unknown as OldHomeSnapshot;
  const strip = stripToHouse({ room: { ...old.room, buddies: Object.fromEntries(old.buddies.map((b) => [b.id, b.spot])) }, homeRooms: old.homeRooms, homeOrder: old.homeOrder });
  return { ...old, buddies: old.buddies.map((b) => ({ ...b, spot: strip.room.buddies[b.id] ?? b.spot })) };
}
