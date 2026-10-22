import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Offline storage shared by every persisted store (localStorage on web). */
export const persistStorage = createJSONStorage(() => AsyncStorage);
