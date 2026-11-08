import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/store/storage';
import { savePicture, type Picture, type SavedPicture } from '@/utils/easel';

export type { SavedPicture } from '@/utils/easel';

interface PaintingsState {
  /** Each player's pictures, newest first, by profile id. */
  byProfile: Record<string, SavedPicture[]>;
  /** Saves a picture (over `id` when it was opened from My pictures) and returns its id, and any older picture that made room. */
  save: (profileId: string, picture: Picture, id?: string, hung?: ReadonlySet<string>) => { id: string; dropped: string | null };
  remove: (profileId: string, id: string) => void;
  /** A player was deleted. */
  forget: (profileId: string) => void;
}

let count = 0;
const newPictureId = () => `${Date.now().toString(36)}${(count++).toString(36)}`;

/** Pictures saved from the easel. Kept apart from the profiles, so a big picture can never get in the way of saving progress. */
export const usePaintings = create<PaintingsState>()(
  persist(
    (set, get) => ({
      byProfile: {},
      save: (profileId, picture, id, hung) => {
        const pictureId = id ?? newPictureId();
        const { list, dropped } = savePicture(get().byProfile[profileId] ?? [], picture, pictureId, Date.now(), hung);
        set((s) => ({ byProfile: { ...s.byProfile, [profileId]: list } }));
        return { id: pictureId, dropped };
      },
      remove: (profileId, id) =>
        set((s) => ({ byProfile: { ...s.byProfile, [profileId]: (s.byProfile[profileId] ?? []).filter((p) => p.id !== id) } })),
      forget: (profileId) =>
        set((s) => {
          const { [profileId]: _gone, ...rest } = s.byProfile;
          return { byProfile: rest };
        }),
    }),
    { name: 'math-game.paintings', version: 1, storage: persistStorage, partialize: (s) => ({ byProfile: s.byProfile }) as PaintingsState },
  ),
);

const NONE: SavedPicture[] = [];

export function usePictures(profileId: string | undefined): SavedPicture[] {
  return usePaintings((s) => (profileId ? (s.byProfile[profileId] ?? NONE) : NONE));
}
