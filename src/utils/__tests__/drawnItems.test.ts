import { DRAWN_IDS, hasDrawing } from '@/components/DrawnItem';
import { ROOM_ITEMS } from '@/constants/room';

describe('drawn room things', () => {
  it('only draws things the shop sells', () => {
    const ids = new Set(ROOM_ITEMS.map((i) => i.id));
    expect(DRAWN_IDS.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('knows which ones are drawn', () => {
    expect(hasDrawing('couch')).toBe(true);
    expect(hasDrawing('robot')).toBe(false);
    expect(hasDrawing(undefined)).toBe(false);
  });
});
