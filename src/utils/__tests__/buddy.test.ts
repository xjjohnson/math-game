import { makeProfile } from '@/test/fixtures';
import {
  buddyGift,
  buddyLevel,
  careForBuddy,
  DAILY_PETS,
  DAILY_PLAY_HEARTS,
  heartForRound,
  heartsToNextLevel,
  TREAT_HEARTS,
  TREAT_PRICE,
} from '@/utils/buddy';

const today = '2026-10-27';
const withPup = (overrides = {}) =>
  makeProfile({
    coins: 20,
    unlocks: ['buddy-pup'],
    equipped: { background: 'bg-cream', cardStyle: 'card-classic', companion: 'buddy-pup' },
    ...overrides,
  });

describe('buddy levels', () => {
  it('levels up every 10 hearts and stops at 5', () => {
    expect(buddyLevel(0)).toBe(1);
    expect(buddyLevel(10)).toBe(2);
    expect(buddyLevel(999)).toBe(5);
    expect(heartsToNextLevel(14)).toBe(6);
    expect(heartsToNextLevel(40)).toBeNull();
  });

  it('wears a gift from level 2', () => {
    expect(buddyGift(withPup())).toBeNull();
    expect(buddyGift(withPup({ buddyHearts: { 'buddy-pup': 12 } }))).toBe('🎀');
    expect(buddyGift(withPup({ buddyHearts: { 'buddy-pup': 45 } }))).toBe('👑');
  });
});

describe('caring for a buddy', () => {
  it('needs a buddy in use', () => {
    expect(careForBuddy(makeProfile(), 'pet', today)).toEqual({ ok: false, reason: 'noBuddy' });
  });

  it('allows a few pets a day, then starts fresh tomorrow', () => {
    let p = withPup();
    for (let i = 0; i < DAILY_PETS; i++) {
      const r = careForBuddy(p, 'pet', today);
      expect(r.ok).toBe(true);
      if (r.ok) p = r.profile;
    }
    expect(p.buddyHearts['buddy-pup']).toBe(DAILY_PETS);
    expect(careForBuddy(p, 'pet', today)).toEqual({ ok: false, reason: 'tired' });
    expect(careForBuddy(p, 'pet', '2026-10-28').ok).toBe(true);
  });

  it('charges coins for treats', () => {
    const r = careForBuddy(withPup(), 'treat', today);
    expect(r.ok && r.profile.coins).toBe(20 - TREAT_PRICE);
    expect(r.ok && r.hearts).toBe(TREAT_HEARTS);
    expect(careForBuddy(withPup({ coins: 2 }), 'treat', today)).toEqual({ ok: false, reason: 'coins' });
  });

  it('caps hearts from games and reports level ups', () => {
    let p = withPup({ buddyHearts: { 'buddy-pup': 9 } });
    const first = careForBuddy(p, 'play', today);
    expect(first.ok && first.levelUp).toBe(true);
    for (let i = 0; i < DAILY_PLAY_HEARTS; i++) {
      const r = careForBuddy(p, 'play', today);
      if (r.ok) p = r.profile;
    }
    expect(p.buddyHearts['buddy-pup']).toBe(9 + DAILY_PLAY_HEARTS);
    expect(careForBuddy(p, 'play', today).ok).toBe(false);
  });

  it('gives the buddy along for a round a heart', () => {
    expect(heartForRound(withPup()).buddyHearts).toEqual({ 'buddy-pup': 1 });
    const alone = makeProfile();
    expect(heartForRound(alone)).toBe(alone);
  });
});
