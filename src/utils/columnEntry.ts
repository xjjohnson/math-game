import type { Problem } from '@/types';

/**
 * Column math, like on paper: the answer is written one digit per box, and
 * small scratch boxes above the columns hold carries and borrows. Box 0 is the
 * leftmost column; the last box is the ones.
 */
export interface ColumnLayout {
  /** Number of digit columns. */
  width: number;
  /** Each operand's digits, right-aligned to the columns; null where it has none. */
  a: (string | null)[];
  b: (string | null)[];
}

const digitsOf = (n: number) => String(Math.abs(n)).split('');

function align(n: number, width: number): (string | null)[] {
  const digits = digitsOf(n);
  return [...Array<null>(width - digits.length).fill(null), ...digits];
}

/** Enough columns for any answer: a carry for +, every product digit for ×. */
export function columnLayout(problem: Problem): ColumnLayout {
  const la = digitsOf(problem.a).length;
  const lb = digitsOf(problem.b).length;
  const width = Math.max(
    problem.operation === 'add' ? Math.max(la, lb) + 1 : problem.operation === 'multiply' ? la + lb : Math.max(la, lb),
    digitsOf(problem.answer).length,
  );
  return { width, a: align(problem.a, width), b: align(problem.b, width) };
}

export type ColumnRow = 'answer' | 'carry' | 'work';

export interface ColumnEntry {
  digits: (string | null)[];
  /** Scratch work above each column. Never graded. */
  carries: (string | null)[];
  /** Free scratch boxes under the line (single-box mode). Never graded. */
  work: (string | null)[];
  /**
   * Single-box mode: the answer is `typed`, written left to right like any
   * number, and the per-column boxes are only scratch space.
   */
  single: boolean;
  typed: string;
  negative: boolean;
  cursor: { row: ColumnRow; col: number };
}

/** Starts at the ones box, the way column math is done on paper. */
export function startEntry(width: number, single = false): ColumnEntry {
  return {
    digits: Array(width).fill(null),
    carries: Array(width).fill(null),
    work: Array(width).fill(null),
    single,
    typed: '',
    negative: false,
    cursor: { row: 'answer', col: width - 1 },
  };
}

export function selectBox(entry: ColumnEntry, row: ColumnRow, col: number): ColumnEntry {
  // Single-box mode: the answer is one box, so tapping it just puts the cursor back there.
  if (entry.single && row === 'answer') return { ...entry, cursor: { row, col: entry.digits.length - 1 } };
  if (col < 0 || col >= entry.digits.length) return entry;
  return { ...entry, cursor: { row, col } };
}

const set = (cells: (string | null)[], col: number, value: string | null) =>
  cells.map((c, i) => (i === col ? value : c));

/**
 * A key from the pad: a digit, '⌫' or '±'. After an answer digit the cursor
 * moves one column left, like working right to left on paper. After a carry
 * it drops back to that column's answer box.
 */
export function pressKey(entry: ColumnEntry, key: string, allowNegative = false): ColumnEntry {
  const { row, col } = entry.cursor;
  if (key === '±') return allowNegative ? { ...entry, negative: !entry.negative } : entry;

  if (entry.single) return pressSingle(entry, key);

  if (key === '⌫') {
    if (row === 'carry') {
      return { ...entry, carries: set(entry.carries, col, null), cursor: { row: 'answer', col } };
    }
    if (entry.digits[col] !== null) return { ...entry, digits: set(entry.digits, col, null) };
    const right = Math.min(col + 1, entry.digits.length - 1);
    return { ...entry, digits: set(entry.digits, right, null), cursor: { row, col: right } };
  }

  if (!/^[0-9]$/.test(key)) return entry;
  if (row === 'carry') {
    return { ...entry, carries: set(entry.carries, col, key), cursor: { row: 'answer', col } };
  }
  return { ...entry, digits: set(entry.digits, col, key), cursor: { row, col: Math.max(0, col - 1) } };
}

/**
 * Single-box mode. The answer box takes digits left to right; the carry boxes
 * and the work row are scratch (a carry hands the cursor back to the answer).
 */
function pressSingle(entry: ColumnEntry, key: string): ColumnEntry {
  const { row, col } = entry.cursor;
  if (row === 'answer') {
    if (key === '⌫') return { ...entry, typed: entry.typed.slice(0, -1) };
    if (!/^[0-9]$/.test(key) || entry.typed.length >= entry.digits.length) return entry;
    return { ...entry, typed: entry.typed === '0' ? key : entry.typed + key };
  }
  const cells = row === 'carry' ? entry.carries : entry.work;
  const put = (value: string | null) => (row === 'carry' ? { carries: set(cells, col, value) } : { work: set(cells, col, value) });
  if (key === '⌫') {
    // Clear this box; if it was already empty, step back toward the ones.
    if (cells[col] !== null) return { ...entry, ...put(null) };
    return { ...entry, cursor: { row, col: Math.min(col + 1, cells.length - 1) } };
  }
  if (!/^[0-9]$/.test(key)) return entry;
  return {
    ...entry,
    ...put(key),
    // A mark goes back to the answer; scratch digits keep walking left along the row.
    cursor: row === 'carry' ? { row: 'answer', col: entry.digits.length - 1 } : { row, col: Math.max(0, col - 1) },
  };
}

/**
 * The number written so far, or null while it isn't a whole number yet: the
 * filled boxes must run without gaps up to the ones box.
 */
export function entryValue(entry: ColumnEntry): number | null {
  if (entry.single) {
    if (entry.typed === '') return null;
    const value = Number(entry.typed);
    return entry.negative ? -value : value;
  }
  const first = entry.digits.findIndex((d) => d !== null);
  if (first < 0 || entry.digits.slice(first).some((d) => d === null)) return null;
  const value = Number(entry.digits.slice(first).join(''));
  return entry.negative ? -value : value;
}
