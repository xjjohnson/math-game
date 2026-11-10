import { clampCamera, coverScale, MAP_H, MAP_W, MAX_ZOOM, pinchCamera } from '@/utils/townMap';

describe('town map camera', () => {
  it('cover scale fills the whole view', () => {
    const s = coverScale(400, 800);
    expect(MAP_W * s).toBeGreaterThanOrEqual(400);
    expect(MAP_H * s).toBeGreaterThanOrEqual(800);
  });

  it('never zooms out past the edges or in past the max', () => {
    expect(clampCamera({ x: 0, y: 0, scale: 0.01 }, 400, 800).scale).toBeCloseTo(coverScale(400, 800));
    expect(clampCamera({ x: 0, y: 0, scale: 9 }, 400, 800).scale).toBe(MAX_ZOOM);
  });

  it('keeps the map edges off screen', () => {
    const c = clampCamera({ x: 500, y: -99999, scale: 1 }, 400, 800);
    expect(c.x).toBe(0);
    expect(c.y).toBe(800 - MAP_H);
  });

  it('one finger just moves the map', () => {
    const c = pinchCamera({ x: -100, y: -50, scale: 1 }, [{ x: 10, y: 10 }, { x: 10, y: 10 }], [{ x: 40, y: 30 }, { x: 40, y: 30 }]);
    expect(c).toEqual({ x: -70, y: -30, scale: 1 });
  });

  it('pinching keeps the spot between the fingers under them', () => {
    const start = { x: -200, y: -100, scale: 1 };
    const c = pinchCamera(start, [{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 50, y: 100 }, { x: 250, y: 100 }]);
    expect(c.scale).toBe(2);
    // map spot under the middle (150,100) at the start was (350,200); it should still be at (150,100)
    expect(c.x + 350 * c.scale).toBeCloseTo(150);
    expect(c.y + 200 * c.scale).toBeCloseTo(100);
  });
});
