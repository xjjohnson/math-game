import { findItem, type Companion } from '@/constants/shop';
import type { BuddyCare, Profile } from '@/types';

/** Daily limits, so caring for a buddy is a little each day rather than tapping forever. */
export const DAILY_PETS = 3;
export const DAILY_TREATS = 2;
/** Hearts the buddy's game can give per day; the game stays playable after that. */
export const DAILY_PLAY_HEARTS = 5;
export const TREAT_PRICE = 5;
export const TREAT_HEARTS = 2;
export const HEARTS_PER_LEVEL = 10;
export const MAX_BUDDY_LEVEL = 5;

/** What a buddy wears from each level on; index 0 is level 1. */
const LEVEL_GIFTS = [null, '🎀', '🧢', '🕶️', '👑'] as const;

export type CareAction = 'pet' | 'treat' | 'play';

export type CareResult =
  | { ok: true; profile: Profile; hearts: number; levelUp: boolean }
  | { ok: false; reason: 'noBuddy' | 'tired' | 'coins' };

export function buddyLevel(hearts: number): number {
  return Math.min(MAX_BUDDY_LEVEL, 1 + Math.floor(hearts / HEARTS_PER_LEVEL));
}

/** Hearts still needed for the next level, or null at the top level. */
export function heartsToNextLevel(hearts: number): number | null {
  const level = buddyLevel(hearts);
  return level >= MAX_BUDDY_LEVEL ? null : level * HEARTS_PER_LEVEL - hearts;
}

export function giftForLevel(level: number): string | null {
  return LEVEL_GIFTS[Math.min(level, MAX_BUDDY_LEVEL) - 1] ?? null;
}

/** What the buddy in use wears for its level. */
export function buddyGift(profile: Profile | undefined): string | null {
  if (!profile) return null;
  return giftForLevel(buddyLevel(buddyHearts(profile, profile.equipped.companion)));
}

export function buddyHearts(profile: Profile, buddyId: string | null): number {
  return buddyId ? (profile.buddyHearts[buddyId] ?? 0) : 0;
}

/** Today's care so far; a new day starts fresh. */
export function careToday(profile: Profile, today: string): BuddyCare {
  return profile.buddyCare?.date === today
    ? profile.buddyCare
    : { date: today, pets: 0, treats: 0, playHearts: 0 };
}

export function buddyCompanion(profile: Profile): Companion | undefined {
  const item = findItem(profile.equipped.companion);
  return item?.category === 'companion' ? item.companion : undefined;
}

function addHearts(profile: Profile, buddyId: string, hearts: number) {
  const before = buddyHearts(profile, buddyId);
  const after = before + hearts;
  return {
    buddyHearts: { ...profile.buddyHearts, [buddyId]: after },
    hearts: after,
    levelUp: buddyLevel(after) > buddyLevel(before),
  };
}

/** Pets, feeds or plays with the buddy in use, within today's limits. */
export function careForBuddy(profile: Profile, action: CareAction, today: string): CareResult {
  const buddyId = profile.equipped.companion;
  if (!buddyId || !buddyCompanion(profile)) return { ok: false, reason: 'noBuddy' };
  const care = careToday(profile, today);

  let gained: number;
  let nextCare: BuddyCare;
  let coins = profile.coins;
  switch (action) {
    case 'pet':
      if (care.pets >= DAILY_PETS) return { ok: false, reason: 'tired' };
      gained = 1;
      nextCare = { ...care, pets: care.pets + 1 };
      break;
    case 'treat':
      if (care.treats >= DAILY_TREATS) return { ok: false, reason: 'tired' };
      if (coins < TREAT_PRICE) return { ok: false, reason: 'coins' };
      coins -= TREAT_PRICE;
      gained = TREAT_HEARTS;
      nextCare = { ...care, treats: care.treats + 1 };
      break;
    case 'play':
      if (care.playHearts >= DAILY_PLAY_HEARTS) return { ok: false, reason: 'tired' };
      gained = 1;
      nextCare = { ...care, playHearts: care.playHearts + 1 };
      break;
  }

  const { buddyHearts: hearts, hearts: total, levelUp } = addHearts(profile, buddyId, gained);
  return {
    ok: true,
    profile: { ...profile, coins, buddyHearts: hearts, buddyCare: nextCare },
    hearts: total,
    levelUp,
  };
}

/** A finished round gives the buddy along for it a heart. */
export function heartForRound(profile: Profile): Profile {
  const buddyId = profile.equipped.companion;
  if (!buddyId || !buddyCompanion(profile)) return profile;
  return { ...profile, buddyHearts: addHearts(profile, buddyId, 1).buddyHearts };
}
