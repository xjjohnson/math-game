/**
 * Join-or-host, the same way for community visits and for games on several
 * phones: when you start, look once for someone already hosting and join them;
 * if nobody is, host, and stay the host.
 *
 * Two phones that start at the same moment can both end up hosting. To fix
 * that, a host keeps an eye out for other hosts while nobody has joined it
 * yet. Each host puts a short random tag in the name it advertises; when two
 * lonely hosts see each other, the one with the smaller tag gives way and
 * joins the other. A host that already has friends never gives way, so a
 * lonely host that sees it still there after a few seconds joins it instead.
 */

/** Starts the name a phone advertises when it hosts a game on several phones. */
export const GAME_MARK = '🎲';

/** A lonely host joins another host it has seen for this long, whatever the tags say. */
export const YIELD_AFTER_MS = 8000;

/** A short random tag for one hosting phone: 4 letters or digits. */
export function newToken(random: () => number = Math.random): string {
  return Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0');
}

/** The name a host advertises: its mark, its tag, then what people see. */
export function advertName(mark: string, token: string, shown: string): string {
  return `${mark}${token} ${shown}`;
}

/** The tag in an advertised name, or null if it has none (an older phone). */
export function tokenOf(name: string, mark: string): string | null {
  if (!name.startsWith(mark)) return null;
  const tag = name.slice(mark.length).split(' ')[0];
  return /^[0-9a-z]{4}$/.test(tag) ? tag : null;
}

/** The part of an advertised name to show people, without the mark and tag. */
export function shownName(name: string, mark: string): string {
  if (!name.startsWith(mark)) return name;
  const rest = name.slice(mark.length).trimStart();
  return tokenOf(name, mark) ? rest.slice(4).trimStart() : rest;
}

/**
 * Should a host that nobody has joined yet give way to `other` (another host's
 * tag, or null for an older phone) that it has seen for `seenMs`?
 */
export function shouldYield(mine: string, other: string | null, seenMs: number): boolean {
  // Older phones never give way, so join them.
  if (other === null) return true;
  if (other === mine) return false;
  return mine < other || seenMs >= YIELD_AFTER_MS;
}
