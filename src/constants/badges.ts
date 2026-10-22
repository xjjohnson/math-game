export interface Badge {
  id: string;
  emoji: string;
  name: string;
  /** How to earn it, shown before it's unlocked. */
  how: string;
}

export const BADGES: Badge[] = [
  { id: 'first-round', emoji: '🎈', name: 'First Round', how: 'Finish your first round' },
  { id: 'perfect', emoji: '💯', name: 'Perfect!', how: 'Get every answer right in a round' },
  { id: 'streak-10', emoji: '🔥', name: 'Hot Streak', how: 'Get 10 right in a row' },
  { id: 'daily', emoji: '⚡', name: 'Challenger', how: 'Win a daily challenge' },
  { id: 'days-3', emoji: '📅', name: 'Regular', how: 'Play 3 days in a row' },
  { id: 'days-7', emoji: '🗓️', name: 'Week Warrior', how: 'Play 7 days in a row' },
  { id: 'all-ops', emoji: '🧮', name: 'All-Rounder', how: 'Try all four operations' },
  { id: 'hard', emoji: '🧠', name: 'Big Brain', how: 'Get 3 stars on Hard' },
  { id: 'shopper', emoji: '🛍️', name: 'Shopper', how: 'Buy something in the shop' },
  { id: 'weekly', emoji: '🏆', name: 'Weekly Champ', how: 'Finish all three weekly goals' },
];

export function findBadge(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
