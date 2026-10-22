import type { AnswerRecord, Difficulty } from '@/types';
import type { RoundResult } from '@/utils/progress';

/**
 * A two-player game as a round for one player's profile, so it pays coins and
 * counts toward stats, streaks, badges and tricky facts like a solo round.
 */
export function multiplayerRound(highScoreKey: string, history: AnswerRecord[], difficulty: Difficulty): RoundResult {
  let run = 0;
  let bestStreak = 0;
  for (const r of history) {
    run = r.correct ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }
  return {
    highScoreKey,
    score: history.filter((r) => r.correct).length,
    bestStreak,
    history,
    difficulty,
  };
}
