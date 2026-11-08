import { BODY_COLORS, DEFAULT_BODY } from '@/constants/wardrobe';
import { makeProfile } from '@/test/fixtures';
import { GUEST_ME, GUEST_PREFIX, guestsOf } from '@/utils/homeVisit';

describe('coming along to a friend’s home', () => {
  const kid = makeProfile({ unlocks: ['buddy-pup', 'buddy-kitty'], equipped: { ...makeProfile().equipped, companion: 'buddy-kitty' } });

  it('brings you and the buddies picked in Bring, with their home body colors', () => {
    const g = guestsOf(kid, ['🐶', '🐱'], true);
    expect(g.map((b) => b.id)).toEqual([GUEST_ME, GUEST_PREFIX + 'buddy-pup', GUEST_PREFIX + 'buddy-kitty']);
    expect(g[0]).toMatchObject({ emoji: kid.avatar, name: 'You' });
    const pup = g[1];
    expect({ fur: pup.fur, belly: pup.belly }).toEqual(BODY_COLORS['buddy-pup'] ?? DEFAULT_BODY);
  });

  it('brings the buddy you use when you never picked anyone', () => {
    expect(guestsOf(kid, [], false).map((b) => b.id)).toEqual([GUEST_ME, GUEST_PREFIX + 'buddy-kitty']);
  });

  it('comes alone when you chose to leave everyone behind', () => {
    expect(guestsOf(kid, [], true).map((b) => b.id)).toEqual([GUEST_ME]);
  });

  it('leaves out buddies you do not own and never clashes with the friend’s buddy ids', () => {
    const g = guestsOf(kid, ['🐼', '🐶'], true);
    expect(g.map((b) => b.id)).toEqual([GUEST_ME, GUEST_PREFIX + 'buddy-pup']);
    expect(g.every((b) => b.id.startsWith(GUEST_PREFIX))).toBe(true);
  });

  it('stands everyone on the floor of the first room', () => {
    for (const b of guestsOf(kid, ['🐶', '🐱'], true)) expect(b.spot.y).toBeCloseTo(0.92);
  });
});
