import { findSkill } from '@/utils/skills/catalog';
import { GRADES } from '@/constants/grades';
import type { AnswerRecord, Difficulty, GameConfig, Grade, Level, TimerSetting } from '@/types';
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
/** Right daily challenge answers given in under this many seconds pay the speed bonus. */
export const SPEEDY_SECONDS = 30;
/** Extra coins for each speedy right answer in the daily challenge. */
export const SPEEDY_COINS = 2;
/** Extra star when at least DAILY_PASS right answers were speedy. */
export const SPEEDY_STARS = 1;
/** Each star a round earns counts this many times toward the player's stars. */
export const STAR_MULTIPLIER: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export interface RoundRewards {
  /** Total coins earned, including all bonuses below. */
  coins: number;
  streakBonusCoins: number;
  dailyBonusCoins: number;
  /** Daily challenge only: right answers given in under SPEEDY_SECONDS. */
  speedyAnswers: number;
  /** SPEEDY_COINS for each speedy answer (included in `coins`). */
  speedBonusCoins: number;
  /** SPEEDY_STARS when DAILY_PASS or more answers were speedy (included in `starsEarned`). */
  speedBonusStars: number;
  /** 0 to 3 stars for the round's accuracy. */
  stars: number;
  /** How much each of those stars is worth at this round's difficulty. */
  starMultiplier: number;
  /** Stars added to the player's total: stars × starMultiplier, plus the speed bonus star. */
  starsEarned: number;
}

/** Coins one right answer pays: harder operations, levels and grades pay more. */
export function coinsForAnswer(record: Pick<AnswerRecord, 'problem' | 'difficulty' | 'grade'>): number {
  return answerValue(record.problem.operation, record.difficulty, record.grade) + (findSkill(record.problem.skill)?.bonus ?? 0);
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
  // The speed bonus pays alongside the daily bonus, so only once a day too.
  const speedyAnswers =
    isDaily && !dailyAlreadyEarned ? correct.filter((r) => r.seconds !== undefined && r.seconds < SPEEDY_SECONDS).length : 0;
  const speedBonusCoins = speedyAnswers * SPEEDY_COINS;
  const speedBonusStars = speedyAnswers >= DAILY_PASS ? SPEEDY_STARS : 0;
  const stars = starsFor(correct.length, history.length);
  const starMultiplier = roundStarMultiplier(history);
  return {
    coins: base + streakBonusCoins + dailyBonusCoins + speedBonusCoins,
    streakBonusCoins,
    dailyBonusCoins,
    speedyAnswers,
    speedBonusCoins,
    speedBonusStars,
    stars,
    starMultiplier,
    starsEarned: stars * starMultiplier + speedBonusStars,
  };
}

/**
 * Seconds per daily challenge question: 90 for Kindergarten to 2nd grade (still
 * counting on fingers and reading the question), 60 from 3rd grade up.
 */
export function dailySeconds(grade: Grade): TimerSetting {
  return grade <= 2 ? 90 : 60;
}

/**
 * Today's challenge: the operation is picked from the date out of what the
 * player's grade teaches, at the difficulty they last played. 60 or 90 seconds
 * per question (see dailySeconds); answers under SPEEDY_SECONDS pay a speed bonus.
 */
export function dailyChallengeConfig(today: string, level: Level): GameConfig {
  const seed = dateSeed(today);
  return {
    // The day's area is the same for everyone in a grade; the skills inside it are picked per player.
    mode: { kind: 'skills', strands: [pick(createRng(seed), GRADES[level.grade].daily ?? GRADES[level.grade].taught)] },
    difficulty: level.difficulty,
    grade: level.grade,
    timer: dailySeconds(level.grade),
    adaptive: false,
    questionCount: QUESTIONS_PER_ROUND,
    seed,
    dailyDate: today,
  };
}
