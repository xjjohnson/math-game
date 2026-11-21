import type { Problem, Rng, SkillId } from '@/types';
import { numberQuestion } from '@/utils/skills/build';
import { pick, randInt } from '@/utils/seededRandom';

/**
 * Story problems with a tape diagram (bar model) to show which part is missing,
 * and two-step stories for 3rd grade.
 */

const NAMES = ['Mia', 'Leo', 'Ava', 'Sam', 'Zoe', 'Max', 'Ivy', 'Eli', 'Ruby', 'Jack'];
const ITEMS = ['stickers', 'marbles', 'shells', 'cards', 'beads', 'stamps', 'rocks', 'books'];

/** Part + part = whole, with one of the three missing. 2nd grade numbers within 100. */
export function tapeStory(id: SkillId, rng: Rng): Problem {
  const name = pick(rng, NAMES);
  const item = pick(rng, ITEMS);
  const a = randInt(rng, 12, 59);
  const b = randInt(rng, 8, 99 - a);
  const whole = a + b;
  const kind = randInt(rng, 0, 2);
  if (kind === 0) {
    return numberQuestion(
      id,
      {
        operation: 'add',
        ask: `${name} has ${a} ${item}. ${name} gets ${b} more. How many ${item} now?`,
        answer: whole,
        picture: { kind: 'tape', whole: null, parts: [a, b], label: item },
        a,
        b,
        near: [whole + 10, whole - 10, Math.abs(a - b)],
      },
      rng,
    );
  }
  if (kind === 1) {
    return numberQuestion(
      id,
      {
        operation: 'subtract',
        ask: `${name} had ${whole} ${item} and gave some away. Now ${name} has ${a}. How many were given away?`,
        answer: b,
        picture: { kind: 'tape', whole, parts: [a, null], label: item },
        a: whole,
        b: a,
        near: [whole + a, b + 10, b - 10],
      },
      rng,
    );
  }
  return numberQuestion(
    id,
    {
      operation: 'subtract',
      ask: `${name} has ${whole} ${item}. ${b} are blue and the rest are red. How many are red?`,
      answer: a,
      picture: { kind: 'tape', whole, parts: [null, b], label: item },
      a: whole,
      b,
      near: [whole + b, a + 10, a - 10],
    },
    rng,
  );
}

/** "How many more" comparing stories, drawn as two bars. */
export function compareStory(id: SkillId, rng: Rng): Problem {
  const p = pick(rng, NAMES);
  const other = pick(rng, NAMES.filter((n) => n !== p));
  const item = pick(rng, ITEMS);
  const small = randInt(rng, 10, 50);
  const diff = randInt(rng, 5, 40);
  return numberQuestion(
    id,
    {
      operation: 'subtract',
      ask: `${p} has ${small + diff} ${item}. ${other} has ${small}. How many more does ${p} have?`,
      answer: diff,
      picture: { kind: 'tape', whole: small + diff, parts: [small, null], label: `${p}'s ${item}` },
      a: small + diff,
      b: small,
      near: [2 * small + diff, diff + 10],
    },
    rng,
  );
}

/** Two steps: work out one thing, then use it. */
export function twoStepStory(id: SkillId, rng: Rng): Problem {
  const name = pick(rng, NAMES);
  const kind = randInt(rng, 0, 3);
  if (kind === 0) {
    const bags = randInt(rng, 2, 6);
    const each = randInt(rng, 3, 9);
    const had = randInt(rng, 5, 40);
    return numberQuestion(
      id,
      {
        operation: 'multiply',
        ask: `${name} has ${had} marbles and buys ${bags} bags with ${each} marbles in each. How many marbles now?`,
        answer: had + bags * each,
        a: bags,
        b: each,
        near: [had + bags + each, bags * each, had * bags],
      },
      rng,
    );
  }
  if (kind === 1) {
    const boxes = randInt(rng, 2, 5);
    const each = randInt(rng, 4, 10);
    const eaten = randInt(rng, 1, boxes * each - 1);
    return numberQuestion(
      id,
      {
        operation: 'multiply',
        ask: `There are ${boxes} boxes of ${each} cookies. The class eats ${eaten}. How many cookies are left?`,
        answer: boxes * each - eaten,
        a: boxes,
        b: each,
        near: [boxes * each, boxes + each - eaten, boxes * each + eaten],
      },
      rng,
    );
  }
  if (kind === 2) {
    const start = randInt(rng, 40, 90);
    const spent = randInt(rng, 10, 30);
    const earned = randInt(rng, 5, 25);
    return numberQuestion(
      id,
      {
        operation: 'subtract',
        ask: `${name} has ${start} coins, spends ${spent} at the shop, then earns ${earned} for jobs. How many coins now?`,
        answer: start - spent + earned,
        a: start,
        b: spent,
        near: [start - spent - earned, start + spent + earned, start - spent],
      },
      rng,
    );
  }
  const friends = randInt(rng, 2, 6);
  const each = randInt(rng, 2, 8);
  const extra = randInt(rng, 1, 9);
  return numberQuestion(
    id,
    {
      operation: 'divide',
      ask: `${name} shares ${friends * each + extra} stickers. ${name} keeps ${extra} and shares the rest equally with ${friends} friends. How many does each friend get?`,
      answer: each,
      a: friends * each,
      b: friends,
      near: [each + 1, friends, Math.floor((friends * each + extra) / friends) + 1],
    },
    rng,
  );
}
