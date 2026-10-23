/** Reads the build number out of the release's version.json, or null if it isn't one. */
export function parseVersion(json: unknown): number | null {
  if (typeof json !== 'object' || json === null) return null;
  const build = (json as Record<string, unknown>).build;
  return typeof build === 'number' && Number.isInteger(build) && build > 0 ? build : null;
}

/** Only a real build (not web or local) is ever told about a newer one. */
export function isNewer(latest: number | null, current: number): boolean {
  return current > 0 && latest !== null && latest > current;
}
