import type { Problem } from '@/types';
import { columnLayout, entryValue, pressKey, selectBox, startEntry, type ColumnEntry } from '@/utils/columnEntry';
import { startTeach, teachDone, teachKey, teachSteps } from '@/utils/columnTeach';

const problem = (operation: Problem['operation'], a: number, b: number, answer: number) =>
  ({ operation, a, b, answer, prompt: '', choices: [] }) as unknown as Problem;

const type = (entry: ColumnEntry, keys: string) => [...keys].reduce((e, k) => pressKey(e, k), entry);

describe('column layout', () => {
  it('leaves room for a carry in addition and every digit of a product', () => {
    expect(columnLayout(problem('add', 27, 36, 63))).toEqual({
      width: 3,
      a: [null, '2', '7'],
      b: [null, '3', '6'],
    });
    expect(columnLayout(problem('subtract', 72, 12, 60)).width).toBe(2);
    expect(columnLayout(problem('multiply', 23, 45, 1035)).width).toBe(4);
    expect(columnLayout(problem('multiply', 12, 3, 36)).width).toBe(3);
  });
});

describe('column entry', () => {
  it('starts at the ones and works right to left', () => {
    const e = type(startEntry(3), '36');
    expect(e.digits).toEqual([null, '6', '3']);
    expect(entryValue(e)).toBe(63);
    expect(e.cursor).toEqual({ row: 'answer', col: 0 });
  });

  it('27 + 36: write 3, carry the 1, then write 6', () => {
    let e = type(startEntry(3), '3');
    e = selectBox(e, 'carry', 1);
    e = pressKey(e, '1');
    expect(e.carries).toEqual([null, '1', null]);
    // Back to the tens answer box after the carry.
    expect(e.cursor).toEqual({ row: 'answer', col: 1 });
    e = pressKey(e, '6');
    expect(entryValue(e)).toBe(63);
  });

  it('any box can be picked and changed', () => {
    let e = type(startEntry(2), '48');
    e = pressKey(selectBox(e, 'answer', 1), '5');
    expect(entryValue(e)).toBe(85);
  });

  it('is not a number while there is a gap or nothing in the ones', () => {
    expect(entryValue(startEntry(3))).toBeNull();
    const tensOnly = pressKey(selectBox(startEntry(3), 'answer', 1), '4');
    expect(entryValue(tensOnly)).toBeNull();
  });

  it('backspace clears the box, then steps back right', () => {
    // Typed ones first: 1 in the ones, 2 in the tens; the cursor waits on the empty hundreds.
    let e = type(startEntry(3), '12');
    expect(e.digits).toEqual([null, '2', '1']);
    e = pressKey(e, '⌫');
    expect(e.digits).toEqual([null, null, '1']);
    expect(e.cursor.col).toBe(1);
    // On a filled box, backspace just clears it.
    e = pressKey(selectBox(e, 'answer', 2), '⌫');
    expect(e.digits).toEqual([null, null, null]);
    expect(e.cursor.col).toBe(2);
  });

  it('minus only where negative answers are allowed', () => {
    const e = type(startEntry(2), '5');
    expect(entryValue(pressKey(e, '±'))).toBe(5);
    expect(entryValue(pressKey(e, '±', true))).toBe(-5);
  });
});

describe('show my work', () => {
  const run = (p: Problem, keys: string[]) => {
    const steps = teachSteps(p)!;
    let s = startTeach(p, steps);
    for (const k of keys) s = [...k].reduce((st, key) => teachKey(st, steps, key), s);
    return { s, steps };
  };

  it('27 + 36: 7 + 6 = 13, write 3 and carry the 1, then 2 + 3 + 1 = 6', () => {
    const p = problem('add', 27, 36, 63);
    const steps = teachSteps(p)!;
    expect(steps.map((x) => x.question)).toEqual(['7 + 6', '2 + 3 + 1 carried']);
    const { s } = run(p, ['13']);
    expect(s.entry.digits).toEqual([null, null, '3']);
    expect(s.entry.carries).toEqual([null, '1', null]);
    const done = run(p, ['13', '6']).s;
    expect(teachDone(done, steps)).toBe(true);
    expect(entryValue(done.entry)).toBe(63);
  });

  it('brings a final carry down: 75 + 48 = 123', () => {
    const p = problem('add', 75, 48, 123);
    expect(teachSteps(p)!.map((x) => x.question)).toEqual(['5 + 8', '7 + 4 + 1 carried', '1 carried']);
    expect(entryValue(run(p, ['13', '12', '1']).s.entry)).toBe(123);
  });

  it('a wrong column total clears and asks again', () => {
    const p = problem('add', 27, 36, 63);
    const steps = teachSteps(p)!;
    let s = startTeach(p, steps);
    s = teachKey(s, steps, '1');
    expect(s.typed).toBe('1');
    s = teachKey(s, steps, '2');
    expect(s).toMatchObject({ typed: '', missed: true, step: 0 });
  });

  it('72 − 48: borrows from the tens', () => {
    const p = problem('subtract', 72, 48, 24);
    const steps = teachSteps(p)!;
    expect(steps.map((x) => x.question)).toEqual(['12 − 8', '6 − 4']);
    expect(steps[0].tip).toMatch(/borrow 1 from the tens/);
    const { s } = run(p, ['4', '2']);
    expect(s.entry.carries).toEqual(['6', '12']);
    expect(entryValue(s.entry)).toBe(24);
  });

  it('borrows across a zero: 300 − 7', () => {
    const p = problem('subtract', 300, 7, 293);
    expect(teachSteps(p)!.map((x) => x.question)).toEqual(['10 − 7', '9 − 0', '2 − 0']);
  });

  it('multiplies with carries: 47 × 3', () => {
    const p = problem('multiply', 47, 3, 141);
    expect(teachSteps(p)!.map((x) => x.question)).toEqual(['7 × 3', '4 × 3 + 2 carried', '1 carried']);
    expect(entryValue(run(p, ['21', '14', '1']).s.entry)).toBe(141);
  });

  it('skips problems with no column method', () => {
    expect(teachSteps(problem('subtract', 120, 450, -330))).toBeNull();
    expect(teachSteps(problem('multiply', 23, 45, 1035))).toBeNull();
  });
});
