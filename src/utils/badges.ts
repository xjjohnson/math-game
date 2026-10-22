import type { AnswerRecord, Profile } from '@/types';
import { dayStreak } from '@/utils/dates';

export interface BadgeContext {
  history: readonly AnswerRecord[];
  /** Difficulty the round was played at. */
  difficulty: AnswerRecord['difficulty'];
  stars: number;
  wonDaily: boolean;
  weeklyCompleted: boolean;
  today: string;
}

/**
 * Badges the updated profile has now earned but didn't have before.
 * `profile` is the profile after the round has been applied.
 */
export function newBadges(profile: Profile, ctx: BadgeContext): string[] {
  const has = new Set(profile.badges);
  const earned: string[] = [];
  const award = (id: string, condition: boolean) => {
    if (condition && !has.has(id)) earned.push(id);
  };

  const allRight = ctx.history.length > 0 && ctx.history.every((r) => r.correct);
  const days = dayStreak(profile.playDates, ctx.today);
  const triedAll = Object.values(profile.stats).every((s) => s.attempted > 0);

  award('first-round', ctx.history.length > 0);
  award('perfect', allRight);
  award('streak-10', profile.bestStreak >= 10);
  award('daily', ctx.wonDaily);
  award('days-3', days >= 3);
  award('days-7', days >= 7);
  award('all-ops', triedAll);
  award('hard', ctx.difficulty === 'hard' && ctx.stars === 3);
  award('weekly', ctx.weeklyCompleted);
  return earned;
}
