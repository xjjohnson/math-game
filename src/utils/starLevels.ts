import { findItem } from '@/constants/shop';
import type { Profile } from '@/types';

/**
 * Stars measure progress. Reaching a star level unlocks a free reward (a shop
 * item), so stars are never spent: they only go up. Coins are the spending money.
 */
export interface StarLevel {
  /** Stars needed to reach this level. */
  stars: number;
  title: string;
  /** Shop item id unlocked for free on reaching the level. */
  reward?: string;
}

export const STAR_LEVELS: StarLevel[] = [
  { stars: 0, title: 'Number Sprout' },
  { stars: 10, title: 'Counting Cub', reward: 'bg-sky' },
  { stars: 25, title: 'Sum Scout', reward: 'card-gold' },
  { stars: 50, title: 'Math Ranger', reward: 'buddy-panda' },
  { stars: 100, title: 'Number Ninja', reward: 'bg-space' },
  { stars: 175, title: 'Brain Boss', reward: 'card-rainbow' },
  { stars: 275, title: 'Math Wizard', reward: 'buddy-unicorn' },
  { stars: 400, title: 'Math Legend', reward: 'avatar-crown' },
];

export interface StarProgress {
  /** 1-based level number. */
  level: number;
  title: string;
  /** The next level, or null at the top. */
  next: StarLevel | null;
  /** Stars earned toward the next level, and how many that level needs from this one. */
  into: number;
  span: number;
}

export function starProgress(stars: number): StarProgress {
  let index = 0;
  STAR_LEVELS.forEach((l, i) => {
    if (stars >= l.stars) index = i;
  });
  const current = STAR_LEVELS[index];
  const next = STAR_LEVELS[index + 1] ?? null;
  return {
    level: index + 1,
    title: current.title,
    next,
    into: stars - current.stars,
    span: next ? next.stars - current.stars : 0,
  };
}

export interface StarUnlocks {
  profile: Profile;
  /** Levels reached by `profile.stars` that the player hadn't been given yet. */
  newLevels: StarLevel[];
}

/**
 * Gives every reward the player's stars have reached and they don't own yet.
 * Safe to run any time: it only adds missing unlocks.
 */
export function grantStarRewards(profile: Profile): StarUnlocks {
  const unlocks = [...profile.unlocks];
  const newLevels: StarLevel[] = [];
  for (const level of STAR_LEVELS) {
    if (!level.reward || profile.stars < level.stars) continue;
    const item = findItem(level.reward);
    if (!item || item.price === 0 || unlocks.includes(item.id)) continue;
    unlocks.push(item.id);
    newLevels.push(level);
  }
  return { profile: newLevels.length ? { ...profile, unlocks } : profile, newLevels };
}

/** Levels newly reached when stars go from `before` to `after`. */
export function levelsReached(before: number, after: number): StarLevel[] {
  return STAR_LEVELS.filter((l) => l.stars > 0 && before < l.stars && after >= l.stars);
}
