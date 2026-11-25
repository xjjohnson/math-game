import { DragOffsets } from '@/utils/dragOffsets';

describe('DragOffsets', () => {
  it('tells only the pieces whose offset changed', () => {
    const store = new DragOffsets();
    const a = jest.fn();
    const b = jest.fn();
    store.subscribe('a', a);
    store.subscribe('b', b);
    store.set({ a: { dx: 1, dy: 2 } });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    store.set({ a: { dx: 1, dy: 2 }, b: { dx: 5, dy: 5 } });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    store.set({ a: { dx: 3, dy: 2 } });
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
    expect(store.get('b')).toBeNull();
  });

  it('keeps the same offset object while the numbers stay the same', () => {
    const store = new DragOffsets();
    store.set({ a: { dx: 1, dy: 2 } });
    const first = store.get('a');
    store.set({ a: { dx: 1, dy: 2 } });
    expect(store.get('a')).toBe(first);
    store.set({ a: { dx: 2, dy: 2 } });
    expect(store.get('a')).not.toBe(first);
  });

  it('stops telling a piece once it unsubscribes, and names who is carried', () => {
    const store = new DragOffsets();
    const a = jest.fn();
    const stop = store.subscribe('a', a);
    stop();
    store.set({ b: { dx: 1, dy: 1 }, a: { dx: 1, dy: 1 } });
    expect(a).not.toHaveBeenCalled();
    expect(store.signature()).toBe('a\u0001b');
    store.set({});
    expect(store.signature()).toBe('');
  });
});
