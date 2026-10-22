import type { AnswerRecord, Difficulty, GameConfig, Operation, Problem } from '@/types';
import { problemAt } from '@/utils/gameSession';

/** Questions each player answers in a pass-and-play game. */
export const PASS_QUESTIONS = 10;

export interface PassPlayer {
  name: string;
  avatar: string;
  /** Set when the player is a saved profile, so the round counts toward their coins. */
  profileId?: string;
}

export type PassPhase = 'handoff' | 'question' | 'feedback' | 'finished';

export interface PassState {
  operation: Operation;
  difficulty: Difficulty;
  seed: number;
  players: [PassPlayer, PassPlayer];
  /** Whose turn: 0 or 1. Player 1 answers all their questions, then hands over. */
  turn: 0 | 1;
  index: number;
  phase: PassPhase;
  histories: [AnswerRecord[], AnswerRecord[]];
}

export type PassAction = { type: 'begin' } | { type: 'answer'; given: number } | { type: 'next' };

/** Each player gets their own questions, so the second can't copy what they watched. */
function config(state: Pick<PassState, 'operation' | 'difficulty' | 'seed'>, turn: 0 | 1): GameConfig {
  return {
    mode: { kind: 'operation', operation: state.operation },
    difficulty: state.difficulty,
    timer: null,
    adaptive: false,
    questionCount: PASS_QUESTIONS,
    seed: turn === 0 ? state.seed : (state.seed ^ 0x27d4eb2d) >>> 0,
  };
}

export function passProblem(state: PassState): Problem {
  return problemAt(config(state, state.turn), state.index, state.difficulty);
}

export function startPass(
  players: [PassPlayer, PassPlayer],
  operation: Operation,
  difficulty: Difficulty,
  seed: number,
): PassState {
  return { operation, difficulty, seed, players, turn: 0, index: 0, phase: 'handoff', histories: [[], []] };
}

export function passReducer(state: PassState, action: PassAction): PassState {
  switch (action.type) {
    case 'begin':
      return state.phase === 'handoff' ? { ...state, phase: 'question' } : state;
    case 'answer': {
      if (state.phase !== 'question') return state;
      const problem = passProblem(state);
      const record: AnswerRecord = {
        problem,
        difficulty: state.difficulty,
        given: action.given,
        correct: action.given === problem.answer,
        points: 0,
      };
      const histories: PassState['histories'] = [...state.histories];
      histories[state.turn] = [...histories[state.turn], record];
      return { ...state, histories, phase: 'feedback' };
    }
    case 'next': {
      if (state.phase !== 'feedback') return state;
      if (state.index + 1 < PASS_QUESTIONS) return { ...state, index: state.index + 1, phase: 'question' };
      if (state.turn === 0) return { ...state, turn: 1, index: 0, phase: 'handoff' };
      return { ...state, phase: 'finished' };
    }
  }
}

export function passScores(state: PassState): [number, number] {
  return [0, 1].map((p) => state.histories[p].filter((r) => r.correct).length) as [number, number];
}

/** 0 or 1 for the winner, or null for a tie. */
export function passWinner(state: PassState): 0 | 1 | null {
  const [a, b] = passScores(state);
  return a === b ? null : a > b ? 0 : 1;
}
