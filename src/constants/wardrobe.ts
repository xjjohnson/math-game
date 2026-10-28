/** Where on a buddy a piece of clothing goes. A buddy wears one thing in each. */
export type WearSlot = 'hat' | 'face' | 'neck' | 'shirt' | 'legs' | 'feet';

export const WEAR_SLOTS: { id: WearSlot; name: string; peopleOnly?: boolean }[] = [
  { id: 'shirt', name: '👕 Tops' },
  { id: 'legs', name: '👖 Bottoms', peopleOnly: true },
  { id: 'hat', name: '🎩 Hats' },
  { id: 'face', name: '👓 Glasses' },
  { id: 'neck', name: '🎀 Neck' },
  { id: 'feet', name: '👟 Shoes' },
];

/** How a top is cut: short sleeves, long sleeves, or a dress that reaches the knees. */
export type TopCut = 'tee' | 'sweater' | 'dress';
/** How bottoms are cut. */
export type LegsCut = 'pants' | 'shorts' | 'skirt' | 'tights';
export type Pattern = 'dots' | 'stripes' | 'flowers';

/** Clothes and accessories, bought once with coins and worn by any buddy. */
export interface Wearable {
  id: string;
  name: string;
  slot: WearSlot;
  /** Drawn on the buddy; shirts are drawn in `color` instead. */
  emoji: string;
  price: number;
  /** Tops and bottoms are drawn in this color. */
  color?: string;
  cut?: TopCut | LegsCut;
  pattern?: Pattern;
  /** Color of the pattern's spots, stripes or flowers. */
  patternColor?: string;
}

export const WEARABLES: Wearable[] = [
  { id: 'cap', name: 'Cap', slot: 'hat', emoji: '🧢', price: 15 },
  { id: 'sunhat', name: 'Sun hat', slot: 'hat', emoji: '👒', price: 20 },
  { id: 'tophat', name: 'Top hat', slot: 'hat', emoji: '🎩', price: 25 },
  { id: 'gradcap', name: 'Grad cap', slot: 'hat', emoji: '🎓', price: 25 },
  { id: 'crown', name: 'Crown', slot: 'hat', emoji: '👑', price: 40 },
  { id: 'glasses', name: 'Glasses', slot: 'face', emoji: '👓', price: 15 },
  { id: 'sunglasses', name: 'Sunglasses', slot: 'face', emoji: '🕶️', price: 20 },
  { id: 'goggles', name: 'Goggles', slot: 'face', emoji: '🥽', price: 20 },
  { id: 'bow', name: 'Bow', slot: 'neck', emoji: '🎀', price: 10 },
  { id: 'scarf', name: 'Scarf', slot: 'neck', emoji: '🧣', price: 15 },
  { id: 'beads', name: 'Necklace', slot: 'neck', emoji: '📿', price: 15 },
  { id: 'medal', name: 'Medal', slot: 'neck', emoji: '🏅', price: 20 },
  { id: 'shirtRed', name: 'Red shirt', slot: 'shirt', emoji: '👕', price: 10, color: '#E53935' },
  { id: 'shirtBlue', name: 'Blue shirt', slot: 'shirt', emoji: '👕', price: 10, color: '#1E88E5' },
  { id: 'shirtGreen', name: 'Green shirt', slot: 'shirt', emoji: '👕', price: 10, color: '#43A047' },
  { id: 'shirtYellow', name: 'Yellow shirt', slot: 'shirt', emoji: '👕', price: 10, color: '#FDD835' },
  { id: 'shirtPurple', name: 'Purple shirt', slot: 'shirt', emoji: '👕', price: 10, color: '#8E24AA' },
  { id: 'shirtPink', name: 'Pink shirt', slot: 'shirt', emoji: '👕', price: 10, color: '#F06292' },
  { id: 'stripedTee', name: 'Striped shirt', slot: 'shirt', emoji: '👕', price: 15, color: '#FFFFFF', pattern: 'stripes', patternColor: '#1E3A8A' },
  { id: 'dottyTee', name: 'Dotty shirt', slot: 'shirt', emoji: '👕', price: 15, color: '#FFD54F', pattern: 'dots', patternColor: '#FFFFFF' },
  { id: 'sweaterTan', name: 'Tan sweater', slot: 'shirt', emoji: '🧥', price: 15, color: '#D8C3A0', cut: 'sweater' },
  { id: 'sweaterPink', name: 'Pink sweater', slot: 'shirt', emoji: '🧥', price: 15, color: '#F8D7DD', cut: 'sweater' },
  { id: 'sweaterGreen', name: 'Green sweater', slot: 'shirt', emoji: '🧥', price: 15, color: '#2E7D32', cut: 'sweater', pattern: 'stripes', patternColor: '#C62828' },
  { id: 'hoodie', name: 'Gray hoodie', slot: 'shirt', emoji: '🧥', price: 15, color: '#9E9E9E', cut: 'sweater' },
  { id: 'dressFlowers', name: 'Flower dress', slot: 'shirt', emoji: '👗', price: 25, color: '#2B2626', cut: 'dress', pattern: 'flowers', patternColor: '#F3D9C4' },
  { id: 'dressBeige', name: 'Sweater dress', slot: 'shirt', emoji: '👗', price: 20, color: '#D9B6A3', cut: 'dress' },
  { id: 'dressPink', name: 'Pink dress', slot: 'shirt', emoji: '👗', price: 20, color: '#F8BBD0', cut: 'dress', pattern: 'dots', patternColor: '#FFFFFF' },
  { id: 'dressBlue', name: 'Blue dress', slot: 'shirt', emoji: '👗', price: 20, color: '#64B5F6', cut: 'dress' },
  { id: 'jeans', name: 'Jeans', slot: 'legs', emoji: '👖', price: 10, color: '#3F6AA8', cut: 'pants' },
  { id: 'blackPants', name: 'Black pants', slot: 'legs', emoji: '👖', price: 10, color: '#37383C', cut: 'pants' },
  { id: 'shorts', name: 'Shorts', slot: 'legs', emoji: '🩳', price: 10, color: '#C9B48A', cut: 'shorts' },
  { id: 'skirt', name: 'Pink skirt', slot: 'legs', emoji: '👗', price: 10, color: '#F48FB1', cut: 'skirt' },
  { id: 'whiteTights', name: 'White tights', slot: 'legs', emoji: '🧦', price: 10, color: '#F7F4F0', cut: 'tights' },
  { id: 'beigeTights', name: 'Beige tights', slot: 'legs', emoji: '🧦', price: 10, color: '#E6D2B5', cut: 'tights' },
  { id: 'sneakers', name: 'Sneakers', slot: 'feet', emoji: '👟', price: 15 },
  { id: 'boots', name: 'Boots', slot: 'feet', emoji: '🥾', price: 15 },
  { id: 'ballet', name: 'Ballet shoes', slot: 'feet', emoji: '🩰', price: 15 },
  { id: 'socks', name: 'Socks', slot: 'feet', emoji: '🧦', price: 10 },
];

export function findWearable(id: string): Wearable | undefined {
  return WEARABLES.find((w) => w.id === id);
}

/** Animal buddies' body colors, keyed by shop item id: fur and the lighter belly. */
export interface BodyColors {
  fur: string;
  belly: string;
}

export const BODY_COLORS: Record<string, BodyColors> = {
  'buddy-pup': { fur: '#D7A86E', belly: '#F3DDBF' },
  'buddy-kitty': { fur: '#F4B183', belly: '#FCE3CF' },
  'buddy-bunny': { fur: '#B0BEC5', belly: '#ECEFF1' },
  'buddy-panda': { fur: '#37474F', belly: '#FAFAFA' },
  'buddy-fox': { fur: '#F57C00', belly: '#FFE0B2' },
  'buddy-penguin': { fur: '#37474F', belly: '#FAFAFA' },
  'buddy-octopus': { fur: '#E57373', belly: '#FFCDD2' },
  'buddy-unicorn': { fur: '#F3E5F5', belly: '#FFFFFF' },
  'buddy-dino': { fur: '#81C784', belly: '#DCEDC8' },
  'buddy-dragon': { fur: '#4CAF50', belly: '#FFF59D' },
  'buddy-bluey': { fur: '#5C9BE0', belly: '#CFE3F7' },
  'buddy-stitch': { fur: '#4A7BD8', belly: '#BBD3F5' },
};

export const DEFAULT_BODY: BodyColors = { fur: '#C8A27C', belly: '#F1E3D3' };

/** A person buddy's looks, picked for free in Dress up. Numbers index the color lists below. */
export type HairStyle = 'short' | 'long' | 'wavy' | 'ponytail' | 'pigtails' | 'bun' | 'curly' | 'bald';

export interface PersonLook {
  skin: number;
  hair: HairStyle;
  hairColor: number;
  /** Beard color, or null for none. */
  beard: number | null;
  /** Grown-ups are 1; kids and babies are drawn smaller. */
  height: number;
}

export const SKIN_TONES = ['#FFE3D3', '#F7D2BC', '#EBB896', '#C99272', '#A0694A', '#6E4632'];
export const HAIR_COLORS = ['#2A221F', '#4A2F23', '#6E4A31', '#A57C55', '#E2C07C', '#B4532A', '#BDBDBD'];
export const HAIR_COLOR_NAMES = ['Black', 'Dark brown', 'Brown', 'Light brown', 'Blonde', 'Red', 'Gray'];

export const HAIR_STYLES: { id: HairStyle; name: string }[] = [
  { id: 'short', name: 'Short' },
  { id: 'long', name: 'Long' },
  { id: 'wavy', name: 'Wavy' },
  { id: 'ponytail', name: 'Ponytail' },
  { id: 'pigtails', name: 'Pigtails' },
  { id: 'bun', name: 'Bun' },
  { id: 'curly', name: 'Curly' },
  { id: 'bald', name: 'Bald' },
];

/** People buddies: how each one looks and what it wears until dressed differently. */
export const PEOPLE: Record<string, { look: PersonLook; outfit: Partial<Record<WearSlot, string>> }> = {
  'buddy-girl': {
    look: { skin: 1, hair: 'wavy', hairColor: 3, beard: null, height: 0.78 },
    outfit: { shirt: 'sweaterPink', legs: 'whiteTights' },
  },
  'buddy-boy': {
    look: { skin: 4, hair: 'short', hairColor: 0, beard: null, height: 0.82 },
    outfit: { shirt: 'stripedTee', legs: 'shorts' },
  },
  'buddy-kid': {
    look: { skin: 1, hair: 'ponytail', hairColor: 2, beard: null, height: 0.85 },
    outfit: { shirt: 'dressBeige', legs: 'beigeTights' },
  },
  'buddy-mom': {
    look: { skin: 1, hair: 'long', hairColor: 1, beard: null, height: 1 },
    outfit: { shirt: 'dressFlowers' },
  },
  'buddy-dad': {
    look: { skin: 1, hair: 'short', hairColor: 2, beard: 5, height: 1 },
    outfit: { shirt: 'sweaterTan', legs: 'jeans' },
  },
  'buddy-grandma': {
    look: { skin: 3, hair: 'bun', hairColor: 6, beard: null, height: 0.96 },
    outfit: { shirt: 'sweaterGreen', legs: 'skirt' },
  },
  'buddy-grandpa': {
    look: { skin: 0, hair: 'bald', hairColor: 6, beard: 6, height: 0.96 },
    outfit: { shirt: 'hoodie', legs: 'blackPants' },
  },
  'buddy-baby': {
    look: { skin: 5, hair: 'curly', hairColor: 0, beard: null, height: 0.62 },
    outfit: { shirt: 'dottyTee', legs: 'shorts' },
  },
};

export function isPerson(buddyId: string): boolean {
  return buddyId in PEOPLE;
}
