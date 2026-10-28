/** Where on a buddy a piece of clothing goes. A buddy wears one thing in each. */
export type WearSlot = 'hat' | 'face' | 'neck' | 'shirt' | 'feet';

export const WEAR_SLOTS: { id: WearSlot; name: string }[] = [
  { id: 'hat', name: '🎩 Hats' },
  { id: 'face', name: '👓 Glasses' },
  { id: 'neck', name: '🎀 Neck' },
  { id: 'shirt', name: '👕 Shirts' },
  { id: 'feet', name: '👟 Shoes' },
];

/** Clothes and accessories, bought once with coins and worn by any buddy. */
export interface Wearable {
  id: string;
  name: string;
  slot: WearSlot;
  /** Drawn on the buddy; shirts are drawn in `color` instead. */
  emoji: string;
  price: number;
  color?: string;
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
  { id: 'sneakers', name: 'Sneakers', slot: 'feet', emoji: '👟', price: 15 },
  { id: 'boots', name: 'Boots', slot: 'feet', emoji: '🥾', price: 15 },
  { id: 'ballet', name: 'Ballet shoes', slot: 'feet', emoji: '🩰', price: 15 },
  { id: 'socks', name: 'Socks', slot: 'feet', emoji: '🧦', price: 10 },
];

export function findWearable(id: string): Wearable | undefined {
  return WEARABLES.find((w) => w.id === id);
}

/**
 * Body colors, keyed by shop item id: fur (skin for people) and the lighter belly. People
 * also come with everyday clothes, shown when nothing from Dress up is on instead.
 */
export interface BodyColors {
  fur: string;
  belly: string;
  shirt?: string;
  shoes?: string;
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
  'buddy-girl': { fur: '#F9D5C0', belly: '#F9D5C0', shirt: '#EC407A', shoes: '#5D4037' },
  'buddy-boy': { fur: '#A1694A', belly: '#A1694A', shirt: '#26A69A', shoes: '#37474F' },
  'buddy-kid': { fur: '#C68E6A', belly: '#C68E6A', shirt: '#FFB300', shoes: '#1565C0' },
  'buddy-mom': { fur: '#F1C9A5', belly: '#F1C9A5', shirt: '#7E57C2', shoes: '#4E342E' },
  'buddy-dad': { fur: '#6D4532', belly: '#6D4532', shirt: '#1976D2', shoes: '#212121' },
  'buddy-grandma': { fur: '#C68E6A', belly: '#C68E6A', shirt: '#AD1457', shoes: '#4E342E' },
  'buddy-grandpa': { fur: '#F9D5C0', belly: '#F9D5C0', shirt: '#558B2F', shoes: '#3E2723' },
  'buddy-baby': { fur: '#8D5A3B', belly: '#8D5A3B', shirt: '#FFF59D', shoes: '#FFFFFF' },
};

export const DEFAULT_BODY: BodyColors = { fur: '#C8A27C', belly: '#F1E3D3' };
