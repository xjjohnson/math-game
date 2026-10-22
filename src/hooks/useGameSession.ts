import { useReducer } from 'react';

import type { GameConfig } from '@/types';
import { sessionReducer, startSession } from '@/utils/gameSession';

export function useGameSession(config: GameConfig) {
  return useReducer(sessionReducer, config, startSession);
}
