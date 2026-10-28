import type { Difficulty, Operation, TimerSetting } from '@/types';

export interface Range {
  min: number;
  max: number;
}

export interface OperandRanges {
  /** First operand (for division: the divisor). */
  a: Range;
  /** Second operand (for division: the quotient). */
  b: Range;
}

export interface DifficultyConfig {
  label: string;
  description: string;
  ranges: Record<Operation, OperandRanges>;
  /** Whether subtraction may produce a negative answer. */
  allowNegatives: boolean;
  /** Optional cap on the dividend; the quotient is limited to fit under it. */
  maxDividend?: number;
  /** Optional cap on an addition answer, e.g. 10 for "adding within 10". */
  maxSum?: number;
}

const r = (min: number, max: number): Range => ({ min, max });

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    description: '1-digit numbers',
    allowNegatives: false,
    ranges: {
      add: { a: r(0, 9), b: r(0, 9) },
      subtract: { a: r(0, 9), b: r(0, 9) },
      multiply: { a: r(1, 9), b: r(1, 9) },
      divide: { a: r(1, 9), b: r(1, 9) },
    },
  },
  medium: {
    label: 'Medium',
    description: '2-digit numbers',
    allowNegatives: false,
    maxDividend: 99,
    ranges: {
      add: { a: r(10, 99), b: r(10, 99) },
      subtract: { a: r(10, 99), b: r(10, 99) },
      multiply: { a: r(10, 99), b: r(2, 9) },
      // Divisor 2-9; maxDividend keeps the dividend 2-digit.
      divide: { a: r(2, 9), b: r(2, 49) },
    },
  },
  hard: {
    label: 'Hard',
    description: '3-digit and mixed',
    allowNegatives: true,
    ranges: {
      add: { a: r(100, 999), b: r(10, 999) },
      subtract: { a: r(100, 999), b: r(10, 999) },
      // 3-digit x 1-digit keeps answers under 9,000.
      multiply: { a: r(100, 999), b: r(2, 9) },
      divide: { a: r(2, 12), b: r(10, 99) },
    },
  },
};

export const TIMER_OPTIONS: { value: TimerSetting; label: string }[] = [
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: null, label: 'Practice (no timer)' },
];

export const OPERATIONS: { value: Operation; label: string; symbol: string }[] = [
  { value: 'add', label: 'Addition', symbol: '+' },
  { value: 'subtract', label: 'Subtraction', symbol: '−' },
  { value: 'multiply', label: 'Multiplication', symbol: '×' },
  { value: 'divide', label: 'Division', symbol: '÷' },
];
