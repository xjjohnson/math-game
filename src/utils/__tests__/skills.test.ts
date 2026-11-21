import { makeProfile } from '@/test/fixtures';
import type { AnswerRecord, GameConfig, Problem } from '@/types';
import { problemAt } from '@/utils/gameSession';
import { createRng } from '@/utils/seededRandom';
import { regroupCount, tradesAcrossZero } from '@/utils/skills/arithmetic';
import { findSkill, SKILLS } from '@/utils/skills/catalog';
import { frontier, isLearned, knows, planRound, recordSkills, withPlan } from '@/utils/skills/plan';

const many = (id: string, n = 200): Problem[] => {
  const skill = findSkill(id)!;
  const rng = createRng(42);
  return Array.from({ length: n }, () => skill.make(rng));
};

describe('every skill makes sound questions', () => {
  it.each(SKILLS.map((s) => s.id))('%s', (id) => {
    for (const p of many(id, 120)) {
      expect(p.skill).toBe(id);
      expect(Number.isFinite(p.answer)).toBe(true);
      expect(p.choices).toContain(p.answer);
      expect(new Set(p.choices).size).toBe(p.choices.length);
      expect(p.choices.length).toBeGreaterThanOrEqual(2);
      if (p.choiceOnly) {
        for (const c of p.choices) {
          expect(p.labels?.[c]).toBeTruthy();
          expect(Number.isInteger(c)).toBe(true);
        }
      } else {
        expect(Number.isInteger(p.answer)).toBe(true);
        // Negative answers only come in from 4th grade up (they're allowed there on the hardest level).
        if (findSkill(id)!.grade < 4) expect(p.answer).toBeGreaterThanOrEqual(0);
        expect(p.choices.length).toBe(4);
      }
      expect(p.ask || p.prompt).toBeTruthy();
    }
  });
});

describe('regrouping ladders', () => {
  const counts = (id: string) => many(id).map((p) => regroupCount(p));

  it('no-trade questions never trade', () => {
    expect(counts('g2-sub-2d').every((c) => c === 0)).toBe(true);
    expect(counts('g2-add-2d').every((c) => c === 0)).toBe(true);
  });

  it('one-trade questions trade exactly once', () => {
    for (const id of ['g2-sub-trade-1d', 'g2-sub-trade', 'g2-sub-3d-once', 'g2-add-bundle']) {
      expect(counts(id).every((c) => c === 1)).toBe(true);
    }
  });

  it('trade-twice questions trade twice, with no zero in the tens', () => {
    for (const p of many('g2-sub-3d-twice')) {
      expect(regroupCount(p)).toBe(2);
      expect(Math.floor(p.a / 10) % 10).not.toBe(0);
    }
  });

  it('across-zero questions trade across a zero', () => {
    for (const p of many('g2-sub-zero')) {
      expect(tradesAcrossZero(p.a, p.b)).toBe(true);
      expect(p.answer).toBeGreaterThan(0);
    }
  });

  it('3-digit adding stays under 1,000 and bundles', () => {
    for (const p of many('g2-add-3d')) {
      expect(p.answer).toBeLessThan(1000);
      expect(regroupCount(p)).toBeGreaterThanOrEqual(1);
    }
  });

  it('within-10 and within-20 facts stay in range', () => {
    for (const p of many('k-add-10')) expect(p.answer).toBeLessThanOrEqual(10);
    for (const p of many('k-sub-10')) expect(p.answer).toBeGreaterThanOrEqual(0);
    for (const p of many('g1-add-20')) expect(p.answer).toBeLessThanOrEqual(20);
    for (const p of many('g1-sub-20')) expect(p.a).toBeLessThanOrEqual(20);
  });
});

const answer = (skill: string, correct: boolean): AnswerRecord => ({
  problem: { ...findSkill(skill)!.make(createRng(1)) },
  difficulty: 'medium',
  given: correct ? 0 : null,
  correct,
  points: 0,
});

describe('skill records', () => {
  it('learns a skill at 8 of the last 10, or the first 5 right', () => {
    expect(isLearned({ recent: '11111' })).toBe(true);
    expect(isLearned({ recent: '1101111011' })).toBe(true);
    expect(isLearned({ recent: '1100111011' })).toBe(false);
  });

  it('records answers and reports newly learned skills once', () => {
    const history = Array.from({ length: 5 }, () => answer('g2-sub-trade', true));
    const first = recordSkills({}, history, '2026-11-21');
    expect(first.learned).toEqual(['g2-sub-trade']);
    expect(first.skills['g2-sub-trade']).toMatchObject({ tries: 5, right: 5, learned: true, learnedOn: '2026-11-21' });
    const again = recordSkills(first.skills, history, '2026-11-22');
    expect(again.learned).toEqual([]);
  });

  it('loses a skill that gets shaky, then gets it back without paying twice', () => {
    let { skills } = recordSkills({}, Array.from({ length: 5 }, () => answer('g2-sub-trade', true)), 'd1');
    ({ skills } = recordSkills(skills, Array.from({ length: 4 }, () => answer('g2-sub-trade', false)), 'd2'));
    expect(skills['g2-sub-trade'].learned).toBe(false);
    const back = recordSkills(skills, Array.from({ length: 8 }, () => answer('g2-sub-trade', true)), 'd3');
    expect(back.skills['g2-sub-trade'].learned).toBe(true);
    expect(back.learned).toEqual([]);
  });
});

describe('what to practise', () => {
  it('treats earlier grades as known and starts at the first skill of the grade', () => {
    const second = makeProfile({ grade: 2 });
    expect(knows(second, findSkill('g1-add-20')!)).toBe(true);
    expect(knows(second, findSkill('g2-sub-trade')!)).toBe(false);
    expect(frontier(second, ['subtract'])[0].id).toBe('g2-sub-2d');
  });

  it('moves along the ladder as skills are learned', () => {
    const second = makeProfile({
      grade: 2,
      skills: {
        'g2-sub-2d': { recent: '11111', tries: 5, right: 5, learned: true },
        'g2-sub-trade-1d': { recent: '11111111', tries: 8, right: 8, learned: true },
      },
    });
    expect(frontier(second, ['subtract'])[0].id).toBe('g2-sub-trade');
  });

  it('goes back to an earlier-grade skill that keeps going wrong', () => {
    const second = makeProfile({ grade: 2, skills: { 'g1-sub-20': { recent: '00010', tries: 5, right: 1, learned: false } } });
    expect(frontier(second, ['subtract'])[0].id).toBe('g1-sub-20');
  });

  it('plans a round of mostly the skill being learned, the same for the same seed', () => {
    const second = makeProfile({ grade: 2 });
    const plan = planRound(second, { strands: ['subtract'], difficulty: 'medium', count: 10, seed: 9 });
    expect(plan).toHaveLength(10);
    expect(plan.filter((id) => id === 'g2-sub-2d').length).toBeGreaterThanOrEqual(7);
    expect(planRound(second, { strands: ['subtract'], difficulty: 'medium', count: 10, seed: 9 })).toEqual(plan);
  });

  it('a kindergartner starts at the beginning', () => {
    const k = makeProfile({ grade: 0 });
    const plan = planRound(k, { difficulty: 'medium', count: 10, seed: 3 });
    for (const id of plan) expect(findSkill(id)!.grade).toBe(0);
  });

  it('worksheets only get number answers', () => {
    const config: GameConfig = {
      mode: { kind: 'skills' },
      difficulty: 'medium',
      grade: 1,
      timer: null,
      adaptive: false,
      questionCount: 10,
      seed: 5,
      worksheet: true,
    };
    const planned = withPlan(config, makeProfile({ grade: 1 }));
    for (let i = 0; i < 10; i++) {
      const p = problemAt(planned, i, 'medium');
      expect(p.choiceOnly).toBeFalsy();
      expect(p.flashMs).toBeFalsy();
    }
  });
});
