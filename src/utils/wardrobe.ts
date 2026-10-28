import { findWearable, PEOPLE, type PersonLook } from '@/constants/wardrobe';
import type { Outfit, Profile } from '@/types';

export type WearResult = { ok: true; profile: Profile } | { ok: false; reason: 'unknown' | 'coins' };

/** What a buddy has on. People start in their own clothes; animals start with nothing. */
export function outfitOf(profile: Profile, buddyId: string): Outfit {
  return profile.outfits[buddyId] ?? PEOPLE[buddyId]?.outfit ?? {};
}

/** A person buddy's looks: changed ones, or how it starts. */
export function lookOf(profile: Profile, buddyId: string): PersonLook | null {
  return profile.looks[buddyId] ?? PEOPLE[buddyId]?.look ?? null;
}

/** Free things and a person's own starting clothes need no buying. */
function owned(profile: Profile, buddyId: string, wearableId: string): boolean {
  const item = findWearable(wearableId);
  if (!item) return false;
  if (item.price === 0 || profile.wardrobe.includes(item.id)) return true;
  return Object.values(PEOPLE[buddyId]?.outfit ?? {}).includes(item.id);
}

/** True when the player can put this on the buddy without paying. */
export function canWear(profile: Profile, buddyId: string, wearableId: string): boolean {
  return owned(profile, buddyId, wearableId);
}

/**
 * Puts a piece of clothing on a buddy, buying it first if the player doesn't have it yet.
 * Tapping something the buddy already has on takes it off.
 */
export function wear(profile: Profile, buddyId: string, wearableId: string): WearResult {
  const item = findWearable(wearableId);
  if (!item) return { ok: false, reason: 'unknown' };
  const outfit = { ...outfitOf(profile, buddyId) };
  let next = profile;
  if (outfit[item.slot] !== item.id && !owned(profile, buddyId, item.id)) {
    if (profile.coins < item.price) return { ok: false, reason: 'coins' };
    next = { ...profile, coins: profile.coins - item.price, wardrobe: [...profile.wardrobe, item.id] };
  }
  if (outfit[item.slot] === item.id) delete outfit[item.slot];
  else outfit[item.slot] = item.id;
  return { ok: true, profile: { ...next, outfits: { ...profile.outfits, [buddyId]: outfit } } };
}

/** Takes everything off a buddy. Clothes stay in the wardrobe. */
export function undress(profile: Profile, buddyId: string): Profile {
  return { ...profile, outfits: { ...profile.outfits, [buddyId]: {} } };
}

/** Changes a person buddy's hair, skin or beard. Free. */
export function setLook(profile: Profile, buddyId: string, change: Partial<PersonLook>): Profile {
  const look = lookOf(profile, buddyId);
  if (!look) return profile;
  return { ...profile, looks: { ...profile.looks, [buddyId]: { ...look, ...change } } };
}
