export type ShopCategory = 'avatar' | 'background' | 'cardStyle' | 'companion';

export interface CardStyle {
  background: string;
  text: string;
  /** null keeps the operation's own color. */
  border: string | null;
  borderStyle: 'solid' | 'dashed' | 'dotted';
}

export interface Companion {
  /** An emoji, or an "@key" drawing from constants/art. */
  emoji: string;
  cheers: string[];
  comforts: string[];
  /** The buddy's favorite snack, given as a treat in the buddy's home. */
  treat: string;
}

interface BaseItem {
  id: string;
  name: string;
  /** Coins to buy; 0 means every player owns it from the start. */
  price: number;
}

export type ShopItem =
  /** `emoji` may also be an "@key" drawing from constants/art. */
  | (BaseItem & { category: 'avatar'; emoji: string })
  /** `decor` scatters faint pictures over the color for a themed look. */
  | (BaseItem & { category: 'background'; color: string; decor?: string[] })
  | (BaseItem & { category: 'cardStyle'; style: CardStyle })
  | (BaseItem & { category: 'companion'; companion: Companion });

export const SHOP_CATEGORIES: { value: ShopCategory; label: string }[] = [
  { value: 'avatar', label: '😀 Avatars' },
  { value: 'background', label: '🎨 Backgrounds' },
  { value: 'cardStyle', label: '🃏 Cards' },
  { value: 'companion', label: '🐾 Buddies' },
];

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'avatar-cat', category: 'avatar', name: 'Cat', emoji: '🐱', price: 30 },
  { id: 'avatar-owl', category: 'avatar', name: 'Owl', emoji: '🦉', price: 30 },
  { id: 'avatar-shark', category: 'avatar', name: 'Shark', emoji: '🦈', price: 40 },
  { id: 'avatar-alien', category: 'avatar', name: 'Alien', emoji: '👽', price: 40 },
  { id: 'avatar-ninja', category: 'avatar', name: 'Ninja', emoji: '🥷', price: 60 },
  { id: 'avatar-wizard', category: 'avatar', name: 'Wizard', emoji: '🧙', price: 60 },
  { id: 'avatar-robot', category: 'avatar', name: 'Robot', emoji: '🤖', price: 80 },
  { id: 'avatar-crown', category: 'avatar', name: 'Royal', emoji: '👑', price: 150 },
  { id: 'avatar-bluey', category: 'avatar', name: 'Bluey', emoji: '@bluey', price: 120 },
  { id: 'avatar-stitch', category: 'avatar', name: 'Stitch', emoji: '@stitch', price: 120 },

  { id: 'bg-cream', category: 'background', name: 'Sunny Cream', color: '#FFF8E7', price: 0 },
  { id: 'bg-sky', category: 'background', name: 'Sky', color: '#E3F2FD', price: 40 },
  { id: 'bg-mint', category: 'background', name: 'Mint', color: '#DFF7EC', price: 40 },
  { id: 'bg-lavender', category: 'background', name: 'Lavender', color: '#EEE6FF', price: 60 },
  { id: 'bg-peach', category: 'background', name: 'Peach', color: '#FFE4D6', price: 60 },
  { id: 'bg-lemon', category: 'background', name: 'Lemonade', color: '#FFF6B8', price: 80 },
  {
    id: 'bg-space',
    category: 'background',
    name: 'Outer Space',
    color: '#E6E9FB',
    decor: ['⭐', '🪐', '🚀', '🌙', '✨'],
    price: 100,
  },
  {
    id: 'bg-ocean',
    category: 'background',
    name: 'Under the Sea',
    color: '#DDF4FB',
    decor: ['🐠', '🫧', '🐳', '🐚', '🐙'],
    price: 100,
  },
  {
    id: 'bg-jungle',
    category: 'background',
    name: 'Jungle',
    color: '#E3F4DF',
    decor: ['🌴', '🦜', '🍃', '🐒', '🌺'],
    price: 100,
  },
  {
    id: 'bg-candy',
    category: 'background',
    name: 'Candy Land',
    color: '#FDE7F1',
    decor: ['🍭', '🍬', '🧁', '🍩', '🍓'],
    price: 100,
  },
  {
    id: 'bg-dino',
    category: 'background',
    name: 'Dino Land',
    color: '#F0F5DC',
    decor: ['🦕', '🦖', '🌋', '🦴', '🌿'],
    price: 120,
  },
  {
    id: 'bg-rainbow',
    category: 'background',
    name: 'Rainbow Sky',
    color: '#F1E9FB',
    decor: ['🌈', '☁️', '✨', '🦄', '💖'],
    price: 120,
  },
  {
    id: 'bg-snow',
    category: 'background',
    name: 'Snow Day',
    color: '#EEF6FC',
    decor: ['❄️', '⛄', '🧣', '🌨️'],
    price: 120,
  },
  {
    id: 'bg-backyard',
    category: 'background',
    name: 'Backyard Fun',
    color: '#E8F6E4',
    decor: ['🌳', '🏡', '🌼', '⚽', '🦴'],
    price: 150,
  },
  {
    id: 'bg-beach',
    category: 'background',
    name: 'Aloha Beach',
    color: '#FFF1DC',
    decor: ['🌺', '🌴', '🏄', '🌊', '🐢'],
    price: 150,
  },

  {
    id: 'card-classic',
    category: 'cardStyle',
    name: 'Classic',
    price: 0,
    style: { background: '#FFFFFF', text: '#1B1B3A', border: null, borderStyle: 'solid' },
  },
  {
    id: 'card-night',
    category: 'cardStyle',
    name: 'Night Sky',
    price: 60,
    style: { background: '#1B1B3A', text: '#FFFFFF', border: '#FFD54F', borderStyle: 'solid' },
  },
  {
    id: 'card-candy',
    category: 'cardStyle',
    name: 'Candy',
    price: 60,
    style: { background: '#FFE3F1', text: '#7A1048', border: '#D81B60', borderStyle: 'dashed' },
  },
  {
    id: 'card-jungle',
    category: 'cardStyle',
    name: 'Jungle',
    price: 80,
    style: { background: '#E4F6DC', text: '#1D4D12', border: '#2E7D32', borderStyle: 'dotted' },
  },
  {
    id: 'card-gold',
    category: 'cardStyle',
    name: 'Gold',
    price: 120,
    style: { background: '#FFF3C4', text: '#4E3B00', border: '#C99700', borderStyle: 'solid' },
  },

  {
    id: 'buddy-pup',
    category: 'companion',
    name: 'Pup',
    price: 100,
    companion: {
      emoji: '🐶',
      treat: '🦴',
      cheers: ['Woof! Nice!', 'Good job!', 'You rock!'],
      comforts: ["It's okay!", 'Try the next one!', 'Paws and think!'],
    },
  },
  {
    id: 'buddy-kitty',
    category: 'companion',
    name: 'Kitty',
    price: 100,
    companion: {
      emoji: '🐱',
      treat: '🐟',
      cheers: ['Purrfect!', 'Meow-velous!', 'So smart!'],
      comforts: ['No worries!', 'Keep going!', "You'll get it!"],
    },
  },
  {
    id: 'buddy-bunny',
    category: 'companion',
    name: 'Bunny',
    price: 100,
    companion: {
      emoji: '🐰',
      treat: '🥕',
      cheers: ['Hop hop hooray!', 'Bunny-tastic!', 'Quick thinking!'],
      comforts: ['Hop back up!', 'Nibble on it!', 'Next one!'],
    },
  },
  {
    id: 'buddy-panda',
    category: 'companion',
    name: 'Panda',
    price: 120,
    companion: {
      emoji: '🐼',
      treat: '🎋',
      cheers: ['Bam-boo-tiful!', 'Panda power!', 'So good!'],
      comforts: ['Take it slow!', "It's okay!", 'Try again!'],
    },
  },
  {
    id: 'buddy-fox',
    category: 'companion',
    name: 'Fox',
    price: 120,
    companion: {
      emoji: '🦊',
      treat: '🫐',
      cheers: ['Clever fox!', 'Sly and smart!', 'Nailed it!'],
      comforts: ['Sniff it out!', 'Almost!', 'Keep trying!'],
    },
  },
  {
    id: 'buddy-penguin',
    category: 'companion',
    name: 'Penguin',
    price: 120,
    companion: {
      emoji: '🐧',
      treat: '🐟',
      cheers: ['Ice cool!', 'Waddle-ful!', 'Chill skills!'],
      comforts: ['Slide to the next!', 'Brr, try again!', 'You got this!'],
    },
  },
  {
    id: 'buddy-octopus',
    category: 'companion',
    name: 'Octopus',
    price: 150,
    companion: {
      emoji: '🐙',
      treat: '🦐',
      cheers: ['Eight thumbs up!', 'Tentacle-tastic!', 'Ink-credible!'],
      comforts: ['Swim on!', 'Next wave!', "Don't worry!"],
    },
  },
  {
    id: 'buddy-unicorn',
    category: 'companion',
    name: 'Unicorn',
    price: 250,
    companion: {
      emoji: '🦄',
      treat: '🧁',
      cheers: ['Magical!', 'Sparkly smart!', 'Rainbow power!'],
      comforts: ['Make a wish and retry!', 'Magic takes practice!', 'Keep shining!'],
    },
  },
  {
    id: 'buddy-dino',
    category: 'companion',
    name: 'Dino',
    price: 150,
    companion: {
      emoji: '🦖',
      treat: '🍖',
      cheers: ['RAWR! Yes!', 'Dino-mite!', 'Stomping it!'],
      comforts: ['Shake it off!', 'Next one!', 'Big dinos try again!'],
    },
  },
  {
    id: 'buddy-dragon',
    category: 'companion',
    name: 'Dragon',
    price: 250,
    companion: {
      emoji: '🐉',
      treat: '🌶️',
      cheers: ['On fire!', 'Legendary!', 'Blazing fast!'],
      comforts: ['Even dragons miss!', 'Breathe and retry!', 'You got this!'],
    },
  },
  {
    id: 'buddy-bluey',
    category: 'companion',
    name: 'Bluey',
    price: 200,
    companion: {
      emoji: '@bluey',
      treat: '🍦',
      cheers: ['Hooray!', 'Wackadoo!', 'Best game ever!'],
      comforts: ["That's okay!", "Let's play again!", 'Have another go!'],
    },
  },
  {
    id: 'buddy-stitch',
    category: 'companion',
    name: 'Stitch',
    price: 200,
    companion: {
      emoji: '@stitch',
      treat: '🍰',
      cheers: ['Ohana!', 'Aloha, smarty!', 'Super good!'],
      comforts: ['No one gets left behind!', 'Try again!', 'Still good!'],
    },
  },
  // People, drawn in their own look (PEOPLE in constants/wardrobe) and dressed like the animal buddies.
  {
    id: 'buddy-girl',
    category: 'companion',
    name: 'Little sister',
    price: 100,
    companion: {
      emoji: '@girl',
      treat: '🍓',
      cheers: ['Yay, you did it!', 'So smart!', 'High five!'],
      comforts: ["That's okay!", 'Try again!', 'You can do it!'],
    },
  },
  {
    id: 'buddy-boy',
    category: 'companion',
    name: 'Boy',
    price: 100,
    companion: {
      emoji: '@boy',
      treat: '🍕',
      cheers: ['Awesome!', 'Nailed it!', 'Way to go!'],
      comforts: ['No problem!', 'Next one!', "Let's keep going!"],
    },
  },
  {
    id: 'buddy-kid',
    category: 'companion',
    name: 'Big sister',
    price: 100,
    companion: {
      emoji: '@kid',
      treat: '🧃',
      cheers: ['Woo-hoo!', 'Great job!', 'You rock!'],
      comforts: ['Oops, okay!', 'Try the next one!', 'Keep at it!'],
    },
  },
  {
    id: 'buddy-mom',
    category: 'companion',
    name: 'Mom',
    price: 100,
    companion: {
      emoji: '@mom',
      treat: '☕',
      cheers: ['Proud of you!', 'Brilliant!', 'Look at you go!'],
      comforts: ['Good try, sweetie!', 'Mistakes help us learn!', 'Take your time!'],
    },
  },
  {
    id: 'buddy-dad',
    category: 'companion',
    name: 'Dad',
    price: 100,
    companion: {
      emoji: '@dad',
      treat: '🥪',
      cheers: ['Touchdown!', 'Nice work, champ!', 'That’s my kid!'],
      comforts: ['Shake it off!', 'Next play!', 'You’ll get it!'],
    },
  },
  {
    id: 'buddy-grandma',
    category: 'companion',
    name: 'Grandma',
    price: 100,
    companion: {
      emoji: '@grandma',
      treat: '🥧',
      cheers: ['Wonderful, dear!', 'Clever cookie!', 'Splendid!'],
      comforts: ['Never mind, dear!', 'Try again, love!', 'Slow and steady!'],
    },
  },
  {
    id: 'buddy-grandpa',
    category: 'companion',
    name: 'Grandpa',
    price: 100,
    companion: {
      emoji: '@grandpa',
      treat: '🍩',
      cheers: ['Well done, kiddo!', 'Top notch!', 'Sharp as a tack!'],
      comforts: ['Back in my day I missed some too!', 'Try again!', 'Keep on trucking!'],
    },
  },
  {
    id: 'buddy-baby',
    category: 'companion',
    name: 'Baby',
    price: 100,
    companion: {
      emoji: '@baby',
      treat: '🍼',
      cheers: ['Goo goo, yay!', 'Wheee!', 'Clap clap!'],
      comforts: ['Uh-oh!', 'Bababa, again!', 'Peekaboo, try again!'],
    },
  },
];

export const DEFAULT_EQUIPPED = {
  background: 'bg-cream',
  cardStyle: 'card-classic',
  companion: null as string | null,
};

export function findItem(id: string | null | undefined): ShopItem | undefined {
  return id ? SHOP_ITEMS.find((item) => item.id === id) : undefined;
}

export function itemsIn(category: ShopCategory): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.category === category);
}
