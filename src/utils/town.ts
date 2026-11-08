import { generate, generateChoices } from '@/utils/mathEngine';
import { randInt, pick } from '@/utils/seededRandom';
import { toWordProblem } from '@/utils/wordProblems';
import { buddyCompanion } from '@/utils/buddy';
import type { Grade, Operation, Profile, Rng, TownVisits } from '@/types';

/** Places in the community the kids can visit. Each has one little job a day. */
export type BuildingId = 'school' | 'shop' | 'bakery' | 'library' | 'park' | 'farm';

export interface Building {
  id: BuildingId;
  name: string;
  emoji: string;
  /** Color of its front on the map. */
  color: string;
  /** What you do there, in a kid's words. */
  job: string;
  reward: 'coins' | 'hearts';
}

export const BUILDINGS: Building[] = [
  { id: 'school', name: 'School', emoji: '🏫', color: '#1E88E5', job: 'Answer the questions on the board.', reward: 'coins' },
  { id: 'shop', name: 'Corner shop', emoji: '🏪', color: '#E53935', job: 'Add up what the customers buy.', reward: 'coins' },
  { id: 'bakery', name: 'Bakery', emoji: '🥐', color: '#F9A825', job: 'Give the right change.', reward: 'coins' },
  { id: 'library', name: 'Library', emoji: '📚', color: '#5E35B1', job: 'Read number stories out loud.', reward: 'hearts' },
  { id: 'park', name: 'Park', emoji: '🌳', color: '#2E7D32', job: 'Count and share with your buddy.', reward: 'hearts' },
  { id: 'farm', name: 'Farm', emoji: '🐄', color: '#8D4A2B', job: 'Collect the right number of eggs.', reward: 'coins' },
];

export const SHIFT_QUESTIONS = 5;
export const COINS_PER_RIGHT = 2;
export const HEARTS_PER_RIGHT = 1;
/** Playing a job again the same day still pays this many coins for each right answer. */
export const REPLAY_COINS_PER_RIGHT = 1;
/** The first play of the day pays its full rate plus a bonus (coins, or hearts for buddy jobs), if anything was right. */
export const FIRST_BONUS_COINS = 5;
export const FIRST_BONUS_HEARTS = 2;

export interface TownQuestion {
  prompt: string;
  answer: number;
  choices: number[];
  /** Money jobs: the player hands back change with coins and bills instead of picking an answer. */
  change?: { price: number; paid: number; item: string; bills: number[] };
  /** Farm: the player collects eggs into a basket (one at a time, or by the box) until it holds the answer. */
  eggs?: { units: number[] };
}

/** How eggs come on the farm: one at a time, a box of 10, a crate of 100 (ten boxes), a truck of 1000. */
export const EGG_UNITS = [1, 10, 100, 1000] as const;

/** The egg sizes offered at a grade: single eggs first, then boxes of ten, then crates and trucks for big numbers. */
export function eggUnits(grade: Grade, answer: number): number[] {
  const units = [1];
  if (grade >= 1 || answer >= 10) units.push(10);
  if (grade >= 3 || answer >= 100) units.push(100);
  if (grade >= 5 || answer >= 1000) units.push(1000);
  return units;
}

/** Adds up the eggs in the basket. */
export const eggsIn = (basket: number[]): number => basket.reduce((a, b) => a + b, 0);

/** A gentle nudge after the wrong number of eggs. */
export function eggHint(answer: number, have: number, grade: Grade): string {
  const off = have > answer ? 'That is a few too many eggs.' : 'Not enough eggs yet.';
  if (grade === 0) return `${off} Count them again, one at a time.`;
  return `${off} You have ${have}. ${have > answer ? 'Tap some in the basket to put them back.' : 'Keep collecting.'}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One egg job: a little farm story whose answer is how many eggs go in the basket. */
function eggQuestion(grade: Grade, rng: Rng): TownQuestion {
  for (let tries = 0; tries < 20; tries++) {
    // Kindergarten sometimes just counts eggs into the basket.
    if (grade === 0 && rng() < 0.4) {
      const n = randInt(rng, 2, 10);
      return eggsAsked(`Put ${n} eggs in the basket.`, n, grade, rng);
    }
    const p = generate(pick(rng, schoolOps(grade)), 'easy', rng, grade);
    let { a, b } = p;
    let answer = p.answer;
    if (p.operation === 'subtract' && answer < 0) [a, b, answer] = [b, a, -answer];
    if (answer < 1) continue;
    switch (p.operation) {
      case 'add':
        return eggsAsked(`The hens laid ${plural(a, 'egg', 'eggs')} this morning and ${b} more after lunch. Collect them all!`, answer, grade, rng);
      case 'subtract':
        return eggsAsked(`There are ${plural(a, 'egg', 'eggs')} in the hen house. ${b} go to the bakery. Collect the eggs that are left.`, answer, grade, rng);
      case 'multiply':
        return eggsAsked(
          a === 1 ? `1 hen laid ${plural(b, 'egg', 'eggs')}. Collect them all!` : `${a} hens each laid ${plural(b, 'egg', 'eggs')}. Collect them all!`,
          answer,
          grade,
          rng,
        );
      case 'divide':
        return eggsAsked(`${a} eggs are shared equally into ${b} baskets. Fill one basket!`, answer, grade, rng);
    }
  }
  return eggsAsked('Put 5 eggs in the basket.', 5, grade, rng);
}

const eggsAsked = (prompt: string, answer: number, grade: Grade, rng: Rng): TownQuestion => ({
  prompt,
  answer,
  choices: generateChoices(answer, rng),
  eggs: { units: eggUnits(grade, answer) },
});

/** The US bills offered for giving change: $1, $5, $10, $20, and bigger ones where the amounts need them. */
export function changeBills(grade: Grade): number[] {
  if (grade <= 1) return [1, 5, 10];
  if (grade === 2) return [1, 5, 10, 20];
  if (grade === 3) return [1, 5, 10, 20, 50];
  return [1, 5, 10, 20, 50, 100];
}

/** The bills a customer hands over to pay `amount`, biggest first; empty if that would be a very big pile. */
export function paymentBills(amount: number, bills: number[]): number[] {
  const out: number[] = [];
  let left = amount;
  for (const b of [...bills].sort((a, c) => c - a)) {
    while (left >= b) {
      out.push(b);
      left -= b;
    }
  }
  return left === 0 && out.length <= 6 ? out : [];
}

/** Most bills a customer will hand over at once. */
const MOST_BILLS = 6;

/**
 * Every sensible way to pay `price`: more than the price (never exactly it, or
 * there's no change to give), and no bill could be left out and still cover it.
 * So $10 + $5 for $12 is fine, but $10 + $5 + $1 isn't. Fewest bills first.
 */
export function sensiblePayments(price: number, bills: number[]): number[][] {
  const kinds = [...bills].sort((a, b) => b - a);
  const out: number[][] = [];
  const walk = (from: number, hand: number[], sum: number) => {
    if (sum > price) {
      // Over the price: keep it only if the smallest bill was needed.
      if (sum - hand[hand.length - 1] < price) out.push(hand);
      return;
    }
    if (hand.length >= MOST_BILLS) return;
    for (let i = from; i < kinds.length; i++) walk(i, [...hand, kinds[i]], sum + kinds[i]);
  };
  walk(0, [], 0);
  return out.sort((a, b) => a.length - b.length || handedBack(a) - handedBack(b));
}

/**
 * How a customer pays, like a real one would: often one bill that's bigger than
 * the price, otherwise a few bills that just cover it. Empty if there's no sensible way.
 */
export function customerPays(price: number, bills: number[], rng: Rng): number[] {
  const all = sensiblePayments(price, bills);
  if (!all.length) return [];
  const fewest = all[0].length;
  const singles = all.filter((h) => h.length === 1);
  // Half the time: the smallest single bill that covers it, like a $20 for $12.
  if (singles.length && rng() < 0.5) return singles[0];
  // Otherwise the fewest bills that cover it; never a bigger bill than needed, like $20 for $8.
  const near = all.filter((h) => (h.length > 1 ? h.length === fewest : h === singles[0]));
  return pick(rng, near);
}

/** Adds up what was handed back. */
export const handedBack = (hand: number[]): number => hand.reduce((a, b) => a + b, 0);

/** A gentle nudge after wrong change; little ones are told to count up, bigger kids to subtract. */
export function changeHint(price: number, paid: number, given: number, grade: Grade): string {
  const how = grade <= 1 ? `Start at ${price} and count up to ${paid}. How far is it?` : `${paid} − ${price} = ?`;
  return `${given > paid - price ? 'That is a bit too much.' : 'Not quite enough yet.'} ${how}`;
}

function changeQuestion(prompt: string, price: number, bills: number[], item: string): TownQuestion {
  const paid = handedBack(bills);
  return { prompt: `${prompt} They pay $${paid}. Give them their change.`, answer: paid - price, choices: [], change: { price, paid, item, bills } };
}

/** The biggest numbers used at a grade: kindergarten stays within 10, then it grows. */
export function townMax(grade: Grade): number {
  return [10, 20, 50, 100, 200, 500, 1000][grade];
}

/** What the school board asks at each grade: adding first, then taking away, times and sharing. */
function schoolOps(grade: Grade): Operation[] {
  if (grade === 0) return ['add'];
  if (grade === 1) return ['add', 'subtract'];
  if (grade === 2) return ['add', 'subtract', 'multiply'];
  return ['add', 'subtract', 'multiply', 'divide'];
}

const SHOP_ITEMS = [
  ['🍎', 'apple'],
  ['🥛', 'milk'],
  ['🍞', 'bread'],
  ['🧃', 'juice'],
  ['🍌', 'banana'],
  ['🥕', 'carrot'],
] as const;

const BAKES = ['🥐 croissant', '🍪 cookie', '🧁 cupcake', '🍩 donut', '🥖 baguette'] as const;

function question(prompt: string, answer: number, rng: Rng): TownQuestion {
  return { prompt, answer, choices: generateChoices(answer, rng) };
}

/** Five questions for one shift. Kindergarten only ever adds, within 10; harder grades add bigger numbers. */
export function shiftQuestions(building: BuildingId, grade: Grade, rng: Rng): TownQuestion[] {
  const max = townMax(grade);
  const out: TownQuestion[] = [];
  for (let i = 0; i < SHIFT_QUESTIONS; i++) {
    switch (building) {
      case 'school': {
        // The board at school: plain sums at the player's grade. Kindergarten only adds.
        const p = generate(pick(rng, schoolOps(grade)), 'easy', rng, grade);
        out.push({ prompt: `Teacher asks: ${p.prompt} = ?`, answer: p.answer, choices: p.choices });
        break;
      }
      case 'shop': {
        const [e1, n1] = pick(rng, SHOP_ITEMS);
        const [e2, n2] = pick(rng, SHOP_ITEMS);
        let a = randInt(rng, 1, Math.max(1, Math.floor(max / 2)));
        let b = randInt(rng, 1, Math.max(1, Math.floor(max / 2)));
        if (grade === 0) {
          out.push(question(`A customer buys a ${e1} ${n1} for ${a} and a ${e2} ${n2} for ${b}. How many coins is that?`, a + b, rng));
        } else {
          // Grown-ups' shop: add it up, take the money, give the change.
          let hand = customerPays(a + b, changeBills(grade), rng);
          for (let tries = 0; !hand.length && tries < 20; tries++) {
            a = randInt(rng, 1, Math.max(1, Math.floor(max / 2)));
            b = randInt(rng, 1, Math.max(1, Math.floor(max / 2)));
            hand = customerPays(a + b, changeBills(grade), rng);
          }
          out.push(changeQuestion(`A customer buys a ${e1} ${n1} for $${a} and a ${e2} ${n2} for $${b}.`, a + b, hand, `${e1}${e2}`));
        }
        break;
      }
      case 'bakery': {
        // Kindergarten has not met subtraction, so the bakery counts up instead.
        let price = randInt(rng, 1, Math.max(2, Math.floor(max / 2)));
        const [bakeEmoji, label] = pick(rng, BAKES).split(' ');
        if (grade === 0) {
          const second = randInt(rng, 1, Math.max(1, max - price));
          out.push(question(`One ${label} costs ${price} and another costs ${second}. How much for both?`, price + second, rng));
        } else {
          let hand = customerPays(price, changeBills(grade), rng);
          for (let tries = 0; !hand.length && tries < 20; tries++) {
            price = randInt(rng, 1, Math.max(2, Math.floor(max / 2)));
            hand = customerPays(price, changeBills(grade), rng);
          }
          out.push(changeQuestion(`A ${label} costs $${price}.`, price, hand, bakeEmoji));
        }
        break;
      }
      case 'library': {
        const p = generate(grade === 0 ? 'add' : pick(rng, ['add', 'subtract'] as const), 'easy', rng, grade);
        const story = toWordProblem(p, rng);
        out.push({ prompt: story.story ?? story.prompt, answer: story.answer, choices: story.choices });
        break;
      }
      case 'park': {
        const ducks = randInt(rng, 1, Math.max(2, Math.floor(max / 2)));
        const more = randInt(rng, 1, Math.max(1, Math.floor(max / 2)));
        out.push(question(`🦆 ${ducks} ducks are on the pond and ${more} more waddle over. How many ducks now?`, ducks + more, rng));
        break;
      }
      case 'farm':
        out.push(eggQuestion(grade, rng));
        break;
    }
  }
  return out;
}

export function visitsToday(profile: Profile, today: string): TownVisits {
  return profile.town?.date === today ? profile.town : { date: today, done: [] };
}

export function shiftDone(profile: Profile, building: BuildingId, today: string): boolean {
  return visitsToday(profile, today).done.includes(building);
}

export interface ShiftPay {
  coins: number;
  hearts: number;
  /** How much of the coins (or hearts) is the first-play bonus. */
  bonus: number;
}

/**
 * What a shift with `correct` right answers pays. The first play of the day pays the full rate plus a
 * bonus (hearts for buddy jobs when there is a buddy, otherwise coins); playing again pays a little.
 */
export function shiftPay(profile: Profile, building: BuildingId, correct: number, first = true): ShiftPay {
  const b = BUILDINGS.find((x) => x.id === building)!;
  if (!first) return { coins: correct * REPLAY_COINS_PER_RIGHT, hearts: 0, bonus: 0 };
  const hearts = b.reward === 'hearts' && buddyCompanion(profile);
  if (hearts) {
    const bonus = correct > 0 ? FIRST_BONUS_HEARTS : 0;
    return { coins: 0, hearts: correct * HEARTS_PER_RIGHT + bonus, bonus };
  }
  const bonus = correct > 0 ? FIRST_BONUS_COINS : 0;
  return { coins: correct * COINS_PER_RIGHT + bonus, hearts: 0, bonus };
}

/** Finishes a shift and pays out. Only the first play of the day marks the building done and earns the bonus; replays pay a little. */
export function finishShift(profile: Profile, building: BuildingId, correct: number, today: string): { profile: Profile; pay: ShiftPay } {
  const first = !shiftDone(profile, building, today);
  const pay = shiftPay(profile, building, correct, first);
  const buddyId = profile.equipped.companion;
  const buddyHearts =
    pay.hearts > 0 && buddyId
      ? { ...profile.buddyHearts, [buddyId]: (profile.buddyHearts[buddyId] ?? 0) + pay.hearts }
      : profile.buddyHearts;
  const visits = visitsToday(profile, today);
  return {
    pay,
    profile: {
      ...profile,
      coins: profile.coins + pay.coins,
      buddyHearts,
      town: first ? { date: today, done: [...visits.done, building] } : visits,
    },
  };
}
