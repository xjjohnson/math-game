import type { ImageSourcePropType } from 'react-native';

import { INGREDIENTS, RECIPES, type Kind, type Recipe } from '@/utils/bakery';
import { SCHOOL_BOOKS } from '@/utils/schoolBooks.generated';
import type { SchoolBook } from '@/utils/schoolBookTypes';

/**
 * The books on the Community library shelves. Tap one to read it. Most are
 * real stories from the Texas school readers (Bluebonnet Learning), with their
 * pictures; some are short books that hide a secret bakery recipe inside, with
 * the exact things to put in the bakery's bowl.
 */

export type Page =
  /** Words and a big picture. */
  | { kind: 'text'; picture: string; text: string }
  /** A printed picture-book spread, words and all; the text is for reading aloud. */
  | { kind: 'picture'; image: ImageSourcePropType; text: string }
  /** A page of a chapter book: its picture (if any) above its words. */
  | { kind: 'chapter'; image?: ImageSourcePropType; heading?: string; text: string }
  /** A bakery recipe from bakery.ts, by name, so the book always matches the bakery. */
  | { kind: 'recipe'; recipe: string };

export interface Book {
  title: string;
  /** The picture on the first page. */
  cover: string;
  /** Easy books use short words and one line a page; the others are a little longer. */
  level: 'easy' | 'harder';
  /** For school books, the grade it is read in. */
  grade?: string;
  pages: Page[];
}

const p = (picture: string, text: string): Page => ({ kind: 'text', picture, text });
const r = (recipe: string): Page => ({ kind: 'recipe', recipe });

/** A page that says a recipe is coming. */
const SECRET = p('🤫', 'Shh! This book has a secret. Turn the page to find a bakery recipe!');

/** Who made the school books, on each one's last page. */
export const creditWords = (b: SchoolBook): string =>
  `This story is from "${b.reader}", the ${b.grade} reader in Bluebonnet Learning, by the Texas Education Agency. ` +
  'Parts are adapted from Amplify Education and the Core Knowledge Foundation. Shared under the Creative Commons BY-NC-SA 4.0 license.';

/** The stories: real books from the Texas school readers, with their own pictures. */
const STORIES: Book[] = SCHOOL_BOOKS.map((b) => ({
  title: b.title,
  cover: b.cover,
  level: b.level,
  grade: b.grade,
  pages: [
    ...b.pages.map((pg): Page =>
      b.style === 'picture' && pg.image
        ? { kind: 'picture', image: pg.image, text: pg.text }
        : { kind: 'chapter', image: pg.image, heading: pg.heading, text: pg.text },
    ),
    p('📚', creditWords(b)),
  ],
}));

/** Books that start like a story and hide a recipe. */
const RECIPE_BOOKS: Book[] = [
  {
    title: 'Grandma\'s Apple Tree',
    cover: '🌳',
    level: 'easy',
    pages: [p('🍎', 'Grandma has an apple tree.'), p('👵', 'We pick apples. Grandma smiles. "Let\'s bake!"'), SECRET, r('Apple pie')],
  },
  {
    title: 'Monkey\'s Lunch',
    cover: '🐒',
    level: 'easy',
    pages: [p('🐒', 'Monkey has too many bananas!'), p('🍌', 'What can Monkey make?'), SECRET, r('Banana bread')],
  },
  {
    title: 'The Party',
    cover: '🎉',
    level: 'easy',
    pages: [p('🎈', 'Today is a party!'), p('🎁', 'There are hats and gifts. What is missing? Cake!'), SECRET, r('Birthday cake'), r('Chocolate cake'), r('Strawberry cake')],
  },
  {
    title: 'Cupcake Kitten',
    cover: '🐱',
    level: 'easy',
    pages: [p('🐱', 'Kitten wants a tiny treat.'), p('🧁', 'A tiny cake for a tiny cat!'), SECRET, r('Cupcakes')],
  },
  {
    title: 'Sunday Morning',
    cover: '🌅',
    level: 'easy',
    pages: [p('🌅', 'It is Sunday. The sun is up.'), p('😋', 'Dad says, "What do you want for breakfast?"'), SECRET, r('Pancakes'), r('Waffles')],
  },
  {
    title: 'The Cookie Jar',
    cover: '🍪',
    level: 'easy',
    pages: [p('🫙', 'Oh no! The cookie jar is empty.'), p('🤔', 'We need to make more cookies.'), SECRET, r('Cookies'), r('Chocolate chip cookies')],
  },
  {
    title: 'The Baker\'s Hat',
    cover: '👨‍🍳',
    level: 'harder',
    pages: [
      p('👨‍🍳', 'The baker has a tall white hat. Inside the hat is a note.'),
      p('📜', 'The note says: "My best bakes. Do not tell anyone!"'),
      SECRET,
      r('Bread'),
      r('Croissants'),
      r('Pretzels'),
    ],
  },
  {
    title: 'Wobbly Pudding',
    cover: '🍮',
    level: 'easy',
    pages: [p('🍮', 'It wiggles. It wobbles.'), p('🥄', 'It is soft and sweet. What is it?'), SECRET, r('Custard')],
  },
  {
    title: 'The Treasure Map',
    cover: '🗺️',
    level: 'harder',
    pages: [
      p('🗺️', 'Pirate Pat found an old map with a big red X.'),
      p('🏝️', 'She sailed to the island and dug and dug.'),
      p('🧰', 'In the chest was not gold, but a recipe! The best treasure of all.'),
      SECRET,
      r('Fudge'),
    ],
  },
];

/** How many books stand on the shelves: 3 bookcases with 3 shelves of 3. */
export const SHELF_BOOKS = 27;

/** Where the recipe books stand among the shelf books (three in each bookcase). */
const RECIPE_SPOTS = [1, 5, 7, 10, 12, 17, 19, 23, 25];

/** The shelf books in shelf order: bookcase by bookcase, top shelf first, left to right. */
export const SHELF: readonly Book[] = (() => {
  const stories = [...STORIES];
  const recipes = [...RECIPE_BOOKS];
  return Array.from({ length: SHELF_BOOKS }, (_, i) => (RECIPE_SPOTS.includes(i) ? recipes.shift() : stories.shift()) as Book);
})();

/** The open book on the reading rug: how the library works. */
export const GUIDE: Book = {
  title: 'Welcome to the Library',
  cover: '📖',
  level: 'easy',
  pages: [
    p('📚', 'Tap any book on the shelves to read it. They are real stories from Texas school readers, from kindergarten up to 5th grade.'),
    p('🔊', 'Tap "Read to me" to hear the words.'),
    p('🤫', 'Some books hide secret recipes. Find them, then bake them in the bakery!'),
    p('🧑‍🍳', `There are ${RECIPES.length} recipes to find. Happy reading!`),
  ],
};

export const recipeByName = (name: string): Recipe | undefined => RECIPES.find((x) => x.name === name);

/** What to put in the bowl for one thing a recipe needs: "🍬 Sugar or 🍯 Honey" for anything sweet. */
export function ingredientsFor(kind: Kind): { emoji: string; name: string }[] {
  return INGREDIENTS.filter((i) => i.kind === kind).map((i) => ({ emoji: i.emoji, name: i.name }));
}

/** The words a recipe page shows (and reads aloud). */
export function recipeWords(recipe: Recipe): string {
  const things = recipe.needs.map((k) =>
    ingredientsFor(k)
      .map((i) => i.name.toLowerCase())
      .join(' or '),
  );
  return `${recipe.name}. Put in the bowl: ${things.join(', ')}. Mix it on the mixer. Then bake it in the hot oven!`;
}

/** The words of any page, for reading aloud. */
export function pageWords(page: Page): string {
  if (page.kind === 'text' || page.kind === 'picture') return page.text;
  if (page.kind === 'chapter') return [page.heading, page.text].filter(Boolean).join('. ');
  const recipe = recipeByName(page.recipe);
  return recipe ? recipeWords(recipe) : '';
}

/** The book a library prop holds: a shelf book, or the guide for anything past the shelves. */
export const bookAt = (n: number): Book => SHELF[n] ?? GUIDE;
