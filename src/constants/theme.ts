/** Vibrant, high-contrast palette. A colorblind-safe variant comes in Phase 6. */
export const colors = {
  background: '#FFF8E7',
  surface: '#FFFFFF',
  text: '#1B1B3A',
  textMuted: '#4A4A6A',
  primary: '#3D5AFE',
  primaryText: '#FFFFFF',
  correct: '#00A86B',
  wrong: '#E53935',
  accent: '#FF9800',
  border: '#1B1B3A',
  disabled: '#B8B8C8',
  operations: {
    add: '#3D5AFE',
    subtract: '#D81B60',
    multiply: '#00897B',
    divide: '#F57C00',
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
