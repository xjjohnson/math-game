import { HOME_AREAS, type AreaId } from '@/constants/room';
import { itemsIn } from '@/constants/shop';
import type { AnswerRecord, Difficulty, Grade, Problem, Profile, Rng } from '@/types';
import { addDays, dateSeed } from '@/utils/dates';
import { recordPrinterCheck } from '@/utils/printer';
import { findSkill } from '@/utils/skills/catalog';
import { planRound } from '@/utils/skills/plan';
import { createRng } from '@/utils/seededRandom';
import type { BuildingId } from '@/utils/town';

/**
 * Lolo, the hidden axolotl. Each player gets their own hiding spot each day, always by a
 * built-in thing that never moves (never behind furniture the kids place), and only in
 * rooms the player owns. Found once a day: one question at their level, then a reward.
 */

export const AXOLOTL_NAME = 'Lolo';

/** How Lolo shows while hiding: head over an edge, tail sticking out, or head above water. */
export type HidePose = 'peek' | 'tail' | 'water';

/** Where Lolo looks for today's spot first: the home's rooms, the backyard, or a town building. */
export type HideRegion = 'home' | 'backyard' | 'town';

interface SpotBase {
  id: string;
  /** Said in the clue and the parent area: "on top of the fridge". */
  name: string;
  pose: HidePose;
  /** Faces left instead of right. */
  flip?: boolean;
}

/** A spot in the buddy home: across in screens from the area's left wall, up in size units above the floor line (like a FixtureSpot). */
export interface HomeHideSpot extends SpotBase {
  kind: 'home';
  area: AreaId;
  left: number;
  bottom: number;
}

/** A spot inside a town building, as shares of the room's width and height (where Lolo's bottom rests). */
export interface TownHideSpot extends SpotBase {
  kind: 'town';
  place: BuildingId;
  x: number;
  y: number;
}

export type HideSpot = HomeHideSpot | TownHideSpot;

const home = (area: AreaId, id: string, name: string, left: number, bottom: number, pose: HidePose, flip?: boolean): HomeHideSpot => ({
  kind: 'home',
  id,
  name,
  area,
  left,
  bottom,
  pose,
  ...(flip ? { flip } : {}),
});
const town = (place: BuildingId, id: string, name: string, x: number, y: number, pose: HidePose, flip?: boolean): TownHideSpot => ({
  kind: 'town',
  id,
  name,
  place,
  x,
  y,
  pose,
  ...(flip ? { flip } : {}),
});

/** Every hiding spot. Home spots sit by the built-ins in constants/room.ts; town spots by the props in placeProps.ts. */
export const HIDE_SPOTS: HideSpot[] = [
  // Living room
  home('living', 'mantel', 'on the fireplace mantel', 1.48, 0.3, 'peek'),
  home('living', 'livingSill', 'on the window sill', 0.86, 0.27, 'peek', true),
  home('living', 'tvUnit', 'beside the TV cabinet', 2.1, 0, 'tail'),
  // Kitchen
  home('kitchen', 'fridgeTop', 'on top of the fridge', 0.8, 0.58, 'peek'),
  home('kitchen', 'sink', 'in the kitchen sink', 0.15, 0.24, 'water'),
  home('kitchen', 'diningTable', 'under the kitchen table', 1.45, 0, 'tail', true),
  // Bedroom
  home('bedroom', 'wallShelf', 'on the bedroom wall shelf', 0.5, 0.44, 'peek'),
  home('bedroom', 'wardrobeTop', 'on top of the wardrobe', 0.79, 0.62, 'peek', true),
  home('bedroom', 'underDesk', 'under the desk', 1.47, 0, 'tail'),
  // Bathroom
  home('bathroom', 'tub', 'in the bathtub', 0.52, 0.17, 'water'),
  home('bathroom', 'vanity', 'on the bathroom sink', 1.93, 0.22, 'peek', true),
  home('bathroom', 'washerTop', 'on the washing machine', 2.31, 0.26, 'peek'),
  // Playroom
  home('playroom', 'ballPit', 'in the ball pit', 0.8, 0.09, 'water'),
  home('playroom', 'toyChest', 'on the toy chest', 0.3, 0.2, 'peek', true),
  home('playroom', 'playShelf', 'on the toy shelf', 1.3, 0.42, 'peek'),
  // Backyard
  home('backyard', 'treeHouse', 'in the tree house window', 0.3, 0.33, 'peek'),
  home('backyard', 'fort', 'on the fort by the slide', 1.64, 0.275, 'peek', true),
  home('backyard', 'trampoline', 'beside the trampoline', 2.12, 0, 'tail'),
  // Study
  home('study', 'studyDesk', 'on the study desk', 1.12, 0.2, 'peek'),
  home('study', 'studyBooks', 'on top of the study bookcase', 0.74, 0.5, 'peek', true),
  // Garage
  home('garage', 'car', 'in the car', 1.22, 0.15, 'peek'),
  home('garage', 'toolCabinet', 'on the tool cabinet', 2.0, 0.45, 'peek', true),
  // Bedroom 2 and 3
  home('bedroom2', 'bed2', 'in bed in bedroom 2', 0.8, 0.15, 'peek'),
  home('bedroom2', 'dresser2', 'on the dresser in bedroom 2', 1.83, 0.26, 'peek', true),
  home('bedroom3', 'bunkTop', 'on the top bunk', 0.38, 0.38, 'peek'),
  home('bedroom3', 'toyChest3', 'on the toy chest in bedroom 3', 1.83, 0.2, 'peek', true),
  // Town
  town('shop', 'shopCounter', 'on the shop counter', 0.9, 0.45, 'peek'),
  town('shop', 'shopFridge', 'on top of the shop fridge', 0.38, 0.16, 'peek', true),
  town('shop', 'shopStand', 'on the fruit stand', 0.74, 0.48, 'peek'),
  town('bakery', 'oven', 'on top of the bakery oven', 0.5, 0.22, 'peek'),
  town('bakery', 'bakeryRack', 'on top of the bread rack', 0.9, 0.16, 'peek', true),
  town('bakery', 'bakeryShelf', 'on the bakery wall shelf', 0.3, 0.27, 'peek'),
  town('library', 'bookcase', 'on top of a library bookcase', 0.32, 0.18, 'peek'),
  town('library', 'libraryDesk', 'on the library desk', 0.76, 0.46, 'peek', true),
  town('library', 'nook', 'in the reading nook', 0.62, 0.74, 'tail'),
  town('park', 'pond', 'in the park pond', 0.71, 0.75, 'water'),
  town('park', 'sandbox', 'in the sandbox', 0.48, 0.72, 'peek', true),
  town('park', 'tree', 'in the park tree', 0.86, 0.3, 'peek'),
  town('school', 'schoolDesk', 'on a school desk', 0.61, 0.5, 'peek'),
  town('school', 'crayonTable', 'on the crayon table', 0.93, 0.5, 'peek', true),
  town('school', 'teacherDesk', 'on the teacher’s desk', 0.5, 0.46, 'peek'),
  town('farm', 'farmPond', 'in the farm pond', 0.81, 0.74, 'water', true),
  town('farm', 'coopRoof', 'on the hen house roof', 0.38, 0.24, 'peek'),
  town('farm', 'mud', 'in the mud puddle', 0.6, 0.79, 'water'),
];

export function findHideSpot(id: string | undefined): HideSpot | undefined {
  return HIDE_SPOTS.find((s) => s.id === id);
}

/** Which part of the game a spot is in, for the Home clue. */
export function regionOf(spot: HideSpot): HideRegion {
  if (spot.kind === 'town') return 'town';
  return spot.area === 'backyard' ? 'backyard' : 'home';
}

/** What the Home clue names for little ones: the room or the building. */
export function placeName(spot: HideSpot): string {
  if (spot.kind === 'town') return `the ${spot.place === 'shop' ? 'corner shop' : spot.place}`;
  const area = HOME_AREAS.find((a) => a.id === spot.area);
  return area ? `the ${area.name.toLowerCase()}` : 'the home';
}

/**
 * The home rooms a player can hide in: the rooms in their house that the hiding spots are
 * written for (the starting rooms and the original backyard, study, garage and bedrooms 2
 * and 3; rooms built later are skipped). None until they have a buddy, since the buddy home
 * only opens once they do.
 */
export function ownedAreas(profile: Pick<Profile, 'house' | 'unlocks'>): AreaId[] {
  if (!itemsIn('companion').some((item) => item.price === 0 || profile.unlocks.includes(item.id))) return [];
  const have = new Set((profile.house ?? []).filter((r) => r.id === r.look).map((r) => r.id));
  return HOME_AREAS.filter((a) => have.has(a.id)).map((a) => a.id);
}

/** The spots open to a player who owns these home rooms (town spots are open to everyone). */
export function openSpots(owned: readonly string[]): HideSpot[] {
  return HIDE_SPOTS.filter((s) => s.kind === 'town' || owned.includes(s.area));
}

/** A stable number for a player id, so siblings get different spots on the same day. */
function idSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The spot picked for a day from the open spots, ignoring yesterday. */
function rawSpot(day: string, playerId: string, spots: readonly HideSpot[]): HideSpot {
  const rng = createRng((dateSeed(day) * 31 + idSeed(playerId)) >>> 0);
  rng();
  return spots[Math.floor(rng() * spots.length)];
}

/**
 * Where Lolo hides today for this player. Stays put all day (and across restarts), is
 * worked out from the date and the player, and is never the same as yesterday's spot.
 */
export function spotFor(day: string, playerId: string, owned: readonly string[]): HideSpot {
  const spots = openSpots(owned);
  const yesterday = rawSpot(addDays(day, -1), playerId, spots);
  const today = rawSpot(day, playerId, spots);
  if (today.id !== yesterday.id || spots.length < 2) return today;
  const rest = spots.filter((s) => s.id !== yesterday.id);
  return rawSpot(day, playerId, rest);
}

/** Today's spot for a profile. */
export function todaysSpot(profile: Pick<Profile, 'id' | 'house' | 'unlocks'>, today: string): HideSpot {
  return spotFor(today, profile.id, ownedAreas(profile));
}

/** Lolo is turned off for this player in the parent area. */
export const axolotlOff = (profile: Pick<Profile, 'axolotl'>): boolean => !!profile.axolotl?.off;

/** Already found today: Lolo is napping until tomorrow. */
export const foundToday = (profile: Pick<Profile, 'axolotl'>, today: string): boolean => profile.axolotl?.day === today;

/** How many days the player has found Lolo. */
export const findsOf = (profile: Pick<Profile, 'axolotl'>): number => profile.axolotl?.finds ?? 0;

/** Lolo is hiding at this spot for the player right now (not found yet today, not switched off). */
export function hidingAt(profile: Pick<Profile, 'id' | 'house' | 'unlocks' | 'axolotl'>, today: string): HideSpot | null {
  if (axolotlOff(profile) || foundToday(profile, today)) return null;
  return todaysSpot(profile, today);
}

/**
 * Once found, Lolo asks question after question until a miss (or RUN_MAX right). Each right
 * answer pays more than the last, straight away, so leaving early keeps what was earned.
 */
export const RUN_MAX = 10;
/** Paid on top for getting all RUN_MAX right. */
export const JACKPOT = 25;
/** Paid when the very first question is missed, for finding Lolo. */
export const THANKS_COINS = 5;
/** Coins for the 1st, 2nd, ... right answer; the last one repeats. */
export const RUN_COINS = [10, 10, 15, 15, 20, 20, 25];
/** Right answers that pay a star: the first, the 5th and the 10th. */
export const STAR_STEPS = [1, 5, 10];

/** Coins for the `n`th right answer in a row (1-based), with the jackpot on the last. */
export function coinsFor(n: number): number {
  const base = RUN_COINS[Math.min(n, RUN_COINS.length) - 1] ?? 0;
  return base + (n === RUN_MAX ? JACKPOT : 0);
}

/** All the coins (before the payout setting) and stars a run of `right` in a row pays, ending in a miss or not. */
export function runTotal(right: number, missed: boolean): { coins: number; stars: number } {
  if (right === 0) return { coins: missed ? THANKS_COINS : 0, stars: 0 };
  let coins = 0;
  for (let n = 1; n <= right; n++) coins += coinsFor(n);
  return { coins, stars: STAR_STEPS.filter((n) => n <= right).length };
}

/** How hard question `n` (0-based) is: warm up, just right, challenge, then challenge a grade up. */
export function levelFor(n: number, grade: Grade): { difficulty: Difficulty; grade: Grade } {
  const difficulty: Difficulty = n < 2 ? 'easy' : n < 4 ? 'medium' : 'hard';
  const up = n >= 7 ? Math.min(6, grade + 1) : grade;
  return { difficulty, grade: up as Grade };
}

/** Lolo's colours, unlocked by counted finds (never spent). The first is the start colour. */
export interface AxolotlColor {
  id: string;
  name: string;
  body: string;
  gills: string;
  finds: number;
}

export const AXOLOTL_COLORS: AxolotlColor[] = [
  { id: 'pink', name: 'Pink', body: '#F7B6C8', gills: '#E86A92', finds: 0 },
  { id: 'gold', name: 'Golden', body: '#F8D774', gills: '#F2A23C', finds: 10 },
  { id: 'wild', name: 'Wild green', body: '#8DB07A', gills: '#5E7F4E', finds: 20 },
  { id: 'blue', name: 'Sparkly blue', body: '#9CC9F2', gills: '#5B8FD9', finds: 50 },
];

/** Finds that put Lolo in the living room fish tank when it's not hiding. */
export const TANK_FINDS = 5;
/** Finds that give Lolo a tiny crown. */
export const CROWN_FINDS = 30;

export const livesInTank = (profile: Pick<Profile, 'axolotl'>): boolean => findsOf(profile) >= TANK_FINDS;
export const hasCrown = (profile: Pick<Profile, 'axolotl'>): boolean => findsOf(profile) >= CROWN_FINDS;

/** The newest colour the player has unlocked (Lolo wears it). */
export function colorOf(profile: Pick<Profile, 'axolotl'>): AxolotlColor {
  const n = findsOf(profile);
  return [...AXOLOTL_COLORS].reverse().find((c) => n >= c.finds) ?? AXOLOTL_COLORS[0];
}

/** What a find count unlocks, if anything, said when it happens. */
export function unlockAt(finds: number): string | null {
  if (finds === TANK_FINDS) return `${AXOLOTL_NAME} moved into the living room fish tank!`;
  if (finds === CROWN_FINDS) return `${AXOLOTL_NAME} got a tiny crown!`;
  const color = AXOLOTL_COLORS.find((c) => c.finds === finds && c.finds > 0);
  return color ? `${AXOLOTL_NAME} turned ${color.name.toLowerCase()}!` : null;
}

/** Question `n` (0-based) of today's run, from the player's skill list, harder as the run goes on. */
export function runQuestion(profile: Pick<Profile, 'grade' | 'skills'>, n: number, rng: Rng): Problem {
  const level = levelFor(n, profile.grade);
  const player = { grade: level.grade, skills: profile.skills ?? {} };
  const [id] = planRound(player, { difficulty: level.difficulty, count: 1, seed: Math.floor(rng() * 2 ** 31) });
  return findSkill(id)!.make(rng);
}

export type StartResult = { ok: true; profile: Profile; unlock: string | null } | { ok: false; reason: 'already' | 'off' };

/** The first question is about to show: today's find is used (and counted for unlocks) from here on. */
export function startRun(profile: Profile, today: string): StartResult {
  if (axolotlOff(profile)) return { ok: false, reason: 'off' };
  if (foundToday(profile, today)) return { ok: false, reason: 'already' };
  const finds = findsOf(profile) + 1;
  return { ok: true, profile: { ...profile, axolotl: { ...profile.axolotl, day: today, finds, run: 0, over: false } }, unlock: unlockAt(finds) };
}

export interface AnswerPay {
  profile: Profile;
  coins: number;
  stars: number;
  learned: number;
  /** Right answers in a row so far. */
  run: number;
  /** The run has ended. */
  over: boolean;
  /** A new longest run. */
  best: boolean;
}

/**
 * Pays one answer of today's run as it happens: a right one pays its coins (and a star on
 * the 1st, 5th and 10th); a miss ends the run (paying the thank-you if it was the first).
 * Answers after the run has ended, or on another day, pay nothing.
 */
export function answerRun(profile: Profile, today: string, record: AnswerRecord, coinPayout = 1): AnswerPay {
  const state = profile.axolotl;
  const run = state?.run ?? 0;
  if (!state || state.day !== today || state.over) return { profile, coins: 0, stars: 0, learned: 0, run, over: true, best: false };
  const n = record.correct ? run + 1 : run;
  const over = !record.correct || n >= RUN_MAX;
  const coins = Math.round((record.correct ? coinsFor(n) : run === 0 ? THANKS_COINS : 0) * coinPayout);
  const stars = record.correct && STAR_STEPS.includes(n) ? 1 : 0;
  const best = n > (state.best ?? 0);
  const paid: Profile = {
    ...profile,
    coins: profile.coins + coins,
    stars: profile.stars + stars,
    axolotl: { ...state, run: n, over, best: Math.max(state.best ?? 0, n) },
  };
  const { profile: next, learned } = recordPrinterCheck(paid, [record], today);
  return { profile: next, coins, stars, learned, run: n, over, best: best && n > 1 };
}

/** Today's run is under way (started and not over): the panel can pick it up again. */
export const runGoing = (profile: Pick<Profile, 'axolotl'>, today: string): boolean =>
  profile.axolotl?.day === today && !profile.axolotl.over;

/** The longest run ever. */
export const bestRun = (profile: Pick<Profile, 'axolotl'>): number => profile.axolotl?.best ?? 0;

/** Parent area: turns Lolo on or off for a player. */
export function setAxolotlOff(profile: Profile, off: boolean): Profile {
  const { off: _was, ...rest } = profile.axolotl ?? { finds: 0 };
  return { ...profile, axolotl: off ? { ...rest, off: true } : rest };
}

/** The Home clue: where to start looking. Little ones (K to 2nd) also hear the room or building. */
export function clueFor(profile: Pick<Profile, 'id' | 'house' | 'unlocks' | 'axolotl' | 'grade'>, today: string): string | null {
  if (axolotlOff(profile)) return null;
  if (foundToday(profile, today)) return `You found ${AXOLOTL_NAME} today!`;
  const spot = todaysSpot(profile, today);
  const region = regionOf(spot);
  const where = region === 'home' ? 'at home' : region === 'backyard' ? 'in the backyard' : 'in town';
  const little = profile.grade <= 2;
  return little && region !== 'backyard' ? `${AXOLOTL_NAME} is hiding ${where}, in ${placeName(spot)}!` : `${AXOLOTL_NAME} is hiding ${where} today!`;
}
