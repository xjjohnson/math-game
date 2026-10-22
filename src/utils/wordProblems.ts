import type { Operation, Problem, Rng } from '@/types';
import { buildProblem } from '@/utils/mathEngine';
import { pick } from '@/utils/seededRandom';

const NAMES = ['Maya', 'Leo', 'Ava', 'Sam', 'Zoe', 'Omar', 'Lily', 'Max', 'Nia', 'Eli'];

const THINGS: [one: string, many: string][] = [
  ['sticker', 'stickers'],
  ['marble', 'marbles'],
  ['apple', 'apples'],
  ['shell', 'shells'],
  ['card', 'cards'],
  ['cookie', 'cookies'],
  ['crayon', 'crayons'],
];

const count = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

type Template = (a: number, b: number, name: string, thing: [string, string]) => string;

const TEMPLATES: Record<Operation, Template[]> = {
  add: [
    (a, b, name, t) =>
      `${name} has ${count(a, t)} and finds ${b} more. How many ${t[1]} does ${name} have now?`,
    (a, b, _name, t) =>
      `One box holds ${count(a, t)} and another holds ${count(b, t)}. How many ${t[1]} are there in all?`,
  ],
  subtract: [
    (a, b, name, t) =>
      `${name} has ${count(a, t)} and gives ${b} away. How many ${t[1]} are left?`,
    (a, b, _name, t) =>
      `A shelf holds ${count(a, t)}. Someone takes ${b} of them. How many ${t[1]} are still on the shelf?`,
  ],
  multiply: [
    (a, b, name, t) =>
      `${name} has ${a} ${a === 1 ? 'bag' : 'bags'} with ${count(b, t)} in each. How many ${t[1]} is that altogether?`,
    (a, b, _name, t) =>
      `There are ${a} ${a === 1 ? 'row' : 'rows'} of ${t[1]} with ${b} in each row. How many ${t[1]} are there?`,
  ],
  divide: [
    (a, b, name, t) =>
      `${name} shares ${count(a, t)} equally with ${b} ${b === 1 ? 'friend' : 'friends'}. How many does each friend get?`,
    (a, b, _name, t) =>
      `${count(a, t)} are packed into ${b} equal ${b === 1 ? 'box' : 'boxes'}. How many go in each box?`,
  ],
};

/**
 * Turns a problem into a short story with the same numbers. A subtraction that
 * would go below zero is flipped, since "gives away more than you have" makes no sense.
 */
export function toWordProblem(problem: Problem, rng: Rng): Problem {
  let { a, b } = problem;
  let base = problem;
  if (problem.operation === 'subtract' && problem.answer < 0) {
    [a, b] = [b, a];
    base = buildProblem('subtract', a, b, a - b, rng);
  }
  const story = pick(rng, TEMPLATES[problem.operation])(a, b, pick(rng, NAMES), pick(rng, THINGS));
  return { ...base, story };
}
