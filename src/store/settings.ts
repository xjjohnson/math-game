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
      reset: () => set((s) => ({ ...DEFAULT_SETTINGS, coinPayout: s.coinPayout })),
    }),
    {
      name: 'math-game.settings',
      version: 4,
      storage: persistStorage,
      // v4: the parent code is fixed (PARENT_CODE), so any PIN saved before is dropped.
      migrate: (persisted) => {
        const { parentPin: _oldPin, ...rest } = persisted as Partial<Settings> & { parentPin?: unknown };
        return { ...DEFAULT_SETTINGS, ...rest };
      },
    },
  ),
);
