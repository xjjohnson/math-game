import { findWearable } from '@/constants/wardrobe';
import type { Outfit, Profile } from '@/types';

export type WearResult = { ok: true; profile: Profile } | { ok: false; reason: 'unknown' | 'coins' };

/** What a buddy has on; nothing for a buddy never dressed. */
export function outfitOf(profile: Profile, buddyId: string): Outfit {
  return profile.outfits[buddyId] ?? {};
}

/**
 * Puts a piece of clothing on a buddy, buying it first if the player doesn't have it yet.
 * Tapping something the buddy already has on takes it off.
 */
export function wear(profile: Profile, buddyId: string, wearableId: string): WearResult {
  const item = findWearable(wearableId);
  if (!item) return { ok: false, reason: 'unknown' };
  let next = profile;
  if (!profile.wardrobe.includes(item.id)) {
    if (profile.coins < item.price) return { ok: false, reason: 'coins' };
    next = { ...profile, coins: profile.coins - item.price, wardrobe: [...profile.wardrobe, item.id] };
  }
  const outfit = { ...outfitOf(profile, buddyId) };
  if (outfit[item.slot] === item.id) delete outfit[item.slot];
  else outfit[item.slot] = item.id;
  return { ok: true, profile: { ...next, outfits: { ...profile.outfits, [buddyId]: outfit } } };
}

/** Takes everything off a buddy. Clothes stay in the wardrobe. */
export function undress(profile: Profile, buddyId: string): Profile {
  return { ...profile, outfits: { ...profile.outfits, [buddyId]: {} } };
}
