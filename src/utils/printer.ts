import {
  FILAMENTS,
  findFilament,
  findPrintToy,
  PRINT_TOYS,
  PRINTS_PER_SPOOL,
  printId,
  SPOOL_PRICE,
  type FilamentId,
  type PrintToyId,
} from '@/constants/printer';
import { MAX_ROOM_THINGS, ROOM_SPAN } from '@/constants/room';
import { AREA_COUNT } from '@/utils/room';
import type { AnswerRecord, Problem, Profile, Rng, RoomThing } from '@/types';
import { SKILL_STARS } from '@/utils/progress';
import { findSkill } from '@/utils/skills/catalog';
import { planRound, recordSkills } from '@/utils/skills/plan';
import { grantStarRewards } from '@/utils/starLevels';

/** Toys left to print in a filament. */
export const filamentLeft = (profile: Pick<Profile, 'filament'>, id: string): number => profile.filament?.[id] ?? 0;

/** Whether the player's stars have unlocked a toy or a filament. */
export const unlocked = (profile: Pick<Profile, 'stars'>, thing: { stars: number }): boolean => profile.stars >= thing.stars;

export const unlockedToys = (profile: Pick<Profile, 'stars'>) => PRINT_TOYS.filter((t) => unlocked(profile, t));
export const unlockedFilaments = (profile: Pick<Profile, 'stars'>) => FILAMENTS.filter((f) => unlocked(profile, f));

export type FilamentBuyResult = { ok: true; profile: Profile } | { ok: false; reason: 'coins' | 'locked' | 'unknown' };

/** Buys one spool (PRINTS_PER_SPOOL toys) of a filament. */
export function buyFilament(profile: Profile, id: string): FilamentBuyResult {
  const f = findFilament(id);
  if (!f) return { ok: false, reason: 'unknown' };
  if (!unlocked(profile, f)) return { ok: false, reason: 'locked' };
  if (profile.coins < SPOOL_PRICE) return { ok: false, reason: 'coins' };
  return {
    ok: true,
    profile: {
      ...profile,
      coins: profile.coins - SPOOL_PRICE,
      filament: { ...profile.filament, [id]: filamentLeft(profile, id) + PRINTS_PER_SPOOL },
    },
  };
}

export type PrintResult =
  | { ok: true; profile: Profile; key: string }
  | { ok: false; reason: 'filament' | 'locked' | 'full' | 'noPrinter' | 'unknown' };

/** Where a new toy lands: on the floor just to the right of the printer (or left, at the home's right end). */
export function printSpot(printer: RoomThing): { x: number; y: number } {
  const step = 0.3 / AREA_COUNT / ROOM_SPAN;
  const x = printer.x + step <= 0.995 ? printer.x + step : printer.x - step;
  return { x, y: 0.9 };
}

/**
 * Uses one print of `filament` to make `toy`: it is added to the home next to the printer
 * right away, so it's kept even if the player leaves before the animation ends.
 */
export function printToy(profile: Profile, printerKey: string, toy: string, filament: string, key: string): PrintResult {
  const t = findPrintToy(toy);
  const f = findFilament(filament);
  if (!t || !f) return { ok: false, reason: 'unknown' };
  const printer = profile.room.things.find((p) => p.key === printerKey && p.placed);
  if (!printer) return { ok: false, reason: 'noPrinter' };
  if (!unlocked(profile, t) || !unlocked(profile, f)) return { ok: false, reason: 'locked' };
  if (filamentLeft(profile, f.id) < 1) return { ok: false, reason: 'filament' };
  if (profile.room.things.length >= MAX_ROOM_THINGS) return { ok: false, reason: 'full' };
  const thing: RoomThing = { key, itemId: printId(t.id as PrintToyId, f.id as FilamentId), placed: true, ...printSpot(printer) };
  return {
    ok: true,
    key,
    profile: {
      ...profile,
      filament: { ...profile.filament, [f.id]: filamentLeft(profile, f.id) - 1 },
      room: { ...profile.room, things: [...profile.room.things, thing] },
    },
  };
}

/** One printer check question from the child's skill list (what they're learning, or one to keep fresh). */
export function printerCheck(profile: Pick<Profile, 'grade' | 'skills'>, rng: Rng): Problem {
  const player = { grade: profile.grade, skills: profile.skills ?? {} };
  const [id] = planRound(player, { difficulty: 'easy', count: 1, seed: Math.floor(rng() * 2 ** 31) });
  return findSkill(id)!.make(rng);
}

/** Saves printer check answers to the skill record (+SKILL_STARS for each newly learned skill). */
export function recordPrinterCheck(profile: Profile, history: readonly AnswerRecord[], today: string): { profile: Profile; learned: number } {
  if (!history.length) return { profile, learned: 0 };
  const { skills, learned } = recordSkills(profile.skills ?? {}, history, today);
  const next = grantStarRewards({ ...profile, skills, stars: profile.stars + learned.length * SKILL_STARS }).profile;
  return { profile: next, learned: learned.length };
}
