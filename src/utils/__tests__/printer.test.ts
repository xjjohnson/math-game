import { findRoomItem, MAX_THINGS_PER_ROOM } from '@/constants/room';
import { parsePrintId, printId, PRINTER_ITEM, PRINTS_PER_SPOOL, SPOOL_PRICE } from '@/constants/printer';
import { makeProfile } from '@/test/fixtures';
import type { Profile, RoomThing } from '@/types';
import { buyFilament, filamentLeft, printerCheck, printToy, recordPrinterCheck, unlockedToys } from '@/utils/printer';
import { buyRoomItem } from '@/utils/room';
import { createRng } from '@/utils/seededRandom';

const MARCH = 2;

function withPrinter(changes: Partial<Profile> = {}): Profile {
  const bought = buyRoomItem(makeProfile({ coins: 200, ...changes }), PRINTER_ITEM, 'p1', 0, MARCH);
  if (!bought.ok) throw new Error('could not buy the printer');
  return bought.profile;
}

describe('3D printer', () => {
  it('is sold on the appliances shelf for 150 coins', () => {
    const item = findRoomItem(PRINTER_ITEM);
    expect(item?.group).toBe('appliances');
    expect(item?.price).toBe(150);
    expect(item?.hidden).toBeFalsy();
  });

  it('sells filament by the spool for coins', () => {
    const p = withPrinter();
    const r = buyFilament(p, 'blue');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.coins).toBe(p.coins - SPOOL_PRICE);
    expect(filamentLeft(r.profile, 'blue')).toBe(PRINTS_PER_SPOOL);
  });

  it('will not sell filament without the coins or the stars', () => {
    expect(buyFilament(makeProfile({ coins: SPOOL_PRICE - 1 }), 'red')).toEqual({ ok: false, reason: 'coins' });
    expect(buyFilament(makeProfile({ coins: 100, stars: 10 }), 'glow')).toEqual({ ok: false, reason: 'locked' });
    expect(buyFilament(makeProfile({ coins: 100, stars: 100 }), 'glow').ok).toBe(true);
  });

  it('prints a toy next to the printer and uses one print', () => {
    const p = { ...withPrinter(), filament: { red: 3 } };
    const r = printToy(p, 'p1', 'star', 'red', 'toy1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(filamentLeft(r.profile, 'red')).toBe(2);
    const toy = r.profile.room.things.find((t) => t.key === 'toy1') as RoomThing;
    expect(toy.itemId).toBe(printId('star', 'red'));
    expect(toy.placed).toBe(true);
    expect(findRoomItem(toy.itemId)?.name).toBe('Red star');
    expect(r.profile.coins).toBe(p.coins);
  });

  it('needs filament, an unlocked toy, a placed printer and room in the house', () => {
    const p = withPrinter();
    expect(printToy(p, 'p1', 'star', 'red', 'k')).toEqual({ ok: false, reason: 'filament' });
    const stocked = { ...p, filament: { red: 1 } };
    expect(printToy(stocked, 'p1', 'dragon', 'red', 'k')).toEqual({ ok: false, reason: 'locked' });
    expect(printToy({ ...stocked, stars: 175 }, 'p1', 'dragon', 'red', 'k').ok).toBe(true);
    expect(printToy(stocked, 'nope', 'star', 'red', 'k')).toEqual({ ok: false, reason: 'noPrinter' });
    const things = Array.from({ length: MAX_THINGS_PER_ROOM * 5 }, (_, i) => ({ key: `t${i}`, itemId: 'ball', placed: true, x: 0.1, y: 0.9 }));
    things[0] = stocked.room.things[0];
    expect(printToy({ ...stocked, room: { ...stocked.room, things } }, 'p1', 'star', 'red', 'k')).toEqual({ ok: false, reason: 'full' });
  });

  it('unlocks more toys as stars go up, and stars are never spent', () => {
    expect(unlockedToys(makeProfile({ stars: 0 })).map((t) => t.id)).toEqual(['star', 'heart', 'boat', 'cat']);
    expect(unlockedToys(makeProfile({ stars: 50 }))).toHaveLength(8);
    expect(unlockedToys(makeProfile({ stars: 400 }))).toHaveLength(12);
    const p = { ...withPrinter({ stars: 60 }), filament: { red: 1 } };
    const r = printToy(p, 'p1', 'rocket', 'red', 'k');
    expect(r.ok && r.profile.stars).toBe(60);
  });

  it('reads printed toy ids back, and ignores ones it does not know', () => {
    expect(parsePrintId('print-dino-green')?.toy.id).toBe('dino');
    expect(parsePrintId('print-unicorn-green')).toBeNull();
    expect(parsePrintId('print-dino-plaid')).toBeNull();
    expect(parsePrintId('ball')).toBeNull();
    expect(findRoomItem('print-heart-glow')?.name).toBe('Glowing heart');
    expect(findRoomItem('print-heart-glow')?.hidden).toBe(true);
  });

  it('asks a printer check from the skill list at the child’s grade', () => {
    for (const grade of [0, 1, 2, 3] as const) {
      const q = printerCheck({ grade, skills: {} }, createRng(grade + 1));
      expect(q.skill).toBeTruthy();
      expect(q.choices.length > 0 || !!q.interact).toBe(true);
    }
  });

  it('saves printer check answers to the skill record', () => {
    const p = makeProfile({ grade: 1, skills: {} });
    const problem = printerCheck(p, createRng(7));
    const { profile } = recordPrinterCheck(
      p,
      [{ problem, difficulty: 'easy', grade: 1, given: problem.answer, correct: true, points: 0 }],
      '2026-11-21',
    );
    expect(profile.skills[problem.skill!]?.tries).toBe(1);
  });
});
