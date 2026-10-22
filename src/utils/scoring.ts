import type { Difficulty, TimerSetting } from '@/types';

export const BASE_POINTS: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 30 };

/** Streak bonus starts at 3 in a row: +5, then +5 more each answer, capped at +25. */
export function streakBonus(streak: number): number {
  if (streak < 3) return 0;
  return 5 * Math.min(streak - 2, 5);
}

/** One point per whole second left on a timed question. */
export function timeBonus(timer: TimerSetting, secondsLeft: number | null): number {
  if (timer === null || secondsLeft === null) return 0;
  return Math.max(0, Math.floor(secondsLeft));
}

export function pointsFor(
  difficulty: Difficulty,
  streak: number,
  timer: TimerSetting,
  secondsLeft: number | null,
): number {
  return BASE_POINTS[difficulty] + streakBonus(streak) + timeBonus(timer, secondsLeft);
}
