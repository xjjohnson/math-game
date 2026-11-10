import type { TextStyle } from 'react-native';
import { ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { useSettings } from '@/store/settings';
import type { Operation } from '@/types';

export interface Palette {
  correct: string;
  wrong: string;
  operations: Record<Operation, string>;
}

/**
 * Okabe-Ito colors: told apart with every common kind of color blindness. Darkened
 * a little from the originals so white text on them and colored text both read (4.5:1).
 */
const COLORBLIND: Palette = {
  correct: '#0072B2',
  wrong: '#B34E00',
  operations: { add: '#0072B2', subtract: '#A8578A', multiply: '#007A5A', divide: '#8A5E00' },
};

const STANDARD: Palette = {
  correct: colors.correct,
  wrong: colors.wrong,
  operations: colors.operations,
};

/** Right/wrong and operation colors, swapped for safe ones when the setting is on. */
export function usePalette(): Palette {
  return useSettings((s) => s.colorblindPalette) ? COLORBLIND : STANDARD;
}

/**
 * Whether to animate, from the Animations setting ("Use device setting" follows
 * the phone's reduce-motion option), plus the matching Reanimated flag.
 */
export function useMotion(): { animate: boolean; reduceMotion: ReduceMotion } {
  const setting = useSettings((s) => s.reduceMotion);
  const systemReduced = useReducedMotion();
  const animate = setting === 'off' || (setting === 'system' && !systemReduced);
  return { animate, reduceMotion: setting === 'off' ? ReduceMotion.Never : ReduceMotion.System };
}

export const DYSLEXIA_FONTS = {
  regular: 'Lexend_400Regular',
  bold: 'Lexend_700Bold',
  black: 'Lexend_900Black',
} as const;

/** Lexend family for a weight; custom fonts on Android need one family per weight. */
export function dyslexiaFontFor(weight: TextStyle['fontWeight']): string {
  const n = typeof weight === 'number' ? weight : Number(weight);
  if (weight === 'bold' || (n >= 600 && n < 800)) return DYSLEXIA_FONTS.bold;
  if (n >= 800) return DYSLEXIA_FONTS.black;
  return DYSLEXIA_FONTS.regular;
}
