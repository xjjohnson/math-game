import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { townSession } from '@/services/townSession';
import type { TownPlace } from '@/utils/multiplayer/protocol';

/** Tells visiting friends this player is at `place` while the screen is showing. */
export function usePlace(place: TownPlace | null) {
  useFocusEffect(
    useCallback(() => {
      if (!place) return;
      townSession().setPlace(place);
      return () => townSession().clearPlace(place);
    }, [place]),
  );
}
