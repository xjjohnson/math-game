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
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  textToSpeech: false,
  haptics: true,
  reduceMotion: 'system',
  dyslexiaFont: false,
  colorblindPalette: false,
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
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'math-game.settings', version: 1, storage: persistStorage },
  ),
);
