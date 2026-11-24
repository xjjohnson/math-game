import { BLANKETS, FORT_ITEM, FORT_PRICE, fortId, isFort, parseFortId } from '@/constants/fort';
import { findRoomItem } from '@/constants/room';
import { makeProfile } from '@/test/fixtures';
import type { Profile } from '@/types';
import { blanketOf, hasFortExtra, nextFortExtra, setFortBlanket } from '@/utils/fort';
import { buyRoomItem } from '@/utils/room';

const MARCH = 2;

function withFort(changes: Partial<Profile> = {}): Profile {
  const bought = buyRoomItem(makeProfile({ coins: 200, ...changes }), FORT_ITEM, 'f1', 0, MARCH);
  if (!bought.ok) throw new Error('could not buy the fort');
  return bought.profile;
}

describe('blanket fort', () => {
  it('is sold folded up on the toys shelf for 120 coins', () => {
    const item = findRoomItem(FORT_ITEM);
    expect(item?.group).toBe('toys');
    expect(item?.price).toBe(FORT_PRICE);
    expect(item?.hidden).toBeFalsy();
    // Nobody can sit in it until it's set up.
    expect(item?.seat).toBeUndefined();
  });

  it('keeps the blanket in the item id, and a built fort is a seat nobody can buy', () => {
    for (const b of BLANKETS) {
      const id = fortId(b.id);
      expect(parseFortId(id)?.id).toBe(b.id);
      expect(isFort(id)).toBe(true);
      const item = findRoomItem(id);
      expect(item?.name).toBe('Blanket fort');
      expect(item?.hidden).toBe(true);
      expect(item?.seat).toBeDefined();
    }
    expect(parseFortId('fort-nope')).toBeNull();
    expect(isFort(FORT_ITEM)).toBe(true);
    expect(isFort('couch')).toBe(false);
  });

  it('is set up once, then changes blankets for free', () => {
    const p = withFort();
    expect(blanketOf(FORT_ITEM)).toBeNull();
    const up = setFortBlanket(p, 'f1');
    expect(up.ok).toBe(true);
    if (!up.ok) return;
    expect(up.profile.room.things.find((t) => t.key === 'f1')?.itemId).toBe('fort-stars');
    const swapped = setFortBlanket(up.profile, 'f1', 'rainbow');
    expect(swapped.ok).toBe(true);
    if (!swapped.ok) return;
    expect(blanketOf(swapped.profile.room.things.find((t) => t.key === 'f1')!.itemId)).toBe('rainbow');
    expect(swapped.profile.coins).toBe(p.coins);
  });

  it('only works on a fort, with a real blanket', () => {
    const p = withFort();
    expect(setFortBlanket(p, 'missing')).toEqual({ ok: false, reason: 'noFort' });
    expect(setFortBlanket(p, 'f1', 'velvet')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('unlocks things inside with stars', () => {
    expect(hasFortExtra(makeProfile({ stars: 0 }), 'lights')).toBe(false);
    expect(hasFortExtra(makeProfile({ stars: 25 }), 'lights')).toBe(true);
    expect(hasFortExtra(makeProfile({ stars: 99 }), 'sleepover')).toBe(false);
    expect(hasFortExtra(makeProfile({ stars: 175 }), 'tunnel')).toBe(true);
    expect(nextFortExtra(makeProfile({ stars: 30 }))?.id).toBe('puppets');
    expect(nextFortExtra(makeProfile({ stars: 500 }))).toBeNull();
  });
});
