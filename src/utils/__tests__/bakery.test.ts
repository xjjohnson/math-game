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
  MESSES,
  RESULTS,
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

  it('makes a funny mess from a wrong mix, and the same treat on every phone', () => {
    expect(made('choc', 'egg')).toBe('Spaghetti chocolate mess');
    expect(made('flour', 'salt', 'choc')).toBe('Spaghetti chocolate mess');
    expect(made('berry', 'jam')).toBe('Sticky fruit gloop');
    expect(made('salt')).toBe('Weird gloop');
    expect(made('salt', 'sugar', 'flour')).toBe('Sticky fruit gloop');
    expect(MESSES.map((m) => m.name)).not.toContain(made('flour', 'butter', 'sugar'));
    expect(recipeFor(bowl('flour', 'egg'))).toBe(recipeFor(bowl('egg', 'flour')));
  });

  it('bakes unmixed food into a lumpy mess', () => {
    expect(bake(bowl('flour', 'butter', 'sugar'), false)?.name).toBe('Lumpy mess (mix it first!)');
    expect(bake(bowl('flour', 'butter', 'sugar'), true)?.name).toBe('Cookies');
    expect(bake(0, false)).toBeNull();
  });

  it('shows what is in the bowl', () => {
    expect(maskEmojis(bowl('flour', 'egg'))).toBe('🥚🌾');
    expect(maskEmojis(0)).toBe('');
  });

  it('keeps the treat in a slot as a number and gets it back', () => {
    expect(unitToMade(0)).toBeNull();
    for (let i = 0; i < RESULTS.length; i++) expect(unitToMade(JSON.parse(JSON.stringify(madeToUnit(i))))).toBe(i);
    expect(madeRecipe(RECIPES.length)).toBe(MESSES[0]);
    expect(madeRecipe(0)).toBe(RECIPES[0]);
  });
});
