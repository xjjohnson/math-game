import { useCallback, useSyncExternalStore } from 'react';

import type { DragOffset, DragOffsets } from '@/utils/dragOffsets';

/** One piece's carried offset (null while it rests); only redraws when this piece's own offset changes. */
export function useDragOffset(store: DragOffsets, key: string): DragOffset | null {
  const subscribe = useCallback((fn: () => void) => store.subscribe(key, fn), [store, key]);
  const get = useCallback(() => store.get(key), [store, key]);
  return useSyncExternalStore(subscribe, get, get);
}
