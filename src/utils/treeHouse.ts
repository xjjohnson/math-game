import type { Profile } from '@/types';

/** Coins in the tree house treasure chest, once a day for each player. */
export const TREE_HOUSE_COINS = 10;

/** Whether today's tree house coins are still in the chest. */
export const treeHouseCoinsReady = (profile: Pick<Profile, 'treeHouseCoinsDay'>, today: string): boolean =>
  profile.treeHouseCoinsDay !== today;

/** Takes today's coins out of the chest: TREE_HOUSE_COINS the first time each day, then 0 until tomorrow. */
export function claimTreeHouseCoins(profile: Profile, today: string): { profile: Profile; coins: number } {
  if (!treeHouseCoinsReady(profile, today)) return { profile, coins: 0 };
  return {
    profile: { ...profile, coins: profile.coins + TREE_HOUSE_COINS, treeHouseCoinsDay: today },
    coins: TREE_HOUSE_COINS,
  };
}
