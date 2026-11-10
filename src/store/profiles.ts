import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_GRADE } from '@/constants/grades';
import { DEFAULT_EQUIPPED } from '@/constants/shop';
import { usePaintings } from '@/store/paintings';
import { useSettings } from '@/store/settings';
import { migrateProfiles, PROFILES_VERSION } from '@/store/profileMigrations';
import { createSafeStorage, type LoadStatus } from '@/store/safeStorage';
import { rawStorage } from '@/store/storage';
import type { Grade, InputStyle, Profile } from '@/types';
import { dateKey } from '@/utils/dates';
import { applyRound, type RoundOutcome, type RoundResult } from '@/utils/progress';
import { careForBuddy as applyCare, heartForRound, type CareAction, type CareResult } from '@/utils/buddy';
import {
  moveRoom,
  buyRoom,
  buyRoomItem,
  emptyRoom,
  hangPicture,
  removePicture,
  moveInRoom,
  setBuddyHome,
  setPlaced,
  setPaint,
  type Placement,
  type HomeRoomBuyResult,
  type RoomBuyResult,
} from '@/utils/room';
import { grantStarRewards } from '@/utils/starLevels';
import { finishShift, type BuildingId, type ShiftPay } from '@/utils/town';
import { buyItem, equipItem, freeAvatars, type BuyResult } from '@/utils/shop';
import { moveWearable, setLook, setMood, takeOff, undress, wear, type MoveResult, type WearResult } from '@/utils/wardrobe';
import type { Mood } from '@/components/PersonFigure';
import type { PersonLook } from '@/constants/wardrobe';

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
    wardrobe: [],
    outfits: {},
    looks: {},
    homeRooms: [],
    town: { date: '', done: [] },
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
  /** Buys a thing for the buddies' home and sets it down in `area` (an index into HOME_AREAS). */
  /** `at` is where new things land, as a share of the home's width (the middle of the screen). */
  buyRoomItem: (id: string, itemId: string, area: number, at?: number) => RoomBuyResult;
  /** Buys an extra room (an area id) for the buddies' home with coins. */
  buyHomeRoom: (id: string, areaId: string) => HomeRoomBuyResult;
  /** Swaps the room in `slot` with the one to its left (-1) or right (1). */
  moveHomeRoom: (id: string, slot: number, dir: -1 | 1) => void;
  /** Moves a thing in the home, or a buddy when `key` is BUDDY_KEY plus its id. */
  moveInRoom: (id: string, key: string, place: Placement) => void;
  setPlaced: (id: string, key: string, placed: boolean, area: number, at?: number) => void;
  paintRoom: (id: string, part: 'wall' | 'floor', color: number, area: number) => void;
  /** Hangs a picture from the School easel in the buddies' home. */
  hangPicture: (id: string, pictureId: string) => 'ok' | 'already' | 'full';
  /** Takes a deleted picture out of the buddies' home. */
  removePicture: (id: string, pictureId: string) => void;
  /** Invites a buddy into the home, or sends it off for a nap. */
  setBuddyHome: (id: string, buddyId: string, home: boolean, area: number, at?: number) => void;
  /** Puts clothes on a buddy (buying them first if needed), or takes them off. */
  wear: (id: string, buddyId: string, wearableId: string) => WearResult;
  undress: (id: string, buddyId: string) => void;
  /** Takes one piece off a buddy; it stays in the wardrobe. */
  takeOff: (id: string, buddyId: string, wearableId: string) => void;
  /** Moves a piece from one buddy to another for free. */
  moveWearable: (id: string, fromId: string, toId: string, wearableId: string) => MoveResult;
  /** Changes a person buddy's hair, skin or beard. */
  setLook: (id: string, buddyId: string, change: Partial<PersonLook>) => void;
  /** Sets the face a buddy shows (Feelings). */
  setMood: (id: string, buddyId: string, mood: Mood) => void;
  /** Finishes a job in the community and returns what it paid. */
  finishShift: (id: string, building: BuildingId, correct: number) => ShiftPay;
}

/** Where the profiles are saved: backed up before each upgrade, and never saved over by a failed load. */
export const profilesStorage = createSafeStorage<ProfilesState>(rawStorage, 'math-game.profiles', PROFILES_VERSION);

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
          usePaintings.getState().forget(id);
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
              ? grantStarRewards({
                  ...p,
                  coins: Math.max(0, p.coins + coins),
                  stars: Math.max(0, p.stars + stars),
                }).profile
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
      buyRoomItem: (id, itemId, area, at) => {
        const current = get().profiles.find((p) => p.id === id);
        if (!current) return { ok: false, reason: 'unknown' };
        const result = buyRoomItem(current, itemId, newId(), area, undefined, at);
        if (result.ok) {
          set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? result.profile : p)) }));
        }
        return result;
      },
      buyHomeRoom: (id, areaId) => {
        const current = get().profiles.find((p) => p.id === id);
        if (!current) return { ok: false, reason: 'unknown' };
        const result = buyRoom(current, areaId);
        if (result.ok) {
          set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? result.profile : p)) }));
        }
        return result;
      },
      moveHomeRoom: (id, slot, dir) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? moveRoom(p, slot, dir) : p)) })),
      moveInRoom: (id, key, spot) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? moveInRoom(p, key, spot) : p)),
        })),
      hangPicture: (id, pictureId) => {
        const current = get().profiles.find((p) => p.id === id);
        if (!current) return 'full';
        const result = hangPicture(current, pictureId);
        if (!result.ok) return result.reason;
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? result.profile : p)) }));
        return 'ok';
      },
      removePicture: (id, pictureId) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? removePicture(p, pictureId) : p)) })),
      setPlaced: (id, key, placed, area, at) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? setPlaced(p, key, placed, area, at) : p)),
        })),
      paintRoom: (id, part, color, area) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? setPaint(p, part, color, area) : p)) })),
      setBuddyHome: (id, buddyId, home, area, at) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === id ? setBuddyHome(p, buddyId, home, area, at) : p)),
        })),
      wear: (id, buddyId, wearableId) => {
        const current = get().profiles.find((p) => p.id === id);
        if (!current) return { ok: false, reason: 'unknown' };
        const result = wear(current, buddyId, wearableId);
        if (result.ok) {
          set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? result.profile : p)) }));
        }
        return result;
      },
      undress: (id, buddyId) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? undress(p, buddyId) : p)) })),
      takeOff: (id, buddyId, wearableId) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? takeOff(p, buddyId, wearableId) : p)) })),
      moveWearable: (id, fromId, toId, wearableId) => {
        const current = get().profiles.find((p) => p.id === id);
        if (!current) return { ok: false, reason: 'unknown' };
        const result = moveWearable(current, fromId, toId, wearableId);
        if (result.ok) {
          set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? result.profile : p)) }));
        }
        return result;
      },
      setLook: (id, buddyId, change) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? setLook(p, buddyId, change) : p)) })),
      setMood: (id, buddyId, mood) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? setMood(p, buddyId, mood) : p)) })),
      finishShift: (id, building, correct) => {
        const current = get().profiles.find((p) => p.id === id);
        if (!current) return { coins: 0, hearts: 0, bonus: 0 };
        const { profile, pay } = finishShift(current, building, correct, dateKey());
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? profile : p)) }));
        return pay;
      },
    }),
    {
      name: 'math-game.profiles',
      version: PROFILES_VERSION,
      storage: profilesStorage,
      migrate: (persisted, version) => migrateProfiles(persisted, version) as ProfilesState,
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          profilesStorage.fail();
          return;
        }
        profilesStorage.unlock();
        // Save what was loaded, so an upgraded save is written once loading worked.
        useProfiles.setState({});
      },
    },
  ),
);

export function useActiveProfile(): Profile | undefined {
  return useProfiles((s) => s.profiles.find((p) => p.id === s.activeProfileId));
}

/** Whether the saved profiles have loaded: 'failed' means they couldn't be opened, and nothing is being saved. */
export function useProfilesLoad(): LoadStatus {
  return useSyncExternalStore(profilesStorage.subscribe, profilesStorage.status, profilesStorage.status);
}

/** Puts a backup back as the saved profiles and loads them again. */
export async function restoreProfiles(backupKey: string): Promise<boolean> {
  if (!(await profilesStorage.restore(backupKey))) return false;
  await useProfiles.persist.rehydrate();
  return profilesStorage.status() === 'ok';
}
