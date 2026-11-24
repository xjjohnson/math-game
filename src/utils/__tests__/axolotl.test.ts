import { itemsIn } from '@/constants/shop';
import { makeProfile } from '@/test/fixtures';
import type { AnswerRecord, Problem } from '@/types';
import {
  answerRun,
  bestRun,
  clueFor,
  colorOf,
  findsOf,
  foundToday,
  hidingAt,
  HIDE_SPOTS,
  levelFor,
  RUN_MAX,
  runQuestion,
  runTotal,
  startRun,
  THANKS_COINS,
  openSpots,
  ownedAreas,
  setAxolotlOff,
  spotFor,
  TANK_FINDS,
  todaysSpot,
} from '@/utils/axolotl';
import { addDays } from '@/utils/dates';
import { createRng } from '@/utils/seededRandom';
import { startingHouse } from '@/utils/room';

const DAY = '2026-11-24';
const BUDDY = itemsIn('companion').find((i) => i.price > 0)!.id;
const BASE = ['living', 'kitchen', 'bedroom', 'bathroom', 'playroom'];

function answer(problem: Problem, correct: boolean): AnswerRecord {
  return { problem, difficulty: 'easy', grade: 1, given: correct ? problem.answer : problem.answer + 1, correct, points: 0 };
}

describe('Lolo the hidden axolotl', () => {
  it('has unique spot ids', () => {
    expect(new Set(HIDE_SPOTS.map((s) => s.id)).size).toBe(HIDE_SPOTS.length);
  });

  it('stays in the same spot all day', () => {
    expect(spotFor(DAY, 'kid-1', BASE).id).toBe(spotFor(DAY, 'kid-1', BASE).id);
  });

  it('never hides in yesterday’s spot', () => {
    let day = DAY;
    for (let i = 0; i < 120; i++) {
      const next = addDays(day, 1);
      expect(spotFor(next, 'kid-1', BASE).id).not.toBe(spotFor(day, 'kid-1', BASE).id);
      day = next;
    }
  });

  it('moves around over a month and gives siblings different spots', () => {
    const seen = new Set<string>();
    let same = 0;
    for (let i = 0; i < 30; i++) {
      const day = addDays(DAY, i);
      seen.add(spotFor(day, 'kid-1', BASE).id);
      if (spotFor(day, 'kid-1', BASE).id === spotFor(day, 'kid-2', BASE).id) same++;
    }
    expect(seen.size).toBeGreaterThan(12);
    expect(same).toBeLessThan(6);
  });

  it('only hides in home rooms the player owns, and only in town before they have a buddy', () => {
    expect(ownedAreas(makeProfile({ unlocks: [BUDDY] }))).toEqual(BASE);
    expect(ownedAreas(makeProfile({ unlocks: [] }))).toEqual([]);
    for (let i = 0; i < 20; i++) expect(todaysSpot(makeProfile({ unlocks: [] }), addDays(DAY, i)).kind).toBe('town');
    const open = openSpots(BASE);
    expect(open.some((s) => s.kind === 'home' && s.area === 'backyard')).toBe(false);
    expect(open.some((s) => s.kind === 'town')).toBe(true);
    for (let i = 0; i < 60; i++) {
      const s = todaysSpot(makeProfile({ unlocks: [BUDDY] }), addDays(DAY, i));
      if (s.kind === 'home') expect(BASE).toContain(s.area);
    }
    expect(openSpots([...BASE, 'backyard']).some((s) => s.kind === 'home' && s.area === 'backyard')).toBe(true);
  });

  it('hides in the original rooms of the house, not in rooms built later', () => {
    const house = [...startingHouse(), { id: 'backyard', look: 'backyard' as const }, { id: 'r1', look: 'kitchen' as const, name: 'Snack room' }];
    expect(ownedAreas(makeProfile({ house, unlocks: [BUDDY] }))).toEqual([...BASE, 'backyard']);
  });

  it('starts a run once a day and counts the find', () => {
    const p = makeProfile({ grade: 1 });
    const r = startRun(p, DAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(foundToday(r.profile, DAY)).toBe(true);
    expect(hidingAt(r.profile, DAY)).toBeNull();
    expect(findsOf(r.profile)).toBe(1);
    expect(startRun(r.profile, DAY)).toEqual({ ok: false, reason: 'already' });
    expect(startRun(r.profile, addDays(DAY, 1)).ok).toBe(true);
  });

  it('pays more for each right answer in a row, straight away', () => {
    const start = startRun(makeProfile({ coins: 0, stars: 0, grade: 2 }), DAY);
    if (!start.ok) throw new Error('no start');
    let p = start.profile;
    const paid: number[] = [];
    for (let n = 0; n < 6; n++) {
      const pay = answerRun(p, DAY, answer(runQuestion(p, n, createRng(n + 1)), true));
      paid.push(pay.coins);
      p = pay.profile;
      expect(pay.over).toBe(false);
    }
    expect(paid).toEqual([10, 10, 15, 15, 20, 20]);
    expect(p.coins).toBe(90);
    expect(p.stars).toBeGreaterThanOrEqual(2);
    expect(bestRun(p)).toBe(6);
  });

  it('ends on a miss, and pays a thank-you only when the first one is missed', () => {
    const s1 = startRun(makeProfile({ coins: 0 }), DAY);
    if (!s1.ok) throw new Error('no start');
    const q = runQuestion(s1.profile, 0, createRng(2));
    const miss = answerRun(s1.profile, DAY, answer(q, false));
    expect(miss.over).toBe(true);
    expect(miss.coins).toBe(THANKS_COINS);
    // Nothing more once it's over.
    expect(answerRun(miss.profile, DAY, answer(q, true)).coins).toBe(0);

    const right = answerRun(s1.profile, DAY, answer(q, true));
    const late = answerRun(right.profile, DAY, answer(q, false));
    expect(late.over).toBe(true);
    expect(late.coins).toBe(0);
    expect(late.profile.coins).toBe(10);
  });

  it('stops at RUN_MAX right with the jackpot', () => {
    const s1 = startRun(makeProfile({ coins: 0, stars: 0 }), DAY);
    if (!s1.ok) throw new Error('no start');
    let p = s1.profile;
    let last = answerRun(p, DAY, answer(runQuestion(p, 0, createRng(1)), true));
    for (let n = 1; n < RUN_MAX; n++) {
      p = last.profile;
      last = answerRun(p, DAY, answer(runQuestion(p, n, createRng(n + 9)), true));
    }
    expect(last.over).toBe(true);
    expect(last.profile.coins).toBe(runTotal(RUN_MAX, false).coins);
    expect(runTotal(RUN_MAX, false)).toEqual({ coins: 215, stars: 3 });
    expect(last.profile.stars).toBeGreaterThanOrEqual(3);
  });

  it('gets harder: easy, medium, hard, then a grade up', () => {
    expect([0, 1, 2, 3, 4, 6, 7, 9].map((n) => levelFor(n, 2))).toEqual([
      { difficulty: 'easy', grade: 2 },
      { difficulty: 'easy', grade: 2 },
      { difficulty: 'medium', grade: 2 },
      { difficulty: 'medium', grade: 2 },
      { difficulty: 'hard', grade: 2 },
      { difficulty: 'hard', grade: 2 },
      { difficulty: 'hard', grade: 3 },
      { difficulty: 'hard', grade: 3 },
    ]);
    expect(levelFor(8, 6).grade).toBe(6);
  });

  it('applies the parent’s coin payout', () => {
    const s1 = startRun(makeProfile({ coins: 0 }), DAY);
    if (!s1.ok) throw new Error('no start');
    const pay = answerRun(s1.profile, DAY, answer(runQuestion(s1.profile, 0, createRng(1)), true), 2);
    expect(pay.coins).toBe(20);
  });

  it('unlocks the fish tank and colours by finds', () => {
    let p = makeProfile();
    let unlock: string | null = null;
    for (let i = 0; i < TANK_FINDS; i++) {
      const r = startRun(p, addDays(DAY, i));
      if (!r.ok) throw new Error('not started');
      p = r.profile;
      unlock = r.unlock;
    }
    expect(unlock).toMatch(/fish tank/);
    expect(colorOf(p).id).toBe('pink');
    expect(colorOf({ axolotl: { finds: 10 } }).id).toBe('gold');
  });

  it('can be switched off by a parent', () => {
    const off = setAxolotlOff(makeProfile(), true);
    expect(hidingAt(off, DAY)).toBeNull();
    expect(clueFor(off, DAY)).toBeNull();
    expect(hidingAt(setAxolotlOff(off, false), DAY)).not.toBeNull();
  });

  it('gives little ones the room in the clue', () => {
    const little = clueFor(makeProfile({ grade: 0 }), DAY) ?? '';
    const big = clueFor(makeProfile({ grade: 5 }), DAY) ?? '';
    expect(little).toMatch(/Lolo is hiding/);
    expect(big).toMatch(/today!$/);
  });
});
