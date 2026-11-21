import type { Money, Problem, Rng, SkillId } from '@/types';
import { numberQuestion, pickQuestion } from '@/utils/skills/build';
import { pick, randInt, shuffle } from '@/utils/seededRandom';

/** Telling time, counting money, and measuring length with a ruler. */

/** "3:05" style label for minutes after 12:00. */
export function timeLabel(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60) % 12 || 12;
  const minute = totalMinutes % 60;
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

/**
 * What time is it? `stepMinutes` is 30 for hour and half hour (1st grade),
 * 5 for 2nd grade and 1 for 3rd grade.
 */
export function tellTime(id: SkillId, rng: Rng, stepMinutes: 30 | 5 | 1): Problem {
  const hour = randInt(rng, 1, 12);
  const minute = randInt(rng, 0, 60 / stepMinutes - 1) * stepMinutes;
  const answer = (hour % 12) * 60 + minute;
  // Likely slips: the hands swapped, the hour one off, the minutes read as the number pointed at.
  const near = new Set<number>();
  const add = (h: number, m: number) => {
    const v = (((h % 12) + 12) % 12) * 60 + (((m % 60) + 60) % 60);
    if (v !== answer) near.add(v);
  };
  add(hour + 1, minute);
  add(hour - 1, minute);
  if (minute % 5 === 0 && minute > 0) add(minute / 5, hour * 5);
  if (minute > 0 && minute % 5 === 0) add(hour, minute / 5);
  add(hour, minute + (stepMinutes === 30 ? 30 : stepMinutes === 5 ? 15 : 5));
  add(hour, minute - (stepMinutes === 30 ? 30 : 5));
  const options = shuffle(rng, [answer, ...shuffle(rng, [...near]).slice(0, 3)]);
  return pickQuestion(
    id,
    {
      operation: 'add',
      ask: 'What time does the clock show?',
      answer,
      options: options.map((v) => ({ value: v, label: timeLabel(v) })),
      picture: { kind: 'clock', hour, minute },
      a: hour,
      b: minute,
    },
    rng,
  );
}

const COIN_NAMES: Record<number, string> = { 1: 'penny', 5: 'nickel', 10: 'dime', 25: 'quarter' };

/** Count coins (cents, under a dollar). */
export function countCoins(id: SkillId, rng: Rng): Problem {
  const kinds: Money[] = rng() < 0.4 ? [1, 5, 10] : [1, 5, 10, 25];
  const count = randInt(rng, 2, 6);
  let items: Money[] = Array.from({ length: count }, () => pick(rng, kinds));
  // Biggest first, the way you count money.
  items = items.sort((x, y) => y - x);
  let total = items.reduce((s, c) => s + c, 0);
  while (total >= 100) {
    total -= items.pop() ?? 0;
  }
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: 'How many cents are there? Count the biggest coins first.',
      answer: total,
      unit: '¢',
      picture: { kind: 'money', items },
      a: total,
      near: [items.length, total + 5, total - 5, total + 10],
    },
    rng,
  );
}

/** Bills and coins: how much money, in dollars (bills) or cents. */
export function countBills(id: SkillId, rng: Rng): Problem {
  const bills: Money[] = Array.from({ length: randInt(rng, 2, 5) }, () => pick(rng, [100, 500, 1000, 2000] as Money[])).sort(
    (x, y) => y - x,
  );
  const total = bills.reduce((s, c) => s + c, 0) / 100;
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: 'How many dollars is this?',
      answer: total,
      unit: 'dollars',
      picture: { kind: 'money', items: bills },
      a: total,
      near: [bills.length, total + 5, total - 1, total + 10],
    },
    rng,
  );
}

/** Make change: it costs this, they paid that. */
export function makeChange(id: SkillId, rng: Rng): Problem {
  const paid = pick(rng, [50, 100, 100]);
  const price = randInt(rng, 11, paid - 6);
  return numberQuestion(
    id,
    {
      operation: 'subtract',
      ask: `A toy costs ${price}¢. You pay with ${paid === 100 ? 'a dollar' : 'two quarters'}. How much change do you get?`,
      prompt: `${paid} − ${price} = ☐`,
      answer: paid - price,
      unit: '¢',
      picture: { kind: 'money', items: paid === 100 ? [100] : [25, 25] },
      a: paid,
      b: price,
      near: [price, paid - price + 10, paid - price - 10],
    },
    rng,
  );
}

const THINGS_TO_MEASURE = ['pencil', 'crayon', 'worm', 'key', 'leaf'] as const;

/** How long is it? `units` picks inches, centimeters or either. */
export function measureLength(id: SkillId, rng: Rng, units: ('in' | 'cm')[]): Problem {
  const unit = pick(rng, units);
  const length = unit === 'in' ? randInt(rng, 2, 6) : randInt(rng, 3, 14);
  const thing = pick(rng, THINGS_TO_MEASURE);
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: `How long is the ${thing}? It starts at 0.`,
      answer: length,
      unit: unit === 'in' ? 'inches' : 'centimeters',
      picture: { kind: 'ruler', length, unit, thing },
      a: length,
      near: [length + 1, length - 1, length + 2],
    },
    rng,
  );
}
