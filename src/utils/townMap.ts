/** The town map's size, in map points, and the camera math for moving and zooming it. */

export const MAP_W = 1600;
export const MAP_H = 1200;
/** How far in a pinch can zoom (map points to screen points). */
export const MAX_ZOOM = 1.8;

/** Where the map sits on screen: its top left corner (screen points) and how big it is drawn. */
export interface Camera {
  x: number;
  y: number;
  scale: number;
}

/** The smallest zoom that still fills the whole view, so no edge of the world shows. */
export function coverScale(viewW: number, viewH: number): number {
  return Math.max(viewW / MAP_W, viewH / MAP_H);
}

/** Keeps the camera inside the map: zoom between filling the view and MAX_ZOOM, and no gaps at the edges. */
export function clampCamera(c: Camera, viewW: number, viewH: number): Camera {
  const scale = Math.min(Math.max(coverScale(viewW, viewH), MAX_ZOOM), Math.max(coverScale(viewW, viewH), c.scale));
  const minX = Math.min(0, viewW - MAP_W * scale);
  const minY = Math.min(0, viewH - MAP_H * scale);
  return {
    scale,
    x: Math.min(0, Math.max(minX, c.x)),
    y: Math.min(0, Math.max(minY, c.y)),
  };
}

type Point = { x: number; y: number };

/**
 * The camera after two fingers moved from `from` to `to`: zoomed by how far apart they spread, and
 * moved so the spot of the map between the fingers stays between them. One finger is the same with
 * both points equal (just a move).
 */
export function pinchCamera(start: Camera, from: [Point, Point], to: [Point, Point]): Camera {
  const d0 = Math.hypot(from[1].x - from[0].x, from[1].y - from[0].y);
  const d1 = Math.hypot(to[1].x - to[0].x, to[1].y - to[0].y);
  const scale = d0 > 0 ? start.scale * (d1 / d0) : start.scale;
  const m0 = { x: (from[0].x + from[1].x) / 2, y: (from[0].y + from[1].y) / 2 };
  const m1 = { x: (to[0].x + to[1].x) / 2, y: (to[0].y + to[1].y) / 2 };
  // The map spot under the fingers' middle at the start...
  const wx = (m0.x - start.x) / start.scale;
  const wy = (m0.y - start.y) / start.scale;
  // ...stays under their middle now.
  return { scale, x: m1.x - wx * scale, y: m1.y - wy * scale };
}
