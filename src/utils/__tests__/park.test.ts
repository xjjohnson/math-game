import { FLOOR, PARK } from '@/utils/multiplayer/placeProps';
import { BRANCHES, CHUTE, inPond, LADDER_FOOT, offGround, parkLanding, rideAt, SLIDE_OFF, slidePath, SWING_SEAT_Y, swingX } from '@/utils/park';

describe('park playground', () => {
  it('sits someone dropped by a swing on its seat', () => {
    const l = parkLanding({ x: swingX(1) + 0.01, y: 0.4 });
    expect(l.spot).toEqual({ x: swingX(1), y: SWING_SEAT_Y });
    expect(rideAt(l.spot)).toEqual({ kind: 'swing', seat: 1 });
    expect(offGround(l.spot)).toBe(true);
  });

  it('does not put two on one swing', () => {
    const l = parkLanding({ x: swingX(0), y: 0.4 }, [0]);
    expect(rideAt(l.spot)?.kind).not.toBe('swing');
  });

  it('sends someone dropped at the slide up the ladder and down the chute', () => {
    const l = parkLanding({ x: PARK.slide.x0 + 0.06, y: 0.45 });
    expect(l.slide).toBe(true);
    expect(l.spot).toEqual(LADDER_FOOT);
    const path = slidePath();
    expect(path[path.length - 1]).toEqual(SLIDE_OFF);
    const kinds = path.slice(0, -1).map((s) => rideAt(s)?.kind);
    expect(kinds).toContain('ladder');
    expect(kinds).toContain('slide');
    // Every step but the last is up off the ground, so no phone pulls it back to the floor.
    expect(path.slice(0, -1).every(offGround)).toBe(true);
    expect(offGround(SLIDE_OFF)).toBe(false);
    // The chute ends on the grass.
    expect(path[path.length - 2]).toEqual({ x: CHUTE.x1, y: FLOOR });
  });

  it('sits someone dropped in the tree on a branch', () => {
    const l = parkLanding({ x: PARK.tree.x + 0.02, y: BRANCHES[0].y - 0.03 });
    expect(l.spot.y).toBe(BRANCHES[0].y);
    expect(rideAt(l.spot)?.kind).toBe('branch');
  });

  it('lets someone swim in the pond and stand on the grass', () => {
    const p = PARK.pond;
    const middle = { x: (p.x0 + p.x1) / 2, y: (p.y0 + p.y1) / 2 };
    expect(inPond(middle)).toBe(true);
    expect(rideAt(parkLanding(middle).spot)?.kind).toBe('swim');
    const grass = parkLanding({ x: 0.5, y: 0.3 });
    expect(grass.spot.y).toBeCloseTo(FLOOR + 0.04);
    expect(rideAt({ x: 0.5, y: 0.9 })).toBeNull();
  });
});
