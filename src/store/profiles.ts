import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { InputStyle, Profile } from '@/types';
import { persistStorage } from '@/store/storage';

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
  };
}

interface ProfilesState {
  profiles: Profile[];
  activeProfileId: string | null;
  addProfile: (name: string, avatar: string) => string;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  updateProfile: (id: string, changes: Partial<Omit<Profile, 'id'>>) => void;
}

export const useProfiles = create<ProfilesState>()(
  persist(
    (set) => ({
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
    }),
    { name: 'math-game.profiles', version: 1, storage: persistStorage },
  ),
);

export function useActiveProfile(): Profile | undefined {
  return useProfiles((s) => s.profiles.find((p) => p.id === s.activeProfileId));
}
