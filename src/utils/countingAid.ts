import type { Problem } from '@/types';

/**
 * "Count it out" turns a problem into things a young player can tap and count:
 * dots for small numbers, rows of dots for times, shared-out groups for
 * division, and hundreds/tens/ones blocks for bigger additions.
 */
export interface CountItem {
  /** How much tapping this item adds to the count (1 for a dot, 10 for a ten bar). */
  value: number;
  /** Which number it belongs to, so the two can be colored apart. */
  part: 'a' | 'b';
  /** Crossed out (taken away), so it isn't counted. */
  crossed?: boolean;
  shape: 'dot' | 'hundred' | 'ten';
}

export interface CountGroup {
  label: string;
  items: CountItem[];
}

export interface CountModel {
  /** What to do, e.g. "Count all the dots." */
  tip: string;
  groups: CountGroup[];
  /** Draw each group's dots in a row of rows (times) rather than ten-frames. */
  layout: 'frames' | 'rows';
}

/** Largest number shown as single dots; bigger ones are too many to tap. */
export const MAX_DOTS = 20;
/** Largest total for times and division pictures. */
export const MAX_ARRAY = 100;
/** Largest number shown as blocks. */
export const MAX_BLOCKS = 999;

const dots = (count: number, part: 'a' | 'b', crossedFrom = Infinity): CountItem[] =>
  Array.from({ length: count }, (_, i) => ({ value: 1, part, shape: 'dot', crossed: i >= crossedFrom }));

function blocks(n: number, part: 'a' | 'b'): CountItem[] {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;
  return [
    ...Array.from({ length: hundreds }, () => ({ value: 100, part, shape: 'hundred' as const })),
    ...Array.from({ length: tens }, () => ({ value: 10, part, shape: 'ten' as const })),
    ...dots(ones, part),
  ];
}

/** A picture to count for this problem, or null when the numbers are too big to count by hand. */
export function countingModel(problem: Problem): CountModel | null {
  const { operation, a, b } = problem;
  if (a < 0 || b < 0) return null;

  switch (operation) {
    case 'add':
      if (a <= MAX_DOTS && b <= MAX_DOTS) {
        return {
          tip: `Count all the dots. Start at ${a} and keep going!`,
          groups: [
            { label: String(a), items: dots(a, 'a') },
            { label: String(b), items: dots(b, 'b') },
          ],
          layout: 'frames',
        };
      }
      if (a + b > MAX_BLOCKS + MAX_BLOCKS) return null;
      return {
        tip: 'Big squares are 100, bars are 10, dots are 1. Tap each one to add it up.',
        groups: [
          { label: String(a), items: blocks(a, 'a') },
          { label: String(b), items: blocks(b, 'b') },
        ],
        layout: 'frames',
      };
    case 'subtract':
      if (a > MAX_DOTS || b > a) return null;
      return {
        tip: `Start with ${a}. ${b} are crossed out. Count the dots that are left.`,
        groups: [{ label: `${a} take away ${b}`, items: dots(a, 'a', a - b) }],
        layout: 'frames',
      };
    case 'multiply': {
      if (a === 0 || b === 0 || a * b > MAX_ARRAY) return null;
      // a groups of b, one group per row.
      return {
        tip: `${a} ${a === 1 ? 'row' : 'rows'} of ${b}. Count every dot, or count by ${b}s!`,
        groups: Array.from({ length: a }, (_, i) => ({
          label: `${b}`,
          items: dots(b, i % 2 === 0 ? 'a' : 'b'),
        })),
        layout: 'rows',
      };
    }
    case 'divide': {
      // a is the number shared out, b is how many groups it's shared into.
      if (b === 0 || a > MAX_ARRAY || b > 12) return null;
      const each = a / b;
      return {
        tip: `${a} shared into ${b} equal groups. How many are in one group?`,
        groups: Array.from({ length: b }, (_, i) => ({
          label: `Group ${i + 1}`,
          items: dots(each, i % 2 === 0 ? 'a' : 'b'),
        })),
        layout: 'rows',
      };
    }
  }
}

/** Running count after each tap, in tap order; untapping the last item takes it off. */
export function tapItem(order: number[], index: number): number[] {
  if (order.at(-1) === index) return order.slice(0, -1);
  if (order.includes(index)) return order;
  return [...order, index];
}
