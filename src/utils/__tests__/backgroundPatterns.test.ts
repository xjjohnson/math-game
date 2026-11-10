import { BACKGROUND_PATTERNS } from '@/constants/patterns';
import { SHOP_ITEMS } from '@/constants/shop';

describe('drawn background patterns', () => {
  it('covers every themed background that has emoji decor', () => {
    const themed = SHOP_ITEMS.filter((i) => i.category === 'background' && 'decor' in i && i.decor?.length).map((i) => i.id);
    expect(themed.filter((id) => !BACKGROUND_PATTERNS[id])).toEqual([]);
  });
});
