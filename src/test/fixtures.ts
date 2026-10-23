import { DEFAULT_EQUIPPED } from '@/constants/shop';
import type { AnswerRecord, Difficulty, Profile } from '@/types';

/** Test helpers only; not used by the app. */
export const rec = (correct: boolean, difficulty: Difficulty = 'easy'): AnswerRecord => ({
  problem: { operation: 'multiply', a: 3, b: 4, answer: 12, prompt: '3 × 4', choices: [11, 12, 13, 14] },
  difficulty,
  given: correct ? 12 : 13,
  correct,
  points: 0,
});

/** "1101" → right, right, wrong, right. */
export const results = (pattern: string, difficulty: Difficulty = 'easy') =>
  [...pattern].map((c) => rec(c === '1', difficulty));

export const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'p1',
  name: 'Ava',
  avatar: '🐼',
  startAvatar: '🐼',
  inputStyle: 'auto',
  createdAt: 0,
  coins: 0,
  stars: 0,
  bestStreak: 0,
  highScores: {},
  unlocks: [],
  stats: {
    add: { attempted: 0, correct: 0 },
    subtract: { attempted: 0, correct: 0 },
    multiply: { attempted: 0, correct: 0 },
    divide: { attempted: 0, correct: 0 },
  },
  playDates: [],
  dailyChallengeDate: null,
  lastDifficulty: 'easy',
  equipped: { ...DEFAULT_EQUIPPED },
  badges: [],
  week: null,
  missed: {},
  ...overrides,
});
