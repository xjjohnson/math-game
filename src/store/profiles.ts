import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_GRADE } from '@/constants/grades';
import { DEFAULT_EQUIPPED } from '@/constants/shop';
import { useSettings } from '@/store/settings';
import { persistStorage } from '@/store/storage';
import type { Difficulty, Grade, InputStyle, Profile, RoomSpot } from '@/types';
import { dateKey } from '@/utils/dates';
import { applyRound, type RoundOutcome, type RoundResult } from '@/utils/progress';
import { careForBuddy as applyCare, heartForRound, type CareAction, type CareResult } from '@/utils/buddy';
import { buyRoomItem, emptyRoom, moveInRoom, nextPaint, setPlaced, type RoomBuyResult } from '@/utils/room';
import { buyItem, equipItem, freeAvatars, type BuyResult } from '@/utils/shop';

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

export function createProfile(
  name: string,
  avatar: string,
  inputStyle: InputStyle = 'auto',
  grade: Grade = DEFAULT_GRADE,
): Profile {
  return {
    id: newId(),
    name: name.trim(),
    avatar,
    startAvatar: avatar,
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
    grade,
    equipped: { ...DEFAULT_EQUIPPED },
    badges: [],
    week: null,
    missed: {},
    buddyHearts: {},
    buddyCare: null,
    room: emptyRoom(),
  };
}

interface ProfilesState {
  profiles: Profile[];
  activeProfileId: string | null;
  addProfile: (name: string, avatar: string, grade?: Grade) => string;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  updateProfile: (id: string, changes: Partial<Omit<Profile, 'id'>>) => void;
  /** Saves a finished round and returns what it earned. */
  recordRound: (id: string, round: RoundResult) => RoundOutcome | null;
  buy: (id: string, itemId: string) => BuyResult;
  equip: (id: string, itemId: string) => void;
  /** Switches to a free avatar: the first pick or one of the defaults. */
  setAvatar: (id: string, avatar: string) => void;
  /** Parent area: adds (or with a minus, takes away) coins and stars, never below zero. */
  adjustBalance: (id: string, change: { coins?: number; stars?: number }) => void;
  /** Pets, feeds or plays with the buddy in use. */
  careForBuddy: (id: string, action: CareAction) => CareResult;
  buyRoomItem: (id: string, itemId: string) => RoomBuyResult;
  /** Moves a thing in the buddy's room, or the buddy itself when `key` is "buddy". */
  moveInRoom: (id: string, key: string, spot: RoomSpot) => void;
  setPlaced: (id: string, key: string, placed: boolean) => void;
  paintRoom: (id: string, part: 'wall' | 'floor') => void;
}

export const useProfiles = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      addProfile: (name, avatar, grade) => {
        const profile = createProfile(name, avatar, 'auto', grade);
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
        const { profile, outcome } = applyRound(current, round, dateKey(), useSettings.getState().coinPayout);
        const withHeart = heartForRound(profile);
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? withHeart : p)) }));
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
      setAvatar: (id, avatar) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id && freeAvatars(p).includes(avatar) ? { ...p, avatar } : p,
          ),
        })),
      adjustBalance: (id, { coins = 0, stars = 0 }) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id
              ? { ...p, coins: Math.max(0, p.coins + coins), stars: Math.max(0, p.stars + stars) }
              : p,
          ),
        })),
      careForBuddy: (id, action) => {
        const current = get().profiles.find((p) => p.id === id);
        if (!current) return { ok: false, reason: 'noBuddy' };
        const result = applyCare(current, action, dateKey());
        if (result.ok) {
          set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? result.profile : p)) }));
        }
        return result;
      },
      buyRoomItem: (id, itemId) => {
        const current = get().profiles.find((p) => p.id === id);
        if (!current) return { ok: false, reason: 'unknown' };
        const result = buyRoomItem(current, itemId, newId());
        if (result.ok) {
          set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? result.profile : p)) }));
        }
        return result;
      },
      moveInRoom: (id, key, spot) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? moveInRoom(p, key, spot) : p)),
        })),
      setPlaced: (id, key, placed) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? setPlaced(p, key, placed) : p)),
        })),
      paintRoom: (id, part) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? nextPaint(p, part) : p)) })),
    }),
    {
      name: 'math-game.profiles',
      version: 7,
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
        return state as ProfilesState;
      },
    },
  ),
);

export function useActiveProfile(): Profile | undefined {
  return useProfiles((s) => s.profiles.find((p) => p.id === s.activeProfileId));
}
