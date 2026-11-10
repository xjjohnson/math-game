import type { Dressed } from '@/components/BuddyFigure';
import type { HomeBuddy } from '@/components/BuddyRoom';
import { BODY_COLORS, DEFAULT_BODY, findWearable } from '@/constants/wardrobe';
import { itemsIn } from '@/constants/shop';
import type { Profile, Room, RoomThing } from '@/types';
import { buddyHearts, buddyLevel, giftForLevel } from '@/utils/buddy';
import { ROOM_SPAN } from '@/constants/room';
import { AREA_COUNT, buddiesHome } from '@/utils/room';
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
  const screen = 1 / (AREA_COUNT * ROOM_SPAN);
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

/** Everything a friend's phone needs to show this player's buddy home. */
export interface HomeSnapshot {
  name: string;
  room: Room;
  buddies: HomeBuddy[];
  /** Extra rooms bought, so the friend sees the same rooms open. */
  homeRooms: string[];
  /** The order the rooms are in, left to right. */
  homeOrder?: string[];
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
    homeOrder: profile.homeOrder,
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
  return v as unknown as HomeSnapshot;
}
