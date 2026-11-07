/** Spots in a shared scene are fractions of its width and height (0 to 1), so every phone's screen size agrees. */
export interface Spot {
  x: number;
  y: number;
}

/** Keeps a token fully inside the scene. */
export function clampSpot(x: number, y: number, margin = 0.08): Spot {
  const c = (v: number, m: number) => Math.min(1 - m, Math.max(m, v));
  return { x: c(x, margin), y: c(y, margin) };
}

/** Where someone stands until they are moved: spread along the floor, in order. */
export function defaultSpot(index: number, count: number): Spot {
  return { x: (index + 1) / (count + 1), y: index % 2 === 0 ? 0.68 : 0.78 };
}

/** The spot for the person at `index` of `count`: where they were put, or the default. */
export function spotFor(saved: Spot | undefined, index: number, count: number): Spot {
  return saved ? clampSpot(saved.x, saved.y) : defaultSpot(index, count);
}
