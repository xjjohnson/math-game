import type { AnswerRecord, Difficulty, GameConfig, Profile, Rng, SkillId, SkillProgress, Strand } from '@/types';
import { findSkill, SKILLS, type SkillDef } from '@/utils/skills/catalog';
import { createRng, pick, shuffle } from '@/utils/seededRandom';

/**
 * How the game decides what each player practises, with no settings:
 * - their grade is the starting point (skills from earlier grades count as known),
 * - each skill keeps the last 10 answers, and is learned at 8 of the last 10
 *   (or the first 5 all right, for something they already knew),
 * - a round is mostly the skills they're learning now, plus a few they know
 *   and the last one they found tricky.
 */

/** Answers kept per skill. */
export const RECENT = 10;
/** Right answers in the last 10 that count as learned. */
export const LEARNED_AT = 8;
/** All of the first this-many right also counts as learned. */
export const QUICK_LEARN = 5;

const ratio = (recent: string) => (recent.length === 0 ? 1 : [...recent].filter((c) => c === '1').length / recent.length);

export function isLearned(p: Pick<SkillProgress, 'recent'>): boolean {
  const right = [...p.recent].filter((c) => c === '1').length;
  if (p.recent.length >= QUICK_LEARN && p.recent.slice(-QUICK_LEARN) === '1'.repeat(QUICK_LEARN)) return true;
  return right >= LEARNED_AT;
}

/** Learned, but the last 5 answers had 2 or fewer right: time to practise it again. */
export function isShaky(p: Pick<SkillProgress, 'recent'>): boolean {
  const last = p.recent.slice(-5);
  return last.length === 5 && [...last].filter((c) => c === '1').length <= 2;
}

/** Updates the skill records from a round's answers. Returns the records and the skills newly learned. */
export function recordSkills(
  skills: Record<SkillId, SkillProgress>,
  history: readonly AnswerRecord[],
  today: string,
): { skills: Record<SkillId, SkillProgress>; learned: SkillId[] } {
  const next = { ...skills };
  const learned: SkillId[] = [];
  for (const r of history) {
    const id = r.problem.skill;
    if (!id || !findSkill(id)) continue;
    const old = next[id] ?? { recent: '', tries: 0, right: 0, learned: false };
    // A right answer after being walked through it isn't proof yet; a wrong one still counts.
    if (r.helped && r.correct) {
      next[id] = { ...old, tries: old.tries + 1 };
      continue;
    }
    const recent = (old.recent + (r.correct ? '1' : '0')).slice(-RECENT);
    let isNow = old.learned;
    if (!old.learned && isLearned({ recent })) isNow = true;
    else if (old.learned && isShaky({ recent })) isNow = false;
    if (isNow && !old.learned && !old.learnedOn) learned.push(id);
    next[id] = {
      ...old,
      recent,
      tries: old.tries + 1,
      right: old.right + (r.correct ? 1 : 0),
      learned: isNow,
      ...(isNow && !old.learnedOn ? { learnedOn: today } : {}),
    };
  }
  return { skills: next, learned };
}

/** Marks that help was opened on a skill. */
export function noteHelp(skills: Record<SkillId, SkillProgress>, id: SkillId): Record<SkillId, SkillProgress> {
  const old = skills[id] ?? { recent: '', tries: 0, right: 0, learned: false };
  return { ...skills, [id]: { ...old, helped: (old.helped ?? 0) + 1 } };
}

export type SkillState = 'known' | 'learning' | 'later';

/**
 * Whether a player knows a skill. Skills below their grade count as known
 * unless they've been getting them wrong; their own grade's skills have to be learned.
 */
export function knows(profile: Pick<Profile, 'grade' | 'skills'>, skill: SkillDef): boolean {
  const p = profile.skills?.[skill.id];
  if (p?.learned) return true;
  if (skill.grade < profile.grade) {
    if (!p) return true;
    return !(p.recent.length >= 4 && ratio(p.recent.slice(-5)) < 0.5);
  }
  return false;
}

/** Skills in teaching order for these strands (all when none). */
function skillsIn(strands: Strand[] | undefined, maxGrade = 12): SkillDef[] {
  return SKILLS.filter((s) => (!strands || strands.includes(s.strand)) && s.grade <= maxGrade);
}

/**
 * The next skill to learn in each strand: the first one not known, at or below
 * the player's grade (or the first above it once their grade is all known).
 */
export function frontier(profile: Pick<Profile, 'grade' | 'skills'>, strands?: Strand[]): SkillDef[] {
  const out: SkillDef[] = [];
  const all = skillsIn(strands);
  const strandList = strands ?? [...new Set(all.map((s) => s.strand))];
  for (const strand of strandList) {
    const inStrand = all.filter((s) => s.strand === strand);
    const next = inStrand.find((s) => !knows(profile, s) && s.grade <= profile.grade) ?? inStrand.find((s) => !knows(profile, s));
    if (next) out.push(next);
  }
  // Lower grades first: a gap from last year comes before something new.
  return out.sort((a, b) => a.grade - b.grade || SKILLS.indexOf(a) - SKILLS.indexOf(b));
}

/** Where each skill stands for this player, for the skill map. */
export function skillState(profile: Pick<Profile, 'grade' | 'skills'>, skill: SkillDef): SkillState {
  if (knows(profile, skill)) return 'known';
  return frontier(profile, [skill.strand]).some((s) => s.id === skill.id) ? 'learning' : 'later';
}

/** Skills known in these strands, near the player's grade (newest first). */
function knownSkills(profile: Pick<Profile, 'grade' | 'skills'>, strands?: Strand[]): SkillDef[] {
  return skillsIn(strands, profile.grade)
    .filter((s) => knows(profile, s) && s.grade >= profile.grade - 1)
    .reverse();
}

/** The skill missed most lately (in the last few answers), if any. */
function trickiest(profile: Pick<Profile, 'skills'>, among: SkillDef[]): SkillDef | undefined {
  let best: SkillDef | undefined;
  let worst = 1;
  for (const s of among) {
    const p = profile.skills?.[s.id];
    if (!p || p.recent.length === 0) continue;
    const r = ratio(p.recent.slice(-5));
    if (r < worst) {
      worst = r;
      best = s;
    }
  }
  return best;
}

/** How many of the 10 questions are new learning, by difficulty (Warm up / Just right / Challenge). */
const LEARNING_SLOTS: Record<Difficulty, number> = { easy: 4, medium: 7, hard: 8 };

/**
 * Picks the skill for each question of a round. Deterministic for a seed, so
 * it can be worked out once and sent along with the round.
 */
export function planRound(
  profile: Pick<Profile, 'grade' | 'skills'>,
  options: { strands?: Strand[]; focus?: SkillId; difficulty: Difficulty; count: number; seed: number; typedOnly?: boolean },
): SkillId[] {
  const { count, difficulty, strands } = options;
  if (options.focus && findSkill(options.focus)) return Array(count).fill(options.focus);
  const rng = createRng(options.seed ^ 0x5eed);
  // A worksheet only has number boxes, so it leaves out the pick-a-word questions.
  const usable = (s: SkillDef) => !options.typedOnly || isTyped(s);
  let learning = frontier(profile, strands).filter(usable);
  // Something from a later grade only when nothing at their own grade is left to learn.
  const atGrade = learning.filter((s) => s.grade <= profile.grade);
  if (atGrade.length) learning = atGrade;
  // Mix rounds keep to a few areas at once so they don't feel scattered.
  if (!strands) learning = pickSome(rng, learning, 3);
  if (difficulty === 'hard') {
    // Challenge: also peek at the skill after the next one.
    const ahead = learning
      .map((s) => skillsIn([s.strand]).find((t) => SKILLS.indexOf(t) > SKILLS.indexOf(s) && !knows(profile, t)))
      .filter((s): s is SkillDef => !!s);
    learning = [...learning, ...ahead.slice(0, 1)];
  }
  const known = knownSkills(profile, strands).filter(usable);
  const tricky = trickiest(profile, known);
  const slots: SkillId[] = [];
  const nLearning = learning.length === 0 ? 0 : known.length === 0 ? count : Math.min(count, LEARNING_SLOTS[difficulty]);
  for (let i = 0; i < nLearning; i++) slots.push(learning[i % learning.length].id);
  if (tricky && slots.length < count) slots.push(tricky.id);
  const pool = known.slice(0, 8);
  while (slots.length < count) {
    const fallback = pool.length ? pick(rng, pool) : learning[0] ?? skillsIn(strands).filter(usable)[0] ?? SKILLS[0];
    slots.push(fallback.id);
  }
  return shuffle(rng, slots);
}

const typedCache = new Map<SkillId, boolean>();

/** Whether a skill's questions are answered with a number (so they fit a worksheet's boxes). */
export function isTyped(skill: SkillDef): boolean {
  let typed = typedCache.get(skill.id);
  if (typed === undefined) {
    const sample = skill.make(createRng(7));
    typed = !sample.choiceOnly && !sample.flashMs;
    typedCache.set(skill.id, typed);
  }
  return typed;
}

function pickSome<T>(rng: Rng, items: T[], n: number): T[] {
  if (items.length <= n) return items;
  // Always keep the earliest (it's the biggest gap), then add some others.
  return [items[0], ...shuffle(rng, items.slice(1)).slice(0, n - 1)];
}

/** Fills in the plan of a skills round for this player; other rounds come back as they are. */
export function withPlan(config: GameConfig, profile: Pick<Profile, 'grade' | 'skills'> | undefined): GameConfig {
  const { mode } = config;
  if (mode.kind !== 'skills' || mode.plan?.length) return config;
  const player = profile ?? { grade: config.grade ?? 1, skills: {} };
  const plan = planRound(
    { grade: config.grade ?? player.grade, skills: player.skills ?? {} },
    {
      strands: mode.strands,
      focus: mode.focus,
      difficulty: config.difficulty,
      count: config.questionCount,
      seed: config.seed,
      typedOnly: !!config.worksheet,
    },
  );
  return { ...config, mode: { ...mode, plan } };
}

/** The same round settings with a new seed, and the skills picked again. */
export function freshRound(config: GameConfig, seed: number): GameConfig {
  const { mode } = config;
  if (mode.kind !== 'skills') return { ...config, seed };
  const { plan: _old, ...rest } = mode;
  return { ...config, seed, mode: rest };
}

/** The skill a skills round asks at `index`. */
export function plannedSkill(config: GameConfig, index: number): SkillDef {
  const mode = config.mode;
  const id = mode.kind === 'skills' ? (mode.plan?.[index % (mode.plan.length || 1)] ?? mode.focus) : undefined;
  return findSkill(id) ?? SKILLS[0];
}
