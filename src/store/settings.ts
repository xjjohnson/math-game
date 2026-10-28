import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/store/storage';

export type ReduceMotion = 'system' | 'on' | 'off';

/** Parent's setting: how many times the usual coins each right answer pays. */
export type CoinPayout = 0.5 | 1 | 2;

export interface Settings {
  sound: boolean;
  textToSpeech: boolean;
  haptics: boolean;
  reduceMotion: ReduceMotion;
  dyslexiaFont: boolean;
  colorblindPalette: boolean;
  /** 4-digit code guarding the parent area; null until a parent sets one. */
  parentPin: string | null;
  coinPayout: CoinPayout;
  /** The buddy's name and the tips along the top of the buddy's home. */
  homeTips: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  textToSpeech: false,
  haptics: true,
  reduceMotion: 'system',
  dyslexiaFont: false,
  colorblindPalette: false,
  parentPin: null,
  coinPayout: 1,
  homeTips: true,
};

interface SettingsState extends Settings {
  update: (changes: Partial<Settings>) => void;
  reset: () => void;
}

/** Device-wide settings (shared by all profiles). */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (changes) => set(changes),
      // Resetting settings keeps the parent's choices so a child can't clear them.
      reset: () => set((s) => ({ ...DEFAULT_SETTINGS, parentPin: s.parentPin, coinPayout: s.coinPayout })),
    }),
    {
      name: 'math-game.settings',
      version: 3,
      storage: persistStorage,
      migrate: (persisted) => ({ ...DEFAULT_SETTINGS, ...(persisted as Partial<Settings>) }),
    },
  ),
);
