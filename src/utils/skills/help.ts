import type { Picture, Problem, SkillProgress } from '@/types';
import { columns, type LessonStep, type LessonVisual, type WorkLine } from '@/utils/lessons';
import { columnLayout } from '@/utils/columnEntry';
import { teachSteps } from '@/utils/columnTeach';
import { answerText } from '@/utils/skills/build';
import { findSkill } from '@/utils/skills/catalog';

/**
 * Help for the question on screen, picked the way a teacher would:
 * - School order: pictures first (tens and ones blocks, ten-frames, counters),
 *   then tricks (number line, count up, break apart, friendly numbers), then
 *   the stacked paper method last.
 * - Which one comes first depends on how the player is doing on the skill:
 *   new or struggling gets the picture, getting there gets the trick that
 *   suits these numbers, and someone who knows it gets the paper method.
 * - The words are the ones schools use now: trade, unbundle, bundle and
 *   regroup (never borrow or carry).
 * While the question is still open, help shows the method but leaves the last
 * step for the player. After a miss it shows the whole thing.
 */

export type WayKind = 'picture' | 'trick' | 'paper';

export interface HelpWay {
  id: string;
  title: string;
  emoji: string;
  kind: WayKind;
  steps: LessonStep[];
}

const KIND_ORDER: WayKind[] = ['picture', 'trick', 'paper'];

interface Ctx {
  p: Problem;
  /** Show the answer at the end (after a miss), or leave it for the player. */
  reveal: boolean;
}

const pic = (picture: Picture): LessonVisual => ({ kind: 'picture', picture });
const big = (text: string): LessonVisual => ({ kind: 'big', text });
const places = (n: number) => ({ h: Math.floor(n / 100) % 10, t: Math.floor(n / 10) % 10, o: n % 10 });
const blocksOf = (n: number): Extract<Picture, { kind: 'blocks' }> => {
  const d = places(n);
  return { kind: 'blocks', hundreds: Math.floor(n / 100), tens: d.t, ones: d.o };
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const sign = (p: Problem) => ({ add: '+', subtract: '−', multiply: '×', divide: '÷' })[p.operation];
const sentence = (p: Problem) => `${p.a} ${sign(p)} ${p.b}`;

/** The last step: the answer after a miss, or "your turn" while the question is open. */
function finish(ctx: Ctx, shown: string, visual: LessonVisual | undefined, yourTurn: string): LessonStep {
  if (ctx.reveal) return { text: shown, visual };
  return { text: `${yourTurn} Close this and put in your answer.` };
}

// ---------- adding ----------

function countOnWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const [from, by] = a >= b ? [a, b] : [b, a];
  const line = { kind: 'numberLine' as const, min: Math.max(0, from - 2), max: Math.max(answer + 2, from + 4), step: 1, start: from };
  return {
    id: 'count-on',
    title: 'Count on',
    emoji: '🐸',
    kind: 'picture',
    steps: [
      { text: `Start at the bigger number, ${from}. Keep it in your head.`, visual: pic({ ...line, hops: [] }) },
      {
        text: `Now count on ${by}, one hop for each.${ctx.reveal ? ` ${Array.from({ length: by }, (_, i) => from + i + 1).join(', ')}.` : ''}`,
        visual: pic({ ...line, hops: Array(by).fill(1), hideEnd: !ctx.reveal }),
      },
      finish(ctx, `You land on ${answer}. So ${a} + ${b} = ${answer}.`, big(`${a} + ${b} = ${answer}`), 'Where do you land?'),
    ],
  };
}

function makeTenWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const [first, second] = a >= b ? [a, b] : [b, a];
  const need = 10 - first;
  const rest = second - need;
  return {
    id: 'make-ten',
    title: 'Make a ten',
    emoji: '🔟',
    kind: 'picture',
    steps: [
      { text: `Put ${first} in the ten-frame and ${second} after it.`, visual: pic({ kind: 'tenFrames', filled: first, extra: second, frames: 2 }) },
      {
        text: `${first} needs ${need} more to fill the frame. Move ${need} over from the ${second}. That leaves ${rest}.`,
        visual: pic({ kind: 'tenFrames', filled: 10, extra: rest, frames: 2 }),
      },
      finish(ctx, `A full ten and ${rest} more: 10 + ${rest} = ${answer}.`, big(`${a} + ${b} = 10 + ${rest} = ${answer}`), `Now it's 10 + ${rest}. What's that?`),
    ],
  };
}

function blocksAddWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const x = places(a);
  const y = places(b);
  const hundreds = Math.floor(a / 100) + Math.floor(b / 100);
  const steps: LessonStep[] = [
    {
      text: `Make both numbers with blocks. Each rod is a ten, each little cube is a one${hundreds ? ', each flat is a hundred' : ''}.`,
      visual: { kind: 'pictures', pictures: [blocksOf(a), blocksOf(b)], joiner: '+' },
    },
  ];
  let h = hundreds;
  let t = x.t + y.t;
  let o = x.o + y.o;
  steps.push({
    text: `Push them together. Ones: ${x.o} + ${y.o} = ${o}. Tens: ${x.t} + ${y.t} = ${t}.`,
    visual: pic({ kind: 'blocks', hundreds: h, tens: t, ones: o }),
  });
  if (o >= 10) {
    o -= 10;
    t += 1;
    steps.push({
      text: `That's 10 or more ones, so bundle 10 ones into 1 ten. Now there are ${plural(t, 'ten')} and ${plural(o, 'one')}.`,
      visual: pic({ kind: 'blocks', hundreds: h, tens: t, ones: o }),
    });
  }
  if (t >= 10) {
    t -= 10;
    h += 1;
    steps.push({
      text: `10 tens make a hundred, so bundle them into 1 hundred. Now there are ${plural(h, 'hundred')}, ${plural(t, 'ten')} and ${plural(o, 'one')}.`,
      visual: pic({ kind: 'blocks', hundreds: h, tens: t, ones: o }),
    });
  }
  steps.push(
    finish(
      ctx,
      `Count them up: ${h ? `${plural(h, 'hundred')}, ` : ''}${plural(t, 'ten')} and ${plural(o, 'one')} is ${answer}.`,
      big(`${a} + ${b} = ${answer}`),
      'Count the hundreds, tens and ones. What number is that?',
    ),
  );
  return { id: 'blocks', title: 'Tens and ones blocks', emoji: '🧱', kind: 'picture', steps };
}

/** Splits a number into its hundreds, tens and ones, leaving out zeros: 247 → [200, 40, 7]. */
const partsOf = (n: number) => [n - (n % 100), (n % 100) - (n % 10), n % 10].filter((x) => x > 0);

function breakApartAddWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const [from, by] = a >= b ? [a, b] : [b, a];
  const parts = partsOf(by);
  const line = { kind: 'numberLine' as const, min: from, max: answer, step: answer - from, start: from };
  const steps: LessonStep[] = [{ text: `Keep ${from} whole and break ${by} into ${parts.join(' and ')}.`, visual: big(`${by} = ${parts.join(' + ')}`) }];
  let at = from;
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    steps.push({
      text: last && !ctx.reveal ? `Then add the ${part}: ${at} + ${part}.` : `${i === 0 ? 'Add' : 'Then add'} the ${part}: ${at} + ${part} = ${at + part}.`,
      visual: pic({ ...line, hops: parts.slice(0, i + 1), hideEnd: last && !ctx.reveal }),
    });
    at += part;
  });
  steps.push(finish(ctx, `So ${a} + ${b} = ${answer}.`, big(`${a} + ${b} = ${answer}`), `What is ${at - parts[parts.length - 1]} + ${parts[parts.length - 1]}?`));
  return { id: 'break-apart', title: 'Break it apart', emoji: '🧩', kind: 'trick', steps };
}

function friendlyAddWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const [keep, round] = b % 10 >= a % 10 ? [a, b] : [b, a];
  const up = Math.ceil(round / 10) * 10;
  const extra = up - round;
  return {
    id: 'friendly',
    title: 'Friendly numbers',
    emoji: '🤝',
    kind: 'trick',
    steps: [
      { text: `${round} is close to ${up}, and tens are easy to add. Pretend it's ${up}.`, visual: big(`${round} → ${up}`) },
      { text: `${keep} + ${up} = ${keep + up}.`, visual: big(`${keep} + ${up} = ${keep + up}`) },
      {
        text: `But we added ${extra} too many, so take ${extra} back.`,
        visual: big(`${keep + up} − ${extra} = ${ctx.reveal ? answer : '?'}`),
      },
      finish(ctx, `${keep + up} − ${extra} = ${answer}. So ${a} + ${b} = ${answer}.`, big(`${a} + ${b} = ${answer}`), `What is ${keep + up} − ${extra}?`),
    ],
  };
}

function zeroWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  return {
    id: 'zero',
    title: 'Zero',
    emoji: '0️⃣',
    kind: 'picture',
    steps: [
      { text: `${ctx.p.operation === 'add' ? 'Adding' : 'Taking away'} 0 means nothing changes.`, visual: pic({ kind: 'things', count: Math.max(1, a), emoji: '🍎', layout: 'frame' }) },
      finish(ctx, `So ${a} ${sign(ctx.p)} ${b} = ${answer}.`, big(`${a} ${sign(ctx.p)} ${b} = ${answer}`), `How many are there?`),
    ],
  };
}

// ---------- taking away ----------

function takeAwayPictureWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  return {
    id: 'take-away',
    title: 'Cross them out',
    emoji: '✏️',
    kind: 'picture',
    steps: [
      { text: `Here are ${a}.`, visual: pic({ kind: 'things', count: a, emoji: '🍎', layout: 'frame' }) },
      { text: `Take away ${b}: cross out ${b} of them.`, visual: pic({ kind: 'things', count: a, emoji: '🍎', layout: 'frame', crossed: b }) },
      finish(ctx, `${answer} are left. So ${a} − ${b} = ${answer}.`, big(`${a} − ${b} = ${answer}`), 'Count the ones that are left.'),
    ],
  };
}

function countBackWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const line = { kind: 'numberLine' as const, min: Math.max(0, answer - 2), max: a + 2, step: 1, start: a };
  return {
    id: 'count-back',
    title: 'Count back',
    emoji: '⬅️',
    kind: 'picture',
    steps: [
      { text: `Start at ${a}. Taking away means going back.`, visual: pic({ ...line, hops: [] }) },
      {
        text: `Hop back ${b}, one at a time.${ctx.reveal ? ` ${Array.from({ length: b }, (_, i) => a - i - 1).join(', ')}.` : ''}`,
        visual: pic({ ...line, hops: Array(b).fill(-1), hideEnd: !ctx.reveal }),
      },
      finish(ctx, `You land on ${answer}. So ${a} − ${b} = ${answer}.`, big(`${a} − ${b} = ${answer}`), 'Where do you land?'),
    ],
  };
}

function countUpWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const ten = Math.ceil(b / 10) * 10;
  const first = Math.min(ten, a) - b;
  const hops = [first, a - b - first].filter((n) => n > 0);
  const line = { kind: 'numberLine' as const, min: b, max: a, step: a - b, start: b };
  return {
    id: 'count-up',
    title: 'Count up',
    emoji: '🪜',
    kind: 'trick',
    steps: [
      {
        text: `${a} and ${b} are close together. Instead of taking away, count UP from ${b} to ${a}.`,
        visual: pic({ ...line, hops: [] }),
      },
      ...(hops.length > 1
        ? [{ text: `Hop to the next ten first: ${b} to ${ten} is ${first}.`, visual: pic({ ...line, hops: [first] }) }]
        : []),
      {
        text: hops.length > 1 ? `Then ${ten} to ${a} is ${a - ten}.` : `Count the hops from ${b} to ${a}.`,
        visual: pic({ ...line, hops }),
      },
      finish(
        ctx,
        hops.length > 1 ? `Add the hops: ${first} + ${a - ten} = ${answer}. So ${a} − ${b} = ${answer}.` : `That's ${answer} hops. So ${a} − ${b} = ${answer}.`,
        big(`${a} − ${b} = ${answer}`),
        'Add up the hops. That is how far apart they are.',
      ),
    ],
  };
}

function blocksSubWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const y = places(b);
  let h = Math.floor(a / 100);
  let { t, o } = places(a);
  const steps: LessonStep[] = [
    {
      text: `Make ${a} with blocks: ${h ? `${plural(h, 'hundred')}, ` : ''}${plural(t, 'ten')} and ${plural(o, 'one')}. We need to take away ${b}.`,
      visual: pic({ kind: 'blocks', hundreds: h, tens: t, ones: o }),
    },
  ];
  if (o < y.o) {
    if (t === 0) {
      h -= 1;
      t = 10;
      steps.push({
        text: `We need more ones, but there are no tens to trade. So first unbundle a hundred: trade it for 10 tens.`,
        visual: pic({ kind: 'blocks', hundreds: h, tens: t, ones: o, traded: 'hundred' }),
      });
    }
    t -= 1;
    o += 10;
    steps.push({
      text: `${o - 10} ones isn't enough to take away ${y.o}. Unbundle a ten: trade 1 ten for 10 ones. Now there are ${plural(t, 'ten')} and ${o} ones.`,
      visual: pic({ kind: 'blocks', hundreds: h, tens: t, ones: o, traded: 'ten' }),
    });
  }
  if (t < y.t) {
    h -= 1;
    t += 10;
    steps.push({
      text: `Now the tens: ${t - 10} tens isn't enough to take away ${y.t}. Trade 1 hundred for 10 tens. Now there are ${t} tens.`,
      visual: pic({ kind: 'blocks', hundreds: h, tens: t, ones: o, traded: 'hundred' }),
    });
  }
  steps.push({
    text: `Now take away ${b}: cross out ${y.h ? `${plural(y.h, 'hundred')}, ` : ''}${plural(y.t, 'ten')} and ${plural(y.o, 'one')}.`,
    visual: pic({ kind: 'blocks', hundreds: h, tens: t, ones: o, crossed: { hundreds: Math.floor(b / 100), tens: y.t, ones: y.o } }),
  });
  const left = places(answer);
  steps.push(
    finish(
      ctx,
      `What's left: ${left.h || Math.floor(answer / 100) ? `${plural(Math.floor(answer / 100), 'hundred')}, ` : ''}${plural(left.t, 'ten')} and ${plural(left.o, 'one')}. That's ${answer}.`,
      big(`${a} − ${b} = ${answer}`),
      'Count what is not crossed out. What number is that?',
    ),
  );
  return { id: 'blocks', title: 'Tens and ones blocks', emoji: '🧱', kind: 'picture', steps };
}

function friendlySubWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const up = Math.ceil(b / 10) * 10;
  const extra = up - b;
  return {
    id: 'friendly',
    title: 'Friendly numbers',
    emoji: '🤝',
    kind: 'trick',
    steps: [
      { text: `${b} is close to ${up}, and taking away tens is easy. Take away ${up} instead.`, visual: big(`${a} − ${up} = ${a - up}`) },
      {
        text: `We took away ${extra} too many, so give ${extra} back.`,
        visual: big(`${a - up} + ${extra} = ${ctx.reveal ? answer : '?'}`),
      },
      finish(ctx, `${a - up} + ${extra} = ${answer}. So ${a} − ${b} = ${answer}.`, big(`${a} − ${b} = ${answer}`), `What is ${a - up} + ${extra}?`),
    ],
  };
}

function breakApartSubWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  // A one-digit number goes back to the ten first (64 − 8: back 4 to 60, then 4 more).
  const downToTen = b < 10 && a % 10 > 0 && a % 10 < b;
  const parts = downToTen ? [a % 10, b - (a % 10)] : partsOf(b);
  const line = { kind: 'numberLine' as const, min: answer, max: a, step: a - answer, start: a };
  const steps: LessonStep[] = [
    {
      text: downToTen
        ? `Break ${b} into ${parts[0]} and ${parts[1]}, so the first jump lands on a ten.`
        : `Break ${b} into ${parts.join(' and ')}. Take them away one part at a time.`,
      visual: big(`${b} = ${parts.join(' + ')}`),
    },
  ];
  let at = a;
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    steps.push({
      text: last && !ctx.reveal ? `Then take away ${part}: ${at} − ${part}.` : `${i === 0 ? 'Take away' : 'Then take away'} ${part}: ${at} − ${part} = ${at - part}.`,
      visual: pic({ ...line, hops: parts.slice(0, i + 1).map((x) => -x), hideEnd: last && !ctx.reveal }),
    });
    at -= part;
  });
  steps.push(finish(ctx, `So ${a} − ${b} = ${answer}.`, big(`${a} − ${b} = ${answer}`), `What is ${at + parts[parts.length - 1]} − ${parts[parts.length - 1]}?`));
  return { id: 'break-apart', title: downToTen ? 'Back to ten' : 'Break it apart', emoji: '🧩', kind: 'trick', steps };
}

// ---------- the stacked paper method ----------

function paperWay(ctx: Ctx): HelpWay | null {
  const { p } = ctx;
  const steps = teachSteps(p);
  if (!steps) return null;
  const layout = columnLayout(p);
  const W = layout.width;
  const cells = (row: (string | null)[]) => row.map((d) => d ?? '');
  const sheet = (upTo: number): LessonVisual => {
    const marks: string[] = Array(W).fill('');
    const answer: string[] = Array(W).fill('');
    for (let i = 0; i <= upTo; i++) {
      for (const m of steps[i].marks) if (m.col >= 0) marks[m.col] = m.text;
      answer[steps[i].col] = String(steps[i].write);
    }
    const anyMarks = marks.some((m) => m);
    const [marksLine, topLine, bottomLine, answerLine] = columns([
      { cells: marks },
      { cells: cells(layout.a) },
      { sign: sign(p), cells: cells(layout.b) },
      { cells: answer },
    ]);
    const lines: WorkLine[] = [];
    if (anyMarks) lines.push({ text: marksLine, tone: 'mark' });
    lines.push({ text: topLine, tone: p.operation === 'subtract' && anyMarks ? 'struck' : undefined });
    lines.push({ text: bottomLine });
    lines.push({ text: '  ' + '─'.repeat(W * 3) });
    if (upTo >= 0) lines.push({ text: answerLine, tone: 'answer' });
    return { kind: 'work', lines };
  };
  const out: LessonStep[] = [
    { text: `Stack ${p.a} on top of ${p.b}: ones under ones, tens under tens. Always start with the ones.`, visual: sheet(-1) },
  ];
  const shown = ctx.reveal ? steps.length : steps.length - 1;
  steps.slice(0, shown).forEach((s, i) => {
    const tip = s.tip ? ` ${s.tip}` : ` Write ${s.write}.`;
    out.push({ text: `${s.question} = ${s.total}.${tip}`, visual: sheet(i) });
  });
  if (!ctx.reveal) {
    const s = steps[steps.length - 1];
    out.push({ text: `Last one: ${s.question}.${s.tip ? ` ${s.tip}` : ''} Close this and finish it.`, visual: sheet(steps.length - 2) });
  } else {
    out.push({
      text: p.operation === 'subtract' ? `Check by adding back: ${p.answer} + ${p.b} = ${p.a}. ✓` : `So ${sentence(p)} = ${p.answer}.`,
      visual: big(`${sentence(p)} = ${p.answer}`),
    });
  }
  return { id: 'paper', title: 'Stack it on paper', emoji: '📝', kind: 'paper', steps: out };
}

// ---------- times and sharing ----------

function groupsWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  return {
    id: 'groups',
    title: 'Equal groups',
    emoji: '🍪',
    kind: 'picture',
    steps: [
      { text: `${a} × ${b} means ${a} groups with ${b} in each.`, visual: pic({ kind: 'groups', groups: a, each: b }) },
      { text: `Add the groups: ${Array(a).fill(b).join(' + ')}.`, visual: pic({ kind: 'groups', groups: a, each: b }) },
      finish(ctx, `${a} groups of ${b} is ${answer}.`, big(`${a} × ${b} = ${answer}`), 'Count all of them. How many?'),
    ],
  };
}

function arrayWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  return {
    id: 'array',
    title: 'Rows and columns',
    emoji: '🔲',
    kind: 'picture',
    steps: [
      { text: `Make ${a} rows with ${b} in each row.`, visual: pic({ kind: 'array', rows: a, cols: b }) },
      finish(ctx, `Count by ${b}s down the rows: ${Array.from({ length: a }, (_, i) => (i + 1) * b).join(', ')}. That's ${answer}.`, big(`${a} × ${b} = ${answer}`), `Count by ${b}s, one row at a time.`),
    ],
  };
}

function skipCountWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  // Skip by the friendlier number, and count that many times.
  const friendly = (n: number) => [10, 5, 2].indexOf(n) + 1 || 9;
  const [by, times] = friendly(b) <= friendly(a) ? [b, a] : [a, b];
  const all = Array.from({ length: times }, (_, i) => (i + 1) * by);
  return {
    id: 'skip-count',
    title: 'Skip count',
    emoji: '🦘',
    kind: 'trick',
    steps: [
      ...(by !== b ? [{ text: `Turn it around: ${a} × ${b} is the same as ${b} × ${a}. Count by ${by}s.`, visual: big(`${a} × ${b} = ${b} × ${a}`) }] : []),
      { text: `Count by ${by}s, ${times} times. Use your fingers to keep track.`, visual: pic({ kind: 'sequence', items: ctx.reveal ? all : [...all.slice(0, -1), null] }) },
      finish(ctx, `The ${times}th number is ${answer}.`, big(`${a} × ${b} = ${answer}`), 'What is the last number you say?'),
    ],
  };
}

function breakApartTimesWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const [split, other] = a >= 6 ? [a, b] : [b, a];
  const rest = split - 5;
  return {
    id: 'break-apart',
    title: 'Break it apart',
    emoji: '🧩',
    kind: 'trick',
    steps: [
      { text: `${split} is 5 and ${rest}. Fives are easy!`, visual: pic({ kind: 'array', rows: split, cols: other }) },
      { text: `5 × ${other} = ${5 * other}, and ${rest} × ${other} = ${rest * other}.`, visual: big(`(5 × ${other}) + (${rest} × ${other})`) },
      finish(ctx, `Put them back together: ${5 * other} + ${rest * other} = ${answer}.`, big(`${a} × ${b} = ${answer}`), `What is ${5 * other} + ${rest * other}?`),
    ],
  };
}

function timesTensWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const [tens, other] = b % 10 === 0 ? [b, a] : [a, b];
  const t = tens / 10;
  return {
    id: 'tens',
    title: 'Think in tens',
    emoji: '🔟',
    kind: 'trick',
    steps: [
      { text: `${tens} is ${t} tens. So ${other} × ${tens} is ${other} × ${t} tens.`, visual: pic({ kind: 'blocks', hundreds: 0, tens: Math.min(t, 9), ones: 0 }) },
      { text: `${other} × ${t} = ${other * t}. That's ${other * t} tens.`, visual: big(`${other} × ${t} = ${other * t}`) },
      finish(ctx, `${other * t} tens is ${answer}.`, big(`${a} × ${b} = ${answer}`), `How much is ${other * t} tens?`),
    ],
  };
}

function shareWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  return {
    id: 'share',
    title: 'Share it out',
    emoji: '🍕',
    kind: 'picture',
    steps: [
      { text: `${a} ÷ ${b} means share ${a} into ${b} equal groups. Draw ${b} circles.`, visual: pic({ kind: 'groups', groups: b, each: 0 }) },
      { text: 'Deal them out one at a time, round and round, until all are used.', visual: pic({ kind: 'groups', groups: b, each: Math.max(1, Math.floor(answer / 2)) }) },
      finish(ctx, `Each group gets ${answer}.`, pic({ kind: 'groups', groups: b, each: answer }), 'How many are in each group when they are all used?'),
    ],
  };
}

function thinkTimesWay(ctx: Ctx): HelpWay {
  const { a, b, answer } = ctx.p;
  const all = Array.from({ length: answer }, (_, i) => (i + 1) * b);
  return {
    id: 'think-times',
    title: 'Think times',
    emoji: '👨‍👩‍👧‍👦',
    kind: 'trick',
    steps: [
      { text: `${a} ÷ ${b} asks: ${b} times what makes ${a}?`, visual: big(`${b} × ☐ = ${a}`) },
      { text: `Count by ${b}s until you reach ${a}. Keep track on your fingers.`, visual: pic({ kind: 'sequence', items: all.length <= 12 ? all : all.slice(-6) }) },
      finish(ctx, `That's ${answer} jumps of ${b}. So ${a} ÷ ${b} = ${answer}.`, big(`${a} ÷ ${b} = ${answer}`), 'How many fingers did you use?'),
    ],
  };
}

// ---------- questions that ask something else (time, money, shapes...) ----------

/** One "here's how to think about it" way for picture and word questions. */
function askWay(ctx: Ctx): HelpWay {
  const { p } = ctx;
  const ans = answerText(p, p.answer);
  const shown = p.picture ? pic(p.picture) : undefined;
  const tip = tipFor(p);
  const steps: LessonStep[] = tip.map((text, i) => ({ text, visual: i === 0 ? shown : tipVisual(p, i) ?? shown }));
  steps.push(finish(ctx, `The answer is ${ans}.`, shown ?? big(ans), 'Try it now!'));
  return { id: 'think', title: 'How to think about it', emoji: '💡', kind: 'picture', steps };
}

function tipVisual(p: Problem, step: number): LessonVisual | undefined {
  const pc = p.picture;
  if (!pc) return undefined;
  if (pc.kind === 'tape' && step === 1) return pic(pc);
  return undefined;
}

function tipFor(p: Problem): string[] {
  const id = p.skill ?? '';
  const pc = p.picture;
  switch (pc?.kind) {
    case 'things':
      return id.includes('quick')
        ? ['Look for groups you know, like the 5 on a die, or a full row of 5.', 'Put the groups together: 5 and 2 more is 7.']
        : ['Touch each one as you count, and move it (or cross it) so you never count one twice.', 'The last number you say tells you how many.'];
    case 'compare':
      return ['Line them up one to one, a match for each.', 'The side with some left over, with no match, has more.'];
    case 'sequence':
      return id.includes('skip') || id.includes('next')
        ? ['Look at how much it goes up each time.', 'Keep adding that same amount to find the missing number.']
        : ['Look at how it changes each time, then keep going.'];
    case 'tenFrames':
      return [`A ten-frame holds 10. Count the empty boxes: that's how many more make 10.`];
    case 'bond':
      return ['The top circle is the whole. The two bottom circles are the parts.', 'If you know the whole and one part, take that part away from the whole.'];
    case 'blocks':
      return ['Count the flats by hundreds, the rods by tens, then the little cubes by ones.', 'Say it: 100, 200... then 10, 20... then 1, 2...'];
    case 'pairs':
      return ['Put them in pairs, two by two.', 'If every one has a partner, it is even. If one is left over, it is odd.'];
    case 'array':
      return ['Count one row, then count by that number for each row.'];
    case 'groups':
      return p.operation === 'divide'
        ? ['Deal them out one at a time into each circle, round and round.', 'When they are all used, count one circle.']
        : ['Count one group. Then count by that number for each group.'];
    case 'tape':
      return [
        'The long bar is the whole. The smaller bars are the parts.',
        pc.whole === null ? 'The whole is missing, so put the parts together: add.' : 'A part is missing, so take the part you know away from the whole: subtract.',
      ];
    case 'clock':
      return [
        'The short hand is the hour. Look at the last number it has passed.',
        'The long hand is the minutes. Count by 5s from the 12: 5, 10, 15...',
      ];
    case 'money':
      return pc.items.some((v) => v >= 100) && p.operation !== 'subtract'
        ? ['Start with the biggest bill, then count on with the others.']
        : p.operation === 'subtract'
          ? ['Count up from the price to what you paid. The amount you count is the change.']
          : ['Quarters are 25¢, dimes 10¢, nickels 5¢, pennies 1¢.', 'Start with the biggest coin and count on: 25, 35, 40, 41...'];
    case 'ruler':
      return ['The thing starts at 0. Look where its other end lines up.', 'That number is how long it is.'];
    case 'shape2d':
      return id.includes('quad')
        ? ['Check the sides: are they all the same length?', 'Check the corners: are they square, like the corner of a book?']
        : ['Count the straight sides, touching each one.', 'Corners are where two sides meet. A circle has none.'];
    case 'shape3d':
      return ['Think of something real: a ball, a can, a dice, an ice cream cone, a box, a tent.', 'Does it roll? Does it have flat faces? Pointy tops?'];
    case 'grid':
      return pc.show === 'squares'
        ? [`Count the squares in one row: ${pc.width}.`, `There are ${pc.height} rows, so count by ${pc.width}s, ${pc.height} times. That's ${pc.height} × ${pc.width}.`]
        : ['Perimeter is the walk all the way around.', `Add all four sides: ${pc.width} + ${pc.height} + ${pc.width} + ${pc.height}.`];
    case 'fraction':
      return [`Count all the equal parts: ${pc.parts}. That's the bottom number.`, `Count the shaded parts: that's the top number.`];
    case 'fractionLine':
      return [`Each whole is cut into ${pc.parts} equal jumps. That's the bottom number.`, 'Count the jumps from 0 to the dot. That is the top number.'];
    case 'fractionBars':
      return ['The second bar has smaller parts. Line them up under the shaded part of the top bar.', 'Count how many small parts fit under it.'];
  }
  if (id.includes('compare')) return ['Look at the biggest place first: hundreds, then tens, then ones.', 'The open mouth of < or > eats the bigger number.'];
  if (id.includes('even')) return ['Look at the ones digit only.', '0, 2, 4, 6 or 8 in the ones means even. 1, 3, 5, 7 or 9 means odd.'];
  if (id.includes('equal')) return ['Work out each side on its own.', 'If both sides make the same number, it is true.'];
  if (id.includes('expanded') || id.includes('place') || id.includes('tens-ones'))
    return ['Each digit is worth more by where it sits: hundreds, tens, ones.', 'Say the number in parts: 600 and 60 and 9.'];
  if (id.includes('missing') || id.includes('fact-family'))
    return ['Adding and taking away undo each other.', 'If you know two numbers of the family, the third one makes it work both ways.'];
  if (id.includes('two-step')) return ['Do it one step at a time. Find the first answer.', 'Then use that answer in the second step.'];
  if (id.includes('turn-around')) return ['You can swap the numbers in a times. The answer stays the same.'];
  if (id.includes('break-apart')) return ['Work out each small times first.', 'Then add the two answers together.'];
  if (id.includes('polygon')) return ['Tri means 3, quad means 4, penta means 5, hexa means 6.'];
  return ['Read it again slowly, and look for the numbers you need.'];
}

// ---------- picking ----------

/** Every way that fits this question, in school order (pictures, tricks, paper). */
export function waysFor(problem: Problem, reveal: boolean): HelpWay[] {
  const ctx: Ctx = { p: problem, reveal };
  const { a, b, answer, operation } = problem;
  if (problem.ask || problem.story) {
    // A picture or story question that is really a sum (a bar model, change, an array) also gets the sum's ways.
    const sum = { add: a + b, subtract: a - b, multiply: a * b, divide: b ? a / b : NaN }[operation];
    const bare: Problem = { ...problem, ask: undefined, story: undefined, picture: undefined, labels: undefined };
    const more = !problem.labels && sum === answer && a > 0 && b > 0 ? waysFor(bare, reveal) : [];
    return [askWay(ctx), ...more];
  }
  if (a < 0 || b < 0 || answer < 0 || !Number.isInteger(answer)) return [];
  const ways: (HelpWay | null)[] = [];
  const small = Math.min(a, b);
  if ((operation === 'add' || operation === 'subtract') && b === 0) return [zeroWay(ctx)];
  if (operation === 'add') {
    if (small <= 5 && small > 0) ways.push(countOnWay(ctx));
    if (answer > 10 && answer <= 20 && a < 10 && b < 10) ways.push(makeTenWay(ctx));
    if (answer >= 20 && answer < 1000 && Math.floor(a / 100) + Math.floor(b / 100) <= 4) ways.push(blocksAddWay(ctx));
    if (a >= 10 && b >= 10) ways.push(breakApartAddWay(ctx));
    if (a >= 10 && b >= 10 && Math.max(a % 10, b % 10) >= 7) ways.push(friendlyAddWay(ctx));
    if (a >= 10 && b >= 10) ways.push(paperWay(ctx));
    // Something to count on with, whatever the numbers.
    if (ways.length === 0 || (answer <= 20 && small > 5 && !ways.some((w) => w?.kind === 'picture'))) ways.unshift(countOnWay(ctx));
  } else if (operation === 'subtract') {
    if (a <= 20) ways.push(takeAwayPictureWay(ctx));
    if (b <= 5 && b > 0) ways.push(countBackWay(ctx));
    if (a >= 20 && a < 1000 && Math.floor(a / 100) <= 5) ways.push(blocksSubWay(ctx));
    if (a > 10 && answer > 0 && b >= 5 && (answer <= 12 || a % 100 === 0)) ways.push(countUpWay(ctx));
    if (b >= 10 && b % 10 >= 7 && a >= Math.ceil(b / 10) * 10) ways.push(friendlySubWay(ctx));
    if (a > 10 && (b >= 10 || (a % 10 > 0 && a % 10 < b))) ways.push(breakApartSubWay(ctx));
    if (a >= 20 && b >= 10) ways.push(paperWay(ctx));
  } else if (operation === 'multiply') {
    if (a % 10 === 0 || b % 10 === 0 ? small > 0 && Math.max(a, b) >= 20 : false) ways.push(timesTensWay(ctx));
    else {
      if (a <= 6 && b <= 10 && a > 0) ways.push(groupsWay(ctx));
      if (a <= 10 && b <= 10 && a > 0 && b > 0) ways.push(arrayWay(ctx));
      if (a <= 12 && b <= 12) ways.push(skipCountWay(ctx));
      if ((a >= 6 && a <= 9) || (b >= 6 && b <= 9)) ways.push(breakApartTimesWay(ctx));
      if (a >= 10 || b >= 10) ways.push(paperWay(ctx));
    }
  } else if (operation === 'divide') {
    if (b > 0 && b <= 6 && answer <= 10) ways.push(shareWay(ctx));
    if (b > 0 && answer <= 12) ways.push(thinkTimesWay(ctx));
  }
  return ways.filter((w): w is HelpWay => !!w);
}

/** Which kind of help suits where the player is on this skill. */
export function stageFor(progress: SkillProgress | undefined): WayKind {
  if (!progress || progress.tries < 3) return 'picture';
  const recent = progress.recent.slice(-5);
  const right = [...recent].filter((c) => c === '1').length / Math.max(1, recent.length);
  if (progress.learned && right >= 0.6) return 'paper';
  return right >= 0.5 ? 'trick' : 'picture';
}

/** The ways that fit this question, and which one to open first for this player. */
export function helpFor(
  problem: Problem,
  progress: SkillProgress | undefined,
  reveal: boolean,
): { ways: HelpWay[]; start: number } {
  const ways = waysFor(problem, reveal);
  if (ways.length === 0) return { ways, start: 0 };
  const skill = findSkill(problem.skill);
  // Kindergarten and 1st grade stay with pictures and counting.
  const stage = skill && skill.grade <= 1 ? 'picture' : stageFor(progress);
  const want = KIND_ORDER.indexOf(stage);
  // The first way at the stage they're at; if there's none, the nearest one before it.
  let start = ways.findIndex((w) => w.kind === stage);
  if (start < 0) start = ways.findIndex((w) => KIND_ORDER.indexOf(w.kind) > want);
  if (start < 0) start = ways.length - 1;
  return { ways, start };
}

// ---------- spotting the slip ----------

const digitsOf = (n: number, width: number) => String(n).padStart(width, '0').split('').map(Number);

/**
 * A short, kind note on what probably went wrong, when the wrong answer matches
 * a common slip. null when it doesn't look like any of them.
 */
export function diagnose(problem: Problem, given: number | null): string | null {
  if (given === null || given === problem.answer) return null;
  const { a, b, answer, operation } = problem;
  if (problem.ask || problem.story) {
    if (problem.picture?.kind === 'clock' && problem.choiceOnly) {
      const h = Math.floor(given / 60) % 12 || 12;
      const m = given % 60;
      if (m === (problem.picture.hour % 12) * 5 && h * 5 === problem.picture.minute) return 'Watch out: the short hand is the hour and the long hand is the minutes.';
      if (m === problem.picture.minute) return 'The minutes are right! Look again at the short hand for the hour: use the last number it passed.';
    }
    if (problem.labels && problem.picture?.kind === 'fraction') return 'The bottom number is how many parts in all. The top number is how many are shaded.';
    if (Math.abs(given - answer) === 1 && !problem.labels) return 'So close, just 1 off! Count again slowly.';
    return null;
  }
  if (operation === 'subtract') {
    const width = String(a).length;
    const top = digitsOf(a, width);
    const bot = digitsOf(b, width);
    // Took the smaller digit from the bigger in each column, with no trade.
    const flipped = Number(top.map((d, i) => Math.abs(d - bot[i])).join(''));
    if (flipped === given && flipped !== answer)
      return 'It looks like the smaller digit was taken from the bigger one. When the top digit is smaller, unbundle: trade 1 from the next place for 10.';
    // Traded for 10 ones but left the tens as they were.
    for (let place = 10; place < a * 10; place *= 10) {
      if (given === answer + place && (a % place) < (b % place))
        return `Good trading! But remember the ${place === 10 ? 'ten' : place === 100 ? 'hundred' : 'place'} you traded is gone, so that place is 1 less now.`;
    }
    if (given === a + b) return 'This one is take away. Did you add by mistake?';
  }
  if (operation === 'add') {
    const width = String(answer).length;
    const x = digitsOf(a, width);
    const y = digitsOf(b, width);
    const noBundle = x.map((d, i) => (d + y[i]) % 10);
    if (Number(noBundle.join('')) === given) return 'When a place makes 10 or more, bundle 10 of them into 1 of the next place, and add it there.';
    const allWritten = Number(x.map((d, i) => String(d + y[i])).join(''));
    if (allWritten === given) return 'Only one digit fits in each place. Bundle 10 into the next place.';
    for (const place of [10, 100]) if (given === answer - place) return 'Close! Did you forget to add the bundled ten?'.replace('ten', place === 10 ? 'ten' : 'hundred');
    if (given === Math.abs(a - b)) return 'This one is adding. Did you take away by mistake?';
  }
  if (operation === 'multiply') {
    if (given === a + b) return `× means groups of. ${a} × ${b} is ${a} groups of ${b}, not ${a} + ${b}.`;
    if (given === answer - a || given === answer - b || given === answer + a || given === answer + b)
      return 'Very close: you are one group off. Count the groups again.';
  }
  if (operation === 'divide') {
    if (given === a - b) return `÷ means sharing into equal groups. How many in each of the ${b} groups?`;
    if (given * b === a + b || given * b === a - b) return `Check it: ${given} × ${b} = ${given * b}, not ${a}. Try one ${given * b > a ? 'fewer' : 'more'}.`;
  }
  if (Math.abs(given - answer) === 1) return 'So close, just 1 off! Count again slowly.';
  if (Math.abs(given - answer) === 10) return 'Just a ten off. Check the tens place again.';
  return null;
}
