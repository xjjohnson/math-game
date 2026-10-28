import type { AnswerRecord, Difficulty, GameConfig } from '@/types';
import { adjustDifficulty } from '@/utils/adaptive';
import {
  correctCount,
  highScoreKey,
  problemAt,
  sessionReducer,
  startSession,
  type SessionState,
} from '@/utils/gameSession';
import { answerValue, pointsFor, streakBonus, timeBonus } from '@/utils/scoring';

const config = (overrides: Partial<GameConfig> = {}): GameConfig => ({
  mode: { kind: 'operation', operation: 'add' },
  difficulty: 'easy',
  timer: null,
  adaptive: false,
  questionCount: 10,
  seed: 1234,
  ...overrides,
});

function answerRight(s: SessionState, secondsLeft: number | null = null): SessionState {
  return sessionReducer(
    sessionReducer(s, { type: 'answer', given: s.problem.answer, secondsLeft }),
    { type: 'next' },
  );
}

function answerWrong(s: SessionState): SessionState {
  return sessionReducer(
    sessionReducer(s, { type: 'answer', given: s.problem.answer + 1, secondsLeft: null }),
    { type: 'next' },
  );
}

const rec = (difficulty: Difficulty, correct: boolean): AnswerRecord => ({
  problem: { operation: 'add', a: 1, b: 1, answer: 2, prompt: '1 + 1', choices: [1, 2, 3, 4] },
  difficulty,
  given: correct ? 2 : 3,
  correct,
  points: 0,
});

describe('scoring', () => {
  it('gives streak bonuses from 3 in a row, capped', () => {
    expect([1, 2, 3, 4, 7, 20].map(streakBonus)).toEqual([0, 0, 5, 10, 25, 25]);
  });

  it('only gives time bonus on timed questions', () => {
    expect(timeBonus(null, 8)).toBe(0);
    expect(timeBonus(10, 7.6)).toBe(7);
    expect(timeBonus(10, -1)).toBe(0);
  });

  it('adds base, streak and time', () => {
    // × is worth 3, Hard adds 2, 4th grade adds 2: 7 coins, so 70 points.
    expect(pointsFor({ operation: 'multiply', difficulty: 'hard', grade: 4 }, 3, 30, 12.2)).toBe(70 + 5 + 12);
  });

  it('pays harder operations, levels and grades more', () => {
    const add = answerValue('add', 'easy', 0);
    const subtract = answerValue('subtract', 'easy', 0);
    const multiply = answerValue('multiply', 'easy', 0);
    const divide = answerValue('divide', 'easy', 0);
    expect(add).toBeLessThan(subtract);
    expect(subtract).toBeLessThan(multiply);
    expect(multiply).toBeLessThan(divide);
    expect(answerValue('add', 'medium', 0)).toBeGreaterThan(add);
    expect(answerValue('add', 'hard', 0)).toBeGreaterThan(answerValue('add', 'medium', 0));
    expect(answerValue('add', 'easy', 6)).toBeGreaterThan(add);
    expect(answerValue('add', 'easy')).toBe(add);
  });
});

describe('adjustDifficulty', () => {
  it('waits for a full window at the current level', () => {
    expect(adjustDifficulty('easy', Array(4).fill(rec('easy', true)))).toBe('easy');
  });

  it('steps up after 4 of 5 right and down after 2 of 5', () => {
    const up = [false, true, true, true, true].map((c) => rec('easy', c));
    expect(adjustDifficulty('easy', up)).toBe('medium');
    const down = [true, true, false, false, false].map((c) => rec('medium', c));
    expect(adjustDifficulty('medium', down)).toBe('easy');
    const stay = [true, true, true, false, false].map((c) => rec('medium', c));
    expect(adjustDifficulty('medium', stay)).toBe('medium');
  });

  it('ignores answers from before the last change and stays within bounds', () => {
    const mixed = [...Array(5).fill(rec('easy', true)), ...Array(3).fill(rec('medium', true))];
    expect(adjustDifficulty('medium', mixed)).toBe('medium');
    expect(adjustDifficulty('hard', Array(5).fill(rec('hard', true)))).toBe('hard');
    expect(adjustDifficulty('easy', Array(5).fill(rec('easy', false)))).toBe('easy');
  });
});

describe('game session', () => {
  it('plays a full round and finishes', () => {
    let s = startSession(config());
    for (let i = 0; i < 10; i++) s = answerRight(s);
    expect(s.phase).toBe('finished');
    expect(correctCount(s)).toBe(10);
    expect(s.bestStreak).toBe(10);
    expect(s.history).toHaveLength(10);
  });

  it('resets the streak on a wrong answer and keeps the best', () => {
    let s = startSession(config());
    s = answerRight(answerRight(answerRight(s)));
    s = answerWrong(s);
    s = answerRight(s);
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(3);
  });

  it('scores the streak bonus', () => {
    let s = startSession(config());
    s = answerRight(answerRight(answerRight(s)));
    expect(s.score).toBe(10 + 10 + 15);
  });

  it('counts a timeout as wrong with no answer', () => {
    let s = startSession(config({ timer: 10 }));
    s = sessionReducer(s, { type: 'timeout' });
    expect(s.phase).toBe('feedback');
    expect(s.history[0]).toMatchObject({ given: null, correct: false, points: 0 });
  });

  it('ignores a second answer to the same question', () => {
    let s = startSession(config());
    s = sessionReducer(s, { type: 'answer', given: s.problem.answer, secondsLeft: null });
    const again = sessionReducer(s, { type: 'answer', given: -1, secondsLeft: null });
    expect(again).toBe(s);
    expect(sessionReducer(s, { type: 'timeout' })).toBe(s);
  });

  it('raises the difficulty in adaptive mode', () => {
    let s = startSession(config({ adaptive: true }));
    for (let i = 0; i < 5; i++) s = answerRight(s);
    expect(s.difficulty).toBe('medium');
    expect(s.problem.a).toBeGreaterThanOrEqual(10);
  });

  it('keeps the difficulty fixed when adaptive is off', () => {
    let s = startSession(config());
    for (let i = 0; i < 6; i++) s = answerRight(s);
    expect(s.difficulty).toBe('easy');
  });

  it('times tables mode only uses the chosen tables', () => {
    const c = config({ mode: { kind: 'tables', tables: [6], includeDivision: false } });
    for (let i = 0; i < 50; i++) {
      const p = problemAt(c, i, 'easy');
      expect(p.a === 6 || p.b === 6).toBe(true);
    }
  });

  it('the same seed gives the same questions', () => {
    for (let i = 0; i < 10; i++) {
      expect(problemAt(config(), i, 'medium')).toEqual(problemAt(config(), i, 'medium'));
    }
  });

  it('builds distinct high score keys', () => {
    expect(highScoreKey(config({ timer: 10 }))).toBe('add:easy:10');
    expect(
      highScoreKey(config({ mode: { kind: 'tables', tables: [7, 3], includeDivision: true } })),
    ).toBe('tables-3-7-div:easy:none');
    expect(highScoreKey(config({ adaptive: true }))).toBe('add:easy:none:adaptive');
  });
});
