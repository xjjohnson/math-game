import { makeProfile } from '@/test/fixtures';
import { createRng } from '@/utils/seededRandom';
import { BUILDINGS, finishShift, shiftDone, shiftQuestions, SHIFT_QUESTIONS } from '@/utils/town';

const today = '2026-11-07';
const withPup = makeProfile({ unlocks: ['buddy-pup'], equipped: { background: 'bg-cream', cardStyle: 'card-classic', companion: 'buddy-pup' } });

describe('community shifts', () => {
  it('asks five questions with the answer among the choices', () => {
    for (const b of BUILDINGS) {
      for (const grade of [0, 1, 3, 6] as const) {
        const qs = shiftQuestions(b.id, grade, createRng(7));
        expect(qs).toHaveLength(SHIFT_QUESTIONS);
        qs.forEach((q) => expect(q.choices).toContain(q.answer));
      }
    }
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
