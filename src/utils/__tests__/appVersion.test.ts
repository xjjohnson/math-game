import { isNewer, parseVersion } from '@/utils/appVersion';

describe('app updates', () => {
  it('reads the build number from version.json', () => {
    expect(parseVersion({ build: 12, sha: 'abc1234' })).toBe(12);
    expect(parseVersion({ build: '12' })).toBeNull();
    expect(parseVersion({ build: 0 })).toBeNull();
    expect(parseVersion(null)).toBeNull();
  });

  it('only offers a newer build to a real build', () => {
    expect(isNewer(8, 7)).toBe(true);
    expect(isNewer(7, 7)).toBe(false);
    expect(isNewer(6, 7)).toBe(false);
    expect(isNewer(null, 7)).toBe(false);
    // Web and local builds are build 0 and never update.
    expect(isNewer(8, 0)).toBe(false);
  });
});
