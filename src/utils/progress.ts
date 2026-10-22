import type { AnswerRecord, Difficulty, Profile } from '@/types';
import { newBadges } from '@/utils/badges';
import { roundRewards, type RoundRewards } from '@/utils/rewards';
import { recordWeek, WEEKLY_GOAL_BONUS } from '@/utils/weekly';

export interface RoundResult {
  highScoreKey: string;
  score: number;
  bestStreak: number;
  history: AnswerRecord[];
  /** Difficulty the round started at. */
  difficulty: Difficulty;
  /** Set when the round was the daily challenge. */
  dailyDate?: string;
}

export interface RoundOutcome extends RoundRewards {
  newHighScore: boolean;
  /** Paid on the round that completes every weekly goal; included in `coins`. */
  weeklyBonusCoins: number;
  /** Badge ids earned by this round. */
  newBadges: string[];
}

/**
 * Applies a finished round to a profile: stats, best streak, high score, coins,
 * stars, the day's play date, the daily challenge, weekly goals and badges.
 * Pure, so it can be tested.
 */
export function applyRound(
  profile: Profile,
  round: RoundResult,
  today: string,
): { profile: Profile; outcome: RoundOutcome } {
  const stats = { ...profile.stats };
  for (const r of round.history) {
    const op = r.problem.operation;
    stats[op] = {
      attempted: stats[op].attempted + 1,
      correct: stats[op].correct + (r.correct ? 1 : 0),
    };
  }

  const previous = profile.highScores[round.highScoreKey] ?? 0;
  const isDaily = round.dailyDate === today;
  const rewards = roundRewards(round.history, isDaily, profile.dailyChallengeDate === today);
  const playDates = profile.playDates.includes(today)
    ? profile.playDates
    : [...profile.playDates, today];

  const correct = round.history.filter((r) => r.correct).length;
  const { week, justCompleted } = recordWeek(profile.week, today, correct);
  const weeklyBonusCoins = justCompleted ? WEEKLY_GOAL_BONUS : 0;

  const updated: Profile = {
    ...profile,
    stats,
    bestStreak: Math.max(profile.bestStreak, round.bestStreak),
    highScores: { ...profile.highScores, [round.highScoreKey]: Math.max(previous, round.score) },
    coins: profile.coins + rewards.coins + weeklyBonusCoins,
    stars: profile.stars + rewards.stars,
    playDates,
    dailyChallengeDate: rewards.dailyBonusCoins > 0 ? today : profile.dailyChallengeDate,
    // The daily challenge shouldn't change what the next one is based on.
    lastDifficulty: isDaily ? profile.lastDifficulty : round.difficulty,
    week,
  };

  const earned = newBadges(updated, {
    history: round.history,
    difficulty: round.difficulty,
    stars: rewards.stars,
    wonDaily: rewards.dailyBonusCoins > 0,
    weeklyCompleted: justCompleted,
    today,
  });

  return {
    profile: { ...updated, badges: [...updated.badges, ...earned] },
    outcome: {
      ...rewards,
      coins: rewards.coins + weeklyBonusCoins,
      weeklyBonusCoins,
      newHighScore: round.score > previous,
      newBadges: earned,
    },
  };
}

/** Accuracy as a whole percent, or null before anything has been tried. */
export function accuracy(stats: { attempted: number; correct: number }): number | null {
  if (stats.attempted === 0) return null;
  return Math.round((stats.correct / stats.attempted) * 100);
}
