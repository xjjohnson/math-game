import type { Problem, Rng, Shape2D, Shape3D, SkillId } from '@/types';
import { numberQuestion, optionsFrom, pickQuestion } from '@/utils/skills/build';
import { pick, randInt } from '@/utils/seededRandom';

/** Shapes, sides and corners, quadrilaterals, area and perimeter, and fractions. */

const SHAPE_NAMES: Record<Shape2D | Shape3D, string> = {
  circle: 'Circle',
  square: 'Square',
  triangle: 'Triangle',
  rectangle: 'Rectangle',
  hexagon: 'Hexagon',
  pentagon: 'Pentagon',
  rhombus: 'Rhombus',
  trapezoid: 'Trapezoid',
  oval: 'Oval',
  cube: 'Cube',
  sphere: 'Sphere',
  cone: 'Cone',
  cylinder: 'Cylinder',
  pyramid: 'Pyramid',
  box: 'Rectangular prism (box)',
};

const SHAPE_COLORS = ['#E74C3C', '#3498DB', '#27AE60', '#F39C12', '#9B59B6', '#16A085'];

const index2d: Shape2D[] = ['circle', 'square', 'triangle', 'rectangle', 'hexagon', 'pentagon', 'rhombus', 'trapezoid', 'oval'];
const index3d: Shape3D[] = ['cube', 'sphere', 'cone', 'cylinder', 'pyramid', 'box'];

/** Name a flat shape (K). */
export function nameShape2D(id: SkillId, rng: Rng): Problem {
  const pool: Shape2D[] = ['circle', 'square', 'triangle', 'rectangle', 'hexagon'];
  const shape = pick(rng, pool);
  const options = optionsFrom(rng, shape, pool);
  return pickQuestion(
    id,
    {
      operation: 'add',
      ask: 'What is this shape called?',
      answer: index2d.indexOf(shape),
      options: options.map((s) => ({ value: index2d.indexOf(s), label: SHAPE_NAMES[s] })),
      picture: { kind: 'shape2d', shape, color: pick(rng, SHAPE_COLORS) },
    },
    rng,
  );
}

/** Name a solid shape (K). */
export function nameShape3D(id: SkillId, rng: Rng): Problem {
  const pool: Shape3D[] = ['cube', 'sphere', 'cone', 'cylinder'];
  const shape = pick(rng, pool);
  return pickQuestion(
    id,
    {
      operation: 'add',
      ask: 'This shape is solid, not flat. What is it called?',
      answer: index3d.indexOf(shape),
      options: optionsFrom(rng, shape, pool).map((s) => ({ value: index3d.indexOf(s), label: SHAPE_NAMES[s] })),
      picture: { kind: 'shape3d', shape, color: pick(rng, SHAPE_COLORS) },
    },
    rng,
  );
}

const SIDES: Partial<Record<Shape2D, number>> = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6, rhombus: 4, trapezoid: 4 };

/** Count sides or corners (1st grade). */
export function sidesAndCorners(id: SkillId, rng: Rng): Problem {
  const shape = pick(rng, Object.keys(SIDES) as Shape2D[]);
  const sides = SIDES[shape] ?? 0;
  const corners = rng() < 0.5;
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: corners ? `How many corners does this ${SHAPE_NAMES[shape].toLowerCase()} have?` : `How many straight sides does this ${SHAPE_NAMES[shape].toLowerCase()} have?`,
      answer: sides,
      picture: { kind: 'shape2d', shape, color: pick(rng, SHAPE_COLORS) },
      near: [sides + 1, sides - 1, sides + 2],
    },
    rng,
  );
}

/** Polygons by name from their sides (2nd grade). */
export function polygonNames(id: SkillId, rng: Rng): Problem {
  const pool: Shape2D[] = ['triangle', 'rectangle', 'pentagon', 'hexagon'];
  const shape = pick(rng, pool);
  return pickQuestion(
    id,
    {
      operation: 'add',
      ask: `Which shape has ${SIDES[shape]} sides?`,
      answer: index2d.indexOf(shape),
      options: optionsFrom(rng, shape, pool).map((s) => ({ value: index2d.indexOf(s), label: SHAPE_NAMES[s] })),
      shuffle: false,
    },
    rng,
  );
}

const QUAD_FACTS: { shape: Shape2D; ask: string }[] = [
  { shape: 'square', ask: 'All 4 sides are the same and every corner is square. What is it?' },
  { shape: 'rectangle', ask: 'Every corner is square, and the opposite sides match. What is it?' },
  { shape: 'rhombus', ask: 'All 4 sides are the same, but the corners are not square. What is it?' },
  { shape: 'trapezoid', ask: 'Only one pair of sides is parallel (they never meet). What is it?' },
];

/** Quadrilaterals by their attributes (3rd grade). */
export function quadrilaterals(id: SkillId, rng: Rng): Problem {
  const fact = pick(rng, QUAD_FACTS);
  const pool = QUAD_FACTS.map((f) => f.shape);
  return pickQuestion(
    id,
    {
      operation: 'add',
      ask: `This is a quadrilateral: 4 sides. ${fact.ask}`,
      answer: index2d.indexOf(fact.shape),
      options: pool.map((s) => ({ value: index2d.indexOf(s), label: SHAPE_NAMES[s] })),
      picture: { kind: 'shape2d', shape: fact.shape, color: pick(rng, SHAPE_COLORS) },
    },
    rng,
  );
}

/** Area by counting squares, or rows × columns (3rd grade). */
export function area(id: SkillId, rng: Rng): Problem {
  const width = randInt(rng, 2, 8);
  const height = randInt(rng, 2, 6);
  return numberQuestion(
    id,
    {
      operation: 'multiply',
      ask: 'Each little square is 1 square unit. What is the area of the rectangle?',
      answer: width * height,
      unit: 'square units',
      picture: { kind: 'grid', width, height, show: 'squares' },
      a: height,
      b: width,
      near: [2 * (width + height), width + height, width * height + width],
    },
    rng,
  );
}

/** Perimeter: the way around (3rd grade). */
export function perimeter(id: SkillId, rng: Rng): Problem {
  const width = randInt(rng, 2, 12);
  const height = randInt(rng, 2, 9);
  return numberQuestion(
    id,
    {
      operation: 'add',
      ask: 'Walk all the way around the edge. What is the perimeter?',
      answer: 2 * (width + height),
      unit: 'units',
      picture: { kind: 'grid', width, height, show: 'sides' },
      a: width,
      b: height,
      near: [width * height, width + height, 2 * width + height],
    },
    rng,
  );
}

// ---------- fractions ----------

/** Fractions are answered by picking a label; the value packs numerator and denominator. */
export const fractionValue = (n: number, d: number) => n * 100 + d;
export const fractionLabel = (n: number, d: number) => `${n}/${d}`;

const DENOMINATORS = [2, 3, 4, 6, 8];

/** What fraction is shaded? Unit fractions first, then any (3rd grade). */
export function shadedFraction(id: SkillId, rng: Rng, unitOnly: boolean): Problem {
  const d = pick(rng, DENOMINATORS);
  const n = unitOnly ? 1 : randInt(rng, 1, d - 1);
  const shape = pick(rng, ['bar', 'circle'] as const);
  const wrong = [
    [d, n],
    [n, d + 1],
    [n + 1 < d ? n + 1 : n - 1 || 1, d],
    [d - n, d],
    [1, n === 1 ? d * 2 : d],
  ].filter(([x, y]) => !(x === n && y === d) && x > 0 && y > 0);
  const seen = new Set<number>([fractionValue(n, d)]);
  const options = [{ value: fractionValue(n, d), label: fractionLabel(n, d) }];
  for (const [x, y] of wrong) {
    const v = fractionValue(x, y);
    if (!seen.has(v) && options.length < 4) {
      seen.add(v);
      options.push({ value: v, label: fractionLabel(x, y) });
    }
  }
  return pickQuestion(
    id,
    {
      operation: 'divide',
      ask: `The whole is cut into ${d} equal parts. What fraction is shaded?`,
      answer: fractionValue(n, d),
      options,
      shuffle: true,
      picture: { kind: 'fraction', parts: d, shaded: n, shape },
      a: n,
      b: d,
    },
    rng,
  );
}

/** Where is the dot on the number line? (3rd grade) */
export function fractionOnLine(id: SkillId, rng: Rng): Problem {
  const d = pick(rng, [2, 3, 4, 6, 8]);
  const wholes = rng() < 0.25 ? 2 : 1;
  const at = randInt(rng, 1, d * wholes - 1);
  const options = new Map<number, string>([[fractionValue(at, d), fractionLabel(at, d)]]);
  for (const [x, y] of [
    [at, d + 1 > 8 ? d - 1 : d + 1],
    [at + 1, d],
    [Math.max(1, at - 1), d],
    [1, at],
  ]) {
    if (y > 0 && x > 0 && options.size < 4 && !options.has(fractionValue(x, y))) options.set(fractionValue(x, y), fractionLabel(x, y));
  }
  return pickQuestion(
    id,
    {
      operation: 'divide',
      ask: `Each whole is cut into ${d} equal jumps. What fraction is at the dot?`,
      answer: fractionValue(at, d),
      options: [...options].map(([value, label]) => ({ value, label })),
      shuffle: true,
      picture: { kind: 'fractionLine', parts: d, at, wholes },
      a: at,
      b: d,
    },
    rng,
  );
}

/** Equal fractions: 1/2 = ☐/4, with bars to compare (3rd grade). */
export function equivalentFraction(id: SkillId, rng: Rng): Problem {
  const [d, times] = pick(rng, [
    [2, 2],
    [2, 3],
    [2, 4],
    [3, 2],
    [4, 2],
  ] as [number, number][]);
  const n = randInt(rng, 1, d - 1);
  return numberQuestion(
    id,
    {
      operation: 'divide',
      ask: 'Both bars are the same size. How many parts make the same amount?',
      prompt: `${n}/${d} = ☐/${d * times}`,
      answer: n * times,
      picture: { kind: 'fractionBars', bars: [{ parts: d, shaded: n }, { parts: d * times, shaded: 0 }] },
      a: n,
      b: d,
      near: [n, n * times + 1, d * times - n * times],
    },
    rng,
  );
}
