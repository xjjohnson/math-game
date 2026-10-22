import { useEffect, useRef, useState } from 'react';

/**
 * Countdown for one question. Restarts whenever `resetKey` changes, stops while
 * `running` is false, and calls `onExpire` once when it reaches zero.
 * Returns null when there is no time limit.
 */
export function useTimer(
  seconds: number | null,
  running: boolean,
  resetKey: unknown,
  onExpire: () => void,
): number | null {
  const [left, setLeft] = useState(seconds);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    setLeft(seconds);
  }, [seconds, resetKey]);

  useEffect(() => {
    if (seconds === null || !running) return;
    const endsAt = Date.now() + seconds * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(0, (endsAt - Date.now()) / 1000);
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        expire.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [seconds, running, resetKey]);

  return left;
}
