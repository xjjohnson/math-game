import {
  DEFAULT_EQUIPPED,
  findItem,
  type CardStyle,
  type Companion,
  type ShopItem,
} from '@/constants/shop';
import { AVATARS, colors } from '@/constants/theme';
import type { Profile } from '@/types';

export type BuyResult =
  | { ok: true; profile: Profile; newBadges: string[] }
  | { ok: false; reason: 'unknown' | 'owned' | 'coins' };

export function owns(profile: Profile, item: ShopItem): boolean {
  return item.price === 0 || profile.unlocks.includes(item.id);
}

export function isEquipped(profile: Profile, item: ShopItem): boolean {
  switch (item.category) {
    case 'avatar':
      return profile.avatar === item.emoji;
    case 'background':
      return profile.equipped.background === item.id;
    case 'cardStyle':
      return profile.equipped.cardStyle === item.id;
    case 'companion':
      return profile.equipped.companion === item.id;
  }
}

/** Avatars a player can always switch to for free: their first pick, then the defaults. */
export function freeAvatars(profile: Profile): string[] {
  return [...new Set([profile.startAvatar, ...AVATARS])];
}

/** Spends coins on an item, then equips it right away. */
export function buyItem(profile: Profile, itemId: string): BuyResult {
  const item = findItem(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (owns(profile, item)) return { ok: false, reason: 'owned' };
  if (profile.coins < item.price) return { ok: false, reason: 'coins' };

  const bought: Profile = {
    ...profile,
    coins: profile.coins - item.price,
    unlocks: [...profile.unlocks, item.id],
  };
  const firstPurchase = !profile.badges.includes('shopper');
  return {
    ok: true,
    profile: {
      ...equipItem(bought, item.id),
      badges: firstPurchase ? [...profile.badges, 'shopper'] : profile.badges,
    },
    newBadges: firstPurchase ? ['shopper'] : [],
  };
}

/** Puts an owned item to use. Equipping the companion in use takes it off. */
export function equipItem(profile: Profile, itemId: string): Profile {
  const item = findItem(itemId);
  if (!item || !owns(profile, item)) return profile;
  switch (item.category) {
    case 'avatar':
      return { ...profile, avatar: item.emoji };
    case 'background':
      return { ...profile, equipped: { ...profile.equipped, background: item.id } };
    case 'cardStyle':
      return { ...profile, equipped: { ...profile.equipped, cardStyle: item.id } };
    case 'companion':
      return {
        ...profile,
        equipped: {
          ...profile.equipped,
          companion: profile.equipped.companion === item.id ? null : item.id,
        },
      };
  }
}

/** Background color for a profile, falling back to the free default. */
export function backgroundColor(profile: Profile | undefined): string {
  const item = findItem(profile?.equipped.background ?? DEFAULT_EQUIPPED.background);
  return item?.category === 'background' ? item.color : colors.background;
}

/** Faint pictures for a themed background; empty for plain colors. */
export function backgroundDecor(profile: Profile | undefined): string[] {
  const item = findItem(profile?.equipped.background);
  return item?.category === 'background' ? (item.decor ?? []) : [];
}

export function cardStyleFor(profile: Profile | undefined): CardStyle | undefined {
  const item = findItem(profile?.equipped.cardStyle);
  return item?.category === 'cardStyle' ? item.style : undefined;
}

export function companionFor(profile: Profile | undefined): Companion | undefined {
  const item = findItem(profile?.equipped.companion);
  return item?.category === 'companion' ? item.companion : undefined;
}
