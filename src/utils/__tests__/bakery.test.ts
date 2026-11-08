import {
  addToMask,
  bake,
  ingredientIndex,
  INGREDIENTS,
  madeRecipe,
  madeToUnit,
  MASK_SIZE,
  maskEmojis,
  maskToUnit,
  RECIPES,
  recipeFor,
  SURPRISE,
  unitToMade,
  unitToMask,
} from '@/utils/bakery';

const bowl = (...keys: string[]) => keys.reduce((m, k) => addToMask(m, ingredientIndex(k)), 0);
const made = (...keys: string[]) => bake(bowl(...keys))?.name;

describe('baking in the bakery', () => {
  it('fits every ingredient in a number a switch can carry', () => {
    expect(INGREDIENTS.length).toBeLessThanOrEqual(Math.log2(MASK_SIZE));
    const all = bowl(...INGREDIENTS.map((i) => i.key));
    expect(unitToMask(maskToUnit(all))).toBe(all);
    expect(maskToUnit(all)).toBeLessThan(1);
    // It survives being sent as text.
    expect(unitToMask(JSON.parse(JSON.stringify(maskToUnit(all))))).toBe(all);
  });

  it('bakes nothing from an empty bowl and something from anything else', () => {
    expect(bake(0)).toBeNull();
    for (let mask = 1; mask < MASK_SIZE; mask += 7) expect(bake(mask)).not.toBeNull();
  });

  it('makes the treats you would expect', () => {
    expect(made('flour', 'egg', 'milk', 'butter', 'sugar', 'choc')).toBe('Chocolate cake');
    expect(made('flour', 'egg', 'milk', 'butter', 'honey', 'berry')).toBe('Strawberry cake');
    expect(made('flour', 'egg', 'milk', 'butter', 'sugar')).toBe('Birthday cake');
    expect(made('flour', 'butter', 'sugar')).toBe('Cookies');
    expect(made('flour', 'butter', 'sugar', 'choc')).toBe('Chocolate chip cookies');
    expect(made('flour', 'butter', 'sugar', 'apple')).toBe('Apple pie');
    expect(made('flour', 'egg', 'banana')).toBe('Banana bread');
    expect(made('flour', 'egg', 'milk')).toBe('Pancakes');
    expect(made('flour', 'salt')).toBe('Pretzels');
    expect(made('flour')).toBe('Bread');
    expect(made('egg', 'milk')).toBe('Custard');
  });

  it('gives a surprise when nothing fits, and the same treat on every phone', () => {
    expect(made('salt')).toBe(SURPRISE.name);
    expect(recipeFor(bowl('flour', 'egg'))).toBe(recipeFor(bowl('egg', 'flour')));
  });

  it('shows what is in the bowl', () => {
    expect(maskEmojis(bowl('flour', 'egg'))).toBe('🥚🌾');
    expect(maskEmojis(0)).toBe('');
  });

  it('keeps the treat in a slot as a number and gets it back', () => {
    expect(unitToMade(0)).toBeNull();
    for (let i = -1; i < RECIPES.length; i++) expect(unitToMade(JSON.parse(JSON.stringify(madeToUnit(i))))).toBe(i);
    expect(madeRecipe(-1)).toBe(SURPRISE);
    expect(madeRecipe(0)).toBe(RECIPES[0]);
  });
});
