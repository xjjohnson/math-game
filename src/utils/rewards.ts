import type { AnswerRecord, Difficulty, GameConfig, Operation } from '@/types';
import { dateSeed } from '@/utils/dates';
import { QUESTIONS_PER_ROUND } from '@/utils/gameSession';
import { createRng, pick } from '@/utils/seededRandom';

export const COINS_PER_CORRECT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
/** Every 5 right in a row pays a bonus. */
export const STREAK_MILESTONE = 5;
export const STREAK_MILESTONE_COINS = 5;
export const DAILY_CHALLENGE_BONUS = 25;
/** Right answers needed (out of 10) to earn the daily challenge bonus. */
export const DAILY_PASS = 7;

export interface RoundRewards {
  /** Total coins earned, including all bonuses below. */
  coins: number;
  streakBonusCoins: number;
  dailyBonusCoins: number;
  /** 0 to 3 stars for the round's accuracy. */
  stars: number;
}

export function starsFor(correct: number, total: number): number {
  if (total === 0) return 0;
  const accuracy = correct / total;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  if (accuracy >= 0.5) return 1;
  return 0;
}

/** Number of times the running streak reached a multiple of STREAK_MILESTONE. */
export function streakMilestones(history: readonly AnswerRecord[]): number {
  let streak = 0;
  let milestones = 0;
  for (const r of history) {
    streak = r.correct ? streak + 1 : 0;
    if (streak > 0 && streak % STREAK_MILESTONE === 0) milestones++;
  }
  return milestones;
}

/**
 * Rewards for a finished round. `dailyAlreadyEarned` stops the daily bonus from
 * paying twice on the same day.
 */
export function roundRewards(
  history: readonly AnswerRecord[],
  isDaily: boolean,
  dailyAlreadyEarned: boolean,
): RoundRewards {
  const correct = history.filter((r) => r.correct);
  const base = correct.reduce((sum, r) => sum + COINS_PER_CORRECT[r.difficulty], 0);
  const streakBonusCoins = streakMilestones(history) * STREAK_MILESTONE_COINS;
  const dailyBonusCoins =
    isDaily && !dailyAlreadyEarned && correct.length >= DAILY_PASS ? DAILY_CHALLENGE_BONUS : 0;
  return {
    coins: base + streakBonusCoins + dailyBonusCoins,
    streakBonusCoins,
    dailyBonusCoins,
    stars: starsFor(correct.length, history.length),
  };
}

const DAILY_OPERATIONS: Operation[] = ['add', 'subtract', 'multiply', 'divide'];

/**
 * Today's challenge: the operation is picked from the date, so every player gets
 * the same one, at the difficulty they last played. 30 seconds per question.
 */
export function dailyChallengeConfig(today: string, difficulty: Difficulty): GameConfig {
  const seed = dateSeed(today);
  return {
    mode: { kind: 'operation', operation: pick(createRng(seed), DAILY_OPERATIONS) },
    difficulty,
    timer: 30,
    adaptive: false,
    questionCount: QUESTIONS_PER_ROUND,
    seed,
    dailyDate: today,
  };
}
