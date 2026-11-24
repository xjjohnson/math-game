import { makeProfile } from '@/test/fixtures';
import { claimTreeHouseCoins, TREE_HOUSE_COINS, treeHouseCoinsReady } from '@/utils/treeHouse';

describe('tree house chest coins', () => {
  const start = makeProfile({ coins: 5 });

  it('gives coins the first time each day, then none until tomorrow', () => {
    expect(treeHouseCoinsReady(start, '2026-11-24')).toBe(true);
    const first = claimTreeHouseCoins(start, '2026-11-24');
    expect(first.coins).toBe(TREE_HOUSE_COINS);
    expect(first.profile.coins).toBe(5 + TREE_HOUSE_COINS);
    expect(treeHouseCoinsReady(first.profile, '2026-11-24')).toBe(false);

    const again = claimTreeHouseCoins(first.profile, '2026-11-24');
    expect(again.coins).toBe(0);
    expect(again.profile).toBe(first.profile);

    const tomorrow = claimTreeHouseCoins(first.profile, '2026-11-25');
    expect(tomorrow.coins).toBe(TREE_HOUSE_COINS);
    expect(tomorrow.profile.coins).toBe(5 + 2 * TREE_HOUSE_COINS);
  });
});
