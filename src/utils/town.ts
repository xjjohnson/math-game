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

export interface TownQuestion {
  prompt: string;
  answer: number;
  choices: number[];
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
        out.push(question(`A customer buys a ${e1} ${n1} for ${a} and a ${e2} ${n2} for ${b}. How many coins is that?`, a + b, rng));
        break;
      }
      case 'bakery': {
        // Kindergarten has not met subtraction, so the bakery counts up instead.
        const price = randInt(rng, 1, Math.max(2, Math.floor(max / 2)));
        const [, label] = pick(rng, BAKES).split(' ');
        if (grade === 0) {
          const second = randInt(rng, 1, Math.max(1, max - price));
          out.push(question(`One ${label} costs ${price} and another costs ${second}. How much for both?`, price + second, rng));
        } else {
          const paid = Math.min(max, price + randInt(rng, 1, Math.max(1, Math.floor(max / 2))));
          out.push(question(`A ${label} costs ${price}. The customer pays ${paid}. How much change?`, paid - price, rng));
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
}

/** What a shift with `correct` right answers pays. Heart jobs pay coins instead when there is no buddy. */
export function shiftPay(profile: Profile, building: BuildingId, correct: number): ShiftPay {
  const b = BUILDINGS.find((x) => x.id === building)!;
  if (b.reward === 'hearts' && buddyCompanion(profile)) return { coins: 0, hearts: correct * HEARTS_PER_RIGHT };
  return { coins: correct * COINS_PER_RIGHT, hearts: 0 };
}

/** Finishes a shift: pays out and marks the building done for today. A second shift the same day pays nothing. */
export function finishShift(profile: Profile, building: BuildingId, correct: number, today: string): { profile: Profile; pay: ShiftPay } {
  if (shiftDone(profile, building, today)) return { profile, pay: { coins: 0, hearts: 0 } };
  const pay = shiftPay(profile, building, correct);
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
      town: { date: today, done: [...visits.done, building] },
    },
  };
}
