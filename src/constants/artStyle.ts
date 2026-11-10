/**
 * The look every drawing in the game shares: people, buddies, furniture, rooms, buttons.
 * See docs/art-style.md for the rules in plain words.
 *
 * Screen colours for text and buttons (contrast-checked) live in constants/theme.ts;
 * this file is only for drawn art.
 */

/** The one outline colour: a warm dark brown, softer than black. */
export const INK = '#4E3324';

/** Outline thickness for something `size` pixels tall, so small and big drawings match. */
export function inkWidth(size: number): number {
  return Math.max(2, Math.round(size * 0.016));
}

/** Fixed outline thickness for room pieces (walls, cupboards, counters). */
export const INK_ROOM = 3;

/** Soft base colours: most of any picture is drawn from these. */
export const SOFT = {
  cream: '#FFF4DC',
  sand: '#F3DDB3',
  peach: '#FFC9A8',
  blush: '#F7B6C2',
  lilac: '#CDB8F0',
  sky: '#B5DDF5',
  mint: '#BFE8CF',
  sage: '#A9CDA0',
  butter: '#FBE38E',
  wood: '#D9A66B',
  stone: '#CFC8C0',
  white: '#FFFDF8',
} as const;

/** A few bright accents for the thing that should catch the eye (a button, a new item). */
export const BRIGHT = {
  red: '#E8473F',
  orange: '#F28C28',
  yellow: '#FFC93C',
  green: '#3FB66B',
  blue: '#3A86E8',
  purple: '#8E5BD8',
  pink: '#EC5A9B',
} as const;

/** The soft shadow drawn on the floor under everyone. */
export const SHADOW = 'rgba(78, 51, 36, 0.18)';

/** Highlight dot in eyes and on shiny things. */
export const SHINE = '#FFFFFF';

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parse(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/**
 * The darker shade of a colour, for the shadow side of a shape (under an arm, the side of a
 * cupboard, the bottom of a button). `amount` 0-1, default 0.18. Colours it can't read come back as is.
 */
export function shade(color: string, amount = 0.18): string {
  const rgb = parse(color);
  if (!rgb) return color;
  // Darken and warm slightly, so shadows look cosy rather than grey.
  const k = 1 - amount;
  return toHex([rgb[0] * k, rgb[1] * k * 0.98, rgb[2] * k * 0.94]);
}

/** A lighter tint of a colour, for highlights. `amount` 0-1, default 0.35. */
export function tint(color: string, amount = 0.35): string {
  const rgb = parse(color);
  if (!rgb) return color;
  return toHex([rgb[0] + (255 - rgb[0]) * amount, rgb[1] + (255 - rgb[1]) * amount, rgb[2] + (255 - rgb[2]) * amount]);
}
