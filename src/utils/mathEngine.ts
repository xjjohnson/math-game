import { DIFFICULTIES, OPERATIONS } from '@/constants/difficulty';
import type { Difficulty, Operation, Problem, Rng } from '@/types';
import { createRng, pick, randInt, shuffle } from '@/utils/seededRandom';

export const CHOICE_COUNT = 4;

const SYMBOLS = Object.fromEntries(OPERATIONS.map((o) => [o.value, o.symbol])) as Record<
  Operation,
  string
>;

/** Builds a problem from known numbers, with fresh answer choices. */
export function buildProblem(
  operation: Operation,
  a: number,
  b: number,
  answer: number,
  rng: Rng,
): Problem {
  return {
    operation,
    a,
    b,
    answer,
    prompt: `${a} ${SYMBOLS[operation]} ${b}`,
    choices: generateChoices(answer, rng),
  };
}

/**
 * Generates one problem. Every answer is a whole number:
 * division picks the divisor and quotient first, then multiplies for the dividend.
 */
export function generate(operation: Operation, difficulty: Difficulty, rng: Rng): Problem {
  const config = DIFFICULTIES[difficulty];
  const { a: ra, b: rb } = config.ranges[operation];
  let a = randInt(rng, ra.min, ra.max);
  let b = randInt(rng, rb.min, rb.max);

  switch (operation) {
    case 'add':
      return buildProblem(operation, a, b, a + b, rng);
    case 'subtract':
      if (!config.allowNegatives && b > a) [a, b] = [b, a];
      return buildProblem(operation, a, b, a - b, rng);
    case 'multiply':
      // Randomise which side the bigger number is on.
      if (rng() < 0.5) [a, b] = [b, a];
      return buildProblem(operation, a, b, a * b, rng);
    case 'divide': {
      const divisor = a;
      let quotient = b;
      if (config.maxDividend !== undefined) {
        const maxQuotient = Math.max(rb.min, Math.floor(config.maxDividend / divisor));
        quotient = randInt(rng, rb.min, Math.min(rb.max, maxQuotient));
      }
      return buildProblem(operation, divisor * quotient, divisor, quotient, rng);
    }
  }
}

export interface TimesTableOptions {
  /** Which tables to practise, e.g. [3, 7]. */
  tables: number[];
  /** Largest factor paired with a table (default 12). */
  maxFactor?: number;
  /** Mix in the matching division facts. */
  includeDivision?: boolean;
}

/** Generates a problem from specific times tables (e.g. only the 7s). */
export function generateTimesTable(options: TimesTableOptions, rng: Rng): Problem {
  const { tables, maxFactor = 12, includeDivision = false } = options;
  if (tables.length === 0) throw new Error('generateTimesTable needs at least one table');
  const table = pick(rng, tables);
  const factor = randInt(rng, 1, maxFactor);
  if (includeDivision && rng() < 0.5) {
    return buildProblem('divide', table * factor, table, factor, rng);
  }
  return rng() < 0.5
    ? buildProblem('multiply', table, factor, table * factor, rng)
    : buildProblem('multiply', factor, table, table * factor, rng);
}

/**
 * Builds shuffled answer options: the correct answer plus plausible wrong ones
 * (off by one or two, off by ten, digits swapped), never duplicated.
 */
export function generateChoices(answer: number, rng: Rng, count = CHOICE_COUNT): number[] {
  const allowNegative = answer < 0;
  const candidates = new Set<number>();
  const offsets = shuffle(rng, [1, -1, 2, -2, 10, -10]);
  for (const offset of offsets) candidates.add(answer + offset);
  const swapped = swapDigits(answer);
  if (swapped !== null) candidates.add(swapped);

  const wrong = shuffle(
    rng,
    [...candidates].filter((n) => n !== answer && (allowNegative || n >= 0)),
  ).slice(0, count - 1);

  // Small answers (like 0 or 1) may not have enough candidates; widen the net.
  let spread = 3;
  while (wrong.length < count - 1) {
    const n = answer + randInt(rng, -spread, spread);
    if (n !== answer && !wrong.includes(n) && (allowNegative || n >= 0)) wrong.push(n);
    spread++;
  }

  return shuffle(rng, [answer, ...wrong]);
}

function swapDigits(n: number): number | null {
  const digits = String(Math.abs(n));
  if (digits.length < 2) return null;
  const swapped = digits.slice(0, -2) + digits.at(-1) + digits.at(-2);
  if (swapped === digits || swapped.startsWith('0')) return null;
  return Math.sign(n) * Number(swapped);
}

/**
 * Generates a whole deck from a seed. Two devices given the same seed and
 * settings get identical problems, so multiplayer only needs to share the seed.
 */
export function generateDeck(
  operation: Operation,
  difficulty: Difficulty,
  seed: number,
  count: number,
): Problem[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => generate(operation, difficulty, rng));
}
