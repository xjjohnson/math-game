import { generate, generateChoices } from '@/utils/mathEngine';
import { randInt, pick } from '@/utils/seededRandom';
import { toWordProblem } from '@/utils/wordProblems';
import { buddyCompanion } from '@/utils/buddy';
import type { Grade, Profile, Rng, TownVisits } from '@/types';

/** Places in the community the kids can visit. Each has one little job a day. */
export type BuildingId = 'shop' | 'bakery' | 'library' | 'park';

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
  { id: 'shop', name: 'Corner shop', emoji: '🏪', color: '#E53935', job: 'Add up what the customers buy.', reward: 'coins' },
  { id: 'bakery', name: 'Bakery', emoji: '🥐', color: '#F9A825', job: 'Give the right change.', reward: 'coins' },
  { id: 'library', name: 'Library', emoji: '📚', color: '#5E35B1', job: 'Read number stories out loud.', reward: 'hearts' },
  { id: 'park', name: 'Park', emoji: '🌳', color: '#2E7D32', job: 'Count and share with your buddy.', reward: 'hearts' },
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
  change?: { price: number; paid: number; item: string };
}

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

/** Adds up what was handed back. */
export const handedBack = (hand: number[]): number => hand.reduce((a, b) => a + b, 0);

/** A gentle nudge after wrong change; little ones are told to count up, bigger kids to subtract. */
export function changeHint(price: number, paid: number, given: number, grade: Grade): string {
  const how = grade <= 1 ? `Start at ${price} and count up to ${paid}. How far is it?` : `${paid} − ${price} = ?`;
  return `${given > paid - price ? 'That is a bit too much.' : 'Not quite enough yet.'} ${how}`;
}

function changeQuestion(prompt: string, price: number, paid: number, item: string): TownQuestion {
  return { prompt, answer: paid - price, choices: [], change: { price, paid, item } };
}

/** The biggest numbers used at a grade: kindergarten stays within 10, then it grows. */
export function townMax(grade: Grade): number {
  return [10, 20, 50, 100, 200, 500, 1000][grade];
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
      case 'shop': {
        const [e1, n1] = pick(rng, SHOP_ITEMS);
        const [e2, n2] = pick(rng, SHOP_ITEMS);
        const a = randInt(rng, 1, Math.max(1, Math.floor(max / 2)));
        const b = randInt(rng, 1, Math.max(1, Math.floor(max / 2)));
        if (grade === 0) {
          out.push(question(`A customer buys a ${e1} ${n1} for ${a} and a ${e2} ${n2} for ${b}. How many coins is that?`, a + b, rng));
        } else {
          // Grown-ups' shop: add it up, take the money, give the change.
          const paid = a + b + randInt(rng, 1, Math.max(1, Math.floor(max / 4)));
          out.push(
            changeQuestion(`A customer buys a ${e1} ${n1} for ${a} and a ${e2} ${n2} for ${b}. They pay ${paid}. Give them their change.`, a + b, paid, `${e1}${e2}`),
          );
        }
        break;
      }
      case 'bakery': {
        // Kindergarten has not met subtraction, so the bakery counts up instead.
        const price = randInt(rng, 1, Math.max(2, Math.floor(max / 2)));
        const [bakeEmoji, label] = pick(rng, BAKES).split(' ');
        if (grade === 0) {
          const second = randInt(rng, 1, Math.max(1, max - price));
          out.push(question(`One ${label} costs ${price} and another costs ${second}. How much for both?`, price + second, rng));
        } else {
          const paid = Math.min(max, price + randInt(rng, 1, Math.max(1, Math.floor(max / 2))));
          out.push(changeQuestion(`A ${label} costs ${price}. The customer pays ${paid}. Give them their change.`, price, paid, bakeEmoji));
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
