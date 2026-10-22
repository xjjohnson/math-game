export type ShopCategory = 'avatar' | 'background' | 'cardStyle' | 'companion';

export interface CardStyle {
  background: string;
  text: string;
  /** null keeps the operation's own color. */
  border: string | null;
  borderStyle: 'solid' | 'dashed' | 'dotted';
}

export interface Companion {
  emoji: string;
  cheers: string[];
  comforts: string[];
}

interface BaseItem {
  id: string;
  name: string;
  /** Coins to buy; 0 means every player owns it from the start. */
  price: number;
}

export type ShopItem =
  | (BaseItem & { category: 'avatar'; emoji: string })
  | (BaseItem & { category: 'background'; color: string })
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

  { id: 'bg-cream', category: 'background', name: 'Sunny Cream', color: '#FFF8E7', price: 0 },
  { id: 'bg-sky', category: 'background', name: 'Sky', color: '#E3F2FD', price: 40 },
  { id: 'bg-mint', category: 'background', name: 'Mint', color: '#DFF7EC', price: 40 },
  { id: 'bg-lavender', category: 'background', name: 'Lavender', color: '#EEE6FF', price: 60 },
  { id: 'bg-peach', category: 'background', name: 'Peach', color: '#FFE4D6', price: 60 },
  { id: 'bg-lemon', category: 'background', name: 'Lemonade', color: '#FFF6B8', price: 80 },

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
      cheers: ['Purrfect!', 'Meow-velous!', 'So smart!'],
      comforts: ['No worries!', 'Keep going!', "You'll get it!"],
    },
  },
  {
    id: 'buddy-dino',
    category: 'companion',
    name: 'Dino',
    price: 150,
    companion: {
      emoji: '🦖',
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
      cheers: ['On fire!', 'Legendary!', 'Blazing fast!'],
      comforts: ['Even dragons miss!', 'Breathe and retry!', 'You got this!'],
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
