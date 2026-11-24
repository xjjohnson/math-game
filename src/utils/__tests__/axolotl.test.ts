import { itemsIn } from '@/constants/shop';
import { makeProfile } from '@/test/fixtures';
import type { AnswerRecord, Problem } from '@/types';
import {
  claimFind,
  clueFor,
  colorOf,
  FIND_COINS,
  FIND_COINS_AFTER_MISS,
  findsOf,
  foundToday,
  hidingAt,
  HIDE_SPOTS,
  lolosQuestion,
  openSpots,
  ownedAreas,
  setAxolotlOff,
  spotFor,
  TANK_FINDS,
  todaysSpot,
} from '@/utils/axolotl';
import { addDays } from '@/utils/dates';
import { createRng } from '@/utils/seededRandom';

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
    expect(ownedAreas(makeProfile({ homeRooms: [], unlocks: [BUDDY] }))).toEqual(BASE);
    expect(ownedAreas(makeProfile({ homeRooms: [], unlocks: [] }))).toEqual([]);
    for (let i = 0; i < 20; i++) expect(todaysSpot(makeProfile({ unlocks: [] }), addDays(DAY, i)).kind).toBe('town');
    const open = openSpots(BASE);
    expect(open.some((s) => s.kind === 'home' && s.area === 'backyard')).toBe(false);
    expect(open.some((s) => s.kind === 'town')).toBe(true);
    for (let i = 0; i < 60; i++) {
      const s = todaysSpot(makeProfile({ homeRooms: [], unlocks: [BUDDY] }), addDays(DAY, i));
      if (s.kind === 'home') expect(BASE).toContain(s.area);
    }
    expect(openSpots([...BASE, 'backyard']).some((s) => s.kind === 'home' && s.area === 'backyard')).toBe(true);
  });

  it('pays once a day: 15 coins and a star first try, 10 after a miss', () => {
    const p = makeProfile({ coins: 5, stars: 2, grade: 1 });
    const q = lolosQuestion(p, createRng(3));
    const first = claimFind(p, DAY, [answer(q, true)]);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.profile.coins).toBe(5 + FIND_COINS);
    expect(first.profile.stars).toBeGreaterThanOrEqual(3);
    expect(foundToday(first.profile, DAY)).toBe(true);
    expect(hidingAt(first.profile, DAY)).toBeNull();
    expect(claimFind(first.profile, DAY, [answer(q, true)])).toEqual({ ok: false, reason: 'already' });

    const missed = claimFind(p, DAY, [answer(q, false), answer(q, true)]);
    expect(missed.ok && missed.profile.coins).toBe(5 + FIND_COINS_AFTER_MISS);

    const tomorrow = claimFind(first.profile, addDays(DAY, 1), [answer(q, true)]);
    expect(tomorrow.ok && findsOf(tomorrow.profile)).toBe(2);
  });

  it('applies the parent’s coin payout', () => {
    const p = makeProfile({ coins: 0 });
    const q = lolosQuestion(p, createRng(1));
    const r = claimFind(p, DAY, [answer(q, true)], 2);
    expect(r.ok && r.profile.coins).toBe(FIND_COINS * 2);
  });

  it('unlocks the fish tank and colours by finds', () => {
    let p = makeProfile();
    const q = lolosQuestion(p, createRng(5));
    let unlock: string | null = null;
    for (let i = 0; i < TANK_FINDS; i++) {
      const r = claimFind(p, addDays(DAY, i), [answer(q, true)]);
      if (!r.ok) throw new Error('not paid');
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
