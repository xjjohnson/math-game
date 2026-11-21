import type { Problem, Rng, SkillId } from '@/types';
import { fromDigits, sum } from '@/utils/skills/build';
import { pick, randInt } from '@/utils/seededRandom';

/**
 * Adding and taking away, built digit by digit so each question needs exactly
 * the regrouping its skill is about (trading a ten, trading twice, trading
 * across a zero), instead of leaving it to luck.
 */

// ---------- adding ----------

/** Both numbers 0-10 with a sum up to 10. */
export function addWithin10(id: SkillId, rng: Rng): Problem {
  const total = randInt(rng, 2, 10);
  const a = randInt(rng, 0, total);
  return sum(id, 'add', a, total - a, rng);
}

/** One-digit facts that cross ten (8 + 5), the "make a ten" kind, with a few under ten. */
export function addWithin20(id: SkillId, rng: Rng): Problem {
  if (rng() < 0.2) {
    const a = randInt(rng, 10, 15);
    return sum(id, 'add', a, randInt(rng, 1, 20 - a), rng);
  }
  const a = randInt(rng, 2, 9);
  const b = randInt(rng, 11 - a, 9);
  return rng() < 0.5 ? sum(id, 'add', a, b, rng) : sum(id, 'add', b, a, rng);
}

/** 2-digit plus 1-digit or plus tens, no bundling (34 + 5, 40 + 30). */
export function addTensNoBundle(id: SkillId, rng: Rng): Problem {
  if (rng() < 0.4) {
    const a = randInt(rng, 1, 8) * 10;
    return sum(id, 'add', a, randInt(rng, 1, 9 - a / 10) * 10, rng);
  }
  const t = randInt(rng, 1, 8);
  const o = randInt(rng, 0, 8);
  return sum(id, 'add', fromDigits(t, o), randInt(rng, 1, 9 - o), rng);
}

/** 2-digit + 2-digit, no bundling (32 + 45). */
export function add2dNoBundle(id: SkillId, rng: Rng): Problem {
  const [aT, bT] = splitBelow(rng, 9, 1);
  const [aO, bO] = splitBelow(rng, 9, 0);
  return sum(id, 'add', fromDigits(aT, aO), fromDigits(bT, bO), rng);
}

/** 2-digit + 2-digit where the ones make a new ten (38 + 47). */
export function add2dBundle(id: SkillId, rng: Rng): Problem {
  const aO = randInt(rng, 2, 9);
  const bO = randInt(rng, 10 - aO, 9);
  const aT = randInt(rng, 1, 7);
  const bT = randInt(rng, 1, 8 - aT);
  return sum(id, 'add', fromDigits(aT, aO), fromDigits(bT, bO), rng);
}

/** 3-digit + 3-digit with one or two bundles, total under 1,000. */
export function add3dBundle(id: SkillId, rng: Rng): Problem {
  const twice = rng() < 0.5;
  const onesBundle = twice || rng() < 0.5;
  const aO = onesBundle ? randInt(rng, 2, 9) : randInt(rng, 0, 8);
  const bO = onesBundle ? randInt(rng, 10 - aO, 9) : randInt(rng, 0, 9 - aO);
  const carry = onesBundle ? 1 : 0;
  const tensBundle = twice || !onesBundle;
  const aT = tensBundle ? randInt(rng, 2, 9) : randInt(rng, 0, 8 - carry);
  const bT = tensBundle ? randInt(rng, Math.max(0, 10 - aT - carry), 9) : randInt(rng, 0, 9 - aT - carry);
  const carry2 = aT + bT + carry >= 10 ? 1 : 0;
  const aH = randInt(rng, 1, 7);
  const bH = randInt(rng, 1, Math.max(1, 8 - aH - carry2));
  return sum(id, 'add', fromDigits(aH, aT, aO), fromDigits(bH, bT, bO), rng);
}

/** Mixed adding within 1,000 (3rd grade fluency). */
export function addWithin1000(id: SkillId, rng: Rng): Problem {
  return pick(rng, [add3dBundle, add2dBundle, add3dBundle])(id, rng);
}

// ---------- taking away ----------

export function subWithin10(id: SkillId, rng: Rng): Problem {
  const a = randInt(rng, 2, 10);
  return sum(id, 'subtract', a, randInt(rng, 0, a), rng);
}

/** Take-away facts from the teens (14 − 6), the ones you can't count back easily. */
export function subWithin20(id: SkillId, rng: Rng): Problem {
  if (rng() < 0.2) {
    const a = randInt(rng, 11, 19);
    return sum(id, 'subtract', a, randInt(rng, 1, a - 10), rng);
  }
  const b = randInt(rng, 2, 9);
  const a = randInt(rng, 11, b + 9);
  return sum(id, 'subtract', a, b, rng);
}

/** 2-digit minus 2-digit where every top digit is big enough (58 − 23): no trade needed. */
export function sub2dNoTrade(id: SkillId, rng: Rng): Problem {
  const aT = randInt(rng, 2, 9);
  const bT = randInt(rng, 1, aT - 1);
  const aO = randInt(rng, 1, 9);
  const bO = randInt(rng, 0, aO);
  return sum(id, 'subtract', fromDigits(aT, aO), fromDigits(bT, bO), rng);
}

/** 2-digit minus 1-digit that needs a ten traded (42 − 7). */
export function sub2d1dTrade(id: SkillId, rng: Rng): Problem {
  const aT = randInt(rng, 2, 9);
  const aO = randInt(rng, 0, 8);
  return sum(id, 'subtract', fromDigits(aT, aO), randInt(rng, aO + 1, 9), rng);
}

/** 2-digit minus 2-digit that needs a ten traded (63 − 28). */
export function sub2dTrade(id: SkillId, rng: Rng): Problem {
  const aT = randInt(rng, 3, 9);
  const aO = randInt(rng, 0, 8);
  const bT = randInt(rng, 1, aT - 2);
  const bO = randInt(rng, aO + 1, 9);
  return sum(id, 'subtract', fromDigits(aT, aO), fromDigits(bT, bO), rng);
}

/** 3-digit minus 3-digit with one trade: from the tens (352 − 127) or from the hundreds (418 − 252). */
export function sub3dTradeOnce(id: SkillId, rng: Rng): Problem {
  const aH = randInt(rng, 3, 9);
  const bH = randInt(rng, 1, aH - 2);
  if (rng() < 0.5) {
    // Ones need a trade; the tens are still big enough afterwards.
    const aT = randInt(rng, 2, 9);
    const bT = randInt(rng, 0, aT - 1);
    const aO = randInt(rng, 0, 8);
    const bO = randInt(rng, aO + 1, 9);
    return sum(id, 'subtract', fromDigits(aH, aT, aO), fromDigits(bH, bT, bO), rng);
  }
  // Tens need a trade from the hundreds; the ones are fine.
  const aT = randInt(rng, 0, 8);
  const bT = randInt(rng, aT + 1, 9);
  const aO = randInt(rng, 1, 9);
  const bO = randInt(rng, 0, aO);
  return sum(id, 'subtract', fromDigits(aH, aT, aO), fromDigits(bH, bT, bO), rng);
}

/** 3-digit minus 3-digit trading twice (532 − 278), with no zero in the tens. */
export function sub3dTradeTwice(id: SkillId, rng: Rng): Problem {
  const aH = randInt(rng, 3, 9);
  const bH = randInt(rng, 1, aH - 2);
  const aT = randInt(rng, 1, 8);
  // After lending one ten, the tens (aT - 1) must be smaller than bT.
  const bT = randInt(rng, aT, 9);
  const aO = randInt(rng, 0, 8);
  const bO = randInt(rng, aO + 1, 9);
  return sum(id, 'subtract', fromDigits(aH, aT, aO), fromDigits(bH, bT, bO), rng);
}

/** Trading across a zero: 403 − 168 or 500 − 236. */
export function subAcrossZero(id: SkillId, rng: Rng): Problem {
  const aH = randInt(rng, 2, 9);
  const bH = randInt(rng, 1, aH - 1);
  const aO = rng() < 0.35 ? 0 : randInt(rng, 0, 8);
  const bO = randInt(rng, aO + 1, 9);
  const bT = randInt(rng, 0, 9);
  return sum(id, 'subtract', fromDigits(aH, 0, aO), fromDigits(bH === aH ? aH - 1 : bH, bT, bO), rng);
}

/** Mixed taking away within 1,000 (3rd grade fluency). */
export function subWithin1000(id: SkillId, rng: Rng): Problem {
  return pick(rng, [sub3dTradeOnce, sub3dTradeTwice, subAcrossZero, sub2dTrade])(id, rng);
}

/** Two digits that add up to less than `max` + 1, each at least `min`. */
function splitBelow(rng: Rng, max: number, min: number): [number, number] {
  const a = randInt(rng, min, max - min);
  return [a, randInt(rng, min, max - a)];
}

// ---------- what a sum needs ----------

/** How many times a sum needs a trade (taking away) or a bundle (adding), column by column. */
export function regroupCount(problem: Pick<Problem, 'operation' | 'a' | 'b'>): number {
  const { a, b } = problem;
  let count = 0;
  if (problem.operation === 'add') {
    let carry = 0;
    for (let x = a, y = b; x > 0 || y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
      carry = (x % 10) + (y % 10) + carry >= 10 ? 1 : 0;
      count += carry;
    }
    return count;
  }
  if (problem.operation === 'subtract' && a >= b) {
    let lent = 0;
    for (let x = a, y = b; x > 0 || y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
      lent = (x % 10) - lent < y % 10 ? 1 : 0;
      count += lent;
    }
  }
  return count;
}

/** True when taking away has to trade across a zero (like 403 − 168). */
export function tradesAcrossZero(a: number, b: number): boolean {
  let lent = 0;
  for (let x = a, y = b; x > 0 || y > 0; x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    const top = (x % 10) - lent;
    if (lent && x % 10 === 0 && Math.floor(x / 10) > 0) return true;
    lent = top < y % 10 ? 1 : 0;
  }
  return false;
}
