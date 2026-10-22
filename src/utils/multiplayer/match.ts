import type { GameConfig, Problem } from '@/types';
import { problemAt } from '@/utils/gameSession';
import type { GameMessage, MatchSetup, Role } from '@/utils/multiplayer/protocol';

/** Head-to-Head Race: first to this many right answers wins. */
export const RACE_TARGET = 10;

/** Co-op Defense: right answers the team needs (between both phones) before each wave's timer runs out. */
export const COOP_WAVES = [
  { target: 6, seconds: 45 },
  { target: 8, seconds: 45 },
  { target: 10, seconds: 45 },
] as const;

export const other = (role: Role): Role => (role === 'host' ? 'guest' : 'host');

/**
 * Both phones build the same problems from the shared seed. In a race both
 * players get the same cards; in co-op the guest gets its own so the two
 * phones don't repeat each other.
 */
export function matchConfig(setup: MatchSetup, role: Role): GameConfig {
  return {
    mode: { kind: 'operation', operation: setup.operation },
    difficulty: setup.difficulty,
    timer: null,
    adaptive: false,
    questionCount: Number.MAX_SAFE_INTEGER,
    seed: setup.mode === 'coop' && role === 'guest' ? (setup.seed ^ 0x5bd1e995) >>> 0 : setup.seed,
  };
}

export function matchProblem(setup: MatchSetup, role: Role, index: number): Problem {
  return problemAt(matchConfig(setup, role), index, setup.difficulty);
}

export interface MatchState {
  setup: MatchSetup;
  me: Role;
  /** Cards answered on this phone; the next card's index. */
  myIndex: number;
  /** Right answers per player. */
  correct: Record<Role, number>;
  /** Co-op: current wave (0-based) and the team's right answers in it. */
  wave: number;
  waveCorrect: number;
  /** Race: the host's call on who won. */
  winner: Role | null;
  /** Co-op: the host's call on how it went. */
  result: 'won' | 'lost' | null;
}

export function startMatch(setup: MatchSetup, me: Role): MatchState {
  return {
    setup,
    me,
    myIndex: 0,
    correct: { host: 0, guest: 0 },
    wave: 0,
    waveCorrect: 0,
    winner: null,
    result: null,
  };
}

export function isOver(state: MatchState): boolean {
  return state.winner !== null || state.result !== null;
}

/** What happens next, from this phone's side. */
export type Step = [MatchState, GameMessage[]];

function count(state: MatchState, role: Role, correct: boolean): MatchState {
  if (!correct || isOver(state)) return state;
  return {
    ...state,
    correct: { ...state.correct, [role]: state.correct[role] + 1 },
    waveCorrect: state.waveCorrect + 1,
  };
}

/**
 * The host is the referee. After every answer it checks for a race winner or a
 * cleared wave and tells the guest; the guest only ever follows those calls.
 */
function referee(state: MatchState, timeUp = false): Step {
  if (state.me !== 'host' || isOver(state)) return [state, []];
  if (state.setup.mode === 'race') {
    const winner = (['host', 'guest'] as const).find((r) => state.correct[r] >= RACE_TARGET);
    return winner ? [{ ...state, winner }, [{ type: 'end', winner }]] : [state, []];
  }
  if (state.waveCorrect >= COOP_WAVES[state.wave].target) {
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
  const answer: GameMessage = { type: 'answer', cardIndex: state.myIndex, correct, playerId: state.me };
  const counted = { ...count(state, state.me, correct), myIndex: state.myIndex + 1 };
  const [next, calls] = referee(counted);
  return [next, [answer, ...calls]];
}

/** A message arrived from the other phone. */
export function receive(state: MatchState, message: GameMessage): Step {
  switch (message.type) {
    case 'answer':
      if (message.playerId === state.me) return [state, []];
      return referee(count(state, message.playerId, message.correct));
    case 'wave':
      if (state.me === 'host' || message.wave <= state.wave) return [state, []];
      return [{ ...state, wave: message.wave, waveCorrect: 0 }, []];
    case 'end':
      if (state.me === 'host' || isOver(state)) return [state, []];
      return [{ ...state, winner: message.winner ?? null, result: message.result ?? null }, []];
    default:
      return [state, []];
  }
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
