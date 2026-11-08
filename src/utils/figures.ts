import type { Dressed } from '@/components/BuddyFigure';
import type { PersonDressed } from '@/components/PersonFigure';
import { PERSON_AVATARS } from '@/constants/art';
import { itemsIn } from '@/constants/shop';
import { BODY_COLORS, DEFAULT_BODY, PEOPLE, type BodyColors, type PersonLook } from '@/constants/wardrobe';
import type { Profile } from '@/types';
import { dressedOf, personOf } from '@/utils/homeVisit';
import { owns } from '@/utils/shop';
import { clothOf } from '@/utils/wardrobe';

/** How to draw an avatar or buddy with a whole body, the same way the buddy home does. */
export type FigureLook =
  | { kind: 'person'; look: PersonLook; dressed: PersonDressed }
  | { kind: 'animal'; emoji: string; fur: string; belly: string; dressed: Dressed };

/** The buddy (shop item id) an emoji or "@key" stands for, if it is one. */
export function buddyIdOf(value: string): string | undefined {
  return itemsIn('companion').find((item) => item.category === 'companion' && item.companion.emoji === value)?.id;
}

/**
 * The body for an avatar or buddy value. Buddies the player owns are drawn exactly as they
 * are at home (their colors, clothes and looks from `profile`); a friend's buddy (no profile)
 * gets its own colors and starting clothes. People avatars are drawn as people. Any other
 * emoji avatar gets a body in `fallback` colors.
 */
export function figureFor(value: string, profile?: Profile | null, fallback: BodyColors = DEFAULT_BODY): FigureLook {
  const avatar = PERSON_AVATARS[value];
  if (avatar) {
    const { shirt, legs, ...rest } = avatar.outfit;
    return { kind: 'person', look: avatar.look, dressed: { ...rest, top: clothOf(shirt), legs: clothOf(legs) } };
  }
  const id = buddyIdOf(value);
  if (!id) return { kind: 'animal', emoji: value, ...fallback, dressed: {} };
  const item = itemsIn('companion').find((i) => i.id === id);
  const mine = !!profile && !!item && owns(profile, item);
  const start = PEOPLE[id];
  if (start) {
    const person = mine ? personOf(profile, id) : undefined;
    if (person) return { kind: 'person', ...person };
    const { shirt, legs, ...rest } = start.outfit;
    return { kind: 'person', look: start.look, dressed: { ...rest, top: clothOf(shirt), legs: clothOf(legs) } };
  }
  const body = BODY_COLORS[id] ?? DEFAULT_BODY;
  return { kind: 'animal', emoji: value, ...body, dressed: mine ? dressedOf(profile, id) : {} };
}
