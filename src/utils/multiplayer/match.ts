import type { GameConfig, Level, Problem } from '@/types';
import { problemAt } from '@/utils/gameSession';
import { HOST_ID, type GameMessage, type MatchSetup, type PlayerInfo } from '@/utils/multiplayer/protocol';

/** Head-to-Head Race: first to this many right answers wins. */
export const RACE_TARGET = 10;

/**
 * Co-op Defense: right answers the team needs before each wave's timer runs
 * out, per player still in the game (two players need 6, then 8, then 10).
 */
export const COOP_WAVES = [
  { perPlayer: 3, seconds: 45 },
  { perPlayer: 4, seconds: 45 },
  { perPlayer: 5, seconds: 45 },
] as const;

/**
 * Every phone builds its problems from the shared seed. In a race, players at
 * the same level get the same cards; in co-op each player gets their own so
 * nobody repeats a teammate's card. Each phone picks its own player's level;
 * without one, the host's classic difficulty is used.
 */
export function matchConfig(setup: MatchSetup, seat: number, level?: Level): GameConfig {
  return {
    mode: { kind: 'operation', operation: setup.operation },
    difficulty: level?.difficulty ?? setup.difficulty,
    grade: level?.grade,
    timer: null,
    adaptive: false,
    questionCount: Number.MAX_SAFE_INTEGER,
    seed: setup.mode === 'coop' && seat > 0 ? (setup.seed ^ Math.imul(seat, 0x5bd1e995)) >>> 0 : setup.seed,
  };
}

export function matchProblem(setup: MatchSetup, seat: number, index: number, level?: Level): Problem {
  return problemAt(matchConfig(setup, seat, level), index, level?.difficulty ?? setup.difficulty);
}

export interface MatchState {
  setup: MatchSetup;
  /** Everyone in the match, host first. */
  players: PlayerInfo[];
  /** This phone's player id. */
  me: string;
  /** Cards answered on this phone; the next card's index. */
  myIndex: number;
  /** Right answers per player id. */
  correct: Record<string, number>;
  /** Players whose phones dropped out. */
  left: string[];
  /** Co-op: current wave (0-based) and the team's right answers in it. */
  wave: number;
  waveCorrect: number;
  /** Race: the host's call on who won. */
  winner: string | null;
  /** Co-op: the host's call on how it went. */
  result: 'won' | 'lost' | null;
}

export function startMatch(setup: MatchSetup, players: PlayerInfo[], me: string): MatchState {
  return {
    setup,
    players,
    me,
    myIndex: 0,
    correct: Object.fromEntries(players.map((p) => [p.id, 0])),
    left: [],
    wave: 0,
    waveCorrect: 0,
    winner: null,
    result: null,
  };
}

export const isHost = (state: MatchState) => state.me === HOST_ID;

/** Where this phone's player sits; picks their co-op cards. */
export const mySeat = (state: MatchState) => Math.max(0, state.players.findIndex((p) => p.id === state.me));

export function isOver(state: MatchState): boolean {
  return state.winner !== null || state.result !== null;
}

/** Co-op: right answers the team needs to clear the current wave. */
export function waveTarget(state: MatchState): number {
  const playing = Math.max(1, state.players.length - state.left.length);
  return COOP_WAVES[state.wave].perPlayer * playing;
}

/** Players from most right answers to fewest; ties keep seating order. */
export function standings(state: MatchState): (PlayerInfo & { correct: number })[] {
  return state.players
    .map((p) => ({ ...p, correct: state.correct[p.id] ?? 0 }))
    .sort((a, b) => b.correct - a.correct);
}

/** What happens next, from this phone's side, and what it sends. */
export type Step = [MatchState, GameMessage[]];

function count(state: MatchState, playerId: string, correct: boolean): MatchState {
  if (!correct || isOver(state) || !(playerId in state.correct)) return state;
  return {
    ...state,
    correct: { ...state.correct, [playerId]: state.correct[playerId] + 1 },
    waveCorrect: state.waveCorrect + 1,
  };
}

/**
 * The host is the referee. After every answer it checks for a race winner or a
 * cleared wave and tells everyone; guests only ever follow those calls.
 */
function referee(state: MatchState, timeUp = false): Step {
  if (!isHost(state) || isOver(state)) return [state, []];
  if (state.setup.mode === 'race') {
    const winner = state.players.find((p) => state.correct[p.id] >= RACE_TARGET)?.id;
    return winner ? [{ ...state, winner }, [{ type: 'end', winner }]] : [state, []];
  }
  if (state.waveCorrect >= waveTarget(state)) {
    if (state.wave === COOP_WAVES.length - 1) {
      return [{ ...state, result: 'won' }, [{ type: 'end', result: 'won' }]];
    }
    const wave = state.wave + 1;
    return [{ ...state, wave, waveCorrect: 0 }, [{ type: 'wave', wave }]];
  }
  if (timeUp) return [{ ...state, result: 'lost' }, [{ type: 'end', result: 'lost' }]];
  return [state, []];
}

/** This phone's player answered its current card. */
export function answerMine(state: MatchState, correct: boolean): Step {
  if (isOver(state)) return [state, []];
  const answer: GameMessage = { type: 'answer', correct, playerId: state.me };
  const counted = { ...count(state, state.me, correct), myIndex: state.myIndex + 1 };
  const [next, calls] = referee(counted);
  return [next, [answer, ...calls]];
}

/**
 * A message arrived. The host passes each guest's answer on to everyone, so
 * every phone sees every answer once (a guest skips the echo of its own).
 */
export function receive(state: MatchState, message: GameMessage): Step {
  switch (message.type) {
    case 'answer': {
      if (message.playerId === state.me) return [state, []];
      const counted = count(state, message.playerId, message.correct);
      if (!isHost(state)) return [counted, []];
      const [next, calls] = referee(counted);
      return [next, [message, ...calls]];
    }
    case 'wave':
      if (isHost(state) || message.wave <= state.wave) return [state, []];
      return [{ ...state, wave: message.wave, waveCorrect: 0 }, []];
    case 'left':
      if (isHost(state) || state.left.includes(message.playerId)) return [state, []];
      return [{ ...state, left: [...state.left, message.playerId] }, []];
    case 'end':
      if (isHost(state) || isOver(state)) return [state, []];
      return [{ ...state, winner: message.winner ?? null, result: message.result ?? null }, []];
    default:
      return [state, []];
  }
}

/** Host only: a guest's phone disconnected mid-match. The rest play on. */
export function playerLeft(state: MatchState, playerId: string): Step {
  if (!isHost(state) || state.left.includes(playerId) || !(playerId in state.correct)) return [state, []];
  const next = { ...state, left: [...state.left, playerId] };
  const [after, calls] = referee(next);
  return [after, [{ type: 'left', playerId }, ...calls]];
}

/** Co-op: the host's wave timer ran out. */
export function waveTimeUp(state: MatchState): Step {
  return referee(state, true);
}

/** How the match ended for this phone's player. */
export function outcomeFor(state: MatchState): 'won' | 'lost' | null {
  if (state.setup.mode === 'race') return state.winner === null ? null : state.winner === state.me ? 'won' : 'lost';
  return state.result;
}
