/** Vibrant, high-contrast palette. A colorblind-safe variant comes in Phase 6. */
export const colors = {
  background: '#FFF8E7',
  surface: '#FFFFFF',
  text: '#1B1B3A',
  textMuted: '#4A4A6A',
  primary: '#3D5AFE',
  primaryText: '#FFFFFF',
  // Text colors here are dark enough for white text on them and to read on the cream page (4.5:1).
  correct: '#007A55',
  wrong: '#C62828',
  /** Bright orange for fills and bars only; never put text on it or use it as text. */
  accent: '#FF9800',
  /** Darker orange for buttons with white text, and for orange text. */
  accentStrong: '#B35300',
  border: '#1B1B3A',
  disabled: '#B8B8C8',
  operations: {
    add: '#3D5AFE',
    subtract: '#D81B60',
    multiply: '#00796B',
    divide: '#B35300',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontSizes = {
  body: 20,
  button: 24,
  title: 36,
  problem: 64,
} as const;

/** Minimum height for anything tappable; well above the 48dp guideline for small hands. */
export const TAP_TARGET = 72;

export const radius = {
  md: 16,
  lg: 24,
} as const;

export const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🦄', '🐢', '🚀'] as const;
