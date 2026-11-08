import { useSyncExternalStore } from 'react';

import type { ChalkStroke } from '@/utils/multiplayer/protocol';

/** Most lines kept on the board; the oldest ones fade away first. */
export const MAX_STROKES = 250;

/**
 * What is drawn on the school chalkboard, kept while the app is open so the
 * board is still there after doing the school job. On a visit, every phone's
 * board follows the host's (see the community session).
 */
export class Chalkboard {
  private strokes: ChalkStroke[] = [];
  private readonly listeners = new Set<() => void>();

  getStrokes = () => this.strokes;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private changed() {
    this.listeners.forEach((l) => l());
  }

  /** Adds a line, or replaces it when it has grown longer. */
  put(stroke: ChalkStroke) {
    const i = this.strokes.findIndex((s) => s.id === stroke.id);
    const next = i >= 0 ? this.strokes.map((s, n) => (n === i ? stroke : s)) : [...this.strokes, stroke];
    this.strokes = next.length > MAX_STROKES ? next.slice(next.length - MAX_STROKES) : next;
    this.changed();
  }

  wipe() {
    if (!this.strokes.length) return;
    this.strokes = [];
    this.changed();
  }
}

let shared: Chalkboard | null = null;

export function chalkboard(): Chalkboard {
  return (shared ??= new Chalkboard());
}

export function useChalkStrokes(): ChalkStroke[] {
  const b = chalkboard();
  return useSyncExternalStore(b.subscribe, b.getStrokes, b.getStrokes);
}

let count = 0;
const prefix = Math.random().toString(36).slice(2, 7);
/** A line id no other phone will use. */
export const newStrokeId = (): string => `${prefix}${(count++).toString(36)}`;
