import {
  advance,
  edgeLength,
  LINKS,
  nearestRoad,
  pickExit,
  placeOf,
  planRoute,
  ROUNDABOUT,
  turnAround,
  turnKind,
  turnPath,
  turnRoom,
  type CarPos,
} from '@/utils/roads';

describe('roads', () => {
  it('every crossing has at least two ways out', () => {
    for (const links of Object.values(LINKS)) expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it('tells left from right on screen', () => {
    // Driving east (right) along the top road, turning down (south) at the middle crossing is a right turn.
    expect(turnKind('nw', 'n', 'c')).toBe(1);
    expect(turnKind('ne', 'n', 'c')).toBe(-1);
    expect(turnKind('nw', 'n', 'ne')).toBe(0);
  });

  it('steers the way the driver turns the wheel, or straight on', () => {
    expect(pickExit('w', 'c', 0)).toBe('e');
    expect(pickExit('w', 'c', 1)).toBe('s');
    expect(pickExit('w', 'c', -1)).toBe('n');
    // A corner only goes one way, whatever the wheel says.
    expect(pickExit('n', 'nw', 1)).toBe('w');
    expect(pickExit('n', 'nw', -1)).toBe('w');
  });

  it('drives in the right-hand lane', () => {
    const east = placeOf({ kind: 'road', from: 'w', to: 'c', d: 200 });
    expect(east.pt.y).toBeGreaterThan(600);
    const west = placeOf({ kind: 'road', from: 'c', to: 'w', d: 200 });
    expect(west.pt.y).toBeLessThan(600);
  });

  it('goes round the fountain, never through it', () => {
    for (const prev of ['n', 'w', 's', 'e'])
      for (const next of ['n', 'w', 's', 'e']) {
        if (prev === next) continue;
        for (const p of turnPath(prev, 'c', next).pts) {
          expect(Math.hypot(p.x - ROUNDABOUT.x, p.y - ROUNDABOUT.y)).toBeGreaterThan(ROUNDABOUT.island + 5);
        }
      }
  });

  it('moves smoothly from road to turn to road', () => {
    let pos: CarPos = { kind: 'road', from: 'nw', to: 'n', d: 100 };
    let last = placeOf(pos).pt;
    for (let i = 0; i < 400; i++) {
      pos = advance(pos, 5, (prev, node) => pickExit(prev, node, 1));
      const now = placeOf(pos).pt;
      expect(Math.hypot(now.x - last.x, now.y - last.y)).toBeLessThan(12);
      last = now;
    }
  });

  it('turns round on the spot', () => {
    const back = turnAround({ kind: 'road', from: 'w', to: 'c', d: 200 });
    expect(back).toMatchObject({ kind: 'road', from: 'c', to: 'w' });
  });

  it('finds the road nearest a tap', () => {
    const r = nearestRoad({ x: 500, y: 625 });
    expect([r.from, r.to].sort()).toEqual(['c', 'w']);
    expect(r.gap).toBeLessThan(30);
  });

  it('plans a drive that arrives where asked', () => {
    const start = { kind: 'road', from: 'w', to: 'c', d: 100 } as CarPos;
    const goal = { from: 'nw', to: 'n', d: 300 };
    const plan = planRoute(start, goal);
    expect(plan.via.length).toBeGreaterThan(0);
    let pos: CarPos = start;
    let i = 0;
    for (let steps = 0; steps < 2000; steps++) {
      if (pos.kind === 'road' && pos.from === goal.from && pos.to === goal.to && pos.d >= goal.d - 4) break;
      pos = advance(pos, 4, (prev, node) => {
        const k = plan.via.indexOf(node, i);
        if (k >= 0) {
          i = k + 1;
          return plan.via[k + 1] ?? goal.to;
        }
        return pickExit(prev, node, 0);
      });
    }
    expect(pos).toMatchObject({ kind: 'road', from: 'nw', to: 'n' });
  });

  it('a goal just ahead needs no turns', () => {
    const plan = planRoute({ kind: 'road', from: 'w', to: 'c', d: 100 }, { from: 'w', to: 'c', d: 300 });
    expect(plan).toEqual({ via: [], length: 200 });
  });

  it('a goal just behind goes round the block', () => {
    const plan = planRoute({ kind: 'road', from: 'w', to: 'c', d: 300 }, { from: 'w', to: 'c', d: 100 });
    expect(plan.via.length).toBeGreaterThan(2);
    expect(plan.length).toBeGreaterThan(edgeLength('w', 'c'));
    expect(turnRoom('c')).toBeGreaterThan(turnRoom('w'));
  });
});
