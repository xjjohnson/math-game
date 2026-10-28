import type { AnswerRecord, Difficulty, GameConfig, Problem } from '@/types';
import { adjustDifficulty } from '@/utils/adaptive';
import { buildProblem, generate, generateTimesTable } from '@/utils/mathEngine';
import { pointsFor } from '@/utils/scoring';
import { createRng } from '@/utils/seededRandom';
import { toWordProblem } from '@/utils/wordProblems';

export const QUESTIONS_PER_ROUND = 10;

export type SessionPhase = 'question' | 'feedback' | 'finished';

export interface SessionState {
  config: GameConfig;
  /** Zero-based index of the current question. */
  index: number;
  difficulty: Difficulty;
  problem: Problem;
  phase: SessionPhase;
  streak: number;
  bestStreak: number;
  score: number;
  history: AnswerRecord[];
}

export type SessionAction =
  | { type: 'answer'; given: number; secondsLeft: number | null }
  | { type: 'timeout' }
  | { type: 'next' };

/**
 * Problem `index` depends only on the seed, the index and the difficulty, so two
 * devices sharing a seed see the same questions even if they answer at different speeds.
 */
export function problemAt(config: GameConfig, index: number, difficulty: Difficulty): Problem {
  const rng = createRng((config.seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
  const { mode } = config;
  if (mode.kind === 'tables') {
    return generateTimesTable({ tables: mode.tables, includeDivision: mode.includeDivision }, rng);
  }
  if (mode.kind === 'review') {
    const fact = mode.facts[index % mode.facts.length];
    return buildProblem(fact.operation, fact.a, fact.b, fact.answer, rng);
  }
  const problem = generate(mode.operation, difficulty, rng, config.grade);
  return config.wordProblems ? toWordProblem(problem, rng) : problem;
}

/** Key for saving a best score, e.g. "multiply:easy:10", "add:g3:hard:none", "tables-3-7:medium:none" or "daily:2026-10-22". */
export function highScoreKey(config: GameConfig): string {
  if (config.dailyDate) return `daily:${config.dailyDate}`;
  const { mode } = config;
  if (mode.kind === 'review') return 'review';
  const name =
    mode.kind === 'operation'
      ? `${mode.operation}${config.wordProblems ? '-words' : ''}`
      : `tables-${[...mode.tables].sort((a, b) => a - b).join('-')}${mode.includeDivision ? '-div' : ''}`;
  const grade = config.grade === undefined ? '' : `g${config.grade}:`;
  return `${name}:${grade}${config.difficulty}:${config.timer ?? 'none'}${config.adaptive ? ':adaptive' : ''}`;
}

export function startSession(config: GameConfig): SessionState {
  return {
    config,
    index: 0,
    difficulty: config.difficulty,
    problem: problemAt(config, 0, config.difficulty),
    phase: 'question',
    streak: 0,
    bestStreak: 0,
    score: 0,
    history: [],
  };
}

function record(state: SessionState, given: number | null, secondsLeft: number | null): SessionState {
  const correct = given === state.problem.answer;
  const streak = correct ? state.streak + 1 : 0;
  const question = { operation: state.problem.operation, difficulty: state.difficulty, grade: state.config.grade };
  const points = correct ? pointsFor(question, streak, state.config.timer, secondsLeft) : 0;
  return {
    ...state,
    phase: 'feedback',
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    score: state.score + points,
    history: [
      ...state.history,
      { problem: state.problem, difficulty: state.difficulty, grade: state.config.grade, given, correct, points },
    ],
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'answer':
      return state.phase === 'question' ? record(state, action.given, action.secondsLeft) : state;
    case 'timeout':
      return state.phase === 'question' ? record(state, null, 0) : state;
    case 'next': {
      if (state.phase !== 'feedback') return state;
      const index = state.index + 1;
      if (index >= state.config.questionCount) return { ...state, phase: 'finished' };
      const adaptive = state.config.adaptive && state.config.mode.kind === 'operation';
      const difficulty = adaptive ? adjustDifficulty(state.difficulty, state.history) : state.difficulty;
      return {
        ...state,
        index,
        difficulty,
        problem: problemAt(state.config, index, difficulty),
        phase: 'question',
      };
    }
  }
}

export function lastAnswer(state: SessionState): AnswerRecord | undefined {
  return state.history.at(-1);
}

export function correctCount(state: SessionState): number {
  return state.history.filter((r) => r.correct).length;
}
