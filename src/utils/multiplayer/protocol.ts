import type { Difficulty, Operation } from '@/types';

/** Bump when messages change shape, so phones on different builds say so instead of misbehaving. */
export const PROTOCOL_VERSION = 2;

/** The host phone plus up to 7 friends. */
export const MAX_PLAYERS = 8;

/** The host's player id. Guests are known by the id the host's phone gives them. */
export const HOST_ID = 'host';

export type MatchMode = 'race' | 'coop';

/** Everything every phone needs to generate the same match. */
export interface MatchSetup {
  mode: MatchMode;
  operation: Operation;
  difficulty: Difficulty;
  seed: number;
}

export interface PlayerInfo {
  id: string;
  name: string;
  avatar: string;
}

/**
 * The only things phones say to each other. Kept tiny on purpose. Guests only
 * talk to the host; the host passes answers on to everyone.
 */
export type GameMessage =
  /** A guest introduces itself to the host. */
  | { type: 'hello'; version: number; name: string; avatar: string }
  /** The host tells one guest its player id. */
  | { type: 'welcome'; version: number; you: string }
  /** The host's list of who is in the game, host first. */
  | { type: 'lobby'; players: PlayerInfo[] }
  | { type: 'start'; setup: MatchSetup; players: PlayerInfo[] }
  | { type: 'answer'; correct: boolean; playerId: string }
  /** Co-op: the host moved everyone on to this wave (0-based). */
  | { type: 'wave'; wave: number }
  /** A player's phone dropped out of the match. */
  | { type: 'left'; playerId: string }
  /** The host's final call: a race winner, or a co-op result. */
  | { type: 'end'; winner?: string; result?: 'won' | 'lost' }
  | { type: 'bye' };

export function encodeMessage(message: GameMessage): string {
  return JSON.stringify(message);
}

const MODES: readonly string[] = ['race', 'coop'];
const OPERATIONS: readonly string[] = ['add', 'subtract', 'multiply', 'divide'];
const DIFFICULTIES: readonly string[] = ['easy', 'medium', 'hard'];

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;

function parsePlayers(v: unknown): PlayerInfo[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_PLAYERS) return null;
  const players: PlayerInfo[] = [];
  for (const p of v as Record<string, unknown>[]) {
    if (typeof p !== 'object' || p === null || !isId(p.id)) return null;
    if (typeof p.name !== 'string' || typeof p.avatar !== 'string') return null;
    players.push({ id: p.id, name: p.name.slice(0, 40), avatar: p.avatar.slice(0, 8) });
  }
  return players;
}

/** Parses a message from another phone, or returns null if it isn't one we understand. */
export function parseMessage(text: string): GameMessage | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const m = raw as Record<string, unknown>;
  switch (m.type) {
    case 'hello':
      return isInt(m.version) && typeof m.name === 'string' && typeof m.avatar === 'string'
        ? { type: 'hello', version: m.version, name: m.name.slice(0, 40), avatar: m.avatar.slice(0, 8) }
        : null;
    case 'welcome':
      return isInt(m.version) && isId(m.you) ? { type: 'welcome', version: m.version, you: m.you } : null;
    case 'lobby': {
      const players = parsePlayers(m.players);
      return players ? { type: 'lobby', players } : null;
    }
    case 'start': {
      const s = m.setup as Record<string, unknown> | undefined;
      const players = parsePlayers(m.players);
      if (
        !s ||
        !players ||
        !MODES.includes(s.mode as string) ||
        !OPERATIONS.includes(s.operation as string) ||
        !DIFFICULTIES.includes(s.difficulty as string) ||
        !isInt(s.seed)
      ) {
        return null;
      }
      const setup: MatchSetup = {
        mode: s.mode as MatchMode,
        operation: s.operation as Operation,
        difficulty: s.difficulty as Difficulty,
        seed: s.seed,
      };
      return { type: 'start', setup, players };
    }
    case 'answer':
      return typeof m.correct === 'boolean' && isId(m.playerId)
        ? { type: 'answer', correct: m.correct, playerId: m.playerId }
        : null;
    case 'wave':
      return isInt(m.wave) && m.wave >= 0 ? { type: 'wave', wave: m.wave } : null;
    case 'left':
      return isId(m.playerId) ? { type: 'left', playerId: m.playerId } : null;
    case 'end': {
      const winner = isId(m.winner) ? m.winner : undefined;
      const result = m.result === 'won' || m.result === 'lost' ? m.result : undefined;
      return winner || result ? { type: 'end', winner, result } : null;
    }
    case 'bye':
      return { type: 'bye' };
    default:
      return null;
  }
}
