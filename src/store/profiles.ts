import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/store/storage';
import type { InputStyle, Profile } from '@/types';
import { dateKey } from '@/utils/dates';
import { applyRound, type RoundOutcome, type RoundResult } from '@/utils/progress';

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
    }),
    {
      name: 'math-game.profiles',
      version: 2,
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
        return state as ProfilesState;
      },
    },
  ),
);

export function useActiveProfile(): Profile | undefined {
  return useProfiles((s) => s.profiles.find((p) => p.id === s.activeProfileId));
}
