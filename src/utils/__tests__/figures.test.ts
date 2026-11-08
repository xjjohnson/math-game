import { BODY_COLORS, PEOPLE } from '@/constants/wardrobe';
import { makeProfile } from '@/test/fixtures';
import { BAKERY, byMixer, FLOOR, grabsMixer, MIXER_HANG, onMixerHang } from '@/utils/multiplayer/placeProps';
import { buddyIdOf, figureFor } from '@/utils/figures';

describe('bodies in Community match the buddy home', () => {
  it('finds the buddy an emoji or drawing stands for', () => {
    expect(buddyIdOf('🐶')).toBe('buddy-pup');
    expect(buddyIdOf('@mom')).toBe('buddy-mom');
    expect(buddyIdOf('🐸')).toBeUndefined();
  });

  it("draws an animal buddy in its own colors, not the owner's", () => {
    const f = figureFor('🐶');
    expect(f).toMatchObject({ kind: 'animal', emoji: '🐶', ...BODY_COLORS['buddy-pup'] });
  });

  it('dresses your own buddy just like at home', () => {
    const p = makeProfile({ unlocks: ['buddy-pup'], outfits: { 'buddy-pup': { hat: 'crown' } } });
    const f = figureFor('🐶', p);
    expect(f.kind).toBe('animal');
    if (f.kind === 'animal') expect(f.dressed.hat).toBe('👑');
    // A friend's pup (no profile) comes undressed.
    const theirs = figureFor('🐶');
    if (theirs.kind === 'animal') expect(theirs.dressed.hat).toBeUndefined();
  });

  it('draws people buddies and people avatars as whole people', () => {
    const mom = figureFor('@mom');
    expect(mom.kind).toBe('person');
    if (mom.kind === 'person') {
      expect(mom.look).toEqual(PEOPLE['buddy-mom'].look);
      expect(mom.dressed.top?.color).toBeTruthy();
    }
    const changed = makeProfile({ unlocks: ['buddy-mom'], looks: { 'buddy-mom': { ...PEOPLE['buddy-mom'].look, hairColor: 4 } } });
    const mine = figureFor('@mom', changed);
    if (mine.kind === 'person') expect(mine.look.hairColor).toBe(4);
    expect(figureFor('@p-ava').kind).toBe('person');
  });

  it('gives any other emoji avatar a body in the given colors', () => {
    expect(figureFor('🐸', null, { fur: '#123456', belly: '#abcdef' })).toMatchObject({ kind: 'animal', fur: '#123456', belly: '#abcdef' });
  });
});

describe('a buddy by the bakery mixer', () => {
  it('counts on the floor under or beside the mixer, not far off or up on the counter', () => {
    const mid = (BAKERY.mixer.x0 + BAKERY.mixer.x1) / 2;
    expect(byMixer({ x: mid, y: 0.75 })).toBe(true);
    expect(byMixer({ x: BAKERY.mixer.x1 + 0.03, y: 0.8 })).toBe(true);
    expect(byMixer({ x: 0.5, y: 0.75 })).toBe(false);
    expect(byMixer({ x: mid, y: FLOOR - 0.1 })).toBe(false);
  });
});

describe('a buddy hanging off the bakery mixer', () => {
  it('grabs on when let go over the mixer, not out on the floor or across the room', () => {
    const mid = (BAKERY.mixer.x0 + BAKERY.mixer.x1) / 2;
    expect(grabsMixer({ x: mid, y: BAKERY.counter.top - 0.05 })).toBe(true);
    expect(grabsMixer({ x: mid, y: 0.8 })).toBe(false);
    expect(grabsMixer({ x: 0.6, y: BAKERY.counter.top - 0.05 })).toBe(false);
  });

  it('knows the hanging spot, and only that spot', () => {
    expect(onMixerHang(MIXER_HANG)).toBe(true);
    expect(onMixerHang({ x: MIXER_HANG.x, y: 0.75 })).toBe(false);
    // Up off the floor, so it never counts as standing by the mixer too.
    expect(MIXER_HANG.y).toBeLessThan(FLOOR);
  });
});
