import type { GameConfig, Level, Problem } from '@/types';
import { problemAt } from '@/utils/gameSession';
import {
  HOST_ID,
  type GameMessage,
  type MatchMode,
  type MatchSetup,
  type PlayerInfo,
} from '@/utils/multiplayer/protocol';

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
 * Monster Battle: one big monster for the whole team. Every right answer is a
 * hit; it has this much health per player still in the game, and the team has
 * this long to beat it. Wrong answers cost nothing.
 */
export const MONSTER = { perPlayer: 6, seconds: 120 } as const;

/** The monster you face is picked from the match seed, so every phone sees the same one. */
export const MONSTERS = ['🐉', '👾', '🦖', '🐙', '👹', '🦑', '🧌'] as const;

export const monsterFor = (seed: number) => MONSTERS[seed % MONSTERS.length];

/**
 * Relay: one player answers at a time, and everyone's phone shows that card so
 * the team can help. A right answer passes the baton to the next player; a
 * wrong one gets them another card. Each player runs this many laps, and the
 * clock gives the team this long per right answer it needs.
 */
export const RELAY = { laps: 3, secondsPerLeg: 20 } as const;

/** Team modes: everyone shares one goal and the host's clock decides. */
export const isTeamMode = (mode: MatchMode) => mode !== 'race';

/** The timed stages of a team mode. Monster Battle and Relay are a single long one. */
export function stagesFor(mode: MatchMode): readonly { perPlayer: number; seconds: number }[] {
  if (mode === 'monster') return [MONSTER];
  if (mode === 'relay') return [{ perPlayer: RELAY.laps, seconds: 0 }];
  return COOP_WAVES;
}

/** How long the team has for the current stage. A relay's clock depends on the team it started with. */
export function stageSeconds(state: MatchState): number {
  if (state.setup.mode === 'relay') return RELAY.secondsPerLeg * RELAY.laps * state.players.length;
  return stagesFor(state.setup.mode)[state.wave].seconds;
}

/**
 * Every phone builds its problems from the shared seed. In a race, players at
 * the same level get the same cards; in team modes each player gets their own
 * so nobody repeats a teammate's card. Each player has their own level;
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
    seed: isTeamMode(setup.mode) && seat > 0 ? (setup.seed ^ Math.imul(seat, 0x5bd1e995)) >>> 0 : setup.seed,
  };
}

/** The host's level, carried in the setup; a relay's shared cards use it. */
export function setupLevel(setup: MatchSetup): Level | undefined {
  return setup.grade === undefined ? undefined : { grade: setup.grade, difficulty: setup.difficulty };
}

/** A player's card at their level. A relay shows seat 0's cards on every phone, one at a time. */
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
  /** Relay: cards the team has answered; the card on every screen now. */
  cards: number;
  /** Relay: the last answer, so watching phones can cheer or sigh. */
  last: { playerId: string; correct: boolean } | null;
  /** Right answers per player id. */
  correct: Record<string, number>;
  /** Players whose phones dropped out. */
  left: string[];
  /** Team modes: current wave (0-based) and the team's right answers in it. */
  wave: number;
  waveCorrect: number;
  /** Race: the host's call on who won. */
  winner: string | null;
  /** Team modes: the host's call on how it went. */
  result: 'won' | 'lost' | null;
}

export function startMatch(setup: MatchSetup, players: PlayerInfo[], me: string): MatchState {
  return {
    setup,
    players,
    me,
    myIndex: 0,
    cards: 0,
    last: null,
    correct: Object.fromEntries(players.map((p) => [p.id, 0])),
    left: [],
    wave: 0,
    waveCorrect: 0,
    winner: null,
    result: null,
  };
}

export const isHost = (state: MatchState) => state.me === HOST_ID;

/** Where this phone's player sits; picks their team-mode cards. */
export const mySeat = (state: MatchState) => Math.max(0, state.players.findIndex((p) => p.id === state.me));

export function isOver(state: MatchState): boolean {
  return state.winner !== null || state.result !== null;
}

/** Team modes: right answers the team needs to clear the current wave (or beat the monster). */
export function waveTarget(state: MatchState): number {
  const playing = Math.max(1, state.players.length - state.left.length);
  return stagesFor(state.setup.mode)[state.wave].perPlayer * playing;
}

/** Players from most right answers to fewest; ties keep seating order. */
export function standings(state: MatchState): (PlayerInfo & { correct: number })[] {
  return state.players
    .map((p) => ({ ...p, correct: state.correct[p.id] ?? 0 }))
    .sort((a, b) => b.correct - a.correct);
}

/** What happens next, from this phone's side, and what it sends. */
export type Step = [MatchState, GameMessage[]];

/** Relay: who holds the baton. It goes round the players still in the game, in seating order. */
export function runner(state: MatchState): string {
  const playing = state.players.filter((p) => !state.left.includes(p.id));
  return (playing[state.waveCorrect % Math.max(1, playing.length)] ?? state.players[0]).id;
}

/** Relay: the lap the team is on (1-based), capped at the last. */
export const relayLap = (state: MatchState) =>
  Math.min(RELAY.laps, Math.floor(state.waveCorrect / Math.max(1, state.players.length - state.left.length)) + 1);

function count(state: MatchState, playerId: string, correct: boolean): MatchState {
  if (isOver(state) || !(playerId in state.correct)) return state;
  const relay = state.setup.mode === 'relay';
  // In a relay only the runner may answer, and every answer moves everyone to the next card.
  if (relay && playerId !== runner(state)) return state;
  const seen = relay ? { ...state, cards: state.cards + 1, last: { playerId, correct } } : state;
  if (!correct) return seen;
  return {
    ...seen,
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
    if (state.wave === stagesFor(state.setup.mode).length - 1) {
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

/** Team modes: the host's clock ran out. */
export function waveTimeUp(state: MatchState): Step {
  return referee(state, true);
}

/** How the match ended for this phone's player. */
export function outcomeFor(state: MatchState): 'won' | 'lost' | null {
  if (state.setup.mode === 'race') return state.winner === null ? null : state.winner === state.me ? 'won' : 'lost';
  return state.result;
}
