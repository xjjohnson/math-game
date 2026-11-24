import { DEFAULT_BLANKET, findBlanket, FORT_EXTRAS, FORT_ITEM, fortId, parseFortId, type BlanketId, type FortExtraId } from '@/constants/fort';
import type { Profile } from '@/types';

/** Whether the player's stars have unlocked something inside the fort (stars are never spent). */
export const hasFortExtra = (profile: Pick<Profile, 'stars'>, id: FortExtraId): boolean =>
  profile.stars >= (FORT_EXTRAS.find((x) => x.id === id)?.stars ?? Infinity);

/** The next thing stars will unlock inside the fort, or null when all are unlocked. */
export const nextFortExtra = (profile: Pick<Profile, 'stars'>) => FORT_EXTRAS.find((x) => profile.stars < x.stars) ?? null;

/** A fort's blanket from its item id; null while it is still folded up. */
export function blanketOf(itemId: string): BlanketId | null {
  return (parseFortId(itemId)?.id as BlanketId | undefined) ?? null;
}

export type FortResult = { ok: true; profile: Profile } | { ok: false; reason: 'noFort' | 'unknown' };

/**
 * Sets up a folded fort (after its fort check), or swaps a built fort's blanket. The blanket is
 * kept in the thing's item id, so a fort only ever needs setting up once.
 */
export function setFortBlanket(profile: Profile, key: string, blanket: string = DEFAULT_BLANKET): FortResult {
  if (!findBlanket(blanket)) return { ok: false, reason: 'unknown' };
  const thing = profile.room.things.find((t) => t.key === key);
  if (!thing || (thing.itemId !== FORT_ITEM && !parseFortId(thing.itemId))) return { ok: false, reason: 'noFort' };
  const itemId = fortId(blanket as BlanketId);
  return {
    ok: true,
    profile: {
      ...profile,
      room: { ...profile.room, things: profile.room.things.map((t) => (t.key === key ? { ...t, itemId } : t)) },
    },
  };
}
