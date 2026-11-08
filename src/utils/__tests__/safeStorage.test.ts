import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createSafeStorage, KEEP_BACKUPS, type RawStorage } from '@/store/safeStorage';

/** An in-memory stand-in for the phone's storage. */
function memory(start: Record<string, string> = {}) {
  const data = new Map(Object.entries(start));
  const raw: RawStorage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  };
  return { data, raw };
}

interface Kids {
  kids: string[];
  add: (name: string) => void;
}

/** A small persisted store wired the same way as the profiles store. */
function makeStore(raw: RawStorage, version: number, migrate: (state: unknown, from: number) => unknown) {
  const storage = createSafeStorage<Kids>(raw, 'kids', version);
  const store = create<Kids>()(
    persist(
      (set) => ({ kids: [], add: (name) => set((s) => ({ kids: [...s.kids, name] })) }),
      {
        name: 'kids',
        version,
        storage,
        migrate: (s, from) => migrate(s, from) as Kids,
        onRehydrateStorage: () => (_s, error) => {
          if (error) storage.fail();
          else {
            storage.unlock();
            store.setState({});
          }
        },
      },
    ),
  );
  return { storage, store };
}

const saved = (kids: string[], version: number) => JSON.stringify({ state: { kids }, version });
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('safe storage for saved players', () => {
  it('backs up the old save before an update upgrades it, then saves the upgraded one', async () => {
    const { data, raw } = memory({ kids: saved(['Ava'], 1) });
    const { storage, store } = makeStore(raw, 2, (s) => s);
    await store.persist.rehydrate();
    await settle();
    expect(storage.status()).toBe('ok');
    expect(store.getState().kids).toEqual(['Ava']);
    expect(data.get('kids.backup.v1')).toBe(saved(['Ava'], 1));
    expect(JSON.parse(data.get('kids')!).version).toBe(2);
    expect((await storage.backups()).map((b) => b.fromVersion)).toEqual([1]);
  });

  it('never saves an empty store over the real save when the upgrade fails', async () => {
    const { data, raw } = memory({ kids: saved(['Ava', 'Ben'], 1) });
    const { storage, store } = makeStore(raw, 2, () => {
      throw new Error('bad upgrade');
    });
    await store.persist.rehydrate();
    await settle();
    expect(storage.status()).toBe('failed');
    expect(store.getState().kids).toEqual([]);
    // A kid makes a new player on the empty screen: it isn't saved over the real ones.
    store.getState().add('Cal');
    await settle();
    expect(data.get('kids')).toBe(saved(['Ava', 'Ben'], 1));
  });

  it('keeps a copy of a save that cannot be read and does not write over it', async () => {
    const { data, raw } = memory({ kids: '{not json' });
    const { storage, store } = makeStore(raw, 2, (s) => s);
    await store.persist.rehydrate();
    await settle();
    expect(storage.status()).toBe('failed');
    store.getState().add('Cal');
    await settle();
    expect(data.get('kids')).toBe('{not json');
    expect(data.get('kids.backup.v0')).toBe('{not json');
  });

  it('starts fresh and saves on a new phone', async () => {
    const { data, raw } = memory();
    const { storage, store } = makeStore(raw, 2, (s) => s);
    await store.persist.rehydrate();
    await settle();
    expect(storage.status()).toBe('ok');
    store.getState().add('Ava');
    await settle();
    expect(JSON.parse(data.get('kids')!).state.kids).toEqual(['Ava']);
    expect(await storage.backups()).toEqual([]);
  });

  it('restores a backup and loads it again', async () => {
    const { data, raw } = memory({ kids: saved(['Ava'], 1) });
    const first = makeStore(raw, 2, (s) => s);
    await first.store.persist.rehydrate();
    await settle();
    first.store.setState({ kids: [] });
    await settle();
    expect(JSON.parse(data.get('kids')!).state.kids).toEqual([]);
    const [backup] = await first.storage.backups();
    expect(await first.storage.restore(backup.key)).toBe(true);
    await first.store.persist.rehydrate();
    await settle();
    expect(first.store.getState().kids).toEqual(['Ava']);
    expect(first.storage.status()).toBe('ok');
    expect(await first.storage.restore('kids.something-else')).toBe(false);
  });

  it(`keeps only the newest ${KEEP_BACKUPS} backups`, async () => {
    const { data, raw } = memory();
    for (let v = 1; v <= KEEP_BACKUPS + 2; v++) {
      data.set('kids', saved(['Ava'], v));
      const { store } = makeStore(raw, v + 1, (s) => s);
      await store.persist.rehydrate();
      await settle();
    }
    const keys = [...data.keys()].filter((k) => k.startsWith('kids.backup.'));
    expect(keys).toHaveLength(KEEP_BACKUPS);
    expect(keys).not.toContain('kids.backup.v1');
  });
});
