import { SHOP_ITEMS } from '@/constants/shop';
import { makeProfile, results } from '@/test/fixtures';
import { newBadges } from '@/utils/badges';
import { applyRound } from '@/utils/progress';
import { backgroundColor, buyItem, equipItem, isEquipped, owns } from '@/utils/shop';
import { allGoalsMet, recordWeek, WEEKLY_GOAL_BONUS, weekKey } from '@/utils/weekly';

const today = '2026-10-22'; // a Thursday

describe('shop catalog', () => {
  it('has unique ids and at least one free default per equip slot', () => {
    const ids = SHOP_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SHOP_ITEMS.some((i) => i.category === 'background' && i.price === 0)).toBe(true);
    expect(SHOP_ITEMS.some((i) => i.category === 'cardStyle' && i.price === 0)).toBe(true);
  });
});

describe('buying and equipping', () => {
  it('spends coins, unlocks, equips and awards the Shopper badge once', () => {
    const first = buyItem(makeProfile({ coins: 100 }), 'bg-sky');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.profile.coins).toBe(60);
    expect(first.profile.unlocks).toEqual(['bg-sky']);
    expect(first.profile.equipped.background).toBe('bg-sky');
    expect(backgroundColor(first.profile)).toBe('#E3F2FD');
    expect(first.newBadges).toEqual(['shopper']);

    const second = buyItem(first.profile, 'avatar-cat');
    expect(second.ok && second.newBadges).toEqual([]);
    expect(second.ok && second.profile.avatar).toBe('🐱');
  });

  it('refuses when short of coins or already owned', () => {
    expect(buyItem(makeProfile({ coins: 10 }), 'bg-sky')).toEqual({ ok: false, reason: 'coins' });
    expect(buyItem(makeProfile({ coins: 999, unlocks: ['bg-sky'] }), 'bg-sky')).toEqual({
      ok: false,
      reason: 'owned',
    });
    expect(buyItem(makeProfile({ coins: 999 }), 'bg-cream')).toEqual({ ok: false, reason: 'owned' });
    expect(buyItem(makeProfile({ coins: 999 }), 'nope')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('only equips owned items, and toggles the buddy off again', () => {
    const p = makeProfile();
    expect(equipItem(p, 'card-gold')).toBe(p);
    const withPup = equipItem(makeProfile({ unlocks: ['buddy-pup'] }), 'buddy-pup');
    expect(withPup.equipped.companion).toBe('buddy-pup');
    expect(equipItem(withPup, 'buddy-pup').equipped.companion).toBeNull();
  });

  it('treats free items as owned and knows what is in use', () => {
    const p = makeProfile();
    const classic = SHOP_ITEMS.find((i) => i.id === 'card-classic')!;
    expect(owns(p, classic)).toBe(true);
    expect(isEquipped(p, classic)).toBe(true);
  });
});

describe('weekly goals', () => {
  it('starts weeks on Sunday', () => {
    expect(weekKey('2026-10-22')).toBe('2026-10-18');
    expect(weekKey('2026-10-18')).toBe('2026-10-18');
    expect(weekKey('2026-10-24')).toBe('2026-10-18');
  });

  it('adds rounds, starts fresh each week, and completes once', () => {
    let { week } = recordWeek(null, today, 9);
    expect(week).toMatchObject({ week: '2026-10-18', correct: 9, rounds: 1, days: [today] });

    week = { ...week, correct: 95, rounds: 9, days: ['a', 'b', 'c', today] };
    const done = recordWeek(week, today, 9);
    expect(done.justCompleted).toBe(true);
    expect(allGoalsMet(done.week)).toBe(true);
    expect(recordWeek(done.week, today, 9).justCompleted).toBe(false);

    const nextWeek = recordWeek(done.week, '2026-10-25', 5);
    expect(nextWeek.week).toMatchObject({ week: '2026-10-25', correct: 5, rounds: 1, completed: false });
  });

  it('pays the weekly bonus through applyRound', () => {
    const p = makeProfile({
      week: { week: '2026-10-18', correct: 95, rounds: 9, days: ['x', 'y', 'z'], completed: false },
    });
    const { profile, outcome } = applyRound(
      p,
      { highScoreKey: 'k', score: 1, bestStreak: 1, history: results('1111100000'), difficulty: 'easy' },
      today,
    );
    expect(outcome.weeklyBonusCoins).toBe(WEEKLY_GOAL_BONUS);
    expect(outcome.newBadges).toContain('weekly');
    expect(profile.coins).toBe(outcome.coins);
  });
});

describe('badges', () => {
  const ctx = {
    history: results('1111111111'),
    difficulty: 'hard' as const,
    stars: 3,
    wonDaily: true,
    weeklyCompleted: false,
    today,
  };

  it('awards what was earned and never repeats', () => {
    const p = makeProfile({
      bestStreak: 10,
      playDates: ['2026-10-20', '2026-10-21', today],
      stats: {
        add: { attempted: 1, correct: 1 },
        subtract: { attempted: 1, correct: 1 },
        multiply: { attempted: 1, correct: 1 },
        divide: { attempted: 1, correct: 0 },
      },
    });
    expect(newBadges(p, ctx).sort()).toEqual(
      ['all-ops', 'daily', 'days-3', 'first-round', 'hard', 'perfect', 'streak-10'].sort(),
    );
    const again = makeProfile({ ...p, badges: newBadges(p, ctx) });
    expect(newBadges(again, ctx)).toEqual([]);
  });

  it('gives nothing extra for an ordinary first round', () => {
    expect(
      newBadges(makeProfile(), { ...ctx, history: results('1100'), difficulty: 'easy', stars: 1, wonDaily: false }),
    ).toEqual(['first-round']);
  });
});
