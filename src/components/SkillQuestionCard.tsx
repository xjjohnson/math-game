import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { FlashCard } from '@/components/FlashCard';
import { ClockSetter, CoinPurse } from '@/components/HandsOn';
import { HelpPanel } from '@/components/HelpPanel';
import { colors, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import type { Problem, SkillProgress } from '@/types';
import { answerText, speakProblem, stopSpeaking, vibrate } from '@/utils/feedback';
import { handsOnCard } from '@/utils/skills/handsOn';
import { diagnose, waysFor } from '@/utils/skills/help';
import { playSound } from '@/utils/soundEffects';

/**
 * One question from the skill list inside a town job: the card, the way to
 * answer it (choices, the clock or the purse), 💡 Help, and after a miss the
 * slip and "Show me how". Give it a new `key` for each question.
 */
export function SkillQuestionCard({
  problem,
  progress,
  onAnswered,
}: {
  problem: Problem;
  progress: SkillProgress | undefined;
  /** Once, when answered. `helped` is true when help was opened first. */
  onAnswered: (given: number, correct: boolean, helped: boolean) => void;
}) {
  const palette = usePalette();
  const [given, setGiven] = useState<number | null>(null);
  const [help, setHelp] = useState<'ask' | 'miss' | null>(null);
  const [helped, setHelped] = useState(false);
  const answered = given !== null;
  const correct = given === problem.answer;
  const canHelp = useMemo(() => waysFor(problem, false).length > 0, [problem]);
  const it = problem.interact;
  const color = palette.operations[problem.operation];

  useEffect(() => {
    speakProblem(handsOnCard(problem, false));
    return stopSpeaking;
  }, [problem]);

  const answer = (value: number) => {
    if (answered) return;
    const right = value === problem.answer;
    setGiven(value);
    vibrate(right ? 'correct' : 'wrong');
    playSound(right ? 'correct' : 'wrong');
    onAnswered(value, right, helped);
  };
  const slip = answered && !correct ? diagnose(problem, given) : null;

  return (
    <View style={styles.wrap}>
      <FlashCard problem={handsOnCard(problem, answered)} reveal={answered} />
      {!answered && canHelp ? (
        <Pressable
          onPress={() => {
            setHelp('ask');
            setHelped(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Help with this question"
          style={styles.helpButton}
          hitSlop={6}
        >
          <Text style={styles.helpText}>💡 Help</Text>
        </Pressable>
      ) : null}
      {answered ? (
        <View style={styles.result} accessibilityLiveRegion="polite">
          <Text style={[styles.resultText, { color: correct ? palette.correct : palette.wrong }]}>
            {correct ? '✓ Great job!' : `✗ Not quite. It's ${answerText(problem, problem.answer)}.`}
          </Text>
          {slip ? <Text style={styles.slip}>{slip}</Text> : null}
          {!correct && canHelp ? (
            <Pressable onPress={() => setHelp('miss')} accessibilityRole="button" style={styles.helpButton} hitSlop={6}>
              <Text style={styles.helpText}>💡 Show me how</Text>
            </Pressable>
          ) : null}
        </View>
      ) : it?.kind === 'setClock' ? (
        <ClockSetter step={it.step} from={it.from} onCheck={answer} />
      ) : it?.kind === 'purse' ? (
        <CoinPurse coins={it.coins} from={it.from} onCheck={answer} />
      ) : (
        <ChoiceButtons
          choices={problem.choices}
          selected={null}
          answer={problem.answer}
          onSelect={answer}
          label={(c) => answerText(problem, c)}
        />
      )}
      {help ? (
        <HelpPanel
          problem={problem}
          progress={progress}
          reveal={help === 'miss'}
          given={help === 'miss' ? given : undefined}
          color={color}
          onClose={() => setHelp(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, alignSelf: 'stretch' },
  helpButton: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
  },
  helpText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  result: { gap: spacing.xs, alignItems: 'center' },
  resultText: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  slip: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
});
