import type { WeekProgress } from '@/types';
import { addDays, parseDateKey } from '@/utils/dates';

export const WEEKLY_GOAL_BONUS = 50;

export const WEEKLY_GOALS: {
  id: 'correct' | 'rounds' | 'days';
  label: string;
  target: number;
}[] = [
  { id: 'correct', label: 'Get 100 answers right', target: 100 },
  { id: 'rounds', label: 'Finish 10 rounds', target: 10 },
  { id: 'days', label: 'Play on 4 different days', target: 4 },
];

/** Weeks start on Sunday; the key is that Sunday's date. */
export function weekKey(today: string): string {
  return addDays(today, -parseDateKey(today).getDay());
}

export function emptyWeek(today: string): WeekProgress {
  return { week: weekKey(today), correct: 0, rounds: 0, days: [], completed: false };
}

/** Progress toward one goal, as the current count. */
export function goalCount(week: WeekProgress, id: (typeof WEEKLY_GOALS)[number]['id']): number {
  return id === 'days' ? week.days.length : week[id];
}

export function allGoalsMet(week: WeekProgress): boolean {
  return WEEKLY_GOALS.every((g) => goalCount(week, g.id) >= g.target);
}

/**
 * Adds a finished round to this week's progress, starting fresh when a new week
 * begins. `justCompleted` is true only on the round that finishes every goal.
 */
export function recordWeek(
  current: WeekProgress | null,
  today: string,
  correct: number,
): { week: WeekProgress; justCompleted: boolean } {
  const base = current && current.week === weekKey(today) ? current : emptyWeek(today);
  const week: WeekProgress = {
    ...base,
    correct: base.correct + correct,
    rounds: base.rounds + 1,
    days: base.days.includes(today) ? base.days : [...base.days, today],
  };
  const justCompleted = !base.completed && allGoalsMet(week);
  return { week: { ...week, completed: base.completed || justCompleted }, justCompleted };
}
