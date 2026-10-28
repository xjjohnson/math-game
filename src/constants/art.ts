import type { ImageSourcePropType } from 'react-native';

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

/** An avatar or buddy as plain text: the emoji itself, or a drawing's stand-in. */
export function stickerText(value: string): string {
  return artFor(value)?.standIn ?? PERSON_STICKERS[value]?.standIn ?? value;
}
