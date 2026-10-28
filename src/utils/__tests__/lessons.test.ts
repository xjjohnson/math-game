import { LESSONS, longDivisionSteps } from '@/utils/lessons';
import { createRng } from '@/utils/seededRandom';

describe('lessons', () => {
  it('have unique ids', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  it('build sensible steps for many examples', () => {
    for (const lesson of LESSONS) {
      for (let seed = 0; seed < 200; seed++) {
        const steps = lesson.build(createRng(seed));
        expect(steps.length).toBeGreaterThanOrEqual(3);
        for (const step of steps) {
          expect(step.text).not.toMatch(/NaN|undefined|Infinity/);
          expect(JSON.stringify(step.visual ?? {})).not.toMatch(/NaN|undefined|null/);
          const v = step.visual;
          if (v?.kind === 'numberLine') {
            expect(v.max - v.min).toBeLessThanOrEqual(20);
            const end = v.hops.reduce((at, h) => at + h, v.start);
            expect(end).toBeGreaterThanOrEqual(v.min);
            expect(end).toBeLessThanOrEqual(v.max);
          }
          if (v?.kind === 'tenFrames') v.frames.forEach((f) => expect(f).toBeLessThanOrEqual(10));
        }
      }
    }
  });

  it('ends every example on a true equation', () => {
    for (const lesson of LESSONS) {
      for (let seed = 0; seed < 200; seed++) {
        for (const step of lesson.build(createRng(seed))) {
          if (step.visual?.kind !== 'big') continue;
          const match = step.visual.text.match(/^(\d+) ([+−×÷]) (\d+) = (\d+)$/);
          if (!match) continue;
          const [, a, sym, b, ans] = match;
          const [x, y, z] = [Number(a), Number(b), Number(ans)];
          const expected = { '+': x + y, '−': x - y, '×': x * y, '÷': x / y }[sym];
          expect(z).toBe(expected);
        }
      }
    }
  });
});

describe('longDivisionSteps', () => {
  it('writes the quotient on top, digit by digit', () => {
    const steps = longDivisionSteps(156, 4);
    const last = steps.at(-2)!.visual;
    expect(last?.kind).toBe('work');
    if (last?.kind !== 'work') return;
    expect(last.lines[0].text.trim()).toBe('3 9');
    expect(last.lines[2].text).toBe('4 │1 5 6');
    expect(last.lines.at(-1)!.text.trim()).toBe('0');
    expect(steps.at(-1)!.visual).toEqual({ kind: 'big', text: '156 ÷ 4 = 39' });
  });

  it('keeps a zero in the middle of the answer', () => {
    const work = longDivisionSteps(728, 7).at(-2)!.visual;
    expect(work?.kind === 'work' && work.lines[0].text.trim()).toBe('1 0 4');
  });
});
