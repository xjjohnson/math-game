import type { GameConfig } from '@/types';
import { problemAt } from '@/utils/gameSession';
import { pointsFor } from '@/utils/scoring';
import { entryValue, gradeWorksheet, nextBox, typeKey, worksheetProblems } from '@/utils/worksheet';

const config: GameConfig = {
  mode: { kind: 'operation', operation: 'multiply' },
  difficulty: 'medium',
  timer: null,
  adaptive: false,
  questionCount: 10,
  seed: 99,
  worksheet: true,
};

describe('worksheet', () => {
  it('asks the same questions as a round with the same seed', () => {
    const problems = worksheetProblems(config);
    expect(problems).toHaveLength(10);
    problems.forEach((p, i) => expect(p).toEqual(problemAt(config, i, 'medium')));
  });

  it('marks every answer and counts streaks down the page', () => {
    const problems = worksheetProblems(config);
    const answers = problems.map((p, i) => (i === 3 ? p.answer + 1 : i === 7 ? null : p.answer));
    const result = gradeWorksheet(config, problems, answers);
    expect(result.history.map((r) => r.correct)).toEqual([
      true, true, true, false, true, true, true, false, true, true,
    ]);
    expect(result.history[7].given).toBeNull();
    expect(result.bestStreak).toBe(3);
    const expected = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2].reduce(
      (sum, streak) =>
        sum + (streak ? pointsFor({ operation: 'multiply', difficulty: 'medium' }, streak, null, null) : 0),
      0,
    );
    expect(result.score).toBe(expected);
  });

  it('types into a box like the number pad', () => {
    expect(typeKey('', '0', false)).toBe('0');
    expect(typeKey('0', '7', false)).toBe('7');
    expect(typeKey('12', '⌫', false)).toBe('1');
    expect(typeKey('12', '±', false)).toBe('12');
    expect(typeKey('12', '±', true)).toBe('-12');
    expect(typeKey('-12', '±', true)).toBe('12');
    expect(typeKey('123456', '7', false)).toBe('123456');
    expect(entryValue('-')).toBeNull();
    expect(entryValue('-4')).toBe(-4);
  });

  it('moves to the next blank box, wrapping round', () => {
    expect(nextBox(['1', '', '3', ''], 0)).toBe(1);
    expect(nextBox(['1', '', '3', ''], 1)).toBe(3);
    expect(nextBox(['', '2', '3', '4'], 3)).toBe(0);
    expect(nextBox(['1', '2', '3'], 2)).toBe(0);
  });
});
