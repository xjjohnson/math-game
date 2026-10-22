// Adds the Android permissions Nearby Connections needs, each limited to the
// Android versions that use it, so newer phones aren't asked for location.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

/** [permission, maxSdkVersion or null, extra attributes] */
const PERMISSIONS = [
  ['android.permission.BLUETOOTH', 30],
  ['android.permission.BLUETOOTH_ADMIN', 30],
  ['android.permission.ACCESS_WIFI_STATE', null],
  ['android.permission.CHANGE_WIFI_STATE', null],
  ['android.permission.ACCESS_COARSE_LOCATION', 32],
  ['android.permission.ACCESS_FINE_LOCATION', 32],
  ['android.permission.BLUETOOTH_SCAN', null],
  ['android.permission.BLUETOOTH_ADVERTISE', null],
  ['android.permission.BLUETOOTH_CONNECT', null],
  ['android.permission.NEARBY_WIFI_DEVICES', null, { 'android:usesPermissionFlags': 'neverForLocation' }],
];

module.exports = function withMathNearby(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    AndroidConfig.Manifest.ensureToolsAvailable(mod.modResults);
    const existing = manifest['uses-permission'] ?? [];
    const names = new Set(PERMISSIONS.map(([name]) => name));
    manifest['uses-permission'] = [
      ...existing.filter((p) => !names.has(p.$['android:name'])),
      ...PERMISSIONS.map(([name, maxSdk, extra]) => ({
        $: {
          'android:name': name,
          ...(maxSdk ? { 'android:maxSdkVersion': String(maxSdk) } : {}),
          ...extra,
        },
      })),
    ];
    return mod;
  });
};
