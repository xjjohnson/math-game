import { DIFFICULTIES, OPERATIONS } from '@/constants/difficulty';
import type { Difficulty } from '@/types';
import { buildProblem, generate } from '@/utils/mathEngine';
import { countingModel, tapItem } from '@/utils/countingAid';
import { createRng } from '@/utils/seededRandom';

const rng = createRng(1);
const counted = (items: { value: number; crossed?: boolean }[]) =>
  items.filter((i) => !i.crossed).reduce((sum, i) => sum + i.value, 0);

describe('countingModel', () => {
  it('adds small numbers with one dot each', () => {
    const model = countingModel(buildProblem('add', 7, 5, 12, rng))!;
    expect(model.groups.map((g) => g.items.length)).toEqual([7, 5]);
  });

  it('crosses out what subtraction takes away', () => {
    const model = countingModel(buildProblem('subtract', 9, 4, 5, rng))!;
    const items = model.groups[0].items;
    expect(items).toHaveLength(9);
    expect(items.filter((i) => i.crossed)).toHaveLength(4);
  });

  it('draws times as rows and division as equal groups', () => {
    const times = countingModel(buildProblem('multiply', 3, 4, 12, rng))!;
    expect(times.groups.map((g) => g.items.length)).toEqual([4, 4, 4]);
    const share = countingModel(buildProblem('divide', 12, 3, 4, rng))!;
    expect(share.groups.map((g) => g.items.length)).toEqual([4, 4, 4]);
  });

  it('uses hundreds, tens and ones blocks for big additions', () => {
    const model = countingModel(buildProblem('add', 234, 58, 292, rng))!;
    expect(model.groups[0].items.map((i) => i.shape)).toEqual([
      'hundred', 'hundred', 'ten', 'ten', 'ten', 'dot', 'dot', 'dot', 'dot',
    ]);
  });

  it('always counts up to the answer when it has a picture', () => {
    for (const difficulty of Object.keys(DIFFICULTIES) as Difficulty[]) {
      for (const { value: op } of OPERATIONS) {
        for (let seed = 0; seed < 300; seed++) {
          const problem = generate(op, difficulty, createRng(seed));
          const model = countingModel(problem);
          if (!model) continue;
          const items = model.groups.flatMap((g) => g.items);
          // Division counts one group; everything else counts the whole picture.
          const total = op === 'divide' ? counted(model.groups[0].items) : counted(items);
          expect(total).toBe(problem.answer);
        }
      }
    }
  });

  it('has a picture for every Easy problem', () => {
    for (const { value: op } of OPERATIONS) {
      for (let seed = 0; seed < 200; seed++) {
        expect(countingModel(generate(op, 'easy', createRng(seed)))).not.toBeNull();
      }
    }
  });

  it('skips numbers too big to count', () => {
    expect(countingModel(buildProblem('multiply', 345, 6, 2070, rng))).toBeNull();
    expect(countingModel(buildProblem('subtract', 45, 12, 33, rng))).toBeNull();
    expect(countingModel(buildProblem('subtract', 120, 450, -330, rng))).toBeNull();
  });
});

describe('tapItem', () => {
  it('counts in tap order and untaps only the last one', () => {
    let order = tapItem([], 3);
    order = tapItem(order, 1);
    expect(order).toEqual([3, 1]);
    expect(tapItem(order, 3)).toEqual([3, 1]);
    expect(tapItem(order, 1)).toEqual([3]);
  });
});
