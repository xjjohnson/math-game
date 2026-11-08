/**
 * The School easel: free painting and coloring pages, drawn with SVG.
 *
 * A picture is a page (blank paper or a coloring page) plus a list of actions
 * in the order they were made: brush lines and bucket fills. Every phone on a
 * visit keeps the same list, so everyone sees the same picture.
 */

/** The paper, in its own units: portrait, 3 wide to 4 tall. */
export const PAPER_W = 750;
export const PAPER_H = 1000;

/** Paints on the palette. 0 is the paper's own white, so it also works as the eraser. */
export const PAINT_COLORS = [
  '#FFFFFF',
  '#E53935', // 1 red
  '#FB8C00', // 2 orange
  '#FDD835', // 3 yellow
  '#43A047', // 4 green
  '#1E88E5', // 5 blue
  '#8E24AA', // 6 purple
  '#EC407A', // 7 pink
  '#8D6E63', // 8 brown
  '#212121', // 9 black
  '#81D4FA', // 10 sky blue
  '#AED581', // 11 light green
  '#FFCCBC', // 12 peach
  '#9E9E9E', // 13 gray
] as const;
export const PAINT_NAMES = [
  'white',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'brown',
  'black',
  'sky blue',
  'light green',
  'peach',
  'gray',
] as const;
export const WHITE = 0;

/** Brush widths in paper units: small, medium and big. */
export const BRUSH_SIZES = [10, 22, 44] as const;

/** Points in one brush line (x then y). A longer line carries on as a new one, so no message gets too big. */
export const MAX_PAINT_POINTS = 150;
/** Most actions kept in one picture; past this the oldest brush lines fade away first. */
export const MAX_PAINT_ACTIONS = 800;

/** A brush line: `c` is a PAINT_COLORS index, `w` a BRUSH_SIZES index, `p` is x0, y0, x1, y1, ... */
export interface BrushAction {
  id: string;
  k: 's';
  c: number;
  w: number;
  p: number[];
}
/** A bucket fill of region `r` (an index into the page's regions) with color `c`. */
export interface FillAction {
  id: string;
  k: 'f';
  r: number;
  c: number;
}
export type PaintAction = BrushAction | FillAction;

/** Color-by-number difficulty: 0 adds, 1 adds and takes away, 2 times and divides. */
export type NumberLevel = 0 | 1 | 2;
export const NUMBER_LEVELS: { id: NumberLevel; name: string; hint: string }[] = [
  { id: 0, name: 'Easy', hint: '3 + 4' },
  { id: 1, name: 'Medium', hint: '12 − 5' },
  { id: 2, name: 'Hard', hint: '21 ÷ 3' },
];

/** What is on the easel: the page, its color-by-number level (null for plain coloring) and what was done to it. */
export interface Picture {
  page: string;
  lv: NumberLevel | null;
  actions: PaintAction[];
}

// --- coloring pages ---

/** One area of a coloring page that the bucket can fill. */
export type Shape =
  | { s: 'r'; x: number; y: number; w: number; h: number }
  | { s: 'c'; x: number; y: number; r: number }
  | { s: 'e'; x: number; y: number; rx: number; ry: number }
  | { s: 'p'; pts: number[] };

export interface Region {
  shape: Shape;
  /** Color-by-number: the PAINT_COLORS index this area should be. Areas without one are free to color. */
  n?: number;
  /** Where its number goes, when the middle of its box is covered by something else. */
  at?: [number, number];
  /** False for the background, which has no outline. */
  line?: boolean;
}

export interface ColoringPage {
  id: string;
  name: string;
  emoji: string;
  /** Areas from the back to the front; the first is always the whole paper. */
  regions: Region[];
  /** Extra lines drawn on top that aren't areas (whiskers, a smile), as SVG path data. */
  lines?: string[];
}

const paper = (n?: number, at?: [number, number]): Region => ({ shape: { s: 'r', x: 0, y: 0, w: PAPER_W, h: PAPER_H }, line: false, n, at });
const rect = (x: number, y: number, w: number, h: number, n?: number, at?: [number, number]): Region => ({ shape: { s: 'r', x, y, w, h }, n, at });
const circle = (x: number, y: number, r: number, n?: number, at?: [number, number]): Region => ({ shape: { s: 'c', x, y, r }, n, at });
const ellipse = (x: number, y: number, rx: number, ry: number, n?: number, at?: [number, number]): Region => ({ shape: { s: 'e', x, y, rx, ry }, n, at });
const poly = (pts: number[], n?: number, at?: [number, number]): Region => ({ shape: { s: 'p', pts }, n, at });

const petals = (cx: number, cy: number, d: number, r: number, colors: number[]): Region[] =>
  colors.map((n, i) => {
    const a = (i / colors.length) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * d);
    const y = Math.round(cy + Math.sin(a) * d);
    const lx = Math.round(cx + Math.cos(a) * (d + 32));
    const ly = Math.round(cy + Math.sin(a) * (d + 32));
    return circle(x, y, r, n, [lx, ly]);
  });

export const BLANK_PAGE: ColoringPage = { id: 'blank', name: 'Blank paper', emoji: '📄', regions: [paper()] };

export const COLORING_PAGES: ColoringPage[] = [
  {
    id: 'house',
    name: 'House',
    emoji: '🏠',
    regions: [
      paper(10, [375, 130]),
      rect(0, 700, 750, 300, 4, [110, 900]),
      circle(620, 140, 70, 3),
      ellipse(190, 160, 95, 45),
      rect(470, 270, 50, 100),
      rect(160, 430, 430, 330, 1, [375, 545]),
      poly([130, 440, 375, 240, 620, 440], 8),
      rect(330, 600, 90, 160, 6),
      rect(200, 500, 90, 80, 3),
      rect(460, 500, 90, 80, 3),
      poly([330, 760, 420, 760, 470, 1000, 280, 1000], 2, [375, 900]),
    ],
  },
  {
    id: 'flower',
    name: 'Flower',
    emoji: '🌻',
    regions: [
      paper(10, [620, 130]),
      rect(0, 760, 750, 240, 4, [120, 900]),
      circle(90, 90, 60, 3),
      rect(360, 470, 30, 310),
      ellipse(290, 620, 75, 32, 11),
      ellipse(460, 560, 75, 32, 11),
      ...petals(375, 330, 110, 70, [7, 6, 7, 6, 7, 6, 7, 6]),
      circle(375, 330, 75, 8),
    ],
  },
  {
    id: 'rocket',
    name: 'Rocket',
    emoji: '🚀',
    regions: [
      paper(9, [640, 680]),
      circle(130, 150, 70, 3),
      circle(620, 120, 20),
      circle(560, 300, 16),
      circle(150, 420, 18),
      circle(650, 520, 20),
      circle(100, 800, 16),
      circle(660, 860, 18),
      poly([280, 700, 470, 700, 440, 820, 375, 960, 310, 820], 2, [375, 862]),
      poly([340, 700, 410, 700, 375, 790]),
      poly([280, 540, 180, 720, 280, 700], 1, [248, 655]),
      poly([470, 540, 570, 720, 470, 700], 1, [502, 655]),
      poly([375, 150, 470, 330, 470, 700, 280, 700, 280, 330], 13, [375, 600]),
      poly([375, 150, 470, 330, 280, 330], 1, [375, 275]),
      circle(375, 430, 55, 10),
    ],
  },
  {
    id: 'fish',
    name: 'Fish',
    emoji: '🐠',
    regions: [
      paper(5, [620, 720]),
      rect(0, 850, 750, 150, 12, [300, 930]),
      ellipse(600, 860, 120, 60, 13),
      poly([100, 850, 70, 700, 120, 600, 90, 480, 150, 600, 130, 700, 160, 850], 4, [115, 760]),
      circle(600, 200, 25),
      circle(640, 120, 18),
      circle(585, 60, 14),
      poly([560, 450, 700, 330, 700, 570], 7, [655, 450]),
      poly([300, 320, 420, 230, 450, 330], 1, [395, 282]),
      ellipse(360, 450, 220, 140, 2, [470, 470]),
      ellipse(300, 450, 30, 130),
      ellipse(400, 450, 26, 120),
      circle(220, 410, 28),
    ],
  },
  {
    id: 'cat',
    name: 'Cat',
    emoji: '🐱',
    regions: [
      paper(11, [100, 100]),
      poly([530, 840, 690, 720, 720, 540, 640, 540, 630, 680, 520, 760], 2, [672, 620]),
      ellipse(375, 760, 190, 170, 2, [240, 800]),
      ellipse(375, 800, 100, 110, 12, [375, 820]),
      poly([220, 330, 250, 170, 340, 280], 2, [268, 255]),
      poly([530, 330, 500, 170, 410, 280], 2, [482, 255]),
      circle(375, 400, 170, 2, [375, 295]),
      ellipse(310, 380, 34, 42, 4),
      ellipse(440, 380, 34, 42, 4),
      poly([352, 448, 398, 448, 375, 476]),
    ],
    lines: [
      'M375 476 Q355 515 330 498',
      'M375 476 Q395 515 420 498',
      'M300 465 L185 445',
      'M300 480 L190 500',
      'M450 465 L565 445',
      'M450 480 L560 500',
    ],
  },
  {
    id: 'turkey',
    name: 'Turkey',
    emoji: '🦃',
    regions: [
      paper(10, [680, 120]),
      rect(0, 820, 750, 180, 4, [120, 920]),
      circle(159, 481, 95, 1, [118, 470]),
      circle(243, 372, 95, 2, [212, 330]),
      circle(375, 330, 95, 3, [375, 262]),
      circle(507, 372, 95, 2, [538, 330]),
      circle(591, 481, 95, 1, [632, 470]),
      rect(330, 760, 22, 80),
      rect(398, 760, 22, 80),
      ellipse(375, 600, 150, 180, 8, [375, 650]),
      circle(375, 390, 80, 8, [375, 338]),
      circle(347, 372, 12),
      circle(403, 372, 12),
      poly([355, 400, 395, 400, 375, 440]),
      ellipse(398, 458, 14, 30),
    ],
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    emoji: '🎃',
    regions: [
      paper(6, [110, 300]),
      rect(0, 820, 750, 180, 8, [375, 912]),
      circle(620, 140, 70, 3),
      rect(345, 250, 60, 110, 4, [375, 300]),
      ellipse(270, 580, 150, 220, 2, [175, 600]),
      ellipse(480, 580, 150, 220, 2, [575, 600]),
      ellipse(375, 580, 140, 240, 2, [375, 405]),
      poly([250, 520, 340, 520, 295, 440]),
      poly([410, 520, 500, 520, 455, 440]),
      poly([260, 640, 300, 680, 340, 650, 375, 690, 410, 650, 450, 680, 490, 640, 450, 740, 300, 740], 9, [375, 718]),
    ],
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    emoji: '🦋',
    regions: [
      paper(10, [100, 900]),
      ellipse(240, 370, 160, 150, 7, [245, 270]),
      ellipse(510, 370, 160, 150, 7, [505, 270]),
      ellipse(270, 640, 120, 130, 6, [262, 735]),
      ellipse(480, 640, 120, 130, 6, [488, 735]),
      circle(210, 350, 45, 3),
      circle(540, 350, 45, 3),
      circle(260, 660, 40, 5),
      circle(490, 660, 40, 5),
      ellipse(375, 500, 35, 230, 9, [375, 520]),
      circle(375, 250, 45, 9),
    ],
    lines: ['M360 215 Q330 140 290 120', 'M390 215 Q420 140 460 120'],
  },
];

const PAGES = new Map([BLANK_PAGE, ...COLORING_PAGES].map((p) => [p.id, p]));

export function pageOf(id: string): ColoringPage {
  return PAGES.get(id) ?? BLANK_PAGE;
}

export function isPage(id: unknown): id is string {
  return typeof id === 'string' && PAGES.has(id);
}

/** Whether a page has numbers to color by. */
export function hasNumbers(page: ColoringPage): boolean {
  return page.regions.some((r) => r.n !== undefined);
}

// --- finding the area under a finger ---

export function inShape(shape: Shape, x: number, y: number): boolean {
  switch (shape.s) {
    case 'r':
      return x >= shape.x && x <= shape.x + shape.w && y >= shape.y && y <= shape.y + shape.h;
    case 'c':
      return (x - shape.x) ** 2 + (y - shape.y) ** 2 <= shape.r ** 2;
    case 'e':
      return ((x - shape.x) / shape.rx) ** 2 + ((y - shape.y) / shape.ry) ** 2 <= 1;
    case 'p': {
      // Count how many edges a line going right from the point crosses.
      const p = shape.pts;
      let inside = false;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        const [xi, yi, xj, yj] = [p[i], p[i + 1], p[j], p[j + 1]];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
  }
}

/** The front-most area of the page under a point (0, the paper, when nothing else is). */
export function regionAt(page: ColoringPage, x: number, y: number): number {
  for (let i = page.regions.length - 1; i > 0; i--) if (inShape(page.regions[i].shape, x, y)) return i;
  return 0;
}

/** Where an area's number is written. */
export function labelAt(region: Region): [number, number] {
  if (region.at) return region.at;
  const s = region.shape;
  switch (s.s) {
    case 'r':
      return [s.x + s.w / 2, s.y + s.h / 2];
    case 'c':
    case 'e':
      return [s.x, s.y];
    case 'p': {
      let x = 0;
      let y = 0;
      for (let i = 0; i < s.pts.length; i += 2) {
        x += s.pts[i];
        y += s.pts[i + 1];
      }
      const n = s.pts.length / 2;
      return [Math.round(x / n), Math.round(y / n)];
    }
  }
}

// --- the picture ---

/** Each area's fill color: the last fill of it wins. Areas never filled are white. */
export function fillsOf(actions: PaintAction[], regions: number): number[] {
  const fills = new Array<number>(regions).fill(WHITE);
  for (const a of actions) if (a.k === 'f' && a.r >= 0 && a.r < regions) fills[a.r] = a.c;
  return fills;
}

/** Adds an action, or replaces it when a brush line has grown. The oldest brush lines go first when there are too many. */
export function putAction(actions: PaintAction[], action: PaintAction): PaintAction[] {
  const i = actions.findIndex((a) => a.id === action.id);
  if (i >= 0) return actions.map((a, n) => (n === i ? action : a));
  const next = [...actions, action];
  if (next.length <= MAX_PAINT_ACTIONS) return next;
  const oldest = next.findIndex((a) => a.k === 's');
  return next.filter((_, n) => n !== (oldest >= 0 ? oldest : 0));
}

/** The id of the last action made on this phone (ids start with `mine`), for Undo. */
export function lastMine(actions: PaintAction[], mine: string): string | null {
  for (let i = actions.length - 1; i >= 0; i--) if (actions[i].id.startsWith(mine)) return actions[i].id;
  return null;
}

/** Color by number: the numbered areas, and which of them aren't the right color yet. */
export function numberCheck(picture: Picture): { total: number; wrong: number[] } {
  const page = pageOf(picture.page);
  const fills = fillsOf(picture.actions, page.regions.length);
  const wrong: number[] = [];
  let total = 0;
  page.regions.forEach((r, i) => {
    if (r.n === undefined) return;
    total++;
    if (fills[i] !== r.n) wrong.push(i);
  });
  return { total, wrong };
}

// --- color-by-number sums ---

/** A small random number maker that gives the same numbers for the same seed, so every phone shows the same sums. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return (max: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % max;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The sum written in an area whose answer is `n`. */
export function sumFor(n: number, level: NumberLevel, key: string): string {
  const rand = seeded(hash(`${key}:${level}:${n}`));
  if (level === 0 || (level === 1 && rand(2) === 0)) {
    if (n < 2) return `${n} + 0`;
    const a = 1 + rand(n - 1);
    return `${a} + ${n - a}`;
  }
  if (level === 1) {
    const b = 1 + rand(9);
    return `${n + b} − ${b}`;
  }
  const pairs: [number, number][] = [];
  for (let a = 2; a <= 9; a++) if (n % a === 0 && n / a >= 2 && n / a <= 9) pairs.push([a, n / a]);
  if (pairs.length && rand(2) === 0) {
    const [a, b] = pairs[rand(pairs.length)];
    return `${a} × ${b}`;
  }
  const b = 2 + rand(4);
  return `${n * b} ÷ ${b}`;
}

/** The color-by-number level that suits a school grade (0 is kindergarten). */
export function levelForGrade(grade: number): NumberLevel {
  return grade <= 1 ? 0 : grade <= 3 ? 1 : 2;
}

// --- drawing lines ---

/**
 * A smooth SVG path through a line's points, each point scaled by sx and sy.
 * One path per line keeps a full board quick to draw.
 */
export function smoothPath(p: number[], sx = 1, sy = 1): string {
  if (p.length < 2) return '';
  const x = (i: number) => Math.round(p[i] * sx * 10) / 10;
  const y = (i: number) => Math.round(p[i + 1] * sy * 10) / 10;
  // A single dot is a very short line, so its round ends show.
  if (p.length < 4) return `M${x(0)} ${y(0)}L${x(0) + 0.1} ${y(0)}`;
  let d = `M${x(0)} ${y(0)}`;
  if (p.length === 4) return `${d}L${x(2)} ${y(2)}`;
  for (let i = 2; i + 2 < p.length; i += 2) {
    const mx = Math.round(((x(i) + x(i + 2)) / 2) * 10) / 10;
    const my = Math.round(((y(i) + y(i + 2)) / 2) * 10) / 10;
    d += `Q${x(i)} ${y(i)} ${mx} ${my}`;
  }
  const last = p.length - 2;
  return `${d}L${x(last)} ${y(last)}`;
}

// --- saving ---

/** Leaves out points that hardly change a line's shape (Ramer–Douglas–Peucker). */
export function simplify(p: number[], tolerance: number): number[] {
  const n = p.length / 2;
  if (n <= 2) return p;
  const keep = new Array<boolean>(n).fill(false);
  keep[0] = keep[n - 1] = true;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay, bx, by] = [p[a * 2], p[a * 2 + 1], p[b * 2], p[b * 2 + 1]];
    const len = Math.hypot(bx - ax, by - ay);
    let far = -1;
    let farDist = tolerance;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = [p[i * 2], p[i * 2 + 1]];
      const dist = len === 0 ? Math.hypot(px - ax, py - ay) : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (dist > farDist) {
        far = i;
        farDist = dist;
      }
    }
    if (far >= 0) {
      keep[far] = true;
      stack.push([a, far], [far, b]);
    }
  }
  return p.filter((_, i) => keep[i >> 1]);
}

/** Keeps every `every`th point of a line, plus its last one. */
function thin(p: number[], every: number): number[] {
  const n = p.length / 2;
  if (n <= 2) return p;
  const out: number[] = [];
  for (let i = 0; i < n - 1; i += every) out.push(p[i * 2], p[i * 2 + 1]);
  out.push(p[p.length - 2], p[p.length - 1]);
  return out;
}

/** Most points kept in a saved picture, so the saves stay small. */
export const MAX_SAVED_POINTS = 6000;

/** A copy of the picture to keep: lines simplified (more and more until it is small enough), undone fills dropped. */
export function compactPicture(picture: Picture): Picture {
  const regions = pageOf(picture.page).regions.length;
  // Only the last fill of each area shows, so the earlier ones can go.
  const lastFill = new Map<number, string>();
  for (const a of picture.actions) if (a.k === 'f') lastFill.set(a.r, a.id);
  const kept = picture.actions.filter((a) => (a.k === 'f' ? lastFill.get(a.r) === a.id && a.r < regions : true));
  const pointsIn = (list: PaintAction[]) => list.reduce((sum, a) => sum + (a.k === 's' ? a.p.length / 2 : 0), 0);
  let tolerance = 1.5;
  let actions = kept;
  for (let round = 0; round < 4; round++) {
    actions = kept.map((a) => (a.k === 's' ? { ...a, p: simplify(a.p, tolerance) } : a));
    if (pointsIn(actions) <= MAX_SAVED_POINTS) return { page: picture.page, lv: picture.lv, actions };
    tolerance *= 2;
  }
  // Still too big (lots of scribbles): keep every few points of each line, and always its ends.
  const every = Math.ceil(pointsIn(actions) / MAX_SAVED_POINTS) + 1;
  actions = actions.map((a) => (a.k === 's' ? { ...a, p: thin(a.p, every) } : a));
  return { page: picture.page, lv: picture.lv, actions };
}

/** A picture kept from the easel, in a player's My pictures. */
export interface SavedPicture extends Picture {
  id: string;
  /** When it was last saved (ms). */
  at: number;
}

/** Most pictures each player keeps; save more and the oldest one that isn't hanging up goes. */
export const MAX_SAVED_PICTURES = 12;

/** Adds or updates a saved picture in a player's list, newest first. */
export function savePicture(
  list: SavedPicture[],
  picture: Picture,
  id: string,
  at: number,
  hung: ReadonlySet<string> = new Set(),
): { list: SavedPicture[]; dropped: string | null } {
  const kept: SavedPicture = { ...compactPicture(picture), id, at };
  const next = [kept, ...list.filter((p) => p.id !== id)];
  if (next.length <= MAX_SAVED_PICTURES) return { list: next, dropped: null };
  // Too many: let go of the oldest one that isn't hanging in the buddy's home (or else the oldest).
  const oldest = [...next].reverse().find((p) => p.id !== id && !hung.has(p.id)) ?? next[next.length - 1];
  return { list: next.filter((p) => p !== oldest), dropped: oldest.id };
}

let count = 0;
/** This phone's id prefix: actions it makes start with it, so Undo only takes back your own. */
export const MY_PAINT_PREFIX = `${Math.random().toString(36).slice(2, 7)}p`;
/** An action id no other phone will use. */
export const newPaintId = (): string => `${MY_PAINT_PREFIX}${(count++).toString(36)}`;
