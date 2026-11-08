import { makeProfile } from '@/test/fixtures';
import { applyRound } from '@/utils/progress';
import { grantStarRewards, levelsReached, STAR_LEVELS, starProgress } from '@/utils/starLevels';
import { findItem } from '@/constants/shop';
import { results } from '@/test/fixtures';

describe('star levels', () => {
  it('every reward is a real, priced shop item', () => {
    for (const l of STAR_LEVELS) {
      if (!l.reward) continue;
      const item = findItem(l.reward);
      expect(item).toBeDefined();
      expect(item!.price).toBeGreaterThan(0);
    }
  });

  it('reports level and progress to the next one', () => {
    expect(starProgress(0)).toMatchObject({ level: 1, into: 0, span: 10 });
    expect(starProgress(30)).toMatchObject({ level: 3, into: 5, span: 25 });
    expect(starProgress(9999)).toMatchObject({ level: STAR_LEVELS.length, next: null });
  });

  it('grants each reward once, and only what stars reached', () => {
    const p = makeProfile({ stars: 30 });
    const first = grantStarRewards(p);
    expect(first.profile.unlocks).toEqual(expect.arrayContaining(['bg-sky', 'card-gold']));
    expect(first.profile.unlocks).not.toContain('buddy-panda');
    expect(grantStarRewards(first.profile).newLevels).toHaveLength(0);
  });

  it('finds levels crossed between two totals', () => {
    expect(levelsReached(8, 27).map((l) => l.title)).toEqual(['Counting Cub', 'Sum Scout']);
    expect(levelsReached(10, 10)).toEqual([]);
  });

  it('a round that crosses a level unlocks its reward', () => {
    const p = makeProfile({ stars: 9 });
    const { profile, outcome } = applyRound(
      p,
      { highScoreKey: 'k', score: 0, bestStreak: 10, history: results('1111111111'), difficulty: 'easy' },
      '2026-01-01',
    );
    expect(outcome.newStarLevels.map((l) => l.title)).toContain('Counting Cub');
    expect(profile.unlocks).toContain('bg-sky');
  });
});
