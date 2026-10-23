/**
 * Which Android build this is. GitHub Actions sets it to the workflow's run
 * number when it builds the APK; it's 0 for the web and for local builds,
 * which never offer updates.
 */
export const BUILD_NUMBER = Number(process.env.EXPO_PUBLIC_BUILD_NUMBER) || 0;

/** Where the "Latest Android app" release keeps its files. */
export const RELEASE_URL = 'https://github.com/xjjohnson/math-game/releases/download/latest-apk';
