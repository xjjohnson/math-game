export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Seconds per question, or null for untimed practice. */
export type TimerSetting = 10 | 30 | null;

/** 'auto' picks multiple choice on Easy and the number pad otherwise. */
export type InputStyle = 'auto' | 'choices' | 'numpad';

/** A random number generator returning floats in [0, 1). */
export type Rng = () => number;

export interface Problem {
  operation: Operation;
  a: number;
  b: number;
  answer: number;
  /** Display text, e.g. "7 × 8". */
  prompt: string;
  /** Shuffled answer options, always including the correct answer. */
  choices: number[];
}

export interface OperationStats {
  attempted: number;
  correct: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  inputStyle: InputStyle;
  createdAt: number;
  coins: number;
  stars: number;
  bestStreak: number;
  /** Keyed by highScoreKey(config), e.g. "multiply:easy:10". */
  highScores: Record<string, number>;
  /** Shop item ids the profile owns. */
  unlocks: string[];
  stats: Record<Operation, OperationStats>;
  /** Local dates ("YYYY-MM-DD") the player finished at least one round, oldest first. */
  playDates: string[];
  /** Local date the daily challenge bonus was last earned. */
  dailyChallengeDate: string | null;
  /** Difficulty of the last round; the daily challenge uses it. */
  lastDifficulty: Difficulty;
}

/** What the round asks: one operation, or chosen times tables. */
export type GameMode =
  | { kind: 'operation'; operation: Operation }
  | { kind: 'tables'; tables: number[]; includeDivision: boolean };

export interface GameConfig {
  mode: GameMode;
  difficulty: Difficulty;
  timer: TimerSetting;
  /** Step difficulty up or down from recent accuracy (operation mode only). */
  adaptive: boolean;
  questionCount: number;
  seed: number;
  /** Set when this round is the daily challenge for that local date. */
  dailyDate?: string;
}

export interface AnswerRecord {
  problem: Problem;
  difficulty: Difficulty;
  /** null when the timer ran out. */
  given: number | null;
  correct: boolean;
  points: number;
}
