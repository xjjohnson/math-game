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

/** Fur colors for buddy bodies, keyed by shop item id; belly is the lighter middle. */
export const BODY_COLORS: Record<string, { fur: string; belly: string }> = {
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

export const DEFAULT_BODY = { fur: '#C8A27C', belly: '#F1E3D3' };
