import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_EQUIPPED } from '@/constants/shop';
import { persistStorage } from '@/store/storage';
import type { InputStyle, Profile } from '@/types';
import { dateKey } from '@/utils/dates';
import { applyRound, type RoundOutcome, type RoundResult } from '@/utils/progress';
import { buyItem, equipItem, type BuyResult } from '@/utils/shop';

function emptyStats(): Profile['stats'] {
  return {
    add: { attempted: 0, correct: 0 },
    subtract: { attempted: 0, correct: 0 },
    multiply: { attempted: 0, correct: 0 },
    divide: { attempted: 0, correct: 0 },
  };
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProfile(name: string, avatar: string, inputStyle: InputStyle = 'auto'): Profile {
  return {
    id: newId(),
    name: name.trim(),
    avatar,
    inputStyle,
    createdAt: Date.now(),
    coins: 0,
    stars: 0,
    bestStreak: 0,
    highScores: {},
    unlocks: [],
    stats: emptyStats(),
    playDates: [],
    dailyChallengeDate: null,
    lastDifficulty: 'easy',
    equipped: { ...DEFAULT_EQUIPPED },
    badges: [],
    week: null,
    missed: {},
  };
}

interface ProfilesState {
  profiles: Profile[];
  activeProfileId: string | null;
  addProfile: (name: string, avatar: string) => string;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  updateProfile: (id: string, changes: Partial<Omit<Profile, 'id'>>) => void;
  /** Saves a finished round and returns what it earned. */
  recordRound: (id: string, round: RoundResult) => RoundOutcome | null;
  buy: (id: string, itemId: string) => BuyResult;
  equip: (id: string, itemId: string) => void;
}

export const useProfiles = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      addProfile: (name, avatar) => {
        const profile = createProfile(name, avatar);
        set((s) => ({ profiles: [...s.profiles, profile], activeProfileId: profile.id }));
        return profile.id;
      },
      removeProfile: (id) =>
        set((s) => {
          const profiles = s.profiles.filter((p) => p.id !== id);
          const activeProfileId =
            s.activeProfileId === id ? (profiles[0]?.id ?? null) : s.activeProfileId;
          return { profiles, activeProfileId };
        }),
      setActiveProfile: (id) => set({ activeProfileId: id }),
      updateProfile: (id, changes) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...changes } : p)),
        })),
      recordRound: (id, round) => {
        const current = get().profiles.find((p) => p.id === id);
        if (!current) return null;
        const { profile, outcome } = applyRound(current, round, dateKey());
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? profile : p)) }));
        return outcome;
      },
      buy: (id, itemId) => {
        const current = get().profiles.find((p) => p.id === id);
        if (!current) return { ok: false, reason: 'unknown' };
        const result = buyItem(current, itemId);
        if (result.ok) {
          set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? result.profile : p)) }));
        }
        return result;
      },
      equip: (id, itemId) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? equipItem(p, itemId) : p)) })),
    }),
    {
      name: 'math-game.profiles',
      version: 4,
      storage: persistStorage,
      migrate: (persisted, version) => {
        const state = persisted as Pick<ProfilesState, 'profiles' | 'activeProfileId'>;
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
        return state as ProfilesState;
      },
    },
  ),
);

export function useActiveProfile(): Profile | undefined {
  return useProfiles((s) => s.profiles.find((p) => p.id === s.activeProfileId));
}
