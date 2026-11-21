import type { Operation, Picture, Problem, Rng, SkillId } from '@/types';
import { buildProblem, generateChoices } from '@/utils/mathEngine';
import { shuffle } from '@/utils/seededRandom';

/**
 * Small helpers the skill makers share, so every question comes out the same
 * shape: a sum ("63 − 28"), a number to find under a picture, or a pick from
 * words or signs.
 */

/** A plain sum, tagged with its skill. */
export function sum(skill: SkillId, operation: Operation, a: number, b: number, rng: Rng): Problem {
  const answer =
    operation === 'add' ? a + b : operation === 'subtract' ? a - b : operation === 'multiply' ? a * b : a / b;
  return { ...buildProblem(operation, a, b, answer, rng), skill };
}

export interface NumberQuestion {
  operation: Operation;
  ask: string;
  /** The big line under the picture, with ☐ where the answer goes; '' for none. */
  prompt?: string;
  answer: number;
  picture?: Picture;
  unit?: string;
  /** Numbers kept on the problem for the help and the speaker (default: the answer and 0). */
  a?: number;
  b?: number;
  flashMs?: number;
  /** Extra wrong answers that are likely slips, put first among the choices. */
  near?: number[];
}

/** A question answered with a number (typed, or picked from four). */
export function numberQuestion(skill: SkillId, q: NumberQuestion, rng: Rng): Problem {
  return {
    operation: q.operation,
    a: q.a ?? q.answer,
    b: q.b ?? 0,
    answer: q.answer,
    prompt: q.prompt ?? '',
    choices: choicesWith(q.answer, q.near ?? [], rng),
    skill,
    ask: q.ask,
    ...(q.picture ? { picture: q.picture } : {}),
    ...(q.unit ? { unit: q.unit } : {}),
    ...(q.flashMs ? { flashMs: q.flashMs } : {}),
  };
}

export interface PickQuestion {
  operation: Operation;
  ask: string;
  prompt?: string;
  /** The right option's value. */
  answer: number;
  /** Every option, right one included; shown in this order unless `shuffle` is set. */
  options: { value: number; label: string }[];
  shuffle?: boolean;
  picture?: Picture;
  a?: number;
  b?: number;
  flashMs?: number;
}

/** A question answered by tapping one of a few words or signs. */
export function pickQuestion(skill: SkillId, q: PickQuestion, rng: Rng): Problem {
  const values = q.options.map((o) => o.value);
  if (!values.includes(q.answer)) throw new Error(`${skill}: answer ${q.answer} is not an option`);
  if (new Set(values).size !== values.length) throw new Error(`${skill}: options repeat`);
  return {
    operation: q.operation,
    a: q.a ?? 0,
    b: q.b ?? 0,
    answer: q.answer,
    prompt: q.prompt ?? '',
    choices: q.shuffle ? shuffle(rng, values) : values,
    skill,
    ask: q.ask,
    labels: Object.fromEntries(q.options.map((o) => [o.value, o.label])),
    choiceOnly: true,
    ...(q.picture ? { picture: q.picture } : {}),
    ...(q.flashMs ? { flashMs: q.flashMs } : {}),
  };
}

/** Four choices: the answer, likely slips first, then the usual near misses. */
export function choicesWith(answer: number, near: number[], rng: Rng): number[] {
  const wrong = [...new Set(near.filter((n) => n !== answer && n >= 0))].slice(0, 3);
  if (wrong.length < 3) {
    for (const n of generateChoices(answer, rng)) {
      if (n !== answer && !wrong.includes(n) && wrong.length < 3) wrong.push(n);
    }
  }
  return shuffle(rng, [answer, ...wrong]);
}

/** Picks up to `count` options from `pool` that aren't `answer`, plus the answer, shuffled. */
export function optionsFrom<T>(rng: Rng, answer: T, pool: readonly T[], count = 4): T[] {
  const others = shuffle(rng, pool.filter((p) => p !== answer)).slice(0, count - 1);
  return shuffle(rng, [answer, ...others]);
}

/** Digits of n from the ones up: digitAt(347, 0) is 7, digitAt(347, 2) is 3. */
export const digitAt = (n: number, place: number) => Math.floor(n / 10 ** place) % 10;

export const fromDigits = (...digits: number[]) => digits.reduce((n, d) => n * 10 + d, 0);

/** How an answer is shown: its label (a word, sign, time or fraction) or the number with its unit. */
export function answerText(problem: Problem, value: number): string {
  const label = problem.labels?.[value];
  if (label !== undefined) return label;
  if (!problem.unit) return String(value);
  return problem.unit === '¢' ? `${value}¢` : `${value} ${problem.unit}`;
}
