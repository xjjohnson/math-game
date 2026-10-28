import { makeProfile, results } from '@/test/fixtures';
import type { AnswerRecord } from '@/types';
import { addDays, dateKey, dayStreak } from '@/utils/dates';
import { accuracy, applyRound, type RoundResult } from '@/utils/progress';
import {
  DAILY_CHALLENGE_BONUS,
  dailyChallengeConfig,
  roundRewards,
  starsFor,
  streakMilestones,
} from '@/utils/rewards';

const profile = makeProfile;

const round = (history: AnswerRecord[], overrides: Partial<RoundResult> = {}): RoundResult => ({
  highScoreKey: 'multiply:easy:none',
  score: 100,
  bestStreak: 3,
  history,
  difficulty: 'easy',
  ...overrides,
});

describe('dates', () => {
  it('formats local dates and adds days across month ends', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days in a row, allowing today not to be played yet', () => {
    const days = ['2026-10-18', '2026-10-20', '2026-10-21'];
    expect(dayStreak(days, '2026-10-21')).toBe(2);
    expect(dayStreak(days, '2026-10-22')).toBe(2);
    expect(dayStreak(days, '2026-10-23')).toBe(0);
    expect(dayStreak([], '2026-10-23')).toBe(0);
  });
});

describe('rewards', () => {
  it('gives stars by accuracy', () => {
    expect([10, 9, 7, 6, 5, 4].map((c) => starsFor(c, 10))).toEqual([3, 3, 2, 1, 1, 0]);
    expect(starsFor(0, 0)).toBe(0);
  });

  it('counts streak milestones every 5 in a row', () => {
    expect(streakMilestones(results('1111111111'))).toBe(2);
    expect(streakMilestones(results('1111011110'))).toBe(0);
    expect(streakMilestones(results('0111110000'))).toBe(1);
  });

  it('pays coins by difficulty plus streak bonuses', () => {
    // Hard × with no grade: 3 for ×, 2 for Hard.
    expect(roundRewards(results('1111100000', 'hard'), false, false)).toEqual({
      coins: 5 * (3 + 2) + 5,
      streakBonusCoins: 5,
      dailyBonusCoins: 0,
      stars: 1,
      starMultiplier: 3,
      starsEarned: 3,
    });
  });

  it('pays the daily bonus once, only with enough right', () => {
    expect(roundRewards(results('1111111000'), true, false).dailyBonusCoins).toBe(DAILY_CHALLENGE_BONUS);
    expect(roundRewards(results('1111110000'), true, false).dailyBonusCoins).toBe(0);
    expect(roundRewards(results('1111111111'), true, true).dailyBonusCoins).toBe(0);
    expect(roundRewards(results('1111111111'), false, false).dailyBonusCoins).toBe(0);
  });

  it('gives everyone the same daily challenge on a date', () => {
    const a = dailyChallengeConfig('2026-10-22', { grade: 3, difficulty: 'easy' });
    expect(dailyChallengeConfig('2026-10-22', { grade: 3, difficulty: 'easy' })).toEqual(a);
    expect(a).toMatchObject({ timer: 30, dailyDate: '2026-10-22', adaptive: false, grade: 3 });
  });

  it("only picks what the player's grade teaches for the daily challenge", () => {
    for (let day = 1; day <= 28; day++) {
      const date = `2026-02-${String(day).padStart(2, '0')}`;
      const config = dailyChallengeConfig(date, { grade: 0, difficulty: 'easy' });
      expect(config.mode).toMatchObject({ kind: 'operation' });
      expect(['add', 'subtract']).toContain((config.mode as { operation: string }).operation);
    }
  });
});

describe('applyRound', () => {
  const today = '2026-10-22';

  it('adds coins, stars, stats, and the play date once', () => {
    let p = profile();
    const r = round(results('1111111110'));
    ({ profile: p } = applyRound(p, r, today));
    const second = applyRound(p, r, today);
    p = second.profile;
    expect(p.playDates).toEqual([today]);
    // Fixture answers are easy × with no grade: 3 coins each, plus 5 for a streak of 5.
    expect(p.coins).toBe(2 * (9 * 3 + 5));
    expect(p.stars).toBe(6);
    expect(p.stats.multiply).toEqual({ attempted: 20, correct: 18 });
    expect(accuracy(p.stats.multiply)).toBe(90);
    expect(accuracy(p.stats.add)).toBeNull();
  });

  it('counts each star more on harder levels', () => {
    const hard = applyRound(profile(), round(results('1111111111', 'hard')), today);
    expect(hard.outcome.stars).toBe(3);
    expect(hard.outcome.starMultiplier).toBe(3);
    expect(hard.profile.stars).toBe(9);
    const medium = applyRound(profile(), round(results('1111111111', 'medium')), today);
    expect(medium.profile.stars).toBe(6);
  });

  it("scales answer coins by the parent's payout, but not bonuses", () => {
    const r = round(results('1111'));
    expect(applyRound(profile(), r, today, 2).outcome.coins).toBe(4 * 3 * 2);
    expect(applyRound(profile(), r, today, 0.5).outcome.coins).toBe(6);
    const streak = round(results('11111'));
    expect(applyRound(profile(), streak, today, 2).outcome.coins).toBe(5 * 3 * 2 + 5);
  });

  it('reports a new high score only when beaten', () => {
    const first = applyRound(profile(), round(results('1')), today);
    expect(first.outcome.newHighScore).toBe(true);
    const tie = applyRound(first.profile, round(results('1')), today);
    expect(tie.outcome.newHighScore).toBe(false);
  });

  it('marks the daily challenge done and does not pay twice', () => {
    const daily = round(results('1111111111'), { dailyDate: today, highScoreKey: `daily:${today}` });
    const first = applyRound(profile(), daily, today);
    expect(first.outcome.dailyBonusCoins).toBe(DAILY_CHALLENGE_BONUS);
    expect(first.profile.dailyChallengeDate).toBe(today);
    const again = applyRound(first.profile, daily, today);
    expect(again.outcome.dailyBonusCoins).toBe(0);
  });

  it("does not pay yesterday's challenge today", () => {
    const stale = round(results('1111111111'), { dailyDate: '2026-10-21' });
    expect(applyRound(profile(), stale, today).outcome.dailyBonusCoins).toBe(0);
  });

  it('remembers the last difficulty, except after the daily challenge', () => {
    const hard = applyRound(profile(), round(results('1'), { difficulty: 'hard' }), today).profile;
    expect(hard.lastDifficulty).toBe('hard');
    const afterDaily = applyRound(
      hard,
      round(results('1'), { difficulty: 'easy', dailyDate: today }),
      today,
    ).profile;
    expect(afterDaily.lastDifficulty).toBe('hard');
  });
});
