import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { Screen } from '@/components/Screen';
import { DIFFICULTIES } from '@/constants/difficulty';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import type { Difficulty, Operation } from '@/types';
import { generate } from '@/utils/mathEngine';
import { createRng, randomSeed } from '@/utils/seededRandom';

const OPERATIONS = new Set<Operation>(['add', 'subtract', 'multiply', 'divide']);

/**
 * Phase 1-2 preview: shows problems from the math engine with multiple choice.
 * Scoring, timers, the number pad and rewards are added in Phase 3.
 */
export function PlayScreen() {
  const params = useLocalSearchParams<{ operation?: string; difficulty?: string }>();
  const operation = OPERATIONS.has(params.operation as Operation) ? (params.operation as Operation) : 'add';
  const difficulty = (params.difficulty as Difficulty) in DIFFICULTIES ? (params.difficulty as Difficulty) : 'easy';

  const rng = useMemo(() => createRng(randomSeed()), []);
  const [problem, setProblem] = useState(() => generate(operation, difficulty, rng));
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const onSelect = (choice: number) => {
    setSelected(choice);
    if (choice === problem.answer) setCorrectCount((n) => n + 1);
  };

  const next = () => {
    setProblem(generate(operation, difficulty, rng));
    setSelected(null);
  };

  const answered = selected !== null;
  const right = selected === problem.answer;

  return (
    <Screen>
      <Text style={styles.counter}>Correct: {correctCount}</Text>
      <View style={[styles.card, { borderColor: colors.operations[operation] }]}>
        <Text style={styles.problem} accessibilityLabel={`What is ${problem.prompt}?`}>
          {problem.prompt}
        </Text>
      </View>
      <ChoiceButtons
        choices={problem.choices}
        selected={selected}
        answer={problem.answer}
        onSelect={onSelect}
      />
      {answered ? (
        <>
          <Text style={[styles.feedback, { color: right ? colors.correct : colors.wrong }]}>
            {right ? 'Great job!' : `It was ${problem.answer}`}
          </Text>
          <BigButton label="Next" onPress={next} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  counter: { fontSize: fontSizes.body, color: colors.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 6,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  problem: { fontSize: fontSizes.problem, fontWeight: '900', color: colors.text },
  feedback: { fontSize: fontSizes.button, fontWeight: '800', textAlign: 'center' },
});
