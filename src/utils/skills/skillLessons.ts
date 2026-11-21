import type { Operation, Rng, SkillId, Strand } from '@/types';
import { LESSONS, RENAMED_LESSONS, type Lesson, type LessonStep } from '@/utils/lessons';
import { createRng } from '@/utils/seededRandom';
import { findSkill } from '@/utils/skills/catalog';
import { waysFor } from '@/utils/skills/help';

/**
 * More "Learn how" lessons, built from the same help the game gives during play:
 * each one makes a fresh question for a skill and walks through one way of
 * solving it, answer included. So a lesson and in-game help always match.
 */

interface Spec {
  id: string;
  title: string;
  emoji: string;
  summary: string;
  skill: SkillId;
  /** Which way to show (help way id). */
  way: string;
  showWork?: boolean;
}

const SPECS: Spec[] = [
  // Counting and place value
  { id: 'count-objects', title: 'Count each one once', emoji: '👆', summary: 'Touch, move and count. The last number is how many.', skill: 'k-count', way: 'think' },
  { id: 'number-bonds', title: 'Number bonds', emoji: '🔗', summary: 'A whole and its two parts.', skill: 'k-bonds', way: 'think' },
  { id: 'place-blocks', title: 'Hundreds, tens and ones', emoji: '🧱', summary: 'Flats, rods and cubes show what each digit is worth.', skill: 'g2-place-1000', way: 'think' },
  { id: 'compare-numbers', title: 'Bigger or smaller', emoji: '🐊', summary: 'Look at the biggest place first. The mouth eats the bigger one.', skill: 'g2-compare', way: 'think' },
  { id: 'even-odd', title: 'Even and odd', emoji: '👯', summary: 'Pairs with none left over are even.', skill: 'g2-even-odd', way: 'think' },
  // Adding
  { id: 'add-blocks', title: 'Add with blocks', emoji: '🧱', summary: 'Push the tens and ones together. 10 ones bundle into a ten.', skill: 'g2-add-bundle', way: 'blocks' },
  { id: 'add-break-apart', title: 'Break it apart (adding)', emoji: '🧩', summary: 'Add the tens, then the ones, on a number line.', skill: 'g2-add-bundle', way: 'break-apart' },
  { id: 'add-friendly', title: 'Friendly numbers (adding)', emoji: '🤝', summary: 'Round to a ten, add, then fix it.', skill: 'g2-add-bundle', way: 'friendly' },
  // Taking away
  { id: 'sub-blocks', title: 'Trade with blocks', emoji: '🔁', summary: 'Not enough ones? Unbundle a ten into 10 ones.', skill: 'g2-sub-trade', way: 'blocks' },
  { id: 'sub-back-to-ten', title: 'Back to ten', emoji: '🎯', summary: 'Jump back to the ten first, then the rest.', skill: 'g2-sub-trade-1d', way: 'break-apart' },
  { id: 'sub-break-apart', title: 'Break it apart (taking away)', emoji: '🧩', summary: 'Take away the tens, then the ones.', skill: 'g2-sub-trade', way: 'break-apart' },
  { id: 'sub-friendly', title: 'Friendly numbers (taking away)', emoji: '🤝', summary: 'Take away a ten, then give a little back.', skill: 'g2-sub-trade', way: 'friendly' },
  { id: 'sub-zero', title: 'Trading across a zero', emoji: '0️⃣', summary: 'No tens? Unbundle a hundred first, then a ten.', skill: 'g2-sub-zero', way: 'blocks' },
  // Stories
  { id: 'bar-models', title: 'Bar models', emoji: '📊', summary: 'Draw the whole and the parts to see what to do.', skill: 'g2-tape', way: 'think' },
  // Times
  { id: 'times-arrays', title: 'Rows and columns', emoji: '🔲', summary: 'An array shows times: rows of the same number.', skill: 'g3-times-3-4', way: 'array' },
  { id: 'times-tens', title: 'Times tens', emoji: '🔟', summary: '5 × 40 is 5 × 4 tens.', skill: 'g3-times-tens', way: 'tens' },
  // Time, money, measuring
  { id: 'tell-time', title: 'Tell the time', emoji: '🕒', summary: 'Short hand for hours, long hand for minutes.', skill: 'g2-time', way: 'think' },
  { id: 'count-coins', title: 'Count coins', emoji: '🪙', summary: 'Biggest coins first, then count on.', skill: 'g2-coins', way: 'think' },
  { id: 'make-change', title: 'Make change', emoji: '🧾', summary: 'Count up from the price to what you paid.', skill: 'g2-change', way: 'count-up' },
  { id: 'measure', title: 'Use a ruler', emoji: '📏', summary: 'Start at 0 and read where it ends.', skill: 'g2-measure', way: 'think' },
  // Shapes and fractions
  { id: 'area', title: 'Area', emoji: '🟩', summary: 'Count the squares inside: rows times columns.', skill: 'g3-area', way: 'think' },
  { id: 'perimeter', title: 'Perimeter', emoji: '🚶', summary: 'Add up all the sides, the walk around the edge.', skill: 'g3-perimeter', way: 'think' },
  { id: 'fractions', title: 'Fractions', emoji: '🍕', summary: 'Equal parts in all on the bottom, shaded on top.', skill: 'g3-fraction', way: 'think' },
  { id: 'fraction-line', title: 'Fractions on a number line', emoji: '📍', summary: 'Count the equal jumps from 0.', skill: 'g3-fraction-line', way: 'think' },
];

/** The steps of one way, on a fresh question that suits it. */
function stepsFor(spec: Spec, rng: Rng): LessonStep[] {
  const skill = findSkill(spec.skill)!;
  for (let tries = 0; tries < 40; tries++) {
    const problem = skill.make(createRng(Math.floor(rng() * 2 ** 31)));
    const way = waysFor(problem, true).find((w) => w.id === spec.way);
    if (!way) continue;
    // Picture and word questions start by showing the question itself.
    const intro: LessonStep[] = problem.ask ? [{ text: problem.ask, visual: problem.picture ? { kind: 'picture', picture: problem.picture } : problem.prompt ? { kind: 'big', text: problem.prompt } : undefined }] : [];
    return [...intro, ...way.steps];
  }
  return [{ text: skill.example }];
}

const operationOf = (strand: Strand, fallback: Operation): Operation =>
  strand === 'add' || strand === 'subtract' || strand === 'multiply' || strand === 'divide' ? strand : fallback;

const AGES = ['5-6', '6-7', '7-8', '8-9', '9-10'];

export const SKILL_LESSONS: Lesson[] = SPECS.map((spec) => {
  const skill = findSkill(spec.skill)!;
  return {
    id: spec.id,
    title: spec.title,
    emoji: spec.emoji,
    operation: operationOf(skill.strand, skill.operation),
    strand: skill.strand,
    grade: skill.grade,
    ages: AGES[skill.grade] ?? '9-12',
    summary: spec.summary,
    build: (rng) => stepsFor(spec, rng),
    practice: { mode: { kind: 'skills', focus: spec.skill }, difficulty: 'medium', showWork: spec.showWork },
  };
});

const strandOfOperation = (op: Operation): Strand => op;

/** Every lesson, school methods first then the skill lessons, each with its strand. */
export const ALL_LESSONS: Lesson[] = [
  ...LESSONS.map((l) => ({ ...l, strand: l.strand ?? strandOfOperation(l.operation) })),
  ...SKILL_LESSONS,
].sort((a, b) => a.grade - b.grade);

export const findLesson = (id: string | undefined) => {
  const wanted = id && RENAMED_LESSONS[id] ? RENAMED_LESSONS[id] : id;
  return ALL_LESSONS.find((l) => l.id === wanted);
};
