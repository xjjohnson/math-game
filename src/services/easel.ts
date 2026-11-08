import { useSyncExternalStore } from 'react';

import { putAction, type NumberLevel, type PaintAction, type Picture } from '@/utils/easel';

/**
 * What is on the School easel, kept while the app is open. On a visit, every
 * phone's easel follows the host's (see the community session), so friends
 * paint the same picture together.
 */
export class EaselBoard {
  private picture: Picture = { page: 'blank', lv: null, actions: [] };
  private readonly listeners = new Set<() => void>();

  getPicture = () => this.picture;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private changed(next: Picture) {
    this.picture = next;
    this.listeners.forEach((l) => l());
  }

  /** Adds actions, or replaces brush lines that have grown. */
  put(actions: PaintAction[]) {
    if (!actions.length) return;
    let list = this.picture.actions;
    for (const a of actions) list = putAction(list, a);
    this.changed({ ...this.picture, actions: list });
  }

  /** Takes one action back. */
  remove(id: string) {
    if (!this.picture.actions.some((a) => a.id === id)) return;
    this.changed({ ...this.picture, actions: this.picture.actions.filter((a) => a.id !== id) });
  }

  /** A fresh sheet: blank paper or a coloring page. */
  reset(page: string, lv: NumberLevel | null) {
    this.changed({ page, lv, actions: [] });
  }
}

let shared: EaselBoard | null = null;

export function easelBoard(): EaselBoard {
  return (shared ??= new EaselBoard());
}

export function useEaselPicture(): Picture {
  const b = easelBoard();
  return useSyncExternalStore(b.subscribe, b.getPicture, b.getPicture);
}
