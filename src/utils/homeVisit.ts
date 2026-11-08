import type { Dressed } from '@/components/BuddyFigure';
import type { HomeBuddy } from '@/components/BuddyRoom';
import { BODY_COLORS, DEFAULT_BODY, findWearable } from '@/constants/wardrobe';
import { itemsIn } from '@/constants/shop';
import type { Profile, Room, RoomThing } from '@/types';
import { buddyHearts, buddyLevel, giftForLevel } from '@/utils/buddy';
import { buddiesHome } from '@/utils/room';
import { owns } from '@/utils/shop';
import { clothOf, lookOf, outfitOf } from '@/utils/wardrobe';

/** A buddy's outfit as things to draw. */
export function dressedOf(profile: Profile, buddyId: string): Dressed {
  const outfit = outfitOf(profile, buddyId);
  const emoji = (id?: string) => (id ? findWearable(id)?.emoji : undefined);
  return {
    hat: emoji(outfit.hat),
    face: emoji(outfit.face),
    neck: emoji(outfit.neck),
    feet: emoji(outfit.feet),
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
      },
    ];
  });
}

/** Everything a friend's phone needs to show this player's buddy home. */
export interface HomeSnapshot {
  name: string;
  room: Room;
  buddies: HomeBuddy[];
  /** Extra rooms bought, so the friend sees the same rooms open. */
  homeRooms: string[];
}

/** Nearby sends at most 32 KB in one go; stay well under it. */
export const MAX_HOME_BYTES = 28000;

const round = (v: number) => Math.round(v * 10000) / 10000;

/** This player's home, small enough to send. Things in the toy box are left out. */
export function homeSnapshot(profile: Profile): HomeSnapshot | null {
  const things: RoomThing[] = profile.room.things
    .filter((t) => t.placed)
    .map((t) => ({ ...t, x: round(t.x), y: round(t.y) }));
  const snap: HomeSnapshot = {
    name: profile.name,
    room: { ...profile.room, things },
    buddies: homeBuddiesOf(profile),
    homeRooms: profile.homeRooms,
  };
  return JSON.stringify(snap).length <= MAX_HOME_BYTES ? snap : null;
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

/** Checks a home sent by another phone, or returns null if it doesn't look right. */
export function parseHomeSnapshot(v: unknown): HomeSnapshot | null {
  if (!isObj(v) || !plain(v)) return null;
  const { name, room, buddies, homeRooms } = v;
  if (!isStr(name, 40) || !isObj(room) || !Array.isArray(buddies) || !Array.isArray(homeRooms)) return null;
  if (!homeRooms.every((r) => isStr(r))) return null;
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
  return v as unknown as HomeSnapshot;
}
