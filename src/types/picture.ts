/**
 * Pictures drawn on a question card (and in help steps). Each one is plain data,
 * so a question can be rebuilt from its seed on another phone and saved as is.
 * QuestionPicture draws them.
 */

export type Shape2D = 'circle' | 'square' | 'triangle' | 'rectangle' | 'hexagon' | 'pentagon' | 'rhombus' | 'trapezoid' | 'oval';
export type Shape3D = 'cube' | 'sphere' | 'cone' | 'cylinder' | 'pyramid' | 'box';

/** Coin and bill values in cents. */
export type Money = 1 | 5 | 10 | 25 | 100 | 500 | 1000 | 2000;

export type Picture =
  /** Things to count. `layout` sets how they're spread out; `crossed` marks some as taken away. */
  | { kind: 'things'; count: number; emoji: string; layout: 'scatter' | 'row' | 'dice' | 'frame'; crossed?: number }
  /** Two groups side by side to compare. */
  | { kind: 'compare'; left: number; right: number; emoji: string }
  /** Ten-frames filled with counters; `extra` counters in a second color follow the first ones. */
  | { kind: 'tenFrames'; filled: number; extra?: number; frames?: number }
  /** A number bond: the whole on top, two parts below; null is the missing one. */
  | { kind: 'bond'; whole: number | null; parts: [number | null, number | null] }
  /** Base-ten blocks: hundreds flats, tens rods and ones cubes. `crossed` shows some taken away; `traded` shows one ten opened into ones. */
  | { kind: 'blocks'; hundreds: number; tens: number; ones: number; crossed?: { hundreds?: number; tens?: number; ones?: number }; traded?: 'ten' | 'hundred' }
  /** A row of numbers with gaps (null) to fill, e.g. 5, 10, 15, ☐. */
  | { kind: 'sequence'; items: (number | null)[] }
  /**
   * A number line with a dot on it; `labels` shows numbers at every tick when true, else only the ends.
   * With `hops` from `start`, each landing spot is labelled too; `hideEnd` writes ? at the last one.
   */
  | { kind: 'numberLine'; min: number; max: number; step: number; dot?: number; hops?: number[]; start?: number; labels?: boolean; hideEnd?: boolean }
  /** Rows of counters, for times. */
  | { kind: 'array'; rows: number; cols: number }
  /** Circles each holding the same number of counters. */
  | { kind: 'groups'; groups: number; each: number }
  /** Pairs of counters, for even and odd. */
  | { kind: 'pairs'; count: number }
  /** A tape diagram (bar model): bars side by side making the whole; null is the unknown part. */
  | { kind: 'tape'; whole: number | null; parts: (number | null)[]; label?: string }
  /** A clock face. */
  | { kind: 'clock'; hour: number; minute: number }
  /** Coins and bills (cents). */
  | { kind: 'money'; items: Money[] }
  /** Something lying along a ruler, `length` units long. */
  | { kind: 'ruler'; length: number; unit: 'in' | 'cm'; thing: 'pencil' | 'crayon' | 'worm' | 'key' | 'leaf' }
  | { kind: 'shape2d'; shape: Shape2D; color?: string }
  | { kind: 'shape3d'; shape: Shape3D; color?: string }
  /** A rectangle on squared paper: `show` picks whether squares are drawn (area) or side lengths written (perimeter). */
  | { kind: 'grid'; width: number; height: number; show: 'squares' | 'sides' }
  /** A shape cut into equal parts with some shaded. */
  | { kind: 'fraction'; parts: number; shaded: number; shape: 'bar' | 'circle' }
  /** Two bars to compare, for equal fractions. */
  | { kind: 'fractionBars'; bars: { parts: number; shaded: number }[] }
  /** A number line from 0 to `wholes`, cut into `parts` per whole, with a dot at `at` parts. */
  | { kind: 'fractionLine'; parts: number; at: number; wholes?: number };
