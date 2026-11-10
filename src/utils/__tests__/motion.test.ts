import { dangleTilt, fallMs } from '@/utils/motion';

describe('picking up and dropping', () => {
  it('swings a held figure out behind the finger, more for a quick flick, but not too far', () => {
    expect(dangleTilt(0)).toBe(0);
    expect(dangleTilt(5)).toBeGreaterThan(0);
    expect(dangleTilt(-5)).toBeLessThan(0);
    expect(dangleTilt(15)).toBeGreaterThan(dangleTilt(5));
    expect(dangleTilt(500)).toBe(28);
    expect(dangleTilt(-500)).toBe(-28);
  });

  it('drops quicker than it walks, but never in a blink', () => {
    // A walk of 400 points takes 0.88s; a drop that far is well under that.
    expect(fallMs(400)).toBeLessThan(880);
    expect(fallMs(1)).toBe(180);
    expect(fallMs(10000)).toBe(600);
    expect(fallMs(300)).toBeGreaterThan(fallMs(50));
  });
});
