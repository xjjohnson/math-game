import type { Difficulty, GameMode, Operation, Rng } from '@/types';
import { randInt } from '@/utils/seededRandom';

/**
 * "Learn how" lessons: short step-by-step walk-throughs of the ways kids are
 * taught at school (counting on, making ten, carrying, borrowing, skip
 * counting, sharing, long division). Each lesson builds its steps from fresh
 * numbers, so "New example" shows the same method on a different problem.
 */

/** A line of written working; tone colors it. */
export interface WorkLine {
  text: string;
  tone?: 'mark' | 'answer' | 'struck' | 'note';
}

export type LessonVisual =
  /** Number line from min to max, starting at `start` and hopping by each entry of `hops`. */
  | { kind: 'numberLine'; min: number; max: number; start: number; hops: number[] }
  /** Groups of dots, one circle each. */
  | { kind: 'dots'; groups: number[] }
  | { kind: 'array'; rows: number; cols: number }
  /** Ten-frames, each filled with that many counters (up to 10). */
  | { kind: 'tenFrames'; frames: number[] }
  /** Working written on paper, one monospaced line each. */
  | { kind: 'work'; lines: WorkLine[] }
  /** Skip-counting chips, e.g. 3, 6, 9, 12. */
  | { kind: 'skip'; numbers: number[] }
  | { kind: 'big'; text: string };

export interface LessonStep {
  text: string;
  visual?: LessonVisual;
}

export interface LessonPractice {
  mode: GameMode;
  difficulty: Difficulty;
  showWork?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  operation: Operation;
  /** Rough school ages, e.g. "5-7". */
  ages: string;
  summary: string;
  build: (rng: Rng) => LessonStep[];
  practice: LessonPractice;
}

const op = (operation: Operation): GameMode => ({ kind: 'operation', operation });
const range = (n: number, step = 1) => Array.from({ length: n }, (_, i) => (i + 1) * step);
const digitsOf = (n: number) => String(n).split('').map(Number);

/**
 * Lays out numbers right-aligned in columns, like on paper. Each row is a
 * symbol (or '') and a list of cells, with the last cell in the ones column.
 */
export function columns(rows: { sign?: string; cells: (string | number)[] }[], cell = 3): string[] {
  const width = Math.max(...rows.map((r) => r.cells.length));
  return rows.map(({ sign = '', cells }) => {
    const padded = [...Array(width - cells.length).fill(''), ...cells];
    return sign.padEnd(2) + padded.map((c) => String(c).padStart(cell)).join('');
  });
}

const rule = (cells: number, cell = 3) => '  ' + '─'.repeat(cells * cell);

// ---------- Addition ----------

function countOn(rng: Rng): LessonStep[] {
  const big = randInt(rng, 4, 9);
  const small = randInt(rng, 2, 4);
  const [a, b] = rng() < 0.5 ? [big, small] : [small, big];
  const sum = a + b;
  const line = { kind: 'numberLine' as const, min: 0, max: Math.min(20, sum + 2), start: big };
  return [
    {
      text: `Let's work out ${a} + ${b}. Put your finger on the bigger number, ${big}. Starting there means fewer hops!`,
      visual: { ...line, hops: [] },
    },
    {
      text: `Now count on ${small}: ${range(small)
        .map((i) => big + i)
        .join(', ')}. One hop for each.`,
      visual: { ...line, hops: Array(small).fill(1) },
    },
    { text: `You landed on ${sum}.`, visual: { kind: 'big', text: `${a} + ${b} = ${sum}` } },
  ];
}

function makeTen(rng: Rng): LessonStep[] {
  const a = randInt(rng, 6, 9);
  const b = randInt(rng, 11 - a, 9);
  const need = 10 - a;
  const rest = b - need;
  const sum = a + b;
  return [
    {
      text: `${a} + ${b}. Tens are easy to add, so let's make a 10 first.`,
      visual: { kind: 'tenFrames', frames: [a, b] },
    },
    {
      text: `${a} needs ${need} more to fill its frame. Move ${need} over from the ${b}. That leaves ${rest}.`,
      visual: { kind: 'tenFrames', frames: [10, rest] },
    },
    {
      text: `Now it's just 10 + ${rest}.`,
      visual: { kind: 'big', text: `${a} + ${b} = 10 + ${rest} = ${sum}` },
    },
  ];
}

function carrying(rng: Rng): LessonStep[] {
  let a = 0;
  let b = 0;
  // Two 2-digit numbers whose ones make 10 or more, with an answer under 100.
  do {
    a = randInt(rng, 15, 69);
    b = randInt(rng, 15, 89 - a + 10);
  } while ((a % 10) + (b % 10) < 10 || a + b > 99);
  const [aT, aO] = digitsOf(a);
  const [bT, bO] = digitsOf(b);
  const onesSum = aO + bO;
  const sum = a + b;
  const [sT, sO] = digitsOf(sum);
  const top = { cells: [aT, aO] };
  const bottom = { sign: '+', cells: [bT, bO] };
  const text = (lines: string[], tones: WorkLine['tone'][]) =>
    lines.map((t, i) => ({ text: t, tone: tones[i] }));
  return [
    {
      text: `Write ${a} + ${b} in columns: ones under ones, tens under tens.`,
      visual: { kind: 'work', lines: text([...columns([top, bottom]), rule(2)], []) },
    },
    {
      text: `Start with the ones: ${aO} + ${bO} = ${onesSum}. That's more than 9, so write the ${onesSum % 10} and carry the 1 up to the tens.`,
      visual: {
        kind: 'work',
        lines: text(
          [...columns([{ cells: [1, ''] }, top, bottom]), rule(2), ...columns([{ cells: ['', sO] }])],
          ['mark', undefined, undefined, undefined, 'answer'],
        ),
      },
    },
    {
      text: `Now the tens: the carried 1 + ${aT} + ${bT} = ${sT}.`,
      visual: {
        kind: 'work',
        lines: text(
          [...columns([{ cells: [1, ''] }, top, bottom]), rule(2), ...columns([{ cells: [sT, sO] }])],
          ['mark', undefined, undefined, undefined, 'answer'],
        ),
      },
    },
    {
      text: 'Try it yourself with "Show my work" switched on. It walks you through every column.',
      visual: { kind: 'big', text: `${a} + ${b} = ${sum}` },
    },
  ];
}

// ---------- Subtraction ----------

function countBack(rng: Rng): LessonStep[] {
  const a = randInt(rng, 8, 15);
  const b = randInt(rng, 2, 5);
  const line = { kind: 'numberLine' as const, min: Math.max(0, a - b - 2), max: a + 1, start: a };
  return [
    { text: `Let's work out ${a} − ${b}. Start at ${a} on the number line.`, visual: { ...line, hops: [] } },
    {
      text: `Take away means go back. Hop back ${b}: ${range(b)
        .map((i) => a - i)
        .join(', ')}.`,
      visual: { ...line, hops: Array(b).fill(-1) },
    },
    { text: `You landed on ${a - b}.`, visual: { kind: 'big', text: `${a} − ${b} = ${a - b}` } },
  ];
}

function countUp(rng: Rng): LessonStep[] {
  const ten = randInt(rng, 3, 9) * 10;
  const b = ten - randInt(rng, 1, 5);
  const a = ten + randInt(rng, 1, 6);
  const up1 = ten - b;
  const up2 = a - ten;
  const line = { kind: 'numberLine' as const, min: b - 1, max: a + 1, start: b };
  return [
    {
      text: `${a} − ${b}: the numbers are close together, so count UP from ${b} to ${a} instead of taking away.`,
      visual: { ...line, hops: [] },
    },
    { text: `First hop to the next ten: ${b} to ${ten} is ${up1}.`, visual: { ...line, hops: [up1] } },
    { text: `Then ${ten} to ${a} is ${up2}.`, visual: { ...line, hops: [up1, up2] } },
    {
      text: `Add the hops: ${up1} + ${up2} = ${up1 + up2}. That's how far apart they are.`,
      visual: { kind: 'big', text: `${a} − ${b} = ${a - b}` },
    },
  ];
}

function borrowing(rng: Rng): LessonStep[] {
  const aT = randInt(rng, 3, 9);
  const aO = randInt(rng, 0, 4);
  const bT = randInt(rng, 1, aT - 1);
  const bO = randInt(rng, aO + 1, 9);
  const a = aT * 10 + aO;
  const b = bT * 10 + bO;
  const diff = a - b;
  const [dT, dO] = [Math.floor(diff / 10), diff % 10];
  const top = { cells: [aT, aO] };
  const bottom = { sign: '−', cells: [bT, bO] };
  const marks = { cells: [aT - 1, aO + 10] };
  return [
    {
      text: `Write ${a} − ${b} in columns. Always start with the ones.`,
      visual: { kind: 'work', lines: [...columns([top, bottom]), rule(2)].map((t) => ({ text: t })) },
    },
    {
      text: `Ones: ${aO} − ${bO}? ${aO} is smaller than ${bO}, so we can't take away yet. Borrow 1 ten from the tens: the ${aT} becomes ${aT - 1}, and the ${aO} becomes ${aO + 10}.`,
      visual: {
        kind: 'work',
        lines: [
          { text: columns([marks])[0], tone: 'mark' },
          { text: columns([top])[0], tone: 'struck' },
          { text: columns([bottom])[0] },
          { text: rule(2) },
        ],
      },
    },
    {
      text: `Now the ones: ${aO + 10} − ${bO} = ${dO}. Then the tens: ${aT - 1} − ${bT} = ${dT}.`,
      visual: {
        kind: 'work',
        lines: [
          { text: columns([marks])[0], tone: 'mark' },
          { text: columns([top])[0], tone: 'struck' },
          { text: columns([bottom])[0] },
          { text: rule(2) },
          { text: columns([{ cells: [dT || '', dO] }])[0], tone: 'answer' },
        ],
      },
    },
    {
      text: 'Check it by adding back: the answer plus the number you took away gives the top number.',
      visual: { kind: 'big', text: `${diff} + ${b} = ${a} ✓` },
    },
  ];
}

// ---------- Multiplication ----------

function groupsOf(rng: Rng): LessonStep[] {
  const a = randInt(rng, 2, 5);
  const b = randInt(rng, 2, 5);
  const ans = a * b;
  return [
    {
      text: `${a} × ${b} means ${a} groups of ${b}.`,
      visual: { kind: 'dots', groups: Array(a).fill(b) },
    },
    {
      text: `Count them all, or add the groups: ${Array(a).fill(b).join(' + ')} = ${ans}.`,
      visual: { kind: 'big', text: `${a} × ${b} = ${ans}` },
    },
    {
      text: `Line the groups up in rows and you get an array: ${a} rows of ${b}. Turn it sideways and it's ${b} rows of ${a}, same answer!`,
      visual: { kind: 'array', rows: a, cols: b },
    },
  ];
}

function skipCounting(rng: Rng): LessonStep[] {
  const b = [2, 3, 5, 10][randInt(rng, 0, 3)];
  const a = randInt(rng, 3, 8);
  return [
    {
      text: `To work out ${a} × ${b}, count by ${b}s. Hold up one finger for each number you say.`,
      visual: { kind: 'skip', numbers: [b] },
    },
    {
      text: `Keep going until you have ${a} fingers up: ${range(a, b).join(', ')}.`,
      visual: { kind: 'skip', numbers: range(a, b) },
    },
    { text: 'The last number you said is the answer.', visual: { kind: 'big', text: `${a} × ${b} = ${a * b}` } },
  ];
}

function tableTricks(rng: Rng): LessonStep[] {
  const n = () => randInt(rng, 2, 9);
  const [n2, n4, n5, n9, n10, n11] = [n(), n(), n(), n(), n(), n()];
  return [
    { text: '× 2 is a double. Add the number to itself.', visual: { kind: 'big', text: `${n2} × 2 = ${n2} + ${n2} = ${n2 * 2}` } },
    {
      text: '× 4 is double, then double again.',
      visual: { kind: 'big', text: `${n4} × 4: ${n4} → ${n4 * 2} → ${n4 * 4}` },
    },
    {
      text: '× 5 answers always end in 0 or 5. It is half of × 10.',
      visual: { kind: 'big', text: `${n5} × 5 = ${n5 * 5}` },
    },
    {
      text: `× 9: the tens digit is one less than the number, and the two digits add up to 9. For ${n9} × 9: one less than ${n9} is ${n9 - 1}, and ${n9 - 1} + ${10 - n9} = 9.`,
      visual: { kind: 'big', text: `${n9} × 9 = ${n9 * 9}` },
    },
    { text: '× 10: put a 0 on the end.', visual: { kind: 'big', text: `${n10} × 10 = ${n10 * 10}` } },
    { text: '× 11 (up to 9): write the number twice.', visual: { kind: 'big', text: `${n11} × 11 = ${n11 * 11}` } },
    {
      text: 'Swap them if it helps! 3 × 8 is the same as 8 × 3, so you only need to learn half the table.',
      visual: { kind: 'array', rows: 3, cols: 8 },
    },
  ];
}

function breakApart(rng: Rng): LessonStep[] {
  const tens = randInt(rng, 1, 9) * 10;
  const ones = randInt(rng, 1, 9);
  const b = randInt(rng, 3, 9);
  const whole = tens + ones;
  const p1 = ones * b;
  const p2 = tens * b;
  const [wT, wO] = digitsOf(whole);
  const head = columns([{ cells: [wT, wO] }, { sign: '×', cells: [b] }]);
  const width = String(p1 + p2).length;
  return [
    {
      text: `${whole} × ${b} looks hard. Break ${whole} into tens and ones: ${tens} + ${ones}.`,
      visual: { kind: 'big', text: `${whole} = ${tens} + ${ones}` },
    },
    {
      text: `Times each part by ${b}: ${ones} × ${b} = ${p1}, and ${tens} × ${b} = ${p2}.`,
      visual: {
        kind: 'work',
        lines: [
          ...head.map((t) => ({ text: t })),
          { text: rule(Math.max(2, width)) },
          { text: columns([{ cells: digitsOf(p1) }])[0].padEnd(12) + `(${ones} × ${b})`, tone: 'note' },
          { text: columns([{ sign: '+', cells: digitsOf(p2) }])[0].padEnd(12) + `(${tens} × ${b})`, tone: 'note' },
        ],
      },
    },
    {
      text: `Add the parts: ${p1} + ${p2} = ${p1 + p2}.`,
      visual: { kind: 'big', text: `${whole} × ${b} = ${p1 + p2}` },
    },
    {
      text: 'On paper, the short way does the same thing: times the ones, carry, then times the tens. "Show my work" walks you through it.',
    },
  ];
}

// ---------- Division ----------

function sharing(rng: Rng): LessonStep[] {
  const b = randInt(rng, 2, 4);
  const each = randInt(rng, 2, 5);
  const a = b * each;
  return [
    { text: `${a} ÷ ${b} means share ${a} into ${b} equal groups.`, visual: { kind: 'dots', groups: [a] } },
    {
      text: `Give one to each group, then another, and keep going until they're all shared out.`,
      visual: { kind: 'dots', groups: Array(b).fill(each) },
    },
    { text: `Each group got ${each}.`, visual: { kind: 'big', text: `${a} ÷ ${b} = ${each}` } },
  ];
}

function factFamily(rng: Rng): LessonStep[] {
  const b = randInt(rng, 3, 9);
  const q = randInt(rng, 2, 9);
  const a = b * q;
  return [
    {
      text: `${a} ÷ ${b} asks: how many ${b}s make ${a}? Think of it as a times fact with a gap.`,
      visual: { kind: 'big', text: `${b} × ? = ${a}` },
    },
    {
      text: `Skip count by ${b} until you reach ${a}, and count how many numbers you said.`,
      visual: { kind: 'skip', numbers: range(q, b) },
    },
    { text: `That's ${q} of them.`, visual: { kind: 'big', text: `${a} ÷ ${b} = ${q}` } },
    {
      text: 'These four facts are a family. Know one and you know them all.',
      visual: {
        kind: 'work',
        lines: [`${b} × ${q} = ${a}`, `${q} × ${b} = ${a}`, `${a} ÷ ${b} = ${q}`, `${a} ÷ ${q} = ${b}`].map(
          (text) => ({ text }),
        ),
      },
    },
  ];
}

/**
 * Long division written the school way:
 *
 *       3 9
 *     ┌────
 *   4 │1 5 6
 *    −1 2
 *     ───
 *       3 6
 */
export function longDivisionSteps(dividend: number, divisor: number): LessonStep[] {
  const digits = digitsOf(dividend);
  const left = String(divisor).length + 2;
  // Digit i of the dividend sits at column left + 2i.
  const at = (i: number) => left + 2 * i;
  const quotient: string[] = digits.map(() => ' ');
  const work: WorkLine[] = [];
  const place = (text: string, endIndex: number, tone?: WorkLine['tone'], sign = '') => {
    const spread = text.split('').join(' ');
    const start = at(endIndex) - (spread.length - 1);
    const pad = Math.max(0, start - sign.length);
    work.push({ text: ' '.repeat(pad) + sign + spread, tone });
  };
  const picture = (): LessonVisual => ({
    kind: 'work',
    lines: [
      { text: ' '.repeat(left) + quotient.join(' ').trimEnd(), tone: 'answer' },
      { text: ' '.repeat(left - 1) + '┌' + '─'.repeat(digits.length * 2) },
      { text: `${divisor} │` + digits.join(' ') },
      ...work,
    ],
  });

  const steps: LessonStep[] = [
    {
      text: `${dividend} ÷ ${divisor}. Write it as a long division: ${divisor} on the outside, ${dividend} inside. Then repeat four moves: Divide, Multiply, Subtract, Bring down.`,
      visual: picture(),
    },
  ];

  let current = 0;
  let started = false;
  digits.forEach((d, i) => {
    current = current * 10 + d;
    const last = i === digits.length - 1;
    if (!started && current < divisor && !last) {
      steps.push({
        text: `${divisor} doesn't fit into ${current}, so use the next digit too.`,
        visual: picture(),
      });
      return;
    }
    started = true;
    const q = Math.floor(current / divisor);
    const product = q * divisor;
    const remainder = current - product;
    quotient[i] = String(q);
    place(String(product), i, undefined, '−');
    const len = String(product).length;
    work.push({ text: ' '.repeat(at(i) - 2 * (len - 1) - 1) + '─'.repeat(2 * len + 1) });
    const next = last ? '' : String(digits[i + 1]);
    if (last) place(String(remainder), i, 'answer');
    else place(String(remainder * 10 + digits[i + 1]), i + 1);
    steps.push({
      text:
        `Divide: how many ${divisor}s fit in ${current}? ${q}. Write ${q} on top. ` +
        `Multiply: ${q} × ${divisor} = ${product}. Subtract: ${current} − ${product} = ${remainder}.` +
        (last ? '' : ` Bring down the ${next}.`),
      visual: picture(),
    });
    current = remainder;
  });

  const answer = Math.floor(dividend / divisor);
  steps.push({
    text: current === 0 ? 'Nothing left over, so we are done!' : `${current} is left over.`,
    visual: { kind: 'big', text: `${dividend} ÷ ${divisor} = ${answer}${current ? ` r ${current}` : ''}` },
  });
  return steps;
}

function longDivision(rng: Rng): LessonStep[] {
  const divisor = randInt(rng, 3, 9);
  const q = randInt(rng, Math.ceil(100 / divisor), Math.floor(999 / divisor));
  return longDivisionSteps(divisor * q, divisor);
}

export const LESSONS: Lesson[] = [
  {
    id: 'count-on',
    title: 'Count on',
    emoji: '🐸',
    operation: 'add',
    ages: '5-7',
    summary: 'Start at the bigger number and hop forward.',
    build: countOn,
    practice: { mode: op('add'), difficulty: 'easy' },
  },
  {
    id: 'make-ten',
    title: 'Make a ten',
    emoji: '🔟',
    operation: 'add',
    ages: '6-8',
    summary: 'Fill up a 10 first, then add what is left.',
    build: makeTen,
    practice: { mode: op('add'), difficulty: 'easy' },
  },
  {
    id: 'carrying',
    title: 'Carrying',
    emoji: '🎒',
    operation: 'add',
    ages: '7-9',
    summary: 'Add big numbers in columns and carry the 1.',
    build: carrying,
    practice: { mode: op('add'), difficulty: 'medium', showWork: true },
  },
  {
    id: 'count-back',
    title: 'Count back',
    emoji: '⬅️',
    operation: 'subtract',
    ages: '5-7',
    summary: 'Start at the first number and hop backward.',
    build: countBack,
    practice: { mode: op('subtract'), difficulty: 'easy' },
  },
  {
    id: 'count-up',
    title: 'Count up to subtract',
    emoji: '🪜',
    operation: 'subtract',
    ages: '7-9',
    summary: 'Find how far apart two numbers are.',
    build: countUp,
    practice: { mode: op('subtract'), difficulty: 'medium' },
  },
  {
    id: 'borrowing',
    title: 'Borrowing',
    emoji: '🤝',
    operation: 'subtract',
    ages: '7-9',
    summary: 'Subtract in columns and borrow a ten.',
    build: borrowing,
    practice: { mode: op('subtract'), difficulty: 'medium', showWork: true },
  },
  {
    id: 'groups',
    title: 'Equal groups',
    emoji: '🍪',
    operation: 'multiply',
    ages: '6-8',
    summary: 'Times means groups of the same size.',
    build: groupsOf,
    practice: { mode: op('multiply'), difficulty: 'easy' },
  },
  {
    id: 'skip-counting',
    title: 'Skip counting',
    emoji: '🦘',
    operation: 'multiply',
    ages: '6-8',
    summary: 'Count by 2s, 5s or 10s to times.',
    build: skipCounting,
    practice: { mode: { kind: 'tables', tables: [2, 5, 10], includeDivision: false }, difficulty: 'medium' },
  },
  {
    id: 'table-tricks',
    title: 'Times table tricks',
    emoji: '🪄',
    operation: 'multiply',
    ages: '8-10',
    summary: 'Shortcuts for 2s, 4s, 5s, 9s, 10s and 11s.',
    build: tableTricks,
    practice: {
      mode: { kind: 'tables', tables: [2, 4, 5, 9, 10, 11], includeDivision: false },
      difficulty: 'medium',
    },
  },
  {
    id: 'break-apart',
    title: 'Break it apart',
    emoji: '🧩',
    operation: 'multiply',
    ages: '9-11',
    summary: 'Times big numbers by splitting tens and ones.',
    build: breakApart,
    practice: { mode: op('multiply'), difficulty: 'medium', showWork: true },
  },
  {
    id: 'sharing',
    title: 'Share it out',
    emoji: '🍕',
    operation: 'divide',
    ages: '6-8',
    summary: 'Divide means share into equal groups.',
    build: sharing,
    practice: { mode: op('divide'), difficulty: 'easy' },
  },
  {
    id: 'fact-family',
    title: 'Think times',
    emoji: '👨‍👩‍👧‍👦',
    operation: 'divide',
    ages: '8-10',
    summary: 'Use a times fact to divide.',
    build: factFamily,
    practice: { mode: { kind: 'tables', tables: [3, 4, 6, 7, 8, 9], includeDivision: true }, difficulty: 'medium' },
  },
  {
    id: 'long-division',
    title: 'Long division',
    emoji: '🏰',
    operation: 'divide',
    ages: '9-12',
    summary: 'Divide, Multiply, Subtract, Bring down.',
    build: longDivision,
    practice: { mode: op('divide'), difficulty: 'hard' },
  },
];

export const findLesson = (id: string | undefined) => LESSONS.find((l) => l.id === id);
