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
  /** Keyed by `${operation}:${difficulty}:${timer}`. */
  highScores: Record<string, number>;
  /** Shop item ids the profile owns. */
  unlocks: string[];
  stats: Record<Operation, OperationStats>;
}
