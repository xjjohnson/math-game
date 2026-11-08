import type { PersistStorage, StorageValue } from 'zustand/middleware';

/** The parts of AsyncStorage (or localStorage) the safe storage needs. */
export interface RawStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

/** A copy of the saved data, made just before an update changed it. */
export interface Backup {
  key: string;
  /** The save's version when it was copied (0 when it couldn't be read at all). */
  fromVersion: number;
  savedAt: number;
}

export type LoadStatus = 'loading' | 'ok' | 'failed';

export interface SafeStorage<S> extends PersistStorage<S> {
  /** Call once loading worked: saving is switched off until then. */
  unlock(): void;
  /** Call when loading failed: saving stays off, so the saved data isn't written over. */
  fail(): void;
  status(): LoadStatus;
  subscribe(listener: () => void): () => void;
  /** Backups kept, newest first. */
  backups(): Promise<Backup[]>;
  /** Puts a backup back as the saved data. Load the store again afterwards. */
  restore(key: string): Promise<boolean>;
}

/** How many backups to keep (one per older version the data was upgraded from). */
export const KEEP_BACKUPS = 3;

/**
 * Storage for a persisted zustand store that never loses the saved data:
 *
 * - Before an app update upgrades the saved data to a new version, or when the
 *   saved data can't be read, the data is copied to a backup first.
 * - Nothing is saved until loading has finished and worked. Without this, a
 *   failed upgrade leaves the store empty and the next change saves that empty
 *   store over everyone's real data.
 */
export function createSafeStorage<S>(raw: RawStorage, name: string, version: number, now: () => number = Date.now): SafeStorage<S> {
  let status: LoadStatus = 'loading';
  const listeners = new Set<() => void>();
  const setStatus = (next: LoadStatus) => {
    status = next;
    listeners.forEach((l) => l());
  };
  const indexKey = `${name}.backups`;

  const readIndex = async (): Promise<Backup[]> => {
    try {
      const list: unknown = JSON.parse((await raw.getItem(indexKey)) ?? '[]');
      return Array.isArray(list) ? (list as Backup[]).filter((b) => b && typeof b.key === 'string') : [];
    } catch {
      return [];
    }
  };

  const backUp = async (text: string, fromVersion: number) => {
    const key = `${name}.backup.v${fromVersion}`;
    try {
      await raw.setItem(key, text);
      const kept = [{ key, fromVersion, savedAt: now() }, ...(await readIndex()).filter((b) => b.key !== key)];
      for (const old of kept.slice(KEEP_BACKUPS)) await raw.removeItem(old.key);
      await raw.setItem(indexKey, JSON.stringify(kept.slice(0, KEEP_BACKUPS)));
    } catch {
      // A full phone can't make the copy; still open the app rather than show nothing.
    }
  };

  return {
    async getItem(key) {
      const text = await raw.getItem(key);
      if (text === null) return null;
      let value: StorageValue<S>;
      try {
        value = JSON.parse(text) as StorageValue<S>;
      } catch (e) {
        await backUp(text, 0);
        throw e;
      }
      if (typeof value?.version === 'number' && value.version !== version) await backUp(text, value.version);
      return value;
    },
    async setItem(key, value) {
      if (status !== 'ok') return;
      await raw.setItem(key, JSON.stringify(value));
    },
    async removeItem(key) {
      if (status !== 'ok') return;
      await raw.removeItem(key);
    },
    unlock: () => setStatus('ok'),
    fail: () => setStatus('failed'),
    status: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async backups() {
      return (await readIndex()).sort((a, b) => b.savedAt - a.savedAt);
    },
    async restore(key) {
      if (!(await readIndex()).some((b) => b.key === key)) return false;
      const text = await raw.getItem(key);
      if (text === null) return false;
      await raw.setItem(name, text);
      // Loading starts over, and saving waits for it again.
      setStatus('loading');
      return true;
    },
  };
}
