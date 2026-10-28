import type { AnswerRecord, Difficulty, GameConfig, Operation, Problem } from '@/types';
import { problemAt } from '@/utils/gameSession';

/** Questions each player answers in a pass-and-play game. */
export const PASS_QUESTIONS = 10;

/** How many can share one phone. */
export const MAX_PASS_PLAYERS = 6;

/** Team Up: the monster has this much health for each player, out of their 10 questions. */
export const TEAM_UP_PER_PLAYER = 7;

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
  /** Team Up: everyone's right answers hit one shared monster instead of picking a winner. */
  team: boolean;
  players: PassPlayer[];
  /** Whose turn, by seat. Each player answers all their questions, then hands over. */
  turn: number;
  index: number;
  phase: PassPhase;
  histories: AnswerRecord[][];
}

export type PassAction = { type: 'begin' } | { type: 'answer'; given: number } | { type: 'next' };

/** Each player gets their own questions, so nobody can copy what they watched. */
function config(state: Pick<PassState, 'operation' | 'difficulty' | 'seed'>, turn: number): GameConfig {
  return {
    mode: { kind: 'operation', operation: state.operation },
    difficulty: state.difficulty,
    timer: null,
    adaptive: false,
    questionCount: PASS_QUESTIONS,
    seed: turn === 0 ? state.seed : (state.seed ^ Math.imul(turn, 0x27d4eb2d)) >>> 0,
  };
}

export function passProblem(state: PassState): Problem {
  return problemAt(config(state, state.turn), state.index, state.difficulty);
}

export function startPass(
  players: PassPlayer[],
  operation: Operation,
  difficulty: Difficulty,
  seed: number,
  team = false,
): PassState {
  return {
    operation,
    difficulty,
    seed,
    team,
    players,
    turn: 0,
    index: 0,
    phase: 'handoff',
    histories: players.map(() => []),
  };
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
      const histories = [...state.histories];
      histories[state.turn] = [...histories[state.turn], record];
      return { ...state, histories, phase: 'feedback' };
    }
    case 'next': {
      if (state.phase !== 'feedback') return state;
      if (state.index + 1 < PASS_QUESTIONS) return { ...state, index: state.index + 1, phase: 'question' };
      if (state.turn + 1 < state.players.length) return { ...state, turn: state.turn + 1, index: 0, phase: 'handoff' };
      return { ...state, phase: 'finished' };
    }
  }
}

export function passScores(state: PassState): number[] {
  return state.histories.map((h) => h.filter((r) => r.correct).length);
}

/** Seats with the top score: one winner, or several when it's a tie. */
export function passWinners(state: PassState): number[] {
  const scores = passScores(state);
  const best = Math.max(...scores);
  return scores.flatMap((score, seat) => (score === best ? [seat] : []));
}

/** Team Up: the monster's full health. */
export const teamTarget = (state: PassState) => TEAM_UP_PER_PLAYER * state.players.length;

/** Team Up: hits so far, from everyone. */
export const teamHits = (state: PassState) => passScores(state).reduce((sum, n) => sum + n, 0);

/** Team Up: the monster is beaten once the team's hits reach its health. */
export const teamWon = (state: PassState) => teamHits(state) >= teamTarget(state);
