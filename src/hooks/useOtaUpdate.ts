import * as Updates from 'expo-updates';
import { useCallback } from 'react';

export interface OtaUpdate {
  /** A newer update finished downloading and shows after a restart. */
  ready: boolean;
  /** Short name for the update this app is running, or null for the one built into the APK. */
  runningId: string | null;
  restart: () => void;
}

/**
 * Over-the-air updates: the app checks Expo at launch and quietly downloads
 * new screens and fixes. Off on the web and in local builds.
 */
function useNativeOtaUpdate(): OtaUpdate {
  const { isUpdatePending, currentlyRunning } = Updates.useUpdates();
  const restart = useCallback(() => {
    Updates.reloadAsync().catch(() => {});
  }, []);
  return {
    ready: isUpdatePending,
    runningId: currentlyRunning.isEmbeddedLaunch ? null : (currentlyRunning.updateId?.slice(0, 8) ?? null),
    restart,
  };
}

const off: OtaUpdate = { ready: false, runningId: null, restart: () => {} };

// Chosen once at startup, so the hooks inside always run the same way.
export const useOtaUpdate: () => OtaUpdate = Updates.isEnabled ? useNativeOtaUpdate : () => off;
