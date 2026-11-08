import { addToMask, bake, INGREDIENTS, RECIPES } from '@/utils/bakery';
import { bookAt, GUIDE, ingredientsFor, pageWords, recipeByName, SHELF, SHELF_BOOKS } from '@/utils/libraryBooks';
import { GUIDE_BOOK, PLACE_PROPS } from '@/utils/multiplayer/placeProps';

const recipePages = SHELF.flatMap((b) => b.pages).filter((p) => p.kind === 'recipe');

describe('library books', () => {
  it('fills every shelf with a book that has pages', () => {
    expect(SHELF).toHaveLength(SHELF_BOOKS);
    for (const b of SHELF) {
      expect(b).toBeDefined();
      expect(b.pages.length).toBeGreaterThan(2);
      for (const p of b.pages) expect(pageWords(p).length).toBeGreaterThan(0);
    }
    expect(new Set(SHELF.map((b) => b.title)).size).toBe(SHELF_BOOKS);
  });

  it('hides every bakery recipe in some book, and only real ones', () => {
    for (const p of recipePages) if (p.kind === 'recipe') expect(recipeByName(p.recipe)).toBeDefined();
    const found = new Set(recipePages.map((p) => (p.kind === 'recipe' ? p.recipe : '')));
    for (const r of RECIPES) expect(found).toContain(r.name);
  });

  it('puts recipe books in every bookcase, mixed in with stories', () => {
    for (let c = 0; c < 3; c++) {
      const inCase = SHELF.slice(c * 9, c * 9 + 9);
      const withRecipe = inCase.filter((b) => b.pages.some((p) => p.kind === 'recipe')).length;
      expect(withRecipe).toBeGreaterThan(0);
      expect(withRecipe).toBeLessThan(9);
    }
  });

  it('bakes what the recipe page says when you follow it', () => {
    for (const r of RECIPES) {
      // One of each thing it asks for (the first choice, like sugar for "sugar or honey").
      const mask = r.needs.reduce((m, k) => addToMask(m, INGREDIENTS.findIndex((i) => i.emoji === ingredientsFor(k)[0].emoji)), 0);
      expect(bake(mask, true)?.name).toBe(r.name);
    }
  });

  it('gives every library book prop its own book, and the open book is the guide', () => {
    const books = PLACE_PROPS.library.filter((p) => p.book !== undefined);
    const shelfBooks = books.filter((p) => p.book !== GUIDE_BOOK).map((p) => p.book);
    expect(new Set(shelfBooks).size).toBe(SHELF_BOOKS);
    expect(Math.max(...(shelfBooks as number[]))).toBe(SHELF_BOOKS - 1);
    expect(bookAt(GUIDE_BOOK)).toBe(GUIDE);
  });
});
