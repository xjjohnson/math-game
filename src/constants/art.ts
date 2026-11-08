import type { ImageSourcePropType } from 'react-native';

import type { PersonLook, WearSlot } from '@/constants/wardrobe';

/**
 * Drawn pictures for characters no emoji covers. Avatars and buddies store
 * these as "@key" (short enough for the multiplayer hello message) in the
 * same place an emoji would go.
 */
interface Art {
  source: ImageSourcePropType;
  /** Emoji used where only text fits, like a player's name in a list. */
  standIn: string;
}

export const ART: Record<string, Art> = {
  '@bluey': { source: require('../../assets/art/bluey.png'), standIn: '🐶' },
  '@stitch': { source: require('../../assets/art/stitch.png'), standIn: '👽' },
  '@mickey': { source: require('../../assets/art/mickey.png'), standIn: '🐭' },
  '@minnie': { source: require('../../assets/art/minnie.png'), standIn: '🎀' },
  '@olaf': { source: require('../../assets/art/olaf.png'), standIn: '⛄' },
  '@pooh': { source: require('../../assets/art/pooh.png'), standIn: '🐻' },
  '@simba': { source: require('../../assets/art/simba.png'), standIn: '🦁' },
  '@nemo': { source: require('../../assets/art/nemo.png'), standIn: '🐠' },
  // Toys and decorations
  '@stitch-ukulele': { source: require('../../assets/art/stitch-ukulele.png'), standIn: '🎸' },
  '@stitch-ship': { source: require('../../assets/art/stitch-ship.png'), standIn: '🛸' },
  '@stitch-surfboard': { source: require('../../assets/art/stitch-surfboard.png'), standIn: '🏄' },
  '@hibiscus': { source: require('../../assets/art/hibiscus.png'), standIn: '🌺' },
  '@bingo': { source: require('../../assets/art/bingo.png'), standIn: '🐶' },
  '@keepy-uppy': { source: require('../../assets/art/keepy-uppy.png'), standIn: '🎈' },
  '@magic-xylophone': { source: require('../../assets/art/magic-xylophone.png'), standIn: '🎶' },
  '@heeler-sign': { source: require('../../assets/art/heeler-sign.png'), standIn: '🏠' },
  '@pawprint': { source: require('../../assets/art/pawprint.png'), standIn: '🐾' },
};

export function artFor(value: string): Art | undefined {
  return value.startsWith('@') ? ART[value] : undefined;
}

/**
 * People buddies, drawn from their starting look and clothes (see PEOPLE in
 * constants/wardrobe), stored as "@key" like the drawings above.
 */
export const PERSON_STICKERS: Record<string, { buddyId: string; standIn: string }> = {
  '@girl': { buddyId: 'buddy-girl', standIn: '👧🏻' },
  '@boy': { buddyId: 'buddy-boy', standIn: '👦🏾' },
  '@kid': { buddyId: 'buddy-kid', standIn: '👧🏼' },
  '@mom': { buddyId: 'buddy-mom', standIn: '👩🏻' },
  '@dad': { buddyId: 'buddy-dad', standIn: '🧔🏻' },
  '@grandma': { buddyId: 'buddy-grandma', standIn: '👵🏽' },
  '@grandpa': { buddyId: 'buddy-grandpa', standIn: '👴🏻' },
  '@baby': { buddyId: 'buddy-baby', standIn: '👶🏾' },
};

/**
 * Free human avatars: every skin tone, hair and age, boys and girls. Drawn like
 * the people buddies, but kept apart from PEOPLE since they aren't buddies.
 * Keys stay within 8 characters for the multiplayer hello message.
 */
export interface PersonAvatar {
  name: string;
  look: PersonLook;
  outfit: Partial<Record<WearSlot, string>>;
  standIn: string;
}

export const PERSON_AVATARS: Record<string, PersonAvatar> = {
  '@p-ava': {
    name: 'Ava',
    look: { skin: 0, hair: 'pigtails', hairColor: 4, beard: null, height: 0.85 },
    outfit: { shirt: 'dressPink', legs: 'whiteTights' },
    standIn: '👧🏻',
  },
  '@p-leo': {
    name: 'Leo',
    look: { skin: 1, hair: 'short', hairColor: 2, beard: null, height: 0.85 },
    outfit: { shirt: 'shirtBlue', legs: 'jeans' },
    standIn: '👦🏻',
  },
  '@p-mia': {
    name: 'Mia',
    look: { skin: 2, hair: 'ponytail', hairColor: 1, beard: null, height: 0.85 },
    outfit: { shirt: 'shirtPurple', legs: 'skirt' },
    standIn: '👧🏽',
  },
  '@p-sam': {
    name: 'Sam',
    look: { skin: 2, hair: 'curly', hairColor: 5, beard: null, height: 0.85 },
    outfit: { shirt: 'stripedTee', legs: 'shorts' },
    standIn: '👦🏽',
  },
  '@p-zoe': {
    name: 'Zoe',
    look: { skin: 3, hair: 'bun', hairColor: 0, beard: null, height: 0.85 },
    outfit: { shirt: 'shirtYellow', legs: 'jeans' },
    standIn: '👧🏾',
  },
  '@p-max': {
    name: 'Max',
    look: { skin: 4, hair: 'short', hairColor: 0, beard: null, height: 0.85 },
    outfit: { shirt: 'shirtGreen', legs: 'blackPants' },
    standIn: '👦🏾',
  },
  '@p-nia': {
    name: 'Nia',
    look: { skin: 5, hair: 'curly', hairColor: 0, beard: null, height: 0.85 },
    outfit: { shirt: 'dressBlue', legs: 'beigeTights' },
    standIn: '👧🏿',
  },
  '@p-jay': {
    name: 'Jay',
    look: { skin: 5, hair: 'bald', hairColor: 0, beard: null, height: 0.85 },
    outfit: { shirt: 'hoodie', legs: 'shorts' },
    standIn: '👦🏿',
  },
  '@p-ivy': {
    name: 'Ivy',
    look: { skin: 1, hair: 'long', hairColor: 5, beard: null, height: 0.92 },
    outfit: { shirt: 'sweaterGreen', legs: 'jeans' },
    standIn: '🧑🏼',
  },
  '@p-ben': {
    name: 'Ben',
    look: { skin: 3, hair: 'wavy', hairColor: 3, beard: null, height: 0.92 },
    outfit: { shirt: 'hoodie', legs: 'jeans' },
    standIn: '🧑🏽',
  },
  '@p-rosa': {
    name: 'Rosa',
    look: { skin: 3, hair: 'long', hairColor: 0, beard: null, height: 1 },
    outfit: { shirt: 'dressFlowers' },
    standIn: '👩🏽',
  },
  '@p-omar': {
    name: 'Omar',
    look: { skin: 4, hair: 'short', hairColor: 0, beard: 0, height: 1 },
    outfit: { shirt: 'sweaterTan', legs: 'blackPants' },
    standIn: '🧔🏾',
  },
};

/** An avatar or buddy as plain text: the emoji itself, or a drawing's stand-in. */
export function stickerText(value: string): string {
  return artFor(value)?.standIn ?? PERSON_STICKERS[value]?.standIn ?? PERSON_AVATARS[value]?.standIn ?? value;
}
