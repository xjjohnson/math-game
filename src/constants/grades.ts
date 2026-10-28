import { DIFFICULTIES, type DifficultyConfig, type OperandRanges } from '@/constants/difficulty';
import type { Difficulty, Grade, Level, Operation } from '@/types';

export interface GradeConfig {
  /** Short button label, e.g. "K" or "3rd". */
  short: string;
  /** Full name, e.g. "Kindergarten". */
  name: string;
  /** Operations taught in this grade; the others still work, just gently. */
  taught: Operation[];
  levels: Record<Difficulty, DifficultyConfig>;
}

const r = (min: number, max: number) => ({ min, max });
const ops = (
  add: OperandRanges,
  subtract: OperandRanges,
  multiply: OperandRanges,
  divide: OperandRanges,
): Record<Operation, OperandRanges> => ({ add, subtract, multiply, divide });
const pair = (a: [number, number], b: [number, number]): OperandRanges => ({ a: r(...a), b: r(...b) });

const ALL: Operation[] = ['add', 'subtract', 'multiply', 'divide'];

/**
 * What each grade practises, loosely following what US schools teach. Each
 * grade has easy, medium and hard; hard in one grade sits near easy in the next.
 * Division ranges are divisor (a) and quotient (b), so answers are always whole.
 */
export const GRADES: Record<Grade, GradeConfig> = {
  0: {
    short: 'K',
    name: 'Kindergarten',
    taught: ['add', 'subtract'],
    levels: {
      easy: {
        label: 'Easy',
        description: 'Numbers up to 5',
        allowNegatives: false,
        maxSum: 5,
        ranges: ops(pair([0, 4], [0, 4]), pair([0, 5], [0, 5]), pair([0, 2], [0, 3]), pair([1, 2], [0, 3])),
      },
      medium: {
        label: 'Medium',
        description: 'Numbers up to 10',
        allowNegatives: false,
        maxSum: 10,
        ranges: ops(pair([0, 9], [0, 9]), pair([0, 10], [0, 10]), pair([0, 3], [0, 3]), pair([1, 3], [0, 3])),
      },
      hard: {
        label: 'Hard',
        description: 'Make 10, take from 10',
        allowNegatives: false,
        maxSum: 10,
        ranges: ops(pair([3, 9], [1, 9]), pair([5, 10], [1, 9]), pair([1, 5], [1, 2]), pair([1, 2], [1, 5])),
      },
    },
  },
  1: {
    short: '1st',
    name: '1st grade',
    taught: ['add', 'subtract'],
    levels: {
      easy: {
        label: 'Easy',
        description: 'Up to 10',
        allowNegatives: false,
        maxSum: 10,
        ranges: ops(pair([0, 9], [0, 9]), pair([0, 10], [0, 10]), pair([1, 5], [1, 2]), pair([1, 2], [1, 5])),
      },
      medium: {
        label: 'Medium',
        description: 'Up to 20',
        allowNegatives: false,
        maxSum: 20,
        ranges: ops(pair([2, 12], [2, 9]), pair([10, 20], [1, 9]), pair([1, 5], [1, 5]), pair([1, 5], [1, 5])),
      },
      hard: {
        label: 'Hard',
        description: '2-digit and 1-digit',
        allowNegatives: false,
        maxSum: 100,
        ranges: ops(pair([10, 89], [1, 9]), pair([20, 99], [1, 9]), pair([2, 5], [1, 10]), pair([2, 5], [1, 5])),
      },
    },
  },
  2: {
    short: '2nd',
    name: '2nd grade',
    taught: ['add', 'subtract'],
    levels: {
      easy: {
        label: 'Easy',
        description: 'Up to 20',
        allowNegatives: false,
        maxSum: 20,
        ranges: ops(pair([2, 12], [2, 9]), pair([10, 20], [1, 9]), pair([1, 5], [1, 5]), pair([1, 5], [1, 5])),
      },
      medium: {
        label: 'Medium',
        description: '2-digit, up to 100',
        allowNegatives: false,
        maxSum: 100,
        ranges: ops(pair([10, 89], [10, 89]), pair([10, 99], [10, 99]), pair([2, 5], [1, 10]), pair([2, 5], [1, 10])),
      },
      hard: {
        label: 'Hard',
        description: '3-digit, up to 1,000',
        allowNegatives: false,
        maxSum: 1000,
        ranges: ops(pair([100, 899], [10, 899]), pair([100, 999], [10, 999]), pair([2, 10], [1, 10]), pair([2, 10], [1, 10])),
      },
    },
  },
  3: {
    short: '3rd',
    name: '3rd grade',
    taught: ALL,
    levels: {
      easy: {
        label: 'Easy',
        description: 'Times tables to 5',
        allowNegatives: false,
        maxSum: 100,
        ranges: ops(pair([10, 89], [10, 89]), pair([10, 99], [10, 99]), pair([1, 5], [1, 10]), pair([1, 5], [1, 10])),
      },
      medium: {
        label: 'Medium',
        description: 'Times tables to 10',
        allowNegatives: false,
        maxSum: 1000,
        ranges: ops(pair([100, 899], [10, 99]), pair([100, 999], [10, 99]), pair([1, 10], [1, 10]), pair([2, 10], [1, 10])),
      },
      hard: {
        label: 'Hard',
        description: 'Times tables to 12, up to 1,000',
        allowNegatives: false,
        maxSum: 1000,
        ranges: ops(pair([100, 899], [100, 899]), pair([100, 999], [100, 999]), pair([2, 12], [2, 12]), pair([2, 12], [2, 12])),
      },
    },
  },
  4: {
    short: '4th',
    name: '4th grade',
    taught: ALL,
    levels: {
      easy: {
        label: 'Easy',
        description: '3-digit, 2-digit × 1-digit',
        allowNegatives: false,
        ranges: ops(pair([100, 999], [100, 999]), pair([100, 999], [100, 999]), pair([10, 99], [2, 9]), pair([2, 9], [10, 30])),
      },
      medium: {
        label: 'Medium',
        description: '4-digit, 3-digit × 1-digit',
        allowNegatives: false,
        ranges: ops(pair([1000, 9999], [100, 999]), pair([1000, 9999], [100, 999]), pair([100, 999], [2, 9]), pair([2, 9], [10, 99])),
      },
      hard: {
        label: 'Hard',
        description: '2-digit × 2-digit, long division',
        allowNegatives: false,
        maxDividend: 9999,
        ranges: ops(pair([1000, 9999], [1000, 9999]), pair([1000, 9999], [1000, 9999]), pair([10, 99], [10, 99]), pair([2, 9], [100, 999])),
      },
    },
  },
  5: {
    short: '5th',
    name: '5th grade',
    taught: ALL,
    levels: {
      easy: {
        label: 'Easy',
        description: '4-digit, 3-digit × 1-digit',
        allowNegatives: false,
        ranges: ops(pair([1000, 9999], [1000, 9999]), pair([1000, 9999], [1000, 9999]), pair([100, 999], [2, 9]), pair([2, 9], [100, 999])),
      },
      medium: {
        label: 'Medium',
        description: '5-digit, 2-digit × 2-digit',
        allowNegatives: false,
        maxDividend: 9999,
        ranges: ops(pair([10000, 99999], [1000, 9999]), pair([10000, 99999], [1000, 9999]), pair([10, 99], [10, 99]), pair([10, 99], [2, 99])),
      },
      hard: {
        label: 'Hard',
        description: '3-digit × 2-digit, ÷ 2-digit',
        allowNegatives: false,
        maxDividend: 9999,
        ranges: ops(pair([10000, 99999], [10000, 99999]), pair([10000, 99999], [10000, 99999]), pair([100, 999], [10, 99]), pair([10, 99], [10, 999])),
      },
    },
  },
  6: {
    short: '6th+',
    name: '6th grade and up',
    taught: ALL,
    levels: {
      easy: {
        label: 'Easy',
        description: 'Big numbers, 2-digit × 2-digit',
        allowNegatives: false,
        maxDividend: 9999,
        ranges: ops(pair([1000, 9999], [1000, 9999]), pair([1000, 9999], [1000, 9999]), pair([10, 99], [10, 99]), pair([10, 99], [2, 99])),
      },
      medium: {
        label: 'Medium',
        description: 'Answers can go below zero',
        allowNegatives: true,
        maxDividend: 99999,
        ranges: ops(pair([10000, 99999], [1000, 9999]), pair([1000, 9999], [1000, 99999]), pair([100, 999], [10, 99]), pair([10, 99], [10, 999])),
      },
      hard: {
        label: 'Hard',
        description: 'Below zero, ÷ 3-digit',
        allowNegatives: true,
        maxDividend: 99999,
        ranges: ops(pair([10000, 99999], [10000, 99999]), pair([10000, 99999], [10000, 99999]), pair([100, 999], [10, 99]), pair([100, 999], [10, 99])),
      },
    },
  },
};

export const GRADE_LIST = Object.keys(GRADES).map(Number) as Grade[];

export const DEFAULT_GRADE: Grade = 1;

export function isGrade(value: unknown): value is Grade {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

/** Number ranges for a level. */
export function levelConfig(level: Level): DifficultyConfig {
  return GRADES[level.grade].levels[level.difficulty];
}

/** A level's numbers, or the classic level's when there's no grade. */
export function difficultyConfigFor(difficulty: Difficulty, grade?: Grade): DifficultyConfig {
  return grade === undefined ? DIFFICULTIES[difficulty] : levelConfig({ grade, difficulty });
}

/** "3rd grade · Medium" */
export function levelName(level: Level): string {
  return `${GRADES[level.grade].name} · ${GRADES[level.grade].levels[level.difficulty].label}`;
}

/** "3rd · Medium" */
export function levelShort(level: Level): string {
  return `${GRADES[level.grade].short} · ${GRADES[level.grade].levels[level.difficulty].label}`;
}
