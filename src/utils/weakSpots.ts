import type { AnswerRecord, Fact, GameConfig, MissedFact } from '@/types';
import { QUESTIONS_PER_ROUND } from '@/utils/gameSession';

/** Right answers in a row that take a fact off the review list. */
export const CLEAR_AFTER = 2;
/** Most facts kept, so the list stays a focused set of tricky ones. */
export const MAX_MISSED = 40;

export function factKey(fact: Pick<Fact, 'operation' | 'a' | 'b'>): string {
  return `${fact.operation}:${fact.a}:${fact.b}`;
}

/**
 * Updates the review list after a round: a miss adds the fact (or counts it
 * again); getting a listed fact right twice in a row clears it.
 */
export function updateMissed(
  missed: Record<string, MissedFact>,
  history: readonly AnswerRecord[],
  today: string,
): Record<string, MissedFact> {
  const next = { ...missed };
  for (const r of history) {
    const { operation, a, b, answer, prompt } = r.problem;
    const key = factKey(r.problem);
    const existing = next[key];
    if (!r.correct) {
      next[key] = {
        operation,
        a,
        b,
        answer,
        prompt,
        misses: (existing?.misses ?? 0) + 1,
        rightInARow: 0,
        lastMissed: today,
      };
    } else if (existing) {
      const rightInARow = existing.rightInARow + 1;
      if (rightInARow >= CLEAR_AFTER) delete next[key];
      else next[key] = { ...existing, rightInARow };
    }
  }

  const keys = Object.keys(next);
  if (keys.length <= MAX_MISSED) return next;
  const keep = trickiest(next, MAX_MISSED).map(factKey);
  return Object.fromEntries(keep.map((k) => [k, next[k]]));
}

/** Most-missed first, then most recently missed. */
export function trickiest(missed: Record<string, MissedFact>, count: number): MissedFact[] {
  return Object.values(missed)
    .sort((x, y) => y.misses - x.misses || y.lastMissed.localeCompare(x.lastMissed))
    .slice(0, count);
}

/** A round of the player's trickiest facts; null when there's nothing to review. */
export function reviewConfig(missed: Record<string, MissedFact>, seed: number): GameConfig | null {
  const facts: Fact[] = trickiest(missed, QUESTIONS_PER_ROUND).map(
    ({ operation, a, b, answer, prompt }) => ({ operation, a, b, answer, prompt }),
  );
  if (facts.length === 0) return null;
  return {
    mode: { kind: 'review', facts },
    difficulty: 'easy',
    timer: null,
    adaptive: false,
    questionCount: QUESTIONS_PER_ROUND,
    seed,
  };
}
