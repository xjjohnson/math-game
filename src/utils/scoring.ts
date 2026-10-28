import type { Difficulty, Grade, Operation, TimerSetting } from '@/types';

/**
 * What one right answer is worth, in coins. Harder questions pay more: adding
 * pays least, then taking away, times and sharing (division); harder levels and
 * higher grades add a little on top. Points are ten times this.
 */
export const OPERATION_VALUE: Record<Operation, number> = { add: 1, subtract: 2, multiply: 3, divide: 4 };
export const DIFFICULTY_VALUE: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/** +1 for every two grades: K-1st +0, 2nd-3rd +1, 4th-5th +2, 6th+ +3. */
export function gradeValue(grade: Grade | undefined): number {
  return grade === undefined ? 0 : Math.floor(grade / 2);
}

export function answerValue(operation: Operation, difficulty: Difficulty, grade?: Grade): number {
  return OPERATION_VALUE[operation] + DIFFICULTY_VALUE[difficulty] + gradeValue(grade);
}

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
  question: { operation: Operation; difficulty: Difficulty; grade?: Grade },
  streak: number,
  timer: TimerSetting,
  secondsLeft: number | null,
): number {
  const base = 10 * answerValue(question.operation, question.difficulty, question.grade);
  return base + streakBonus(streak) + timeBonus(timer, secondsLeft);
}
