import type { Problem, Rng, SkillId } from '@/types';
import { numberQuestion, sum } from '@/utils/skills/build';
import { pick, randInt } from '@/utils/seededRandom';

/** Arrays, equal groups, times tables, turn-around and break-apart facts, and sharing. */

/** Rows of counters: how many in all? (2nd grade, repeated addition) */
export function arrayCount(id: SkillId, rng: Rng): Problem {
  const rows = randInt(rng, 2, 5);
  const cols = randInt(rng, 2, 5);
  return numberQuestion(
    id,
    {
      operation: 'multiply',
      ask: `${rows} rows of ${cols}. How many in all?`,
      prompt: `${Array(rows).fill(cols).join(' + ')} = ☐`,
      answer: rows * cols,
      picture: { kind: 'array', rows, cols },
      a: rows,
      b: cols,
      near: [rows + cols, rows * cols + cols],
    },
    rng,
  );
}

/** Equal groups: 3 groups of 4 is 3 × 4. */
export function equalGroups(id: SkillId, rng: Rng): Problem {
  const groups = randInt(rng, 2, 5);
  const each = randInt(rng, 2, 6);
  return numberQuestion(
    id,
    {
      operation: 'multiply',
      ask: `${groups} groups of ${each}. How many altogether?`,
      prompt: `${groups} × ${each} = ☐`,
      answer: groups * each,
      picture: { kind: 'groups', groups, each },
      a: groups,
      b: each,
      near: [groups + each, groups * each - each],
    },
    rng,
  );
}

/** A times fact from the given tables, either way round. */
export function timesFact(id: SkillId, rng: Rng, tables: number[], maxFactor = 10): Problem {
  const t = pick(rng, tables);
  const f = randInt(rng, 1, maxFactor);
  return rng() < 0.5 ? sum(id, 'multiply', t, f, rng) : sum(id, 'multiply', f, t, rng);
}

/** Turn-around facts: 4 × 7 = 28, so 7 × 4 = ☐. */
export function turnAround(id: SkillId, rng: Rng): Problem {
  const a = randInt(rng, 3, 9);
  let b = randInt(rng, 2, 9);
  if (a === b) b = a - 1;
  return numberQuestion(
    id,
    {
      operation: 'multiply',
      ask: `${a} × ${b} = ${a * b}. Turn it around!`,
      prompt: `${b} × ${a} = ☐`,
      answer: a * b,
      a: b,
      b: a,
      near: [a * b + a, a * b - b],
    },
    rng,
  );
}

/** Break apart: 7 × 6 = (5 × 6) + (2 × 6). */
export function breakApart(id: SkillId, rng: Rng): Problem {
  const big = randInt(rng, 6, 9);
  const other = randInt(rng, 3, 9);
  const asked = rng() < 0.5;
  if (asked) {
    return numberQuestion(
      id,
      {
        operation: 'multiply',
        ask: `Break ${big} into 5 and ${big - 5}. What is ${big} × ${other}?`,
        prompt: `(5 × ${other}) + (${big - 5} × ${other}) = ☐`,
        answer: big * other,
        a: big,
        b: other,
        near: [5 * other, (big - 5) * other, big * other + other],
      },
      rng,
    );
  }
  return numberQuestion(
    id,
    {
      operation: 'multiply',
      ask: `${big} × ${other} is 5 × ${other} plus how many more?`,
      prompt: `${big} × ${other} = ${5 * other} + ☐`,
      answer: (big - 5) * other,
      a: big,
      b: other,
      near: [big * other, (big - 5) + other],
    },
    rng,
  );
}

/** Times a multiple of ten: 4 × 30. */
export function timesTens(id: SkillId, rng: Rng): Problem {
  const a = randInt(rng, 2, 9);
  const b = randInt(rng, 1, 9) * 10;
  return sum(id, 'multiply', a, b, rng);
}

/** Division within 100 from the given divisors. */
export function divideFact(id: SkillId, rng: Rng, divisors: number[]): Problem {
  const d = pick(rng, divisors);
  const q = randInt(rng, 1, 10);
  return sum(id, 'divide', d * q, d, rng);
}

/** Sharing: 12 shared into 3 groups. */
export function shareEqually(id: SkillId, rng: Rng): Problem {
  const groups = randInt(rng, 2, 5);
  const each = randInt(rng, 2, 5);
  return numberQuestion(
    id,
    {
      operation: 'divide',
      ask: `Share ${groups * each} counters into ${groups} equal groups. How many in each group?`,
      prompt: `${groups * each} ÷ ${groups} = ☐`,
      answer: each,
      picture: { kind: 'groups', groups, each: 0 },
      a: groups * each,
      b: groups,
      near: [groups, each + 1],
    },
    rng,
  );
}
