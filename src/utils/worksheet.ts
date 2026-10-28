import { difficultyConfigFor } from '@/constants/grades';
import type { AnswerRecord, GameConfig, Problem } from '@/types';
import { problemAt } from '@/utils/gameSession';
import { pointsFor } from '@/utils/scoring';

/**
 * Worksheet mode: every question on one page, answered in any order and
 * marked together at the end. Questions come from the same seed rules as a
 * normal round, so a worksheet and a round with one seed ask the same things.
 */
export function worksheetProblems(config: GameConfig): Problem[] {
  return Array.from({ length: config.questionCount }, (_, i) => problemAt(config, i, config.difficulty));
}

/** Whether this problem's answer box needs a minus key. */
export function allowsNegative(config: GameConfig, problem: Problem): boolean {
  return difficultyConfigFor(config.difficulty, config.grade).allowNegatives && problem.operation === 'subtract' && !problem.story;
}

export interface WorksheetResult {
  history: AnswerRecord[];
  score: number;
  bestStreak: number;
}

/** Marks the sheet top to bottom; streaks count runs of right answers down the page. */
export function gradeWorksheet(
  config: GameConfig,
  problems: Problem[],
  answers: (number | null)[],
): WorksheetResult {
  let streak = 0;
  let bestStreak = 0;
  let score = 0;
  const history = problems.map((problem, i): AnswerRecord => {
    const given = answers[i] ?? null;
    const correct = given === problem.answer;
    streak = correct ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
    const question = { operation: problem.operation, difficulty: config.difficulty, grade: config.grade };
    const points = correct ? pointsFor(question, streak, null, null) : 0;
    score += points;
    return { problem, difficulty: config.difficulty, grade: config.grade, given, correct, points };
  });
  return { history, score, bestStreak };
}

const MAX_DIGITS = 6;

/** Applies one key to an answer box's text. */
export function typeKey(entry: string, key: string, allowNegative: boolean): string {
  if (key === '⌫') return entry.slice(0, -1);
  if (key === '±') {
    if (!allowNegative) return entry;
    return entry.startsWith('-') ? entry.slice(1) : `-${entry}`;
  }
  if (!/^[0-9]$/.test(key)) return entry;
  const digits = entry.replace('-', '');
  if (digits.length >= MAX_DIGITS) return entry;
  if (digits === '0') return entry.replace('0', key);
  return entry + key;
}

/** The typed number, or null for a blank (or a lone minus sign). */
export function entryValue(entry: string): number | null {
  return entry === '' || entry === '-' ? null : Number(entry);
}

/** The next box to fill after `from`: the next blank one down the page, wrapping, else just the next. */
export function nextBox(entries: string[], from: number): number {
  for (let step = 1; step <= entries.length; step++) {
    const i = (from + step) % entries.length;
    if (entryValue(entries[i]) === null) return i;
  }
  return (from + 1) % entries.length;
}
