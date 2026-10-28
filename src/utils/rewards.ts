import { GRADES } from '@/constants/grades';
import type { AnswerRecord, Difficulty, GameConfig, Level } from '@/types';
import { dateSeed } from '@/utils/dates';
import { QUESTIONS_PER_ROUND } from '@/utils/gameSession';
import { answerValue } from '@/utils/scoring';
import { createRng, pick } from '@/utils/seededRandom';

/** Every 5 right in a row pays a bonus. */
export const STREAK_MILESTONE = 5;
export const STREAK_MILESTONE_COINS = 5;
export const DAILY_CHALLENGE_BONUS = 25;
/** Right answers needed (out of 10) to earn the daily challenge bonus. */
export const DAILY_PASS = 7;
/** Each star a round earns counts this many times toward the player's stars. */
export const STAR_MULTIPLIER: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export interface RoundRewards {
  /** Total coins earned, including all bonuses below. */
  coins: number;
  streakBonusCoins: number;
  dailyBonusCoins: number;
  /** 0 to 3 stars for the round's accuracy. */
  stars: number;
  /** How much each of those stars is worth at this round's difficulty. */
  starMultiplier: number;
  /** Stars added to the player's total: stars × starMultiplier. */
  starsEarned: number;
}

/** Coins one right answer pays: harder operations, levels and grades pay more. */
export function coinsForAnswer(record: Pick<AnswerRecord, 'problem' | 'difficulty' | 'grade'>): number {
  return answerValue(record.problem.operation, record.difficulty, record.grade);
}

export function starsFor(correct: number, total: number): number {
  if (total === 0) return 0;
  const accuracy = correct / total;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  if (accuracy >= 0.5) return 1;
  return 0;
}

/** The star multiplier for the difficulty most of the round was played at. */
export function roundStarMultiplier(history: readonly AnswerRecord[]): number {
  if (history.length === 0) return 1;
  const total = history.reduce((sum, r) => sum + STAR_MULTIPLIER[r.difficulty], 0);
  return Math.round(total / history.length);
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
 * paying twice on the same day. `coinPayout` is the parent's setting that scales
 * the coins each right answer pays (bonuses stay the same).
 */
export function roundRewards(
  history: readonly AnswerRecord[],
  isDaily: boolean,
  dailyAlreadyEarned: boolean,
  coinPayout = 1,
): RoundRewards {
  const correct = history.filter((r) => r.correct);
  const base = Math.round(correct.reduce((sum, r) => sum + coinsForAnswer(r), 0) * coinPayout);
  const streakBonusCoins = streakMilestones(history) * STREAK_MILESTONE_COINS;
  const dailyBonusCoins =
    isDaily && !dailyAlreadyEarned && correct.length >= DAILY_PASS ? DAILY_CHALLENGE_BONUS : 0;
  const stars = starsFor(correct.length, history.length);
  const starMultiplier = roundStarMultiplier(history);
  return {
    coins: base + streakBonusCoins + dailyBonusCoins,
    streakBonusCoins,
    dailyBonusCoins,
    stars,
    starMultiplier,
    starsEarned: stars * starMultiplier,
  };
}

/**
 * Today's challenge: the operation is picked from the date out of what the
 * player's grade teaches, at the difficulty they last played. 30 seconds per question.
 */
export function dailyChallengeConfig(today: string, level: Level): GameConfig {
  const seed = dateSeed(today);
  return {
    mode: { kind: 'operation', operation: pick(createRng(seed), GRADES[level.grade].taught) },
    difficulty: level.difficulty,
    grade: level.grade,
    timer: 30,
    adaptive: false,
    questionCount: QUESTIONS_PER_ROUND,
    seed,
    dailyDate: today,
  };
}
