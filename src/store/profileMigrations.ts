import { DEFAULT_GRADE } from '@/constants/grades';
import { DEFAULT_EQUIPPED } from '@/constants/shop';
import type { Difficulty, Grade, Profile } from '@/types';
import { addExtraRooms, AREAS_BEFORE_EXTRA_ROOMS, emptyRoom, upgradeRoom, widenHome } from '@/utils/room';

/** The version the profiles are saved as. Bump it, and add a step below, whenever Profile gains a field. */
export const PROFILES_VERSION = 13;

export interface SavedProfiles {
  profiles: Profile[];
  activeProfileId: string | null;
}

/** Brings profiles saved by an older version of the app up to PROFILES_VERSION. */
export function migrateProfiles(persisted: unknown, version: number): SavedProfiles {
  const state = persisted as SavedProfiles;
  if (version < 2) {
    // Version 2 added play dates, the daily challenge and last difficulty.
    state.profiles = state.profiles.map((p) => ({
      ...p,
      playDates: p.playDates ?? [],
      dailyChallengeDate: p.dailyChallengeDate ?? null,
      lastDifficulty: p.lastDifficulty ?? 'easy',
    }));
  }
  if (version < 3) {
    // Version 3 added the shop (equipped items), badges and weekly goals.
    state.profiles = state.profiles.map((p) => ({
      ...p,
      equipped: p.equipped ?? { ...DEFAULT_EQUIPPED },
      badges: p.badges ?? [],
      week: p.week ?? null,
    }));
  }
  if (version < 4) {
    // Version 4 added the weak-spots review list.
    state.profiles = state.profiles.map((p) => ({ ...p, missed: p.missed ?? {} }));
  }
  if (version < 5) {
    // Version 5 remembers the first avatar so it can be picked again.
    state.profiles = state.profiles.map((p) => ({ ...p, startAvatar: p.startAvatar ?? p.avatar }));
  }
  if (version < 6) {
    // Version 6 added buddy hearts, daily buddy care and the buddy's room.
    state.profiles = state.profiles.map((p) => ({
      ...p,
      buddyHearts: p.buddyHearts ?? {},
      buddyCare: p.buddyCare ?? null,
      room: p.room ?? emptyRoom(),
    }));
  }
  if (version < 7) {
    // Version 7 added grade levels. Start near the classic level they last played.
    const nearest: Record<Difficulty, Grade> = { easy: 1, medium: 3, hard: 5 };
    state.profiles = state.profiles.map((p) => ({ ...p, grade: p.grade ?? nearest[p.lastDifficulty] ?? DEFAULT_GRADE }));
  }
  if (version < 8) {
    // Version 8 grew the one room into a home with areas and room for several buddies.
    // The old room becomes the living room, with the buddy in use where it stood.
    state.profiles = state.profiles.map((p) => ({
      ...p,
      room: upgradeRoom(p.room, p.equipped?.companion ?? null),
    }));
  }
  if (version < 9) {
    // Version 9 added clothes for buddies.
    state.profiles = state.profiles.map((p) => ({ ...p, wardrobe: p.wardrobe ?? [], outfits: p.outfits ?? {} }));
  }
  if (version < 10) {
    // Version 10 added hair, skin and beards for people buddies.
    state.profiles = state.profiles.map((p) => ({ ...p, looks: p.looks ?? {} }));
  }
  if (version < 11) {
    // Version 11 made the rooms wider and added the bathroom and playroom.
    state.profiles = state.profiles.map((p) => ({ ...p, room: widenHome(p.room, AREAS_BEFORE_EXTRA_ROOMS) }));
  }
  if (version < 12) {
    // Version 12 added the community: which buildings' jobs are done today.
    state.profiles = state.profiles.map((p) => ({ ...p, town: p.town ?? { date: '', done: [] } }));
  }
  if (version < 13) {
    // Version 13 added extra rooms to buy. Everyone starts with none, and the new areas' paint is filled in.
    state.profiles = state.profiles.map((p) => ({ ...p, homeRooms: p.homeRooms ?? [], room: addExtraRooms(p.room) }));
  }
  return state;
}
