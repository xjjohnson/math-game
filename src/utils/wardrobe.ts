import type { Cloth, Mood } from '@/components/PersonFigure';
import { findWearable, isPerson, PEOPLE, type PersonLook } from '@/constants/wardrobe';
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

/** A top or bottom, ready for a person to wear. */
export function clothOf(wearableId?: string): Cloth | undefined {
  const w = wearableId ? findWearable(wearableId) : undefined;
  return w?.color ? { color: w.color, cut: w.cut, pattern: w.pattern, patternColor: w.patternColor } : undefined;
}

export type MoveResult =
  | { ok: true; profile: Profile; swapped: string | null }
  | { ok: false; reason: 'unknown' | 'same' | 'notWearing' | 'cannotWear' };

/**
 * Takes a piece off one buddy and puts it on another, free. If the other buddy already had
 * something in that spot, it goes back to the first buddy. Animals can't wear bottoms.
 */
export function moveWearable(profile: Profile, fromId: string, toId: string, wearableId: string): MoveResult {
  const item = findWearable(wearableId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (fromId === toId) return { ok: false, reason: 'same' };
  const from = { ...outfitOf(profile, fromId) };
  if (from[item.slot] !== item.id) return { ok: false, reason: 'notWearing' };
  if (item.slot === 'legs' && !isPerson(toId)) return { ok: false, reason: 'cannotWear' };
  const to = { ...outfitOf(profile, toId) };
  const displaced = to[item.slot] ?? null;
  delete from[item.slot];
  to[item.slot] = item.id;
  if (displaced) from[item.slot] = displaced;
  const wardrobe = profile.wardrobe.includes(item.id) ? profile.wardrobe : [...profile.wardrobe, item.id];
  const kept = displaced && !wardrobe.includes(displaced) ? [...wardrobe, displaced] : wardrobe;
  return {
    ok: true,
    swapped: displaced,
    profile: { ...profile, wardrobe: kept, outfits: { ...profile.outfits, [fromId]: from, [toId]: to } },
  };
}

/** Takes one piece off a buddy. It stays in the wardrobe, so it can be worn again. */
export function takeOff(profile: Profile, buddyId: string, wearableId: string): Profile {
  const item = findWearable(wearableId);
  if (!item) return profile;
  const outfit = { ...outfitOf(profile, buddyId) };
  if (outfit[item.slot] !== item.id) return profile;
  delete outfit[item.slot];
  const wardrobe = profile.wardrobe.includes(item.id) ? profile.wardrobe : [...profile.wardrobe, item.id];
  return { ...profile, wardrobe, outfits: { ...profile.outfits, [buddyId]: outfit } };
}

export type OutfitSlot = keyof Outfit;

/**
 * What changed between two outfits: pieces put on (new in a spot, or swapped in) and pieces
 * that came off (taken off, or swapped out), for the dress-up poof and the old piece falling.
 */
export function outfitChange(before: Outfit, after: Outfit): { on: { slot: OutfitSlot; id: string }[]; off: { slot: OutfitSlot; id: string }[] } {
  const on: { slot: OutfitSlot; id: string }[] = [];
  const off: { slot: OutfitSlot; id: string }[] = [];
  const slots = new Set([...Object.keys(before), ...Object.keys(after)] as OutfitSlot[]);
  for (const slot of slots) {
    const was = before[slot];
    const now = after[slot];
    if (was === now) continue;
    if (now) on.push({ slot, id: now });
    if (was) off.push({ slot, id: was });
  }
  return { on, off };
}

/** How far down a buddy each spot is worn, as a share of its height from the top of its box. */
export const SLOT_HEIGHT: Record<OutfitSlot, number> = { hat: 0.14, face: 0.3, neck: 0.48, shirt: 0.6, legs: 0.78, feet: 0.93 };

/** Sets the face a buddy shows from Feelings; the everyday smile clears it. */
export function setMood(profile: Profile, buddyId: string, mood: Mood): Profile {
  const moods = { ...(profile.moods ?? {}) };
  if (mood === 'smile') delete moods[buddyId];
  else moods[buddyId] = mood;
  return { ...profile, moods };
}

/** The face a buddy shows: the one set in Feelings, or its everyday smile. */
export function moodOf(profile: Profile, buddyId: string): Mood {
  return profile.moods?.[buddyId] ?? 'smile';
}

/** A feeling's little picture, for the Feelings row and an animal buddy's face bubble. */
export const MOOD_EMOJI: Record<Mood, string> = { smile: '🙂', happy: '😄', sad: '😢', surprised: '😮', cross: '😠', silly: '😜' };
/** A feeling's name, read out and shown under its button. */
export const MOOD_NAME: Record<Mood, string> = { smile: 'Smile', happy: 'Happy', sad: 'Sad', surprised: 'Surprised', cross: 'Cross', silly: 'Silly' };
