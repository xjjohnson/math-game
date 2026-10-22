import type { Difficulty, Operation } from '@/types';

/** Bump when messages change shape, so phones on different builds say so instead of misbehaving. */
export const PROTOCOL_VERSION = 1;

export type Role = 'host' | 'guest';
export type MatchMode = 'race' | 'coop';

/** Everything both phones need to generate the same match. */
export interface MatchSetup {
  mode: MatchMode;
  operation: Operation;
  difficulty: Difficulty;
  seed: number;
}

/** The only things two phones say to each other. Kept tiny on purpose. */
export type GameMessage =
  | { type: 'hello'; version: number; name: string; avatar: string }
  | { type: 'start'; setup: MatchSetup }
  | { type: 'answer'; cardIndex: number; correct: boolean; playerId: Role }
  /** Co-op: the host moved everyone on to this wave (0-based). */
  | { type: 'wave'; wave: number }
  /** The host's final call: a race winner, or a co-op result. */
  | { type: 'end'; winner?: Role; result?: 'won' | 'lost' }
  | { type: 'bye' };

export function encodeMessage(message: GameMessage): string {
  return JSON.stringify(message);
}

const ROLES: readonly string[] = ['host', 'guest'];
const MODES: readonly string[] = ['race', 'coop'];
const OPERATIONS: readonly string[] = ['add', 'subtract', 'multiply', 'divide'];
const DIFFICULTIES: readonly string[] = ['easy', 'medium', 'hard'];

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** Parses a message from the other phone, or returns null if it isn't one we understand. */
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
    case 'start': {
      const s = m.setup as Record<string, unknown> | undefined;
      if (
        !s ||
        !MODES.includes(s.mode as string) ||
        !OPERATIONS.includes(s.operation as string) ||
        !DIFFICULTIES.includes(s.difficulty as string) ||
        !isInt(s.seed)
      ) {
        return null;
      }
      return { type: 'start', setup: s as unknown as MatchSetup };
    }
    case 'answer':
      return isInt(m.cardIndex) && typeof m.correct === 'boolean' && ROLES.includes(m.playerId as string)
        ? { type: 'answer', cardIndex: m.cardIndex, correct: m.correct, playerId: m.playerId as Role }
        : null;
    case 'wave':
      return isInt(m.wave) && m.wave >= 0 ? { type: 'wave', wave: m.wave } : null;
    case 'end': {
      const winner = ROLES.includes(m.winner as string) ? (m.winner as Role) : undefined;
      const result = m.result === 'won' || m.result === 'lost' ? m.result : undefined;
      return winner || result ? { type: 'end', winner, result } : null;
    }
    case 'bye':
      return { type: 'bye' };
    default:
      return null;
  }
}
