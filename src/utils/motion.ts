/** Pure numbers behind the moves in components/Motion.tsx, kept here so they can be tested. */

/**
 * How far a held figure swings out when the finger moves `moveX` points sideways: it trails behind
 * (moving right swings the feet left), more for a quick flick, never past 28 degrees.
 */
export function dangleTilt(moveX: number): number {
  return Math.max(-28, Math.min(28, moveX * 1.4));
}

/** How long a drop of `far` points takes: quicker than walking, like falling, 0.18s to 0.6s. */
export function fallMs(far: number): number {
  return Math.round(Math.min(600, Math.max(180, Math.sqrt(far) * 30)));
}
