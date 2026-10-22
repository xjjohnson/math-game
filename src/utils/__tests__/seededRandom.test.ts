import { createRng, randInt, shuffle } from '@/utils/seededRandom';

describe('seededRandom', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('returns floats in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('randInt covers the whole inclusive range', () => {
    const rng = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(randInt(rng, 1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('shuffle keeps every item and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(createRng(5), input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(input);
  });
});
