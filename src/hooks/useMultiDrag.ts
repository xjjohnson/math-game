import { useEffect, useRef, useState } from 'react';
import type { GestureResponderEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from 'react-native';

/**
 * Several fingers at once on a side-scrolling room: each finger carries its own buddy, and a
 * buddy held near the side of the screen scrolls the room that way. The room's own scroller is
 * switched off while anyone is held, and told not to take the touch over.
 *
 * Positions are in the room's (scrolled) points. The hook only reports where held buddies are;
 * the caller keeps where they were put down.
 */

export interface DragItem {
  id: string;
  /** Where it is drawn, in the room's points. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Where it stands (the point it is dragged from). */
  spot: { x: number; y: number };
}

interface Args {
  items: DragItem[];
  roomW: number;
  viewW: number;
  scroller: React.RefObject<ScrollViewInstance | null>;
  /** A buddy was picked up; return where it really starts from (e.g. climbing out of a bag). */
  onPick?: (id: string) => { x: number; y: number } | void;
  /** A buddy was let go: tapped (not moved) or dropped at `spot`. */
  onLetGo: (id: string, moved: boolean, spot: { x: number; y: number }) => void;
}

interface Track {
  id: string;
  from: { x: number; y: number };
  startX: number;
  startY: number;
  startScroll: number;
  pageX: number;
  pageY: number;
  moved: boolean;
}

const TAP_SLOP = 6;
const EDGE = 40;
/** Points per millisecond while holding someone at the side of the screen. */
const EDGE_SPEED = 0.6;

export function useMultiDrag(args: Args) {
  const latest = useRef(args);
  latest.current = args;
  const frameRef = useRef<{ measure: (cb: (x: number, y: number, w: number, h: number, px: number, py: number) => void) => void } | null>(null);
  const frame = useRef({ x: 0, y: 0 });
  const scrollX = useRef(0);
  const tracks = useRef(new Map<number, Track>());
  const edgeFrame = useRef<number | null>(null);
  const edgeLast = useRef(0);
  const showFrame = useRef<number | null>(null);
  const [dragAt, setDragAt] = useState<Record<string, { x: number; y: number }>>({});
  const [holding, setHolding] = useState(false);

  useEffect(
    () => () => {
      if (edgeFrame.current !== null) cancelAnimationFrame(edgeFrame.current);
      if (showFrame.current !== null) cancelAnimationFrame(showFrame.current);
    },
    [],
  );

  const measure = () =>
    frameRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      frame.current = { x: pageX ?? 0, y: pageY ?? 0 };
    });

  const spotOf = (t: Track) => ({
    x: t.from.x + (t.pageX - t.startX) + (scrollX.current - t.startScroll),
    y: t.from.y + (t.pageY - t.startY),
  });

  const showNow = () => {
    showFrame.current = null;
    const next: Record<string, { x: number; y: number }> = {};
    for (const t of tracks.current.values()) if (t.moved) next[t.id] = spotOf(t);
    setDragAt(next);
    setHolding(tracks.current.size > 0);
  };
  /** Redraw at most once per frame, however many touch events came in. */
  const show = (now = false) => {
    if (now) {
      if (showFrame.current !== null) cancelAnimationFrame(showFrame.current);
      return showNow();
    }
    if (showFrame.current === null) showFrame.current = requestAnimationFrame(showNow);
  };

  const stopEdge = () => {
    if (edgeFrame.current !== null) cancelAnimationFrame(edgeFrame.current);
    edgeFrame.current = null;
  };
  const edgeDir = () => {
    for (const t of tracks.current.values()) {
      if (!t.moved) continue;
      const x = t.pageX - frame.current.x;
      if (x < EDGE) return -1;
      if (x > latest.current.viewW - EDGE) return 1;
    }
    return 0;
  };
  const scrollBy = (dx: number) => {
    const { roomW, viewW, scroller } = latest.current;
    const to = Math.min(Math.max(0, roomW - viewW), Math.max(0, scrollX.current + dx));
    if (to === scrollX.current) return;
    scrollX.current = to;
    scroller.current?.scrollTo({ x: to, animated: false });
  };

  const hit = (pageX: number, pageY: number): DragItem | null => {
    const x = pageX - frame.current.x + scrollX.current;
    const y = pageY - frame.current.y;
    const held = new Set([...tracks.current.values()].map((t) => t.id));
    // Later items are drawn in front.
    const items = latest.current.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (held.has(it.id)) continue;
      if (x >= it.left && x <= it.left + it.width && y >= it.top && y <= it.top + it.height) return it;
    }
    return null;
  };

  const start = (id: number, pageX: number, pageY: number) => {
    if (tracks.current.has(id)) return;
    const it = hit(pageX, pageY);
    if (!it) return;
    const from = latest.current.onPick?.(it.id) ?? it.spot;
    tracks.current.set(id, { id: it.id, from, startX: pageX, startY: pageY, startScroll: scrollX.current, pageX, pageY, moved: false });
    show(true);
  };

  const moveTouches = (touches: readonly { identifier: number | string; pageX: number; pageY: number }[]) => {
    let changed = false;
    for (const touch of touches) {
      const t = tracks.current.get(Number(touch.identifier));
      if (!t) continue;
      t.pageX = touch.pageX;
      t.pageY = touch.pageY;
      if (!t.moved && Math.abs(t.pageX - t.startX) < TAP_SLOP && Math.abs(t.pageY - t.startY) < TAP_SLOP) continue;
      t.moved = true;
      changed = true;
    }
    if (!changed) return;
    show();
    if (edgeFrame.current === null && edgeDir() !== 0) {
      edgeLast.current = Date.now();
      const tick = () => {
        const dir = edgeDir();
        if (dir === 0 || tracks.current.size === 0) return stopEdge();
        const now = Date.now();
        // Time-based, so a slow frame doesn't make the room crawl.
        const dt = Math.min(64, now - edgeLast.current);
        edgeLast.current = now;
        scrollBy(dir * EDGE_SPEED * dt);
        show();
        edgeFrame.current = requestAnimationFrame(tick);
      };
      edgeFrame.current = requestAnimationFrame(tick);
    }
  };

  const end = (id: number) => {
    const t = tracks.current.get(id);
    if (!t) return;
    const spot = spotOf(t);
    tracks.current.delete(id);
    if (tracks.current.size === 0) stopEdge();
    latest.current.onLetGo(t.id, t.moved, t.moved ? spot : t.from);
    show(true);
  };

  const touchesOf = (e: GestureResponderEvent) => (e.nativeEvent.changedTouches?.length ? e.nativeEvent.changedTouches : [e.nativeEvent]);

  const handlers = {
    onStartShouldSetResponder: (e: GestureResponderEvent) => hit(e.nativeEvent.pageX, e.nativeEvent.pageY) !== null,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      measure();
      start(Number(e.nativeEvent.identifier), e.nativeEvent.pageX, e.nativeEvent.pageY);
      // Tell Android's scroller not to take this touch over.
      return true;
    },
    onResponderStart: (e: GestureResponderEvent) => touchesOf(e).forEach((t) => start(Number(t.identifier), t.pageX, t.pageY)),
    onResponderMove: (e: GestureResponderEvent) => moveTouches(e.nativeEvent.touches?.length ? e.nativeEvent.touches : [e.nativeEvent]),
    onResponderEnd: (e: GestureResponderEvent) => touchesOf(e).forEach((t) => end(Number(t.identifier))),
    onResponderRelease: () => [...tracks.current.keys()].forEach(end),
    onResponderTerminate: () => [...tracks.current.keys()].forEach(end),
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // While fingers are down we drive the scroll ourselves; a late event would jump it back.
    if (tracks.current.size > 0) return;
    scrollX.current = e.nativeEvent.contentOffset.x;
  };

  return { frameRef, measure, handlers, dragAt, holding, onScroll };
}
