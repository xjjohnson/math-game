import type { Problem } from '@/types';
import { columnLayout, startEntry, type ColumnEntry } from '@/utils/columnEntry';

/**
 * "Show my work" mode walks through a column problem one column at a time,
 * starting at the ones: the player works out each column, and when it comes
 * to 10 or more the 1 is carried for them, the way it's written on paper.
 * Subtraction borrows the same way.
 */
export interface TeachStep {
  /** Column this step writes (0 is the leftmost). */
  col: number;
  /** What to work out, e.g. "7 + 6" or "13 − 8" or "4 × 6 + 2". */
  question: string;
  /** The column's full result the player types, e.g. 13. */
  total: number;
  /** Digit that goes in the answer box. */
  write: number;
  /** Notes written in the small boxes above the columns once this step is done. */
  marks: { col: number; text: string }[];
  /** A line explaining the step, e.g. why we borrow. */
  tip: string | null;
}

const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands'];
export const placeName = (power: number) => PLACES[power] ?? 'next';

const digit = (d: string | null) => (d === null ? 0 : Number(d));

/** Steps from the ones leftward, or null when the problem has no column method here. */
export function teachSteps(problem: Problem): TeachStep[] | null {
  if (problem.story || problem.a < 0 || problem.b < 0) return null;
  const { width, a, b } = columnLayout(problem);
  const steps: TeachStep[] = [];
  const answerDigits = String(problem.answer).length;
  const lastCol = width - answerDigits;

  if (problem.operation === 'add') {
    let carryIn = 0;
    for (let col = width - 1; col >= lastCol; col--) {
      const parts = [a[col], b[col]].filter((d) => d !== null).map(Number);
      const total = parts.reduce((s, n) => s + n, 0) + carryIn;
      const shown = [...parts.map(String), ...(carryIn ? [`${carryIn} carried`] : [])];
      steps.push({
        col,
        question: shown.length ? shown.join(' + ') : '0',
        total,
        write: total % 10,
        marks: total >= 10 ? [{ col: col - 1, text: String(Math.floor(total / 10)) }] : [],
        tip: parts.length === 0 && carryIn ? `Bring the carried ${carryIn} down.` : null,
      });
      carryIn = Math.floor(total / 10);
    }
    return steps;
  }

  if (problem.operation === 'multiply') {
    // The column method here is for a one-digit multiplier, which is all the game asks.
    if (problem.b > 9) return null;
    let carryIn = 0;
    for (let col = width - 1; col >= lastCol; col--) {
      const top = a[col];
      const total = (top === null ? 0 : Number(top) * problem.b) + carryIn;
      const question =
        top === null ? `${carryIn} carried` : `${top} × ${problem.b}${carryIn ? ` + ${carryIn} carried` : ''}`;
      steps.push({
        col,
        question,
        total,
        write: total % 10,
        marks: total >= 10 ? [{ col: col - 1, text: String(Math.floor(total / 10)) }] : [],
        tip: top === null ? `Bring the carried ${carryIn} down.` : null,
      });
      carryIn = Math.floor(total / 10);
    }
    return steps;
  }

  if (problem.operation === 'subtract') {
    if (problem.a < problem.b) return null;
    let lent = 0;
    for (let col = width - 1; col >= lastCol; col--) {
      const top = digit(a[col]) - lent;
      const bottom = digit(b[col]);
      const borrowed = top < bottom;
      const total = (borrowed ? top + 10 : top) - bottom;
      const place = placeName(width - 1 - col);
      const next = placeName(width - col);
      const worked = borrowed ? top + 10 : top;
      const marks: TeachStep['marks'] = [];
      // Cross-out style notes: this column's new top digit, and the smaller digit it borrowed from.
      if (borrowed || lent) marks.push({ col, text: String(worked) });
      if (borrowed && digit(a[col - 1]) - 1 >= 0) marks.push({ col: col - 1, text: String(digit(a[col - 1]) - 1) });
      steps.push({
        col,
        question: `${worked} − ${bottom}`,
        total,
        write: total,
        marks,
        tip: !borrowed
          ? null
          : top < 0
            ? `This 0 lent 1 already, so it borrows 1 from the ${next} too and becomes 9.`
            : `${top} is less than ${bottom}, so borrow 1 from the ${next}. The ${place} become ${worked}.`,
      });
      lent = borrowed ? 1 : 0;
    }
    return steps;
  }
  return null;
}

/** Where a teaching round is: the boxes plus which step is next and what's typed for it. */
export interface TeachState {
  entry: ColumnEntry;
  step: number;
  /** Digits typed so far for this step's total, e.g. "1" while typing 13. */
  typed: string;
  /** Set after a wrong try, so the hint can say so. */
  missed: boolean;
}

export function startTeach(problem: Problem, steps: TeachStep[]): TeachState {
  const entry = startEntry(columnLayout(problem).width);
  return { entry: { ...entry, cursor: { row: 'answer', col: steps[0].col } }, step: 0, typed: '', missed: false };
}

export const teachDone = (state: TeachState, steps: TeachStep[]) => state.step >= steps.length;

/**
 * A digit for the current step. Once the typed number is the column's total,
 * its ones digit goes in the box and any tens are carried to the next column.
 * A wrong number clears so the player can try that column again.
 */
export function teachKey(state: TeachState, steps: TeachStep[], key: string): TeachState {
  if (teachDone(state, steps)) return state;
  if (key === '⌫') return { ...state, typed: state.typed.slice(0, -1) };
  if (!/^[0-9]$/.test(key)) return state;

  const step = steps[state.step];
  const typed = state.typed + key;
  const want = String(step.total);
  if (typed === want) {
    const { entry } = state;
    const digits = entry.digits.map((d, i) => (i === step.col ? String(step.write) : d));
    const carries = entry.carries.map((c, i) => step.marks.find((m) => m.col === i)?.text ?? c);
    const nextStep = state.step + 1;
    const col = nextStep < steps.length ? steps[nextStep].col : step.col;
    return {
      entry: { ...entry, digits, carries, cursor: { row: 'answer', col } },
      step: nextStep,
      typed: '',
      missed: false,
    };
  }
  if (want.startsWith(typed)) return { ...state, typed, missed: false };
  return { ...state, typed: '', missed: true };
}
