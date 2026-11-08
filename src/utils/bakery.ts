/**
 * Baking in the Community bakery: drop ingredients into the mixing bowl, put
 * the bowl in the hot oven for a few seconds, and out comes a cake, cookies,
 * bread or something else yummy. Which treat you get depends only on what is
 * in the bowl, so every phone on a visit works out the same one.
 */

/** What an ingredient counts as when a treat is worked out (sugar and honey both sweeten). */
export type Kind = 'flour' | 'egg' | 'milk' | 'butter' | 'sweet' | 'choc' | 'berry' | 'apple' | 'banana' | 'salt' | 'jam';

export interface Ingredient {
  /** Short name, also the bakery prop that holds it. */
  key: string;
  emoji: string;
  name: string;
  kind: Kind;
}

/** In bit order: the bowl's contents are kept as a number with one bit per ingredient. */
export const INGREDIENTS: readonly Ingredient[] = [
  { key: 'egg', emoji: '🥚', name: 'Egg', kind: 'egg' },
  { key: 'milk', emoji: '🥛', name: 'Milk', kind: 'milk' },
  { key: 'butter', emoji: '🧈', name: 'Butter', kind: 'butter' },
  { key: 'berry', emoji: '🍓', name: 'Strawberry', kind: 'berry' },
  { key: 'honey', emoji: '🍯', name: 'Honey', kind: 'sweet' },
  { key: 'salt', emoji: '🧂', name: 'Salt', kind: 'salt' },
  { key: 'jam', emoji: '🫙', name: 'Jam', kind: 'jam' },
  { key: 'choc', emoji: '🍫', name: 'Chocolate', kind: 'choc' },
  { key: 'flour', emoji: '🌾', name: 'Flour', kind: 'flour' },
  { key: 'sugar', emoji: '🍬', name: 'Sugar', kind: 'sweet' },
  { key: 'banana', emoji: '🍌', name: 'Banana', kind: 'banana' },
  { key: 'apple', emoji: '🍎', name: 'Apple', kind: 'apple' },
];

/** The bowl's contents travel as mask / MASK_SIZE (between 0 and 1), so MASK_SIZE has to cover every bit. */
export const MASK_SIZE = 4096;

export const ingredientIndex = (key: string): number => INGREDIENTS.findIndex((i) => i.key === key);
export const maskToUnit = (mask: number): number => mask / MASK_SIZE;
export const unitToMask = (x: number): number => Math.max(0, Math.min(MASK_SIZE - 1, Math.round(x * MASK_SIZE)));
export const addToMask = (mask: number, index: number): number => mask | (1 << index);

/** The emoji of everything in the bowl, in shelf order. */
export const maskEmojis = (mask: number): string =>
  INGREDIENTS.filter((_, i) => (mask & (1 << i)) !== 0)
    .map((i) => i.emoji)
    .join('');

const kindsIn = (mask: number): Set<Kind> => new Set(INGREDIENTS.filter((_, i) => (mask & (1 << i)) !== 0).map((i) => i.kind));

export interface Recipe {
  emoji: string;
  name: string;
  /** The treat comes out when the bowl has at least these. The recipe that asks for the most wins. */
  needs: readonly Kind[];
}

export const RECIPES: readonly Recipe[] = [
  { emoji: '🎂', name: 'Chocolate cake', needs: ['flour', 'egg', 'milk', 'butter', 'sweet', 'choc'] },
  { emoji: '🍰', name: 'Strawberry cake', needs: ['flour', 'egg', 'milk', 'butter', 'sweet', 'berry'] },
  { emoji: '🎂', name: 'Birthday cake', needs: ['flour', 'egg', 'milk', 'butter', 'sweet'] },
  { emoji: '🥧', name: 'Apple pie', needs: ['flour', 'butter', 'sweet', 'apple'] },
  { emoji: '🍞', name: 'Banana bread', needs: ['flour', 'egg', 'banana'] },
  { emoji: '🧁', name: 'Cupcakes', needs: ['flour', 'egg', 'milk', 'sweet'] },
  { emoji: '🧇', name: 'Waffles', needs: ['flour', 'egg', 'milk', 'butter'] },
  { emoji: '🥞', name: 'Pancakes', needs: ['flour', 'egg', 'milk'] },
  { emoji: '🍪', name: 'Chocolate chip cookies', needs: ['flour', 'butter', 'sweet', 'choc'] },
  { emoji: '🍪', name: 'Cookies', needs: ['flour', 'butter', 'sweet'] },
  { emoji: '🥐', name: 'Croissants', needs: ['flour', 'butter'] },
  { emoji: '🥨', name: 'Pretzels', needs: ['flour', 'salt'] },
  { emoji: '🥖', name: 'Bread', needs: ['flour'] },
  { emoji: '🍮', name: 'Custard', needs: ['egg', 'milk'] },
  { emoji: '🍫', name: 'Fudge', needs: ['choc', 'sweet'] },
];

/** What anything else (no flour, no match) turns into. */
export const SURPRISE: Recipe = { emoji: '🍮', name: 'Yummy pudding', needs: [] };

/** Which treat this bowl bakes into: an index into RECIPES, or -1 for the surprise. -2 when the bowl is empty. */
export function recipeFor(mask: number): number {
  if (mask === 0) return -2;
  const kinds = kindsIn(mask);
  let best = -1;
  RECIPES.forEach((r, i) => {
    if (r.needs.every((k) => kinds.has(k)) && (best < 0 || r.needs.length > RECIPES[best].needs.length)) best = i;
  });
  return best;
}

/** The treat for a bowl: always something. */
export const bake = (mask: number): Recipe | null => {
  const i = recipeFor(mask);
  return i === -2 ? null : i === -1 ? SURPRISE : RECIPES[i];
};

/**
 * Finished treats sit on the counter as a few spare pieces, each with a
 * switch that says what it is. y carries the answer: 0 is "nothing here",
 * otherwise (recipe number + 2) / 64, where the surprise is number -1.
 */
export const MADE_SLOTS = 6;
export const madeToUnit = (recipe: number): number => (recipe + 2) / 64;
/** The recipe number kept in a switch's y, or null for an empty slot. */
export const unitToMade = (y: number): number | null => {
  const n = Math.round(y * 64) - 2;
  return n >= -1 && n < RECIPES.length ? n : null;
};
export const madeRecipe = (n: number): Recipe => (n < 0 ? SURPRISE : RECIPES[n]);
