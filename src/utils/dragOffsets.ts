/** How far a piece being carried has moved from where it rests, in pixels. */
export interface DragOffset {
  dx: number;
  dy: number;
}

/**
 * Where every carried piece is right now, kept outside React so that moving a finger only
 * redraws the pieces being carried (each one listens for its own key), not the whole room.
 * A piece's offset object stays the same until its numbers change, so listeners can compare it.
 */
export class DragOffsets {
  private map = new Map<string, DragOffset>();
  private listeners = new Map<string, Set<() => void>>();

  get = (key: string): DragOffset | null => this.map.get(key) ?? null;

  /** Calls `fn` whenever this key's offset appears, changes or goes away. Returns how to stop. */
  subscribe = (key: string, fn: () => void): (() => void) => {
    let set = this.listeners.get(key);
    if (!set) this.listeners.set(key, (set = new Set()));
    set.add(fn);
    return () => {
      set.delete(fn);
      if (!set.size) this.listeners.delete(key);
    };
  };

  /** Replaces every offset; only the keys whose numbers changed (or came or went) are told. */
  set(next: Readonly<Record<string, DragOffset>>): void {
    const old = this.map;
    const map = new Map<string, DragOffset>();
    const changed: string[] = [];
    for (const [key, o] of Object.entries(next)) {
      const before = old.get(key);
      if (before && before.dx === o.dx && before.dy === o.dy) map.set(key, before);
      else {
        map.set(key, { dx: o.dx, dy: o.dy });
        changed.push(key);
      }
    }
    for (const key of old.keys()) if (!map.has(key)) changed.push(key);
    this.map = map;
    for (const key of changed) this.listeners.get(key)?.forEach((fn) => fn());
  }

  /** The carried keys, in a fixed order, as one string, to tell when the set of carried pieces changes. */
  signature(): string {
    return [...this.map.keys()].sort().join('\u0001');
  }
}
