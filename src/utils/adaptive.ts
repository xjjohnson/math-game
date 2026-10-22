import type { AnswerRecord, Difficulty } from '@/types';

const ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

/** How many answers at the current level are judged before changing level. */
export const ADAPTIVE_WINDOW = 5;
const STEP_UP_AT = 4; // 4 or 5 right out of 5
const STEP_DOWN_AT = 2; // 2 or fewer right out of 5

/**
 * Picks the next difficulty from recent accuracy. Only answers given since the
 * last change count, so the level never flips back and forth on every question.
 */
export function adjustDifficulty(current: Difficulty, history: AnswerRecord[]): Difficulty {
  const recent: AnswerRecord[] = [];
  for (let i = history.length - 1; i >= 0 && recent.length < ADAPTIVE_WINDOW; i--) {
    if (history[i].difficulty !== current) break;
    recent.push(history[i]);
  }
  if (recent.length < ADAPTIVE_WINDOW) return current;

  const correct = recent.filter((r) => r.correct).length;
  const level = ORDER.indexOf(current);
  if (correct >= STEP_UP_AT) return ORDER[Math.min(level + 1, ORDER.length - 1)];
  if (correct <= STEP_DOWN_AT) return ORDER[Math.max(level - 1, 0)];
  return current;
}
