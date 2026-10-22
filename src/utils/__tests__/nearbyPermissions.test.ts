import { nearbyPermissions } from '@/utils/nearbyPermissions';

const names = (api: number) => nearbyPermissions(api).map((p) => p.permission.replace('android.permission.', ''));

describe('nearbyPermissions', () => {
  it('asks for coarse location only on Android 9 and older', () => {
    expect(names(28)).toEqual(['ACCESS_COARSE_LOCATION']);
  });

  it('asks for fine location on Android 10 and 11', () => {
    expect(names(29)).toEqual(['ACCESS_FINE_LOCATION']);
    expect(names(30)).toEqual(['ACCESS_FINE_LOCATION']);
  });

  it('adds the Bluetooth permissions from Android 12', () => {
    expect(names(31)).toEqual(['BLUETOOTH_SCAN', 'BLUETOOTH_ADVERTISE', 'BLUETOOTH_CONNECT', 'ACCESS_FINE_LOCATION']);
    expect(names(32)).toEqual(names(31));
  });

  it('swaps location for nearby Wi-Fi from Android 13', () => {
    expect(names(33)).toEqual(['BLUETOOTH_SCAN', 'BLUETOOTH_ADVERTISE', 'BLUETOOTH_CONNECT', 'NEARBY_WIFI_DEVICES']);
    expect(names(36)).toEqual(names(33));
  });
});
