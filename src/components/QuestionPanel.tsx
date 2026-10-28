import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/AppText';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { FlashCard, isStacked } from '@/components/FlashCard';
import { ColumnPad, NumberPad } from '@/components/NumberPad';
import { DIFFICULTIES } from '@/constants/difficulty';
import { fontSizes } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useColumnAnswer } from '@/hooks/useColumnAnswer';
import type { Difficulty, InputStyle, Problem } from '@/types';
import { speakProblem, stopSpeaking, vibrate } from '@/utils/feedback';
import { playSound } from '@/utils/soundEffects';

const RIGHT_PAUSE_MS = 700;
const WRONG_PAUSE_MS = 1600;

interface Props {
  problem: Problem;
  difficulty: Difficulty;
  inputStyle: InputStyle;
  /** Called the moment the player answers. */
  onAnswer: (given: number, correct: boolean) => void;
  /** Called after the right/wrong pause, to move to the next card. */
  onNext: () => void;
  /** Stops taking answers, e.g. while waiting for the other phone. */
  disabled?: boolean;
  /** Don't read the card aloud, e.g. on phones watching a teammate's turn. */
  silent?: boolean;
}

/**
 * One card and its answer buttons, for the two-player games. It shows ✓ or the
 * right answer briefly, then moves on by itself so nobody has to tap Next.
 * Give it a new `key` for each card.
 */
export function QuestionPanel({ problem, difficulty, inputStyle, onAnswer, onNext, disabled, silent }: Props) {
  const palette = usePalette();
  const [given, setGiven] = useState<number | null>(null);
  const answered = given !== null;
  const correct = given === problem.answer;

  const allowNegative =
    DIFFICULTIES[difficulty].allowNegatives && problem.operation === 'subtract' && !problem.story;
  const typingColumns = isStacked(problem) && inputStyle !== 'choices';
  const column = useColumnAnswer(problem, { allowNegative });

  useEffect(() => {
    if (silent) return;
    speakProblem(problem);
    return stopSpeaking;
  }, [problem, silent]);

  useEffect(() => {
    if (!answered) return;
    const id = setTimeout(onNext, correct ? RIGHT_PAUSE_MS : WRONG_PAUSE_MS);
    return () => clearTimeout(id);
    // onNext may be a new function each render; the pause should start once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, correct]);

  const answer = (value: number) => {
    if (answered || disabled) return;
    const right = value === problem.answer;
    setGiven(value);
    vibrate(right ? 'correct' : 'wrong');
    playSound(right ? 'correct' : 'wrong');
    onAnswer(value, right);
  };


  return (
    <>
      <FlashCard
        problem={problem}
        reveal={answered}
        column={
          typingColumns && !answered
            ? {
                layout: column.layout,
                entry: column.entry,
                selectable: true,
                allowNegative,
                onSelect: column.select,
                onToggleSign: () => column.press('±'),
              }
            : undefined
        }
        onSpeak={() => speakProblem(problem, true)}
      />
      {answered ? (
        <Text style={[styles.feedback, { color: correct ? palette.correct : palette.wrong }]}>
          {correct ? '✓ Right!' : `✗ It's ${problem.answer}`}
        </Text>
      ) : null}
      {inputStyle === 'choices' ? (
        <ChoiceButtons
          choices={problem.choices}
          selected={given}
          answer={problem.answer}
          onSelect={answer}
        />
      ) : answered ? null : typingColumns ? (
        <ColumnPad
          onKey={column.press}
          canCheck={column.value !== null}
          onCheck={() => column.value !== null && answer(column.value)}
          disabled={disabled}
        />
      ) : (
        <NumberPad onSubmit={answer} allowNegative={allowNegative} disabled={disabled} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  feedback: { fontSize: fontSizes.button, fontWeight: '800', textAlign: 'center' },
});
