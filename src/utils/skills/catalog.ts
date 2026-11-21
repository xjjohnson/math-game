import type { Difficulty, Grade, Operation, Problem, Rng, SkillId, Strand } from '@/types';
import { generate } from '@/utils/mathEngine';
import * as add from '@/utils/skills/arithmetic';
import * as geo from '@/utils/skills/geometry';
import * as measure from '@/utils/skills/measurement';
import * as mult from '@/utils/skills/multiply';
import * as ns from '@/utils/skills/numberSense';
import * as story from '@/utils/skills/stories';

/**
 * Every skill the game teaches, in teaching order. Grades run K (0) to 12, so
 * later grades only add entries here. A skill makes its own questions; the
 * mix in skills/plan.ts decides which skills a round uses for each player.
 */
export interface SkillDef {
  id: SkillId;
  strand: Strand;
  /** School grade it belongs to: 0 is kindergarten, up to 12. */
  grade: number;
  /** Kid-sized name, e.g. "Trade a ten". */
  title: string;
  /** A typical question, e.g. "63 − 28". */
  example: string;
  /** Family used for the card's color and the coins it pays. */
  operation: Operation;
  /** Extra coins per right answer, for the skills that take more steps (trading). */
  bonus?: number;
  make: (rng: Rng) => Problem;
}

type Maker = (id: SkillId, rng: Rng) => Problem;

const skill = (
  id: SkillId,
  strand: Strand,
  grade: number,
  title: string,
  example: string,
  operation: Operation,
  maker: Maker,
  bonus?: number,
): SkillDef => ({ id, strand, grade, title, example, operation, make: (rng) => maker(id, rng), ...(bonus ? { bonus } : {}) });

const K_SKILLS: SkillDef[] = [
  skill('k-count', 'count', 0, 'Count things', 'How many apples?', 'add', ns.countThings),
  skill('k-quick-look', 'count', 0, 'Quick looks', 'Dice dots', 'add', ns.quickLook),
  skill('k-next', 'count', 0, 'What comes next (to 100)', '27, 28, 29, ☐', 'add', (id, rng) => ns.whatComesNext(id, rng, 100)),
  skill('k-compare', 'count', 0, 'Which has more?', '5 or 3 apples', 'add', ns.compareGroups),
  skill('k-bonds', 'count', 0, 'Number bonds to 10', '7 is 4 and ☐', 'subtract', ns.numberBond),
  skill('k-make-ten', 'add', 0, 'Make a ten', '6 + ☐ = 10', 'add', ns.makeTen),
  skill('k-add-10', 'add', 0, 'Adding within 10', '4 + 3', 'add', add.addWithin10),
  skill('k-sub-10', 'subtract', 0, 'Taking away within 10', '8 − 3', 'subtract', add.subWithin10),
  skill('k-shapes', 'shapes', 0, 'Flat shapes', 'Circle, square, triangle', 'add', geo.nameShape2D),
  skill('k-solids', 'shapes', 0, 'Solid shapes', 'Cube, sphere, cone', 'add', geo.nameShape3D),
];

const G1_SKILLS: SkillDef[] = [
  skill('g1-count-20', 'count', 1, 'Count to 20', 'How many stars?', 'add', (id, rng) => ns.countThings(id, rng, 20)),
  skill('g1-next-120', 'count', 1, 'Count to 120', '98, 99, 100, ☐', 'add', (id, rng) => ns.whatComesNext(id, rng, 120)),
  skill('g1-compare', 'place', 1, 'Compare 2-digit numbers', '34 ☐ 43', 'add', (id, rng) => ns.compareNumbers(id, rng, 2)),
  skill('g1-tens-ones', 'place', 1, 'Tens and ones', '47 is 4 tens and 7 ones', 'add', ns.tensAndOnes),
  skill('g1-add-20', 'add', 1, 'Adding within 20', '8 + 5', 'add', add.addWithin20),
  skill('g1-sub-20', 'subtract', 1, 'Taking away within 20', '14 − 6', 'subtract', add.subWithin20),
  skill('g1-missing', 'place', 1, 'Missing numbers', '6 + ☐ = 11', 'add', ns.missingNumber),
  skill('g1-equal', 'place', 1, 'The equal sign', '5 + 2 = 4 + 3?', 'add', ns.equalSign),
  skill('g1-fact-family', 'subtract', 1, 'Fact families', '3 + 4 = 7, so 7 − 4 = ☐', 'subtract', ns.factFamily),
  skill('g1-add-tens', 'add', 1, 'Adding tens and ones', '34 + 5, 40 + 30', 'add', add.addTensNoBundle),
  skill('g1-time', 'time', 1, 'Time to the hour and half hour', '3:30', 'add', (id, rng) => (rng() < 0.5 ? measure.setTheClock : measure.tellTime)(id, rng, 30)),
  skill('g1-measure', 'measure', 1, 'Measure in inches', 'How long is the pencil?', 'add', (id, rng) => measure.measureLength(id, rng, ['in'])),
  skill('g1-sides', 'shapes', 1, 'Sides and corners', 'A triangle has ☐ sides', 'add', geo.sidesAndCorners),
];

const G2_SKILLS: SkillDef[] = [
  skill('g2-place-1000', 'place', 2, 'Place value to 1,000', 'The 4 in 347 is worth ☐', 'add', ns.placeValue),
  skill('g2-expanded', 'place', 2, 'Expanded form', '300 + 40 + 7', 'add', ns.expandedForm),
  skill('g2-compare', 'place', 2, 'Compare 3-digit numbers', '362 ☐ 326', 'add', (id, rng) => ns.compareNumbers(id, rng, 3)),
  skill('g2-skip', 'count', 2, 'Skip counting', '5, 10, 15, ☐', 'add', ns.skipCount),
  skill('g2-even-odd', 'count', 2, 'Even and odd', 'Is 14 even or odd?', 'add', ns.evenOdd),
  skill('g2-add-2d', 'add', 2, 'Adding 2-digit numbers', '32 + 45', 'add', add.add2dNoBundle),
  skill('g2-add-bundle', 'add', 2, 'Bundle a ten', '38 + 47', 'add', add.add2dBundle, 1),
  skill('g2-add-3d', 'add', 2, 'Adding 3-digit numbers', '275 + 148', 'add', add.add3dBundle, 1),
  skill('g2-sub-2d', 'subtract', 2, 'Taking away 2-digit numbers', '58 − 23', 'subtract', add.sub2dNoTrade),
  skill('g2-sub-trade-1d', 'subtract', 2, 'Trade a ten (minus 1-digit)', '42 − 7', 'subtract', add.sub2d1dTrade, 1),
  skill('g2-sub-trade', 'subtract', 2, 'Trade a ten', '63 − 28', 'subtract', add.sub2dTrade, 1),
  skill('g2-sub-3d-once', 'subtract', 2, 'Trade once with 3 digits', '352 − 127', 'subtract', add.sub3dTradeOnce, 1),
  skill('g2-sub-3d-twice', 'subtract', 2, 'Trade twice', '532 − 278', 'subtract', add.sub3dTradeTwice, 2),
  skill('g2-sub-zero', 'subtract', 2, 'Trade across a zero', '403 − 168', 'subtract', add.subAcrossZero, 2),
  skill('g2-array', 'multiply', 2, 'Arrays', '3 rows of 4', 'multiply', mult.arrayCount),
  skill('g2-tape', 'story', 2, 'Story problems with a bar model', 'Mia has 34, gets some more...', 'add', story.tapeStory),
  skill('g2-compare-story', 'story', 2, 'How many more?', 'Leo has 52, Ava has 37', 'subtract', story.compareStory),
  skill('g2-coins', 'money', 2, 'Count coins', 'Quarters, dimes, nickels, pennies', 'add', (id, rng) => (rng() < 0.5 ? measure.makeAmount : measure.countCoins)(id, rng)),
  skill('g2-bills', 'money', 2, 'Count dollars', '$5 + $1 + $1', 'add', measure.countBills),
  skill('g2-change', 'money', 2, 'Make change', '100¢ − 64¢', 'subtract', (id, rng) => (rng() < 0.5 ? measure.countUpChange : measure.makeChange)(id, rng), 1),
  skill('g2-time', 'time', 2, 'Time to 5 minutes', '7:25', 'add', (id, rng) => (rng() < 0.5 ? measure.setTheClock : measure.tellTime)(id, rng, 5)),
  skill('g2-measure', 'measure', 2, 'Inches and centimeters', 'How many cm?', 'add', (id, rng) => measure.measureLength(id, rng, ['in', 'cm'])),
  skill('g2-polygons', 'shapes', 2, 'Shapes by their sides', 'Which has 5 sides?', 'add', geo.polygonNames),
];

const G3_SKILLS: SkillDef[] = [
  skill('g3-add-1000', 'add', 3, 'Adding within 1,000', '467 + 285', 'add', add.addWithin1000, 1),
  skill('g3-sub-1000', 'subtract', 3, 'Taking away within 1,000', '702 − 348', 'subtract', add.subWithin1000, 1),
  skill('g3-groups', 'multiply', 3, 'Equal groups', '3 groups of 4', 'multiply', mult.equalGroups),
  skill('g3-times-2-5-10', 'multiply', 3, 'Times 2, 5 and 10', '5 × 7', 'multiply', (id, rng) => mult.timesFact(id, rng, [2, 5, 10])),
  skill('g3-turn-around', 'multiply', 3, 'Turn-around facts', '4 × 7 = 7 × 4', 'multiply', mult.turnAround),
  skill('g3-times-3-4', 'multiply', 3, 'Times 3 and 4', '4 × 6', 'multiply', (id, rng) => mult.timesFact(id, rng, [3, 4])),
  skill('g3-break-apart', 'multiply', 3, 'Break apart to multiply', '7 × 6 = 5 × 6 + 2 × 6', 'multiply', mult.breakApart),
  skill('g3-times-6-9', 'multiply', 3, 'Times 6, 7, 8 and 9', '7 × 8', 'multiply', (id, rng) => mult.timesFact(id, rng, [6, 7, 8, 9])),
  skill('g3-times-tens', 'multiply', 3, 'Times tens', '4 × 30', 'multiply', mult.timesTens),
  skill('g3-share', 'divide', 3, 'Share equally', '12 into 3 groups', 'divide', mult.shareEqually),
  skill('g3-divide-2-5-10', 'divide', 3, 'Divide by 2, 5 and 10', '35 ÷ 5', 'divide', (id, rng) => mult.divideFact(id, rng, [2, 5, 10])),
  skill('g3-divide', 'divide', 3, 'Division within 100', '56 ÷ 7', 'divide', (id, rng) => mult.divideFact(id, rng, [3, 4, 6, 7, 8, 9])),
  skill('g3-two-step', 'story', 3, 'Two-step story problems', 'Buy 3 bags of 5, then...', 'multiply', story.twoStepStory),
  skill('g3-unit-fraction', 'fractions', 3, 'Unit fractions', '1/4 shaded', 'divide', (id, rng) => geo.shadedFraction(id, rng, true)),
  skill('g3-fraction', 'fractions', 3, 'Fractions of a shape', '3/8 shaded', 'divide', (id, rng) => geo.shadedFraction(id, rng, false)),
  skill('g3-fraction-line', 'fractions', 3, 'Fractions on a number line', 'The dot is at ☐', 'divide', geo.fractionOnLine),
  skill('g3-equivalent', 'fractions', 3, 'Equal fractions', '1/2 = ☐/4', 'divide', geo.equivalentFraction),
  skill('g3-time', 'time', 3, 'Time to the minute', '4:37', 'add', (id, rng) => (rng() < 0.5 ? measure.setTheClock : measure.tellTime)(id, rng, 1)),
  skill('g3-elapsed', 'time', 3, 'Time passing', '2:40 + 25 minutes', 'add', measure.timePassing),
  skill('g3-area', 'measure', 3, 'Area', '4 rows of 6 squares', 'multiply', geo.area),
  skill('g3-perimeter', 'measure', 3, 'Perimeter', 'All the way around', 'add', geo.perimeter),
  skill('g3-quads', 'shapes', 3, 'Quadrilaterals', 'Square, rhombus, trapezoid', 'add', geo.quadrilaterals),
];

const OP_STRAND: Record<Operation, Strand> = { add: 'add', subtract: 'subtract', multiply: 'multiply', divide: 'divide' };
const OP_NAME: Record<Operation, string> = { add: 'Adding', subtract: 'Taking away', multiply: 'Multiplying', divide: 'Dividing' };
const LEVEL_NAME: Record<Difficulty, string> = { easy: 'part 1', medium: 'part 2', hard: 'part 3' };

/** 4th to 6th grade arithmetic, from the grade levels (until those grades get skills of their own). */
const LATER_SKILLS: SkillDef[] = ([4, 5, 6] as Grade[]).flatMap((grade) =>
  (['add', 'subtract', 'multiply', 'divide'] as Operation[]).flatMap((op) =>
    (['easy', 'medium', 'hard'] as Difficulty[]).map((d) =>
      skill(`g${grade}-${op}-${d}`, OP_STRAND[op], grade, `${OP_NAME[op]}, grade ${grade} ${LEVEL_NAME[d]}`, '', op, (id, rng) => ({
        ...generate(op, d, rng, grade),
        skill: id,
      })),
    ),
  ),
);

export const SKILLS: SkillDef[] = [...K_SKILLS, ...G1_SKILLS, ...G2_SKILLS, ...G3_SKILLS, ...LATER_SKILLS];

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

export const findSkill = (id: SkillId | undefined): SkillDef | undefined => (id ? BY_ID.get(id) : undefined);

/** Position in teaching order (grade first, then the order listed). */
export const skillOrder = (id: SkillId) => SKILLS.findIndex((s) => s.id === id);

export const STRANDS: { value: Strand; label: string; emoji: string }[] = [
  { value: 'count', label: 'Counting', emoji: '🔢' },
  { value: 'add', label: 'Adding', emoji: '➕' },
  { value: 'subtract', label: 'Taking away', emoji: '➖' },
  { value: 'place', label: 'Place value', emoji: '🧱' },
  { value: 'multiply', label: 'Times', emoji: '✖️' },
  { value: 'divide', label: 'Sharing', emoji: '➗' },
  { value: 'story', label: 'Story problems', emoji: '📖' },
  { value: 'time', label: 'Time', emoji: '🕒' },
  { value: 'money', label: 'Money', emoji: '🪙' },
  { value: 'measure', label: 'Measuring', emoji: '📏' },
  { value: 'shapes', label: 'Shapes', emoji: '🔷' },
  { value: 'fractions', label: 'Fractions', emoji: '🍕' },
];

export const strandInfo = (strand: Strand) => STRANDS.find((s) => s.value === strand) ?? STRANDS[0];

/** Strands that have skills up to this grade (plus one grade ahead). */
export function strandsForGrade(grade: number): Strand[] {
  return STRANDS.map((s) => s.value).filter((st) => SKILLS.some((s) => s.strand === st && s.grade <= grade + 1));
}
