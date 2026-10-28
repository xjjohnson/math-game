export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** School grade: 0 is kindergarten, 6 is "6th and up". */
export type Grade = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A grade plus easy, medium or hard inside it. */
export interface Level {
  grade: Grade;
  difficulty: Difficulty;
}

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
  /** Word problem text, when the round uses word problems. */
  story?: string;
}

/** The parts of a problem needed to ask it again later. */
export type Fact = Pick<Problem, 'operation' | 'a' | 'b' | 'answer' | 'prompt'>;

export interface MissedFact extends Fact {
  misses: number;
  /** Right answers in a row since the last miss; 2 clears the fact. */
  rightInARow: number;
  /** Local date of the latest miss. */
  lastMissed: string;
}

export interface OperationStats {
  attempted: number;
  correct: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  /** The avatar picked when the player was made, so it can always be picked again for free. */
  startAvatar: string;
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
  /** School grade the questions are pitched at. */
  grade: Grade;
  /** Shop item ids in use (the avatar is stored as `avatar` itself). */
  equipped: Equipped;
  /** Earned badge ids, in the order they were earned. */
  badges: string[];
  /** This week's goal progress; null before the first round. */
  week: WeekProgress | null;
  /** Facts to review, keyed by factKey(). */
  missed: Record<string, MissedFact>;
  /** Hearts each buddy has earned, keyed by shop item id. */
  buddyHearts: Record<string, number>;
  /** Today's buddy care, for the daily limits; null before the first. */
  buddyCare: BuddyCare | null;
  /** The buddies' home: paint colors, who is home and the things placed in it. */
  room: Room;
}

/**
 * Spots are shares of the whole home's width (x, so 0 to 1 spans every area) and of its
 * height (y, where things stand).
 */
export interface RoomSpot {
  x: number;
  y: number;
}

export interface BuddySpot extends RoomSpot {
  /** Key of the seat (a placed thing) it sits on. */
  on?: string;
}

export interface RoomThing extends RoomSpot {
  /** Tells copies of the same item apart. */
  key: string;
  itemId: string;
  /** False while it is put away in the toy box. */
  placed: boolean;
  /**
   * What it rests on: a table's or seat's key, a buddy holding it (BUDDY_KEY + id),
   * or a built-in shelf or counter (FIXTURE_KEY + id).
   */
  on?: string;
  /** The cupboard it is kept in, and which shelf (0 is the top one). */
  in?: string;
  shelf?: number;
}

/** Indexes into WALL_COLORS and FLOOR_COLORS. */
export interface AreaPaint {
  wall: number;
  floor: number;
}

export interface Room {
  /** Paint for each area, in HOME_AREAS order. */
  paint: AreaPaint[];
  /** Buddies at home and where they stand, keyed by shop item id. The buddy in use is always home. */
  buddies: Record<string, BuddySpot>;
  things: RoomThing[];
}

export interface BuddyCare {
  /** Local date, "YYYY-MM-DD". */
  date: string;
  pets: number;
  treats: number;
  /** Hearts earned from the buddy's game today. */
  playHearts: number;
}

export interface Equipped {
  background: string;
  cardStyle: string;
  companion: string | null;
}

export interface WeekProgress {
  /** Sunday that starts the week, "YYYY-MM-DD". */
  week: string;
  correct: number;
  rounds: number;
  days: string[];
  /** True once every weekly goal has been met (pays out once). */
  completed: boolean;
}

/** What the round asks: one operation, or chosen times tables. */
export type GameMode =
  | { kind: 'operation'; operation: Operation }
  | { kind: 'tables'; tables: number[]; includeDivision: boolean }
  /** Practice facts the player got wrong before. */
  | { kind: 'review'; facts: Fact[] };

export interface GameConfig {
  mode: GameMode;
  difficulty: Difficulty;
  /** School grade; without one, the classic 1-, 2- and 3-digit levels are used. */
  grade?: Grade;
  timer: TimerSetting;
  /** Step difficulty up or down from recent accuracy (operation mode only). */
  adaptive: boolean;
  questionCount: number;
  seed: number;
  /** Set when this round is the daily challenge for that local date. */
  dailyDate?: string;
  /** Ask each problem as a short story (operation mode only). */
  wordProblems?: boolean;
  /** Coach column problems one column at a time, carrying and borrowing like on paper. */
  showWork?: boolean;
  /** Show every question on one page and mark them all at the end. */
  worksheet?: boolean;
}

export interface AnswerRecord {
  problem: Problem;
  difficulty: Difficulty;
  /** Grade the question was pitched at, when the round had one. */
  grade?: Grade;
  /** null when the timer ran out. */
  given: number | null;
  correct: boolean;
  points: number;
}
