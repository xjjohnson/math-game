import { DIFFICULTIES } from '@/constants/difficulty';
import { GRADE_LIST, levelConfig } from '@/constants/grades';
import type { Difficulty, Grade, Operation } from '@/types';
import {
  CHOICE_COUNT,
  generate,
  generateChoices,
  generateDeck,
  generateTimesTable,
} from '@/utils/mathEngine';
import { createRng } from '@/utils/seededRandom';

const OPS: Operation[] = ['add', 'subtract', 'multiply', 'divide'];
const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const SEEDS = 2000;

function forEverySeed(fn: (seed: number) => void) {
  for (let seed = 0; seed < SEEDS; seed++) fn(seed);
}

describe('generate', () => {
  it.each(LEVELS)('every division result is a whole number (%s)', (difficulty) => {
    forEverySeed((seed) => {
      const p = generate('divide', difficulty, createRng(seed));
      expect(Number.isInteger(p.answer)).toBe(true);
      expect(p.a / p.b).toBe(p.answer);
      expect(p.b).toBeGreaterThan(0);
    });
  });

  it.each(['easy', 'medium'] as Difficulty[])('subtraction is never negative (%s)', (difficulty) => {
    forEverySeed((seed) => {
      const p = generate('subtract', difficulty, createRng(seed));
      expect(p.answer).toBeGreaterThanOrEqual(0);
    });
  });

  it('answers are correct for every operation and level', () => {
    const solve: Record<Operation, (a: number, b: number) => number> = {
      add: (a, b) => a + b,
      subtract: (a, b) => a - b,
      multiply: (a, b) => a * b,
      divide: (a, b) => a / b,
    };
    for (const op of OPS) {
      for (const level of LEVELS) {
        forEverySeed((seed) => {
          const p = generate(op, level, createRng(seed));
          expect(p.answer).toBe(solve[op](p.a, p.b));
          expect(Number.isInteger(p.answer)).toBe(true);
        });
      }
    }
  });

  it('easy addition and subtraction use 1-digit numbers', () => {
    for (const op of ['add', 'subtract'] as Operation[]) {
      forEverySeed((seed) => {
        const p = generate(op, 'easy', createRng(seed));
        expect(p.a).toBeLessThanOrEqual(9);
        expect(p.b).toBeLessThanOrEqual(9);
      });
    }
  });

  it('medium division keeps the dividend 2-digit', () => {
    forEverySeed((seed) => {
      const p = generate('divide', 'medium', createRng(seed));
      expect(p.a).toBeLessThanOrEqual(DIFFICULTIES.medium.maxDividend!);
      expect(p.a).toBeGreaterThanOrEqual(4);
    });
  });

  it('hard multiplication stays a sensible size', () => {
    forEverySeed((seed) => {
      const p = generate('multiply', 'hard', createRng(seed));
      expect(p.answer).toBeLessThan(9000);
    });
  });

  it('builds a readable prompt', () => {
    const p = generate('multiply', 'easy', createRng(1));
    expect(p.prompt).toBe(`${p.a} × ${p.b}`);
  });
});

describe('generateChoices', () => {
  it('always has the right count, contains the answer, and has no duplicates', () => {
    for (const op of OPS) {
      for (const level of LEVELS) {
        forEverySeed((seed) => {
          const { answer, choices } = generate(op, level, createRng(seed));
          expect(choices).toHaveLength(CHOICE_COUNT);
          expect(choices).toContain(answer);
          expect(new Set(choices).size).toBe(CHOICE_COUNT);
          if (answer >= 0) choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
        });
      }
    }
  });

  it('handles answers of 0 and 1', () => {
    for (const answer of [0, 1]) {
      forEverySeed((seed) => {
        const choices = generateChoices(answer, createRng(seed));
        expect(new Set(choices).size).toBe(CHOICE_COUNT);
        choices.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
      });
    }
  });
});

describe('generateTimesTable', () => {
  it('only uses the chosen tables', () => {
    forEverySeed((seed) => {
      const p = generateTimesTable({ tables: [7] }, createRng(seed));
      expect(p.operation).toBe('multiply');
      expect(p.a === 7 || p.b === 7).toBe(true);
      expect(p.answer).toBe(p.a * p.b);
    });
  });

  it('mixes in whole-number division facts when asked', () => {
    let sawDivision = false;
    forEverySeed((seed) => {
      const p = generateTimesTable({ tables: [3, 8], includeDivision: true }, createRng(seed));
      if (p.operation === 'divide') {
        sawDivision = true;
        expect([3, 8]).toContain(p.b);
        expect(p.a / p.b).toBe(p.answer);
      }
    });
    expect(sawDivision).toBe(true);
  });

  it('rejects an empty table list', () => {
    expect(() => generateTimesTable({ tables: [] }, createRng(1))).toThrow();
  });
});

describe('generateDeck', () => {
  it('the same seed gives identical decks (for multiplayer)', () => {
    expect(generateDeck('add', 'medium', 42, 20)).toEqual(generateDeck('add', 'medium', 42, 20));
  });

  it('different seeds give different decks', () => {
    expect(generateDeck('add', 'medium', 1, 20)).not.toEqual(generateDeck('add', 'medium', 2, 20));
  });
});

describe('grade levels', () => {
  const grades = GRADE_LIST;

  it('keeps every answer whole and right at every grade and level', () => {
    for (const grade of grades) {
      for (const difficulty of LEVELS) {
        const config = levelConfig({ grade, difficulty });
        for (const op of OPS) {
          for (let seed = 0; seed < 300; seed++) {
            const p = generate(op, difficulty, createRng(seed), grade);
            expect(Number.isInteger(p.answer)).toBe(true);
            if (op === 'divide') expect(p.a).toBe(p.b * p.answer);
            if (!config.allowNegatives) expect(p.answer).toBeGreaterThanOrEqual(0);
            if (op === 'add' && config.maxSum !== undefined) expect(p.answer).toBeLessThanOrEqual(config.maxSum);
            if (op === 'divide' && config.maxDividend !== undefined) {
              expect(p.a).toBeLessThanOrEqual(config.maxDividend);
            }
          }
        }
      }
    }
  });

  it('keeps kindergarten within 10', () => {
    for (let seed = 0; seed < 500; seed++) {
      const add = generate('add', 'medium', createRng(seed), 0);
      const sub = generate('subtract', 'hard', createRng(seed), 0);
      expect(add.answer).toBeLessThanOrEqual(10);
      expect(Math.max(sub.a, sub.b)).toBeLessThanOrEqual(10);
    }
  });

  it('gets bigger as the grade goes up', () => {
    const biggest = (grade: Grade) =>
      Math.max(...Array.from({ length: 200 }, (_, seed) => generate('add', 'medium', createRng(seed), grade).answer));
    for (let g = 1; g < grades.length; g++) {
      expect(biggest(grades[g])).toBeGreaterThanOrEqual(biggest(grades[g - 1]));
    }
  });
});
