import type { Mood } from '@/components/PersonFigure';
import type { PersonLook } from '@/constants/wardrobe';
import type { Money, Picture } from '@/types/picture';

export type { Money, Picture, Shape2D, Shape3D } from '@/types/picture';

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
/** Seconds per question; 60 and 90 are only used by the daily challenge. */
export type TimerSetting = 10 | 30 | 60 | 90 | null;

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
  /** The skill this question practises (see src/utils/skills/catalog.ts). */
  skill?: SkillId;
  /**
   * The question in words, for questions that aren't a plain sum, e.g.
   * "How many dots?" or "What time is it?". `prompt` is then the big line under
   * the picture (it may be empty), with ☐ where the answer goes.
   */
  ask?: string;
  /** A picture drawn on the card: dots, blocks, a clock, coins, a shape, a fraction... */
  picture?: Picture;
  /** Words for answers that aren't plain numbers, keyed by the answer value, e.g. { 0: '<', 1: '=', 2: '>' }. */
  labels?: Record<number, string>;
  /** Only answered by tapping a choice (the answers are words or signs, not numbers to type). */
  choiceOnly?: boolean;
  /** Unit after a typed answer, e.g. "¢" or "inches". */
  unit?: string;
  /** Hide the picture after this many milliseconds (quick looks, like dice dots). */
  flashMs?: number;
  /**
   * Play answers it by doing instead of picking: setting the clock hands, or
   * filling a purse with coins. Screens without that (worksheets, two-player
   * games) use `ask`, `picture` and the choices as a normal question.
   */
  interact?: Interact;
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
  /** Clothes and accessories bought, by wearable id. Any buddy can wear them. */
  wardrobe: string[];
  /** What each buddy has on, keyed by the buddy's shop item id. */
  outfits: Record<string, Outfit>;
  /** How each person buddy looks (hair, skin, beard), once changed from its start. */
  looks: Record<string, PersonLook>;
  /** The face each buddy was set to in Feelings; missing means its everyday smile. */
  moods?: Record<string, Mood>;
  /** Ids of the extra rooms (HomeArea.price) bought for the buddies' home. */
  homeRooms: string[];
  /** Order of the rooms in the home, left to right, as HomeArea ids. Missing means the starting order. */
  homeOrder?: string[];
  /** What was picked on the New game screen last time, so it starts that way again. */
  lastGame?: GameChoices;
  /** Community buildings whose daily job is done, for today only. */
  town: TownVisits;
  /** How the player is doing on each skill, keyed by skill id. */
  skills: Record<SkillId, SkillProgress>;
  /** 3D printer filament: toys left to print, by filament id (constants/printer.ts). */
  filament: Record<string, number>;
  /** The car driven round the town, its paint and how it is steered. Missing until first changed. */
  garage?: Garage;
}

/** A player's car choice for the town (see utils/garage.ts for the defaults). */
export interface Garage {
  car?: string;
  /** Index into CAR_PAINTS. */
  paint?: number;
  /** The rainbow stripe is on (once bought). */
  stripe?: boolean;
  controls?: 'tap' | 'wheel';
  /** Cars (and the stripe) bought with coins. */
  owned?: string[];
}

/** New game screen picks (grade and difficulty are kept on the profile itself). */
export interface GameChoices {
  choice: Operation | 'tables' | 'mix' | Strand;
  tables: number[];
  includeDivision: boolean;
  timer: TimerSetting;
  adaptive: boolean;
  wordProblems: boolean;
  showWork: boolean;
  worksheet: boolean;
}

export interface TownVisits {
  /** Local date, "YYYY-MM-DD". */
  date: string;
  done: string[];
}

/** Wearable ids a buddy has on, one per spot. */
export type Outfit = Partial<Record<'hat' | 'face' | 'neck' | 'shirt' | 'legs' | 'feet', string>>;

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
  /** The cupboard it is kept in, and which shelf (0 is the top one); x is then how far along the shelf. */
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
  | { kind: 'review'; facts: Fact[] }
  /**
   * Skill practice: the app picks each question's skill from what the player is
   * learning. `strands` limits it to some areas (all when missing); `focus`
   * practises one skill; `plan` is the skill for each question, filled in when
   * the round starts so every device asks the same things.
   */
  | { kind: 'skills'; strands?: Strand[]; focus?: SkillId; plan?: SkillId[] };

/** An area of maths, like a strand in a school curriculum. */
export type Strand =
  | 'count'
  | 'add'
  | 'subtract'
  | 'place'
  | 'multiply'
  | 'divide'
  | 'story'
  | 'time'
  | 'money'
  | 'measure'
  | 'shapes'
  | 'fractions';

export type SkillId = string;

/** How a player is doing on one skill. */
export interface SkillProgress {
  /** Last answers, oldest first, as '1' (right) and '0' (wrong); at most 10. */
  recent: string;
  tries: number;
  right: number;
  /** True once learned (see isLearned); can be lost again if it gets shaky. */
  learned: boolean;
  /** Local date the skill was first learned. */
  learnedOn?: string;
  /** Times the Help button was opened on this skill. */
  helped?: number;
}

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

export type Interact =
  /** Drag the hands to the answer (minutes after 12:00). `from` starts the clock at a time, for time passing. */
  | { kind: 'setClock'; ask: string; step: number; from?: number }
  /** Put coins in a purse to make the answer (cents). `from` counts up from a price, for change. */
  | { kind: 'purse'; ask: string; coins: Money[]; from?: number };

export interface AnswerRecord {
  problem: Problem;
  difficulty: Difficulty;
  /** Grade the question was pitched at, when the round had one. */
  grade?: Grade;
  /** null when the timer ran out. */
  given: number | null;
  correct: boolean;
  points: number;
  /** Seconds the player took, on timed rounds only. */
  seconds?: number;
  /** Help was opened before answering; it doesn't count toward learning the skill. */
  helped?: boolean;
}
