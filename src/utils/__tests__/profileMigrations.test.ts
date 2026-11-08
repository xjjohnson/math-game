import { migrateProfiles, PROFILES_VERSION } from '@/store/profileMigrations';
import { AREA_COUNT } from '@/utils/room';

/**
 * A profile as each older version of the app saved it: the fields every
 * version had, plus the ones each later version added, in the shape it used.
 */
function savedAt(version: number): Record<string, unknown> {
  const p: Record<string, unknown> = {
    id: 'kid-1',
    name: 'Ava',
    avatar: '🦊',
    inputStyle: 'auto',
    createdAt: 1,
    coins: 120,
    stars: 9,
    bestStreak: 4,
    highScores: { add: 50 },
    unlocks: [],
    stats: {
      add: { attempted: 10, correct: 8 },
      subtract: { attempted: 0, correct: 0 },
      multiply: { attempted: 0, correct: 0 },
      divide: { attempted: 0, correct: 0 },
    },
  };
  if (version >= 2) Object.assign(p, { playDates: ['2026-10-01'], dailyChallengeDate: null, lastDifficulty: 'medium' });
  if (version >= 3) Object.assign(p, { equipped: { background: 'bg-default', cardStyle: 'card-default', companion: 'pup' }, badges: ['first'], week: null });
  if (version >= 4) p.missed = { '3+4': 2 };
  if (version >= 5) p.startAvatar = '🦊';
  if (version >= 6) {
    Object.assign(p, { buddyHearts: { pup: 5 }, buddyCare: null });
    // Before version 8 the buddy had one room.
    p.room = { wall: 2, floor: 1, buddy: { x: 0.5, y: 0.8 }, things: [{ key: 't1', itemId: 'rug', placed: true, x: 0.3, y: 0.9 }] };
  }
  if (version >= 7) p.grade = 2;
  if (version >= 8) {
    // From version 8 to 10: a home of three areas.
    p.room = {
      paint: [{ wall: 2, floor: 1 }, { wall: 0, floor: 0 }, { wall: 0, floor: 0 }],
      buddies: { pup: { x: 1 / 6, y: 0.8 } },
      things: [{ key: 't1', itemId: 'rug', placed: true, x: 0.1, y: 0.9 }],
    };
  }
  if (version >= 9) Object.assign(p, { wardrobe: ['hat-1'], outfits: { pup: { hat: 'hat-1' } } });
  if (version >= 10) p.looks = {};
  if (version >= 11) {
    // Version 11 and 12: five wider areas.
    p.room = {
      paint: [0, 1, 2, 3, 4].map((i) => ({ wall: i === 0 ? 2 : 0, floor: i === 0 ? 1 : 0 })),
      buddies: { pup: { x: 0.05, y: 0.8 } },
      things: [{ key: 't1', itemId: 'rug', placed: true, x: 0.03, y: 0.9 }],
    };
  }
  if (version >= 12) p.town = { date: '2026-11-01', done: ['bakery'] };
  if (version >= 13) {
    // Version 13: every area, extra rooms included.
    const room = p.room as { paint: unknown[]; buddies: Record<string, { x: number }>; things: { x: number }[] };
    p.room = {
      paint: Array.from({ length: AREA_COUNT }, (_, i) => room.paint[i] ?? { wall: 0, floor: 0 }),
      buddies: { pup: { ...room.buddies.pup, x: 0.02 } },
      things: room.things.map((t) => ({ ...t, x: 0.01 })),
    };
    p.homeRooms = [];
  }
  return p;
}

/** Every field a profile saved by this version of the app has. */
const FIELDS = [
  'playDates',
  'dailyChallengeDate',
  'lastDifficulty',
  'equipped',
  'badges',
  'week',
  'missed',
  'startAvatar',
  'buddyHearts',
  'buddyCare',
  'room',
  'grade',
  'wardrobe',
  'outfits',
  'looks',
  'town',
  'homeRooms',
];

describe('upgrading saved profiles', () => {
  const versions = Array.from({ length: PROFILES_VERSION }, (_, i) => i + 1);

  it.each(versions)('brings a profile saved by version %i up to date without losing anything', (version) => {
    const { profiles, activeProfileId } = migrateProfiles({ profiles: [savedAt(version)], activeProfileId: 'kid-1' }, version);
    expect(activeProfileId).toBe('kid-1');
    expect(profiles).toHaveLength(1);
    const p = profiles[0];
    for (const field of FIELDS) expect(p).toHaveProperty(field);
    // What the kid earned is kept.
    expect(p.coins).toBe(120);
    expect(p.stars).toBe(9);
    expect(p.stats.add).toEqual({ attempted: 10, correct: 8 });
    // The home has every area, and anything they had in it is still there.
    expect(p.room.paint).toHaveLength(AREA_COUNT);
    if (version >= 6) {
      expect(p.room.things.map((t) => t.itemId)).toEqual(['rug']);
      expect(p.room.paint[0]).toEqual({ wall: 2, floor: 1 });
      for (const t of p.room.things) expect(t.x).toBeGreaterThanOrEqual(0);
      for (const t of p.room.things) expect(t.x).toBeLessThanOrEqual(1);
    }
    if (version >= 8) expect(Object.keys(p.room.buddies)).toEqual(['pup']);
  });

  it('keeps several players and leaves an up-to-date profile alone', () => {
    const current = savedAt(PROFILES_VERSION);
    const { profiles } = migrateProfiles(
      { profiles: [savedAt(3), { ...current, id: 'kid-2' }], activeProfileId: 'kid-2' },
      3,
    );
    expect(profiles.map((p) => p.id)).toEqual(['kid-1', 'kid-2']);
    const { profiles: same } = migrateProfiles({ profiles: [current], activeProfileId: 'kid-1' }, PROFILES_VERSION);
    expect(same[0]).toEqual(current);
  });

  it('copes with no players at all', () => {
    expect(migrateProfiles({ profiles: [], activeProfileId: null }, 1).profiles).toEqual([]);
  });
});
