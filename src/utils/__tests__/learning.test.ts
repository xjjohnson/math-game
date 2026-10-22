import { rec } from '@/test/fixtures';
import type { AnswerRecord, Difficulty, GameConfig, Operation } from '@/types';
import { highScoreKey, problemAt } from '@/utils/gameSession';
import { generate } from '@/utils/mathEngine';
import { createRng } from '@/utils/seededRandom';
import { factKey, MAX_MISSED, reviewConfig, trickiest, updateMissed } from '@/utils/weakSpots';
import { toWordProblem } from '@/utils/wordProblems';

const today = '2026-10-22';

const answer = (a: number, b: number, correct: boolean): AnswerRecord => ({
  ...rec(correct),
  problem: { operation: 'multiply', a, b, answer: a * b, prompt: `${a} × ${b}`, choices: [] },
});

describe('weak spots', () => {
  it('adds misses, counts repeats, and clears after two right in a row', () => {
    let missed = updateMissed({}, [answer(7, 8, false), answer(6, 7, true)], today);
    expect(Object.keys(missed)).toEqual(['multiply:7:8']);
    missed = updateMissed(missed, [answer(7, 8, false)], '2026-10-23');
    expect(missed['multiply:7:8']).toMatchObject({ misses: 2, rightInARow: 0, lastMissed: '2026-10-23' });

    missed = updateMissed(missed, [answer(7, 8, true)], today);
    expect(missed['multiply:7:8'].rightInARow).toBe(1);
    missed = updateMissed(missed, [answer(7, 8, false)], today);
    expect(missed['multiply:7:8'].rightInARow).toBe(0);
    missed = updateMissed(missed, [answer(7, 8, true), answer(7, 8, true)], today);
    expect(missed).toEqual({});
  });

  it('keeps only the trickiest facts once the list is full', () => {
    const history = Array.from({ length: MAX_MISSED + 5 }, (_, i) => answer(i + 2, 3, false));
    const missed = updateMissed({}, [...history, answer(2, 3, false)], today);
    expect(Object.keys(missed)).toHaveLength(MAX_MISSED);
    expect(trickiest(missed, 1)[0]).toMatchObject({ a: 2, b: 3, misses: 2 });
  });

  it('builds a review round from the trickiest facts, or none when empty', () => {
    expect(reviewConfig({}, 1)).toBeNull();
    const missed = updateMissed({}, [answer(7, 8, false), answer(9, 6, false)], today);
    const config = reviewConfig(missed, 5)!;
    expect(config.mode.kind).toBe('review');
    const asked = Array.from({ length: 10 }, (_, i) => problemAt(config, i, 'easy'));
    expect(new Set(asked.map(factKey))).toEqual(new Set(['multiply:7:8', 'multiply:9:6']));
    asked.forEach((p) => expect(p.choices).toContain(p.answer));
    expect(highScoreKey(config)).toBe('review');
  });
});

describe('word problems', () => {
  const ops: Operation[] = ['add', 'subtract', 'multiply', 'divide'];
  const levels: Difficulty[] = ['easy', 'medium', 'hard'];

  it('tells a story with the same numbers and a whole, non-negative answer', () => {
    for (const op of ops) {
      for (const level of levels) {
        for (let seed = 0; seed < 300; seed++) {
          const rng = createRng(seed);
          const p = toWordProblem(generate(op, level, rng), rng);
          expect(p.story).toBeTruthy();
          expect(p.story).toContain(String(p.a));
          expect(p.story).toContain(String(p.b));
          expect(p.answer).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(p.answer)).toBe(true);
          expect(p.choices).toContain(p.answer);
        }
      }
    }
  });

  it('flips a negative subtraction so the story makes sense', () => {
    const p = toWordProblem(
      { operation: 'subtract', a: 120, b: 450, answer: -330, prompt: '120 − 450', choices: [] },
      createRng(1),
    );
    expect(p).toMatchObject({ a: 450, b: 120, answer: 330, prompt: '450 − 120' });
  });

  it('is used by rounds with word problems switched on', () => {
    const config: GameConfig = {
      mode: { kind: 'operation', operation: 'add' },
      difficulty: 'medium',
      timer: null,
      adaptive: false,
      questionCount: 10,
      seed: 9,
      wordProblems: true,
    };
    expect(problemAt(config, 0, 'medium').story).toBeTruthy();
    expect(problemAt(config, 0, 'medium')).toEqual(problemAt(config, 0, 'medium'));
    expect(highScoreKey(config)).toBe('add-words:medium:none');
  });
});
