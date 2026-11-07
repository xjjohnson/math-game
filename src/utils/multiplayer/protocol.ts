import { isGrade } from '@/constants/grades';
import type { Difficulty, Grade, Operation } from '@/types';
import { parseHomeSnapshot, type HomeSnapshot } from '@/utils/homeVisit';

/** Bump when messages change shape, so phones on different builds say so instead of misbehaving. */
export const PROTOCOL_VERSION = 7;

/**
 * The oldest version that can still play matches with this one. v5 only added
 * community visits (new message types that older phones ignore), so v4 phones
 * can still join a game; they just don't show up in the community.
 */
export const MIN_GAME_VERSION = 4;

/** The first version that understands community visits. */
export const TOWN_VERSION = 5;

/** Where a visitor is in the community: the street, or inside one building. */
export type TownPlace = 'street' | 'shop' | 'bakery' | 'library' | 'park';
export const TOWN_PLACES: readonly TownPlace[] = ['street', 'shop', 'bakery', 'library', 'park'];

/** The first version that can show a friend's buddy home (and move things in the community rooms). */
export const HOME_VERSION = 7;

/** The first version that lets everyone drag the people around a shared scene. */
export const SCENE_VERSION = 6;

/** One visitor and where they are right now. x and y (0 to 1 across the scene) are where they were put, if anyone has moved them. */
export interface TownPerson extends PlayerInfo {
  place: TownPlace;
  x?: number;
  y?: number;
}

/** The host phone plus up to 7 friends. */
export const MAX_PLAYERS = 8;

/** The host's player id. Guests are known by the id the host's phone gives them. */
export const HOST_ID = 'host';

export type MatchMode = 'race' | 'coop' | 'monster' | 'relay';

/** Everything every phone needs to generate the same match. */
export interface MatchSetup {
  mode: MatchMode;
  operation: Operation;
  /** The host's own level. Each player plays at their own, except in Relay, where everyone shares the host's cards. */
  difficulty: Difficulty;
  grade?: Grade;
  seed: number;
}

export interface PlayerInfo {
  id: string;
  name: string;
  avatar: string;
  /** Community: buddies (emoji or "@key" drawings) walking with this player, up to MAX_BUDDIES. */
  buddies?: string[];
  /** Community: an accessory (emoji) this player is wearing, if any. */
  acc?: string;
}

export const MAX_BUDDIES = 3;

/** People, their buddies, and the things in the rooms (and their switches) that anyone can move. */
export const MAX_SPOTS = 240;

/** Where a piece was put in its scene: a player's id, or `${playerId}:b${n}` for one of their buddies. */
export interface SpotEntry {
  id: string;
  x: number;
  y: number;
}

/** Whose piece an id is: the player id before any colon. */
export const ownerOf = (pieceId: string): string => pieceId.split(':')[0];
export const buddyPieceId = (playerId: string, n: number): string => `${playerId}:b${n}`;

/** Starts the name a phone advertises when it hosts a community visit, so games and visits don't mix in the finder. */
export const TOWN_MARK = '🏘️';

/**
 * The only things phones say to each other. Kept tiny on purpose. Guests only
 * talk to the host; the host passes answers on to everyone.
 */
export type GameMessage =
  /** A guest introduces itself to the host. */
  | { type: 'hello'; version: number; name: string; avatar: string; buddies?: string[]; acc?: string }
  /** The host tells one guest its player id. */
  | { type: 'welcome'; version: number; you: string }
  /** The host's list of who is in the game, host first. */
  | { type: 'lobby'; players: PlayerInfo[] }
  | { type: 'start'; setup: MatchSetup; players: PlayerInfo[] }
  | { type: 'answer'; correct: boolean; playerId: string }
  /** Co-op Defense: the host moved everyone on to this wave (0-based). */
  | { type: 'wave'; wave: number }
  /** A player's phone dropped out of the match. */
  | { type: 'left'; playerId: string }
  /** The host's final call: a race winner, or a team result. */
  | { type: 'end'; winner?: string; result?: 'won' | 'lost' }
  | { type: 'bye' }
  /** Community (v5): a guest says where it is now, or null when it left the community. */
  | { type: 'visit'; place: TownPlace | null }
  /** Community (v5): the host tells everyone who is where. Only people in the community are listed. */
  | { type: 'town'; people: TownPerson[]; spots?: SpotEntry[] }
  /** Community (v5): a wave. Guests send it to the host, who passes it on with the sender's id. */
  | { type: 'hi'; playerId?: string }
  /** Community: a guest changed its buddies or accessory. */
  | { type: 'look'; buddies: string[]; acc?: string }
  /** Scene (v6): a phone moves its own person or buddies, or (v7) a thing in a room (ids starting "~"); the host keeps the spot and passes it on. x and y run 0 to 1. */
  | { type: 'move'; id: string; x: number; y: number }
  /**
   * Homes (v7): ask to see player `of`'s buddy home. Guests ask the host; the host
   * passes the ask on to `of`, saying who it is `for`.
   */
  | { type: 'home-ask'; of: string; for?: string }
  /** Homes (v7): player `of`'s home, or null if it can't be shown. The host passes it on to `for`. */
  | { type: 'home'; of: string; for?: string; home: HomeSnapshot | null };

export function encodeMessage(message: GameMessage): string {
  return JSON.stringify(message);
}

const MODES: readonly string[] = ['race', 'coop', 'monster', 'relay'];
const OPERATIONS: readonly string[] = ['add', 'subtract', 'multiply', 'divide'];
const DIFFICULTIES: readonly string[] = ['easy', 'medium', 'hard'];

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;

const parseBuddies = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((b): b is string => typeof b === 'string' && b.length > 0).map((b) => b.slice(0, 16)).slice(0, MAX_BUDDIES) : [];
const parseAcc = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v.slice(0, 8) : undefined);

function parsePlayers(v: unknown): PlayerInfo[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_PLAYERS) return null;
  const players: PlayerInfo[] = [];
  for (const p of v as Record<string, unknown>[]) {
    if (typeof p !== 'object' || p === null || !isId(p.id)) return null;
    if (typeof p.name !== 'string' || typeof p.avatar !== 'string') return null;
    const buddies = parseBuddies(p.buddies);
    const acc = parseAcc(p.acc);
    players.push({
      id: p.id,
      name: p.name.slice(0, 40),
      avatar: p.avatar.slice(0, 8),
      ...(buddies.length ? { buddies } : {}),
      ...(acc ? { acc } : {}),
    });
  }
  return players;
}

const isUnit = (v: unknown): v is number => typeof v === 'number' && v >= 0 && v <= 1;
const parseSpotList = (v: unknown): SpotEntry[] =>
  Array.isArray(v)
    ? v
        .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
        .filter((e) => isId(e.id) && isUnit(e.x) && isUnit(e.y))
        .slice(0, MAX_SPOTS)
        .map((e) => ({ id: e.id as string, x: e.x as number, y: e.y as number }))
    : [];
const isPlace = (v: unknown): v is TownPlace => TOWN_PLACES.includes(v as TownPlace);

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
        ? {
            type: 'hello',
            version: m.version,
            name: m.name.slice(0, 40),
            avatar: m.avatar.slice(0, 8),
            ...(parseBuddies(m.buddies).length ? { buddies: parseBuddies(m.buddies) } : {}),
            ...(parseAcc(m.acc) ? { acc: parseAcc(m.acc) } : {}),
          }
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
        ...(isGrade(s.grade) ? { grade: s.grade } : {}),
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
    case 'visit':
      return m.place === null ? { type: 'visit', place: null } : isPlace(m.place) ? { type: 'visit', place: m.place } : null;
    case 'town': {
      const spotList = parseSpotList(m.spots);
      if (Array.isArray(m.people) && m.people.length === 0) return { type: 'town', people: [], ...(spotList.length ? { spots: spotList } : {}) };
      const players = parsePlayers(m.people);
      if (!players) return null;
      const places = (m.people as Record<string, unknown>[]).map((p) => p.place);
      if (!places.every(isPlace)) return null;
      const raw = m.people as Record<string, unknown>[];
      return {
        type: 'town',
        people: players.map((p, i) => {
          const { x, y } = raw[i];
          return { ...p, place: places[i] as TownPlace, ...(isUnit(x) && isUnit(y) ? { x, y } : {}) };
        }),
        ...(spotList.length ? { spots: spotList } : {}),
      };
    }
    case 'look':
      return { type: 'look', buddies: parseBuddies(m.buddies), ...(parseAcc(m.acc) ? { acc: parseAcc(m.acc) } : {}) };
    case 'move':
      return isId(m.id) && isUnit(m.x) && isUnit(m.y) ? { type: 'move', id: m.id, x: m.x, y: m.y } : null;
    case 'hi':
      return { type: 'hi', ...(isId(m.playerId) ? { playerId: m.playerId } : {}) };
    case 'home-ask':
      return isId(m.of) ? { type: 'home-ask', of: m.of, ...(isId(m.for) ? { for: m.for } : {}) } : null;
    case 'home': {
      if (!isId(m.of)) return null;
      const home = m.home === null ? null : parseHomeSnapshot(m.home);
      if (m.home !== null && !home) return null;
      return { type: 'home', of: m.of, ...(isId(m.for) ? { for: m.for } : {}), home };
    }
    default:
      return null;
  }
}
