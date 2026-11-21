import type { Money, Picture, Problem } from '@/types';

/** Fewest coins (and dollar bills) that make `cents`, biggest first. */
export function fewestCoins(cents: number, coins: Money[] = [100, 25, 10, 5, 1]): Money[] {
  const out: Money[] = [];
  let left = cents;
  for (const c of [...coins].sort((a, b) => b - a)) {
    while (left >= c) {
      out.push(c);
      left -= c;
    }
  }
  return out;
}

const clockAt = (minutes: number): Extract<Picture, { kind: 'clock' }> => ({
  kind: 'clock',
  hour: Math.floor(minutes / 60) % 12 || 12,
  minute: minutes % 60,
});

/**
 * How a hands-on question shows on the card in Play: while answering, just the
 * instruction (the clock or purse is the answer pad); once answered, the right
 * clock or the fewest coins for the amount.
 */
export function handsOnCard(problem: Problem, answered: boolean): Problem {
  const it = problem.interact;
  if (!it) return problem;
  if (!answered) {
    // Time passing keeps its start clock out of the card: the clock to set starts there.
    return { ...problem, ask: it.ask, picture: undefined, prompt: '' };
  }
  const picture: Picture = it.kind === 'setClock' ? clockAt(problem.answer) : { kind: 'money', items: fewestCoins(problem.answer, it.coins) };
  return { ...problem, ask: it.ask, picture, prompt: '' };
}

/** A short note on a hands-on miss, or null. */
export function handsOnSlip(problem: Problem, given: number | null): string | null {
  const it = problem.interact;
  if (!it || given === null || given === problem.answer) return null;
  if (it.kind === 'setClock') {
    const want = { h: Math.floor(problem.answer / 60) % 12, m: problem.answer % 60 };
    const got = { h: Math.floor(given / 60) % 12, m: given % 60 };
    if (it.from !== undefined && given === it.from) return 'Move the clock forward from the start time by the minutes it bakes.';
    if (got.m === want.h * 5 && got.h * 5 === want.m) return 'The hands are swapped: the short hand is the hour, the long hand is the minutes.';
    if (got.m === want.m) return 'The minutes are right! Check the short hand: it shows the hour.';
    if (got.h === want.h) return 'The hour is right! Check the long hand: count by 5s from the 12.';
    return null;
  }
  const target = it.from !== undefined ? `${problem.a}¢` : `${problem.answer}¢`;
  return given > problem.answer
    ? `That's a bit too much. Count again and stop at ${target}.`
    : `Not enough yet. Keep adding coins until you get to ${target}.`;
}
