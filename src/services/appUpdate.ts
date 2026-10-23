import { File, Paths } from 'expo-file-system';
import { startActivityAsync } from 'expo-intent-launcher';
import { Platform } from 'react-native';

import { BUILD_NUMBER, RELEASE_URL } from '@/constants/build';
import { isNewer, parseVersion } from '@/utils/appVersion';

/** Android's flag that lets the installer read our downloaded file. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const APK_TYPE = 'application/vnd.android.package-archive';

/** Updating only makes sense in a real Android build from GitHub Actions. */
export const canUpdate = Platform.OS === 'android' && BUILD_NUMBER > 0;

/** The newest build on the release page, or null if it can't be reached. */
export async function latestBuild(): Promise<number | null> {
  try {
    // The query string skips any cached copy so a new release shows up right away.
    const res = await fetch(`${RELEASE_URL}/version.json?t=${Date.now()}`);
    return res.ok ? parseVersion(await res.json()) : null;
  } catch {
    return null;
  }
}

/** The newer build number if there is one, else null. */
export async function checkForUpdate(): Promise<number | null> {
  if (!canUpdate) return null;
  const latest = await latestBuild();
  return isNewer(latest, BUILD_NUMBER) ? latest : null;
}

/**
 * Downloads the new APK and opens Android's installer on it. The first time,
 * Android asks to allow Math Game to install apps; after that it's one tap.
 */
export async function downloadAndInstall(): Promise<void> {
  const apk = new File(Paths.cache, 'math-game-update.apk');
  if (apk.exists) apk.delete();
  const file = await File.downloadFileAsync(`${RELEASE_URL}/math-game.apk`, apk);
  await startActivityAsync('android.intent.action.VIEW', {
    data: file.contentUri,
    type: APK_TYPE,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}
