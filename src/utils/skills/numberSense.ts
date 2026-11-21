import type { Problem, Rng, SkillId } from '@/types';
import { digitAt, numberQuestion, pickQuestion } from '@/utils/skills/build';
import { pick, randInt } from '@/utils/seededRandom';

/**
 * Counting, quick looks, what comes next, comparing, number bonds, place value,
 * missing numbers, the equal sign, fact families, and even and odd.
 */

const THINGS = ['🍎', '⭐', '🐞', '🌸', '🐟', '🍪', '🎈', '🐥', '🚗', '🦋'];

/** Count up to 10 (K) or 20 things. */
export function countThings(id: SkillId, rng: Rng, max = 10): Problem {
  const count = randInt(rng, max > 10 ? 8 : 3, max);
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: 'How many are there? Touch each one as you count.',
      answer: count,
      picture: { kind: 'things', count, emoji: pick(rng, THINGS), layout: count > 10 ? 'frame' : 'scatter' },
    },
    rng,
  );
}

/** Subitizing: dots flash for a moment and the player says how many without counting one by one. */
export function quickLook(id: SkillId, rng: Rng): Problem {
  const count = randInt(rng, 1, 6);
  const layout = pick(rng, ['dice', 'frame', 'dice'] as const);
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: 'Quick look! How many dots did you see?',
      answer: count,
      picture: { kind: 'things', count, emoji: '🔵', layout },
      flashMs: 1600,
    },
    rng,
  );
}

/** What comes next, counting by ones to 100 (K) or 120 (1st), or by tens. */
export function whatComesNext(id: SkillId, rng: Rng, max: number): Problem {
  const byTens = max <= 100 && rng() < 0.3;
  const step = byTens ? 10 : 1;
  const start = byTens ? randInt(rng, 0, 6) * 10 : randInt(rng, 1, max - 4);
  const items = [0, 1, 2, 3].map((i) => start + i * step);
  const answer = start + 4 * step;
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: byTens ? 'Count by tens. What comes next?' : 'What number comes next?',
      answer,
      picture: { kind: 'sequence', items: [...items, null] },
      near: [answer + step, answer - 2 * step, answer + 10, answer - 10].filter((n) => n !== answer),
    },
    rng,
  );
}

/** Skip counting by 2s, 5s, 10s or 100s, with a gap somewhere in the row. */
export function skipCount(id: SkillId, rng: Rng): Problem {
  const step = pick(rng, [2, 5, 10, 100, 5, 2]);
  const start = step === 100 ? randInt(rng, 0, 4) * 100 : randInt(rng, 0, 10) * step;
  const values = Array.from({ length: 5 }, (_, i) => start + i * step);
  const gap = randInt(rng, 2, 4);
  const answer = values[gap];
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: `Count by ${step}s. What number is missing?`,
      answer,
      picture: { kind: 'sequence', items: values.map((v, i) => (i === gap ? null : v)) },
      near: [answer + 1, answer - 1, answer + step],
      a: step,
    },
    rng,
  );
}

const MORE_LESS = [
  { value: 0, label: '⬅ This side' },
  { value: 1, label: 'Same' },
  { value: 2, label: 'This side ➡' },
];

/** Which group has more? */
export function compareGroups(id: SkillId, rng: Rng): Problem {
  const left = randInt(rng, 1, 9);
  const same = rng() < 0.2;
  let right = same ? left : randInt(rng, 1, 9);
  if (!same && right === left) right = left === 9 ? 8 : left + 1;
  return pickQuestion(
    id,
    {
      operation: 'add',
      ask: 'Which side has more?',
      answer: left === right ? 1 : left > right ? 0 : 2,
      options: MORE_LESS,
      picture: { kind: 'compare', left, right, emoji: pick(rng, THINGS) },
      a: left,
      b: right,
    },
    rng,
  );
}

const SIGNS = [
  { value: 0, label: '<' },
  { value: 1, label: '=' },
  { value: 2, label: '>' },
];

/** 34 ☐ 43: pick <, = or >. `digits` is 2 for 1st grade, 3 for 2nd. */
export function compareNumbers(id: SkillId, rng: Rng, digits: 2 | 3): Problem {
  const min = digits === 2 ? 10 : 100;
  const max = digits === 2 ? 99 : 999;
  const a = randInt(rng, min, max);
  let b: number;
  const kind = rng();
  if (kind < 0.15) b = a;
  else if (kind < 0.5) {
    // Same digits swapped round (34 and 43), the tricky kind.
    const s = String(a).split('').reverse().join('');
    b = Number(s) >= min ? Number(s) : a + 9;
  } else b = randInt(rng, min, max);
  if (b > max) b = max;
  return pickQuestion(
    id,
    {
      operation: 'add',
      ask: 'Which sign goes in the box?',
      prompt: `${a} ☐ ${b}`,
      answer: a < b ? 0 : a === b ? 1 : 2,
      options: SIGNS,
      a,
      b,
    },
    rng,
  );
}

/** Number bonds: a whole up to 10 and one part; find the other part. */
export function numberBond(id: SkillId, rng: Rng): Problem {
  const whole = randInt(rng, 3, 10);
  const part = randInt(rng, 0, whole);
  const missingFirst = rng() < 0.3;
  return numberQuestion(
    id,
    {
      operation: 'subtract',
      ask: 'What number goes in the empty circle?',
      answer: whole - part,
      picture: { kind: 'bond', whole, parts: missingFirst ? [null, part] : [part, null] },
      a: whole,
      b: part,
    },
    rng,
  );
}

/** How many more to make 10? (ten-frame) */
export function makeTen(id: SkillId, rng: Rng): Problem {
  const filled = randInt(rng, 1, 9);
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: 'How many more make 10?',
      prompt: `${filled} + ☐ = 10`,
      answer: 10 - filled,
      picture: { kind: 'tenFrames', filled },
      a: filled,
      b: 10 - filled,
    },
    rng,
  );
}

/** Tens and ones: count the blocks, or say how many tens are in a number. */
export function tensAndOnes(id: SkillId, rng: Rng): Problem {
  const tens = randInt(rng, 1, 9);
  const ones = randInt(rng, 0, 9);
  const n = tens * 10 + ones;
  if (rng() < 0.5) {
    return numberQuestion(
      id,
      {
        operation: 'add',
        ask: 'Each rod is a ten. Each cube is a one. What number is this?',
        answer: n,
        picture: { kind: 'blocks', hundreds: 0, tens, ones },
        near: [ones * 10 + tens, tens + ones, n + 10],
      },
      rng,
    );
  }
  const askTens = rng() < 0.5;
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: askTens ? `How many tens are in ${n}?` : `How many ones are in ${n}?`,
      prompt: `${n} = ${askTens ? '☐ tens' : `${tens} tens`} and ${askTens ? `${ones} ones` : '☐ ones'}`,
      answer: askTens ? tens : ones,
      near: askTens ? [ones, n] : [tens, n],
      a: n,
    },
    rng,
  );
}

/** Place value to 1,000: the value of one digit, or the number the blocks show. */
export function placeValue(id: SkillId, rng: Rng): Problem {
  const n = randInt(rng, 101, 999);
  const [h, t, o] = [digitAt(n, 2), digitAt(n, 1), digitAt(n, 0)];
  if (rng() < 0.4) {
    return numberQuestion(
      id,
      {
        operation: 'add',
        ask: 'Each flat is a hundred, each rod a ten, each cube a one. What number is this?',
        answer: n,
        picture: { kind: 'blocks', hundreds: h, tens: t, ones: o },
        near: [h * 100 + o * 10 + t, h + t + o, n + 100],
      },
      rng,
    );
  }
  const place = pick(rng, t === 0 ? [2, 0] : [2, 1, 0]);
  const digit = digitAt(n, place);
  const value = digit * 10 ** place;
  const names = ['ones', 'tens', 'hundreds'];
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: `In ${n}, the ${digit} is in the ${names[place]} place. What is it worth?`,
      answer: value,
      near: [digit, digit * 10, digit * 100].filter((v) => v !== value),
      a: n,
      b: place,
    },
    rng,
  );
}

/** Expanded form: 300 + 40 + 7 = ☐, or 562 = 500 + ☐ + 2. */
export function expandedForm(id: SkillId, rng: Rng): Problem {
  const n = randInt(rng, 101, 999);
  const [h, t, o] = [digitAt(n, 2) * 100, digitAt(n, 1) * 10, digitAt(n, 0)];
  const parts = [h, t, o].filter((p) => p > 0);
  if (rng() < 0.5) {
    return numberQuestion(
      id,
      {
        operation: 'add',
        ask: 'Put the parts together. What number is it?',
        prompt: `${parts.join(' + ')} = ☐`,
        answer: n,
        near: [h / 100 + t / 10 + o, n + 10, n - 10],
      },
      rng,
    );
  }
  const missing = t > 0 ? 1 : 0;
  const shown = [h, t, o].map((p, i) => (i === missing ? '☐' : String(p)));
  const answer = [h, t, o][missing];
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: 'Stretch the number out by place value. What goes in the box?',
      prompt: `${n} = ${shown.join(' + ')}`,
      answer,
      near: [answer / 10, answer * 10, n - answer].filter((v) => Number.isInteger(v)),
      a: n,
    },
    rng,
  );
}

/** Missing numbers: 6 + ☐ = 11, ☐ − 4 = 9, 15 − ☐ = 8. */
export function missingNumber(id: SkillId, rng: Rng): Problem {
  const a = randInt(rng, 2, 10);
  const b = randInt(rng, 2, 10);
  const total = a + b;
  const kind = randInt(rng, 0, 2);
  if (kind === 0) {
    return numberQuestion(
      id,
      { operation: 'add', ask: 'What number goes in the box?', prompt: `${a} + ☐ = ${total}`, answer: b, a: total, b: a, near: [total, total + a] },
      rng,
    );
  }
  if (kind === 1) {
    return numberQuestion(
      id,
      { operation: 'subtract', ask: 'What number goes in the box?', prompt: `${total} − ☐ = ${a}`, answer: b, a: total, b: a, near: [total + a] },
      rng,
    );
  }
  return numberQuestion(
    id,
    { operation: 'subtract', ask: 'What number goes in the box?', prompt: `☐ − ${a} = ${b}`, answer: total, a: total, b: a, near: [Math.abs(b - a)] },
    rng,
  );
}

const TRUE_FALSE = [
  { value: 1, label: '✓ True' },
  { value: 0, label: '✗ False' },
];

/** The equal sign means "the same as": is 5 + 2 = 4 + 3 true? */
export function equalSign(id: SkillId, rng: Rng): Problem {
  const total = randInt(rng, 5, 18);
  const a = randInt(rng, 1, total - 1);
  const c = randInt(rng, 1, total - 1);
  const right = rng() < 0.5;
  const d = right ? total - c : total - c + pick(rng, [1, -1, 2]);
  const leftSide = rng() < 0.25 ? String(total) : `${a} + ${total - a}`;
  const rightSide = rng() < 0.3 && right ? `${total + c} − ${c}` : `${c} + ${Math.max(0, d)}`;
  const truth = evalSide(leftSide) === evalSide(rightSide);
  return pickQuestion(
    id,
    {
      operation: 'add',
      ask: 'Is this true? Both sides must be the same amount.',
      prompt: `${leftSide} = ${rightSide}`,
      answer: truth ? 1 : 0,
      options: TRUE_FALSE,
      a: evalSide(leftSide),
      b: evalSide(rightSide),
    },
    rng,
  );
}

function evalSide(side: string): number {
  const m = side.match(/^(\d+)(?: ([+−]) (\d+))?$/);
  if (!m) return Number.NaN;
  if (!m[2]) return Number(m[1]);
  return m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]);
}

/** Fact families: 3 + 4 = 7, so 7 − 4 = ☐. */
export function factFamily(id: SkillId, rng: Rng): Problem {
  let a = randInt(rng, 2, 9);
  let b = randInt(rng, 2, 9);
  if (a === b) b = a === 9 ? 8 : a + 1;
  if (rng() < 0.5) [a, b] = [b, a];
  const total = a + b;
  const asks = [
    { prompt: `${total} − ${b} = ☐`, answer: a },
    { prompt: `${total} − ${a} = ☐`, answer: b },
    { prompt: `${b} + ☐ = ${total}`, answer: a },
  ];
  const asked = pick(rng, asks);
  return numberQuestion(
    id,
    {
      operation: 'subtract',
      ask: `${a} + ${b} = ${total}. Use the fact family. What goes in the box?`,
      prompt: asked.prompt,
      answer: asked.answer,
      a: total,
      b: total - asked.answer,
      near: [total, total - asked.answer],
    },
    rng,
  );
}

const EVEN_ODD = [
  { value: 0, label: 'Even' },
  { value: 1, label: 'Odd' },
];

/** Even or odd? Small numbers show as pairs of counters. */
export function evenOdd(id: SkillId, rng: Rng): Problem {
  const n = rng() < 0.6 ? randInt(rng, 2, 20) : randInt(rng, 21, 99);
  return pickQuestion(
    id,
    {
      operation: 'add',
      ask: n <= 20 ? `Can ${n} be put into pairs with none left over? Is it even or odd?` : `Is ${n} even or odd? Look at the ones.`,
      prompt: String(n),
      answer: n % 2,
      options: EVEN_ODD,
      ...(n <= 20 ? { picture: { kind: 'pairs', count: n } } : {}),
      a: n,
    },
    rng,
  );
}
