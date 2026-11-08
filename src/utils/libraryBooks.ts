import { INGREDIENTS, RECIPES, type Kind, type Recipe } from '@/utils/bakery';

/**
 * The books on the Community library shelves. Tap one to read it. Most are
 * short, easy-to-read stories; some start like a story and hide a secret
 * bakery recipe inside, with the exact things to put in the bakery's bowl.
 */

export type Page =
  /** Words and a big picture. */
  | { kind: 'text'; picture: string; text: string }
  /** A bakery recipe from bakery.ts, by name, so the book always matches the bakery. */
  | { kind: 'recipe'; recipe: string };

export interface Book {
  title: string;
  /** The picture on the first page. */
  cover: string;
  /** Easy books use short words and one line a page; the others are a little longer. */
  level: 'easy' | 'harder';
  pages: Page[];
}

const p = (picture: string, text: string): Page => ({ kind: 'text', picture, text });
const r = (recipe: string): Page => ({ kind: 'recipe', recipe });

/** A page that says a recipe is coming. */
const SECRET = p('🤫', 'Shh! This book has a secret. Turn the page to find a bakery recipe!');

/** The stories. */
const STORIES: Book[] = [
  {
    title: 'The Big Red Bus',
    cover: '🚌',
    level: 'easy',
    pages: [
      p('🚌', 'I see a bus.'),
      p('🔴', 'The bus is big. The bus is red.'),
      p('👧', 'A girl gets on the bus.'),
      p('🐶', 'A dog gets on the bus!'),
      p('🛑', 'Stop, bus, stop!'),
      p('🏫', 'We are at school. Bye, bus!'),
    ],
  },
  {
    title: 'Pip the Pup',
    cover: '🐶',
    level: 'easy',
    pages: [
      p('🐶', 'This is Pip. Pip is a pup.'),
      p('🦴', 'Pip has a bone.'),
      p('🕳️', 'Pip digs a hole. Dig, dig, dig!'),
      p('🦴', 'Pip puts the bone in the hole.'),
      p('😴', 'Now Pip can nap. Good pup, Pip.'),
    ],
  },
  {
    title: 'Frog Can Hop',
    cover: '🐸',
    level: 'easy',
    pages: [
      p('🐸', 'Frog can hop.'),
      p('🪨', 'Hop on a rock.'),
      p('🪵', 'Hop on a log.'),
      p('🌸', 'Hop on a lily pad.'),
      p('💦', 'Hop in the pond! Splash!'),
    ],
  },
  {
    title: 'Ducks at the Pond',
    cover: '🦆',
    level: 'easy',
    pages: [
      p('🦆', 'One duck swims in the pond.'),
      p('🦆🦆', 'One more duck comes. Now there are 2 ducks.'),
      p('🦆🦆🦆', 'One more duck comes. Now there are 3 ducks.'),
      p('🦆🦆🦆🦆', 'One more duck comes. Now there are 4 ducks.'),
      p('🍞', 'A boy has bread. Quack, quack, quack, quack!'),
    ],
  },
  {
    title: 'Ten Red Apples',
    cover: '🍎',
    level: 'harder',
    pages: [
      p('🌳', 'Ten red apples hang on a tree.'),
      p('🐛', 'A worm eats one. Now there are nine.'),
      p('🐦', 'A bird takes two. Now there are seven.'),
      p('🐿️', 'A squirrel takes three. Now there are four.'),
      p('🧺', 'I pick the last four and put them in my basket.'),
      p('🥧', 'How many are left on the tree? None! Zero!'),
    ],
  },
  {
    title: 'The Lost Sock',
    cover: '🧦',
    level: 'easy',
    pages: [
      p('🧦', 'I have one sock. Where is the other sock?'),
      p('🛏️', 'Is it on the bed? No.'),
      p('📦', 'Is it in the box? No.'),
      p('🐱', 'Is it with the cat? Yes!'),
      p('😺', 'The cat has my sock. Silly cat!'),
    ],
  },
  {
    title: 'Bear Wants a Nap',
    cover: '🐻',
    level: 'easy',
    pages: [
      p('🐻', 'Bear is sleepy. Bear wants a nap.'),
      p('🐦', 'Tweet, tweet! A bird sings. Bear can not sleep.'),
      p('🐝', 'Buzz, buzz! A bee hums. Bear can not sleep.'),
      p('🌙', 'Now it is night. It is quiet.'),
      p('💤', 'Bear sleeps. Shh!'),
    ],
  },
  {
    title: 'Rainy Day',
    cover: '☔',
    level: 'easy',
    pages: [
      p('🌧️', 'Drip, drop. It is a rainy day.'),
      p('🥾', 'I put on my boots.'),
      p('☂️', 'I get my umbrella.'),
      p('💦', 'I jump in a big puddle. Splash!'),
      p('🌈', 'The sun comes out. Look, a rainbow!'),
    ],
  },
  {
    title: 'My Rocket',
    cover: '🚀',
    level: 'easy',
    pages: [
      p('🚀', 'I made a rocket.'),
      p('🔟', 'Count down with me: 10, 9, 8, 7, 6...'),
      p('🔥', '5, 4, 3, 2, 1. Blast off!'),
      p('🌙', 'I zoom to the moon.'),
      p('👽', 'Hi, moon friend! Now I must go home.'),
      p('🏠', 'Back home in time for dinner.'),
    ],
  },
  {
    title: 'Fish in a Dish',
    cover: '🐟',
    level: 'easy',
    pages: [
      p('🐟', 'I have a fish.'),
      p('🥣', 'My fish is in a dish.'),
      p('😟', 'The dish is too small.'),
      p('🫙', 'I get a big jar.'),
      p('🐠', 'Now my fish can swim and swim. Swish!'),
    ],
  },
  {
    title: 'The Snowman',
    cover: '⛄',
    level: 'easy',
    pages: [
      p('❄️', 'Snow is on the ground.'),
      p('⚪', 'I roll a big ball. Then a small ball.'),
      p('🥕', 'I give him a carrot nose.'),
      p('🧣', 'I give him my hat and a red scarf.'),
      p('⛄', 'Hello, snowman! He looks happy.'),
    ],
  },
  {
    title: 'Busy Bee',
    cover: '🐝',
    level: 'easy',
    pages: [
      p('🐝', 'Buzz! Bee is busy.'),
      p('🌻', 'Bee goes to a big yellow flower.'),
      p('🌷', 'Bee goes to a pink flower.'),
      p('🏠', 'Bee flies back to the hive.'),
      p('🍯', 'Bee makes sweet honey. Yum!'),
    ],
  },
  {
    title: 'The Dino Egg',
    cover: '🥚',
    level: 'harder',
    pages: [
      p('🥚', 'Max found a big egg by the river.'),
      p('🤔', 'Is it a duck egg? It is too big for a duck.'),
      p('💥', 'Crack! Crack! The egg starts to wiggle.'),
      p('🦖', 'Out pops a baby dinosaur!'),
      p('🦕', 'His mom comes stomping by. Stomp, stomp!'),
      p('👋', 'Max waves goodbye. What a day!'),
    ],
  },
  {
    title: 'Owl Counts Stars',
    cover: '🦉',
    level: 'harder',
    pages: [
      p('🦉', 'Owl stays up when everyone sleeps.'),
      p('⭐', 'She looks up and sees one star.'),
      p('⭐⭐⭐', 'Then three stars. Then too many to count!'),
      p('☁️', 'A cloud floats by and hides them all.'),
      p('🌟', 'The wind blows the cloud away. The stars are back, twinkling just for Owl.'),
    ],
  },
  {
    title: 'The Kind Robot',
    cover: '🤖',
    level: 'harder',
    pages: [
      p('🤖', 'Bolt is a little robot who likes to help.'),
      p('🧹', 'He sweeps the floor. Swish, swish.'),
      p('🪴', 'He waters the plants. Drip, drip.'),
      p('😢', 'He sees a girl who dropped her blocks.'),
      p('🧱', 'Bolt helps her build a tall tower.'),
      p('💛', 'Being kind makes Bolt\'s lights glow bright!'),
    ],
  },
  {
    title: 'Turtle Wins the Race',
    cover: '🐢',
    level: 'harder',
    pages: [
      p('🐇', 'Rabbit is fast. "I will win the race!" he says.'),
      p('🐢', 'Turtle is slow, but she does not stop.'),
      p('🌳', 'Rabbit runs far ahead, then takes a nap under a tree.'),
      p('👣', 'Step, step, step. Turtle keeps going.'),
      p('🏁', 'Turtle crosses the finish line first!'),
      p('🏆', 'Slow and steady can win too.'),
    ],
  },
  {
    title: 'Bunny\'s Garden',
    cover: '🐰',
    level: 'easy',
    pages: [
      p('🐰', 'Bunny has a garden.'),
      p('🌱', 'She plants a seed.'),
      p('💧', 'She gives it water every day.'),
      p('☀️', 'The sun helps it grow.'),
      p('🥕', 'Pop! A big orange carrot. Crunch!'),
    ],
  },
  {
    title: 'The Shape Parade',
    cover: '🔺',
    level: 'easy',
    pages: [
      p('🟦', 'Here comes a square. It has 4 sides.'),
      p('🔺', 'Here comes a triangle. It has 3 sides.'),
      p('⭕', 'Here comes a circle. It rolls and rolls.'),
      p('⭐', 'Here comes a star. It has 5 points.'),
      p('🎉', 'Hooray for the shape parade!'),
    ],
  },
];

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
    p('📚', 'Tap any book on the shelves to read it.'),
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
  if (page.kind === 'text') return page.text;
  const recipe = recipeByName(page.recipe);
  return recipe ? recipeWords(recipe) : '';
}

/** The book a library prop holds: a shelf book, or the guide for anything past the shelves. */
export const bookAt = (n: number): Book => SHELF[n] ?? GUIDE;
