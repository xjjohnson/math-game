import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/store/storage';

export type ReduceMotion = 'system' | 'on' | 'off';

export interface Settings {
  sound: boolean;
  textToSpeech: boolean;
  haptics: boolean;
  reduceMotion: ReduceMotion;
  dyslexiaFont: boolean;
  colorblindPalette: boolean;
  /** 4-digit code guarding the parent area; null until a parent sets one. */
  parentPin: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  textToSpeech: false,
  haptics: true,
  reduceMotion: 'system',
  dyslexiaFont: false,
  colorblindPalette: false,
  parentPin: null,
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
      // Resetting settings keeps the parent PIN so a child can't clear it.
      reset: () => set((s) => ({ ...DEFAULT_SETTINGS, parentPin: s.parentPin })),
    }),
    {
      name: 'math-game.settings',
      version: 2,
      storage: persistStorage,
      migrate: (persisted) => ({ ...DEFAULT_SETTINGS, ...(persisted as Partial<Settings>) }),
    },
  ),
);
