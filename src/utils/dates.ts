/** Local calendar date as "YYYY-MM-DD", so a day starts at the player's midnight. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

/**
 * Days in a row the player has played, counting back from today. A streak that
 * ended yesterday still counts, so it doesn't reset before they've had a chance to play.
 */
export function dayStreak(playDates: readonly string[], today: string): number {
  const played = new Set(playDates);
  let day = played.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (played.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

/** A stable number for a date, used to seed the daily challenge. */
export function dateSeed(key: string): number {
  return Number(key.replace(/-/g, ''));
}
