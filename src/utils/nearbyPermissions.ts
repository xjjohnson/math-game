import { PermissionsAndroid, Platform, type Permission } from 'react-native';

export interface NearbyPermission {
  permission: Permission;
  /** What the parent sees on the permission screen. */
  label: string;
}

const BLUETOOTH: NearbyPermission[] = [
  { permission: 'android.permission.BLUETOOTH_SCAN', label: 'Find nearby phones (Bluetooth)' },
  { permission: 'android.permission.BLUETOOTH_ADVERTISE', label: 'Let nearby phones find this one' },
  { permission: 'android.permission.BLUETOOTH_CONNECT', label: 'Connect to nearby phones' },
];

/**
 * The runtime permissions Nearby Connections needs on a given Android API level.
 * Android 12 (31) split Bluetooth into its own permissions and Android 13 (33)
 * added nearby Wi-Fi. Nearby still checks for location on every version.
 */
export function nearbyPermissions(apiLevel: number): NearbyPermission[] {
  const list: NearbyPermission[] = [];
  if (apiLevel >= 31) list.push(...BLUETOOTH);
  if (apiLevel >= 33) {
    list.push({ permission: 'android.permission.NEARBY_WIFI_DEVICES', label: 'Connect over nearby Wi-Fi' });
  }
  list.push({
    permission: apiLevel >= 29 ? 'android.permission.ACCESS_FINE_LOCATION' : 'android.permission.ACCESS_COARSE_LOCATION',
    label: 'Location (Android needs it to find nearby phones)',
  });
  return list;
}

export type PermissionStatus = 'granted' | 'denied' | 'blocked';

/** This phone's list, or nothing on the web where Nearby isn't available. */
export function devicePermissions(): NearbyPermission[] {
  return Platform.OS === 'android' ? nearbyPermissions(Number(Platform.Version)) : [];
}

export async function checkPermissions(
  list: NearbyPermission[],
): Promise<Record<string, PermissionStatus>> {
  const entries = await Promise.all(
    list.map(async ({ permission }) => {
      const ok = await PermissionsAndroid.check(permission);
      return [permission, ok ? 'granted' : 'denied'] as const;
    }),
  );
  return Object.fromEntries(entries);
}

/** Asks for every missing permission at once. "blocked" means only phone settings can allow it now. */
export async function requestPermissions(
  list: NearbyPermission[],
): Promise<Record<string, PermissionStatus>> {
  const results = await PermissionsAndroid.requestMultiple(list.map((p) => p.permission));
  return Object.fromEntries(
    list.map(({ permission }) => {
      const result = results[permission];
      const status: PermissionStatus =
        result === PermissionsAndroid.RESULTS.GRANTED
          ? 'granted'
          : result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
            ? 'blocked'
            : 'denied';
      return [permission, status];
    }),
  );
}

export function allGranted(statuses: Record<string, PermissionStatus>, list: NearbyPermission[]): boolean {
  return list.every(({ permission }) => statuses[permission] === 'granted');
}
