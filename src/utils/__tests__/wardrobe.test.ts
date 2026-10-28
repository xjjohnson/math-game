import { WEARABLES } from '@/constants/wardrobe';
import { makeProfile } from '@/test/fixtures';
import { lookOf, outfitOf, setLook, undress, wear } from '@/utils/wardrobe';

describe('buddy clothes', () => {
  it('buys a piece once, then puts it on and takes it off for free', () => {
    const first = wear(makeProfile({ coins: 30 }), 'buddy-pup', 'crown');
    expect(first).toEqual({ ok: false, reason: 'coins' });
    const bought = wear(makeProfile({ coins: 50 }), 'buddy-pup', 'crown');
    if (!bought.ok) throw new Error('wear failed');
    expect(bought.profile.coins).toBe(10);
    expect(bought.profile.wardrobe).toEqual(['crown']);
    expect(outfitOf(bought.profile, 'buddy-pup')).toEqual({ hat: 'crown' });
    const off = wear(bought.profile, 'buddy-pup', 'crown');
    if (!off.ok) throw new Error('wear failed');
    expect(off.profile.coins).toBe(10);
    expect(outfitOf(off.profile, 'buddy-pup')).toEqual({});
  });

  it('wears one thing per spot, and each buddy dresses on its own', () => {
    let p = makeProfile({ coins: 100 });
    for (const id of ['cap', 'tophat', 'scarf']) {
      const r = wear(p, 'buddy-pup', id);
      if (!r.ok) throw new Error('wear failed');
      p = r.profile;
    }
    expect(outfitOf(p, 'buddy-pup')).toEqual({ hat: 'tophat', neck: 'scarf' });
    const kitty = wear(p, 'buddy-kitty', 'cap');
    if (!kitty.ok) throw new Error('wear failed');
    expect(kitty.profile.coins).toBe(p.coins);
    expect(outfitOf(kitty.profile, 'buddy-kitty')).toEqual({ hat: 'cap' });
    expect(outfitOf(undress(kitty.profile, 'buddy-pup'), 'buddy-pup')).toEqual({});
    expect(undress(kitty.profile, 'buddy-pup').wardrobe).toHaveLength(3);
  });

  it('has a color for every shirt', () => {
    expect(WEARABLES.filter((w) => w.slot === 'shirt').every((w) => !!w.color)).toBe(true);
  });
});

describe('people buddies', () => {
  it('start in their own clothes, which come off and go back on for free', () => {
    const p = makeProfile({ coins: 0 });
    expect(outfitOf(p, 'buddy-dad')).toEqual({ shirt: 'sweaterTan', legs: 'jeans' });
    const off = wear(p, 'buddy-dad', 'sweaterTan');
    if (!off.ok) throw new Error('wear failed');
    expect(outfitOf(off.profile, 'buddy-dad')).toEqual({ legs: 'jeans' });
    const back = wear(off.profile, 'buddy-dad', 'sweaterTan');
    if (!back.ok) throw new Error('wear failed');
    expect(back.profile.coins).toBe(0);
    expect(outfitOf(back.profile, 'buddy-dad').shirt).toBe('sweaterTan');
    // Someone else's starting clothes still cost coins.
    expect(wear(p, 'buddy-mom', 'jeans')).toEqual({ ok: false, reason: 'coins' });
    expect(outfitOf(p, 'buddy-pup')).toEqual({});
  });

  it('changes hair, beard and skin for free, only for people', () => {
    const p = makeProfile();
    expect(lookOf(p, 'buddy-pup')).toBeNull();
    expect(setLook(p, 'buddy-pup', { hair: 'long' })).toBe(p);
    const changed = setLook(p, 'buddy-dad', { hair: 'curly', beard: null });
    expect(lookOf(changed, 'buddy-dad')).toMatchObject({ hair: 'curly', beard: null, skin: lookOf(p, 'buddy-dad')!.skin });
  });
});
