import { makeProfile } from '@/test/fixtures';
import { createRng } from '@/utils/seededRandom';
import { BUILDINGS, changeCoins, changeHint, finishShift, handedBack, shiftDone, shiftQuestions, SHIFT_QUESTIONS } from '@/utils/town';

const today = '2026-11-07';
const withPup = makeProfile({ unlocks: ['buddy-pup'], equipped: { background: 'bg-cream', cardStyle: 'card-classic', companion: 'buddy-pup' } });

describe('community shifts', () => {
  it('asks five questions with the answer among the choices', () => {
    for (const b of BUILDINGS) {
      for (const grade of [0, 1, 3, 6] as const) {
        const qs = shiftQuestions(b.id, grade, createRng(7));
        expect(qs).toHaveLength(SHIFT_QUESTIONS);
        qs.forEach((q) => (q.change ? expect(q.change.paid - q.change.price).toBe(q.answer) : expect(q.choices).toContain(q.answer)));
      }
    }
  });

  it('makes the shop and bakery hand back change from grade 1 up, with coins that can make the answer', () => {
    for (const grade of [1, 3, 6] as const) {
      for (const id of ['shop', 'bakery'] as const) {
        const qs = shiftQuestions(id, grade, createRng(11));
        qs.forEach((q) => {
          expect(q.change).toBeDefined();
          expect(q.answer).toBeGreaterThan(0);
          expect(changeCoins(grade)).toContain(1); // any amount can be made
        });
      }
    }
    expect(shiftQuestions('shop', 0, createRng(3)).every((q) => !q.change)).toBe(true);
    expect(handedBack([5, 2, 1])).toBe(8);
  });

  it('gives a gentle hint: count up for little ones, subtract for bigger kids', () => {
    expect(changeHint(3, 10, 2, 1)).toMatch(/count up/);
    expect(changeHint(3, 10, 2, 4)).toMatch(/10 − 3/);
    expect(changeHint(3, 10, 9, 4)).toMatch(/too much/);
    expect(changeHint(3, 10, 2, 4)).toMatch(/enough/);
  });

  it('keeps kindergarten to addition within 20', () => {
    for (const b of BUILDINGS) {
      for (let seed = 0; seed < 20; seed++) {
        shiftQuestions(b.id, 0, createRng(seed)).forEach((q) => {
          expect(q.prompt).not.toMatch(/change|left|give|take/i);
          expect(q.answer).toBeLessThanOrEqual(20);
        });
      }
    }
  });

  it('pays coins once a day', () => {
    const first = finishShift(makeProfile(), 'shop', 4, today);
    expect(first.pay.coins).toBe(8);
    expect(shiftDone(first.profile, 'shop', today)).toBe(true);
    expect(finishShift(first.profile, 'shop', 5, today).pay).toEqual({ coins: 0, hearts: 0 });
    expect(shiftDone(first.profile, 'shop', '2026-11-08')).toBe(false);
  });

  it('pays hearts to the buddy, or coins without one', () => {
    const hearts = finishShift(withPup, 'park', 3, today);
    expect(hearts.pay).toEqual({ coins: 0, hearts: 3 });
    expect(hearts.profile.buddyHearts['buddy-pup']).toBe(3);
    expect(finishShift(makeProfile(), 'park', 3, today).pay).toEqual({ coins: 6, hearts: 0 });
  });
});
