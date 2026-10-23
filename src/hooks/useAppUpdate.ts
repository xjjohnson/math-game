import { useCallback, useEffect, useState } from 'react';

import { canUpdate, checkForUpdate, downloadAndInstall } from '@/services/appUpdate';

export type UpdateStatus = 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'error';

// One check per app launch is plenty; screens that mount later reuse it.
let launchCheck: Promise<number | null> | null = null;

/** Looks for a newer APK once per launch and offers to install it. */
export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [latest, setLatest] = useState<number | null>(null);

  const run = useCallback(async (check: Promise<number | null>) => {
    setStatus('checking');
    const found = await check;
    setLatest(found);
    setStatus(found ? 'available' : 'none');
  }, []);

  useEffect(() => {
    if (!canUpdate) return;
    launchCheck ??= checkForUpdate();
    run(launchCheck);
  }, [run]);

  const checkAgain = useCallback(() => {
    launchCheck = checkForUpdate();
    return run(launchCheck);
  }, [run]);

  const install = useCallback(async () => {
    setStatus('downloading');
    try {
      await downloadAndInstall();
      setStatus('available');
    } catch {
      setStatus('error');
    }
  }, []);

  return { canUpdate, status, latest, checkAgain, install };
}
