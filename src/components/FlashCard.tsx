import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import type { Problem } from '@/types';

interface Props {
  problem: Problem;
  /** Shown under the prompt after answering, e.g. "= 56". */
  reveal?: boolean;
}

const SPOKEN: Record<Problem['operation'], string> = {
  add: 'plus',
  subtract: 'minus',
  multiply: 'times',
  divide: 'divided by',
};

export function FlashCard({ problem, reveal = false }: Props) {
  return (
    <View style={[styles.card, { borderColor: colors.operations[problem.operation] }]}>
      <Text
        style={styles.prompt}
        adjustsFontSizeToFit
        numberOfLines={1}
        accessibilityLabel={`What is ${problem.a} ${SPOKEN[problem.operation]} ${problem.b}?`}
      >
        {problem.prompt}
      </Text>
      <Text style={[styles.answer, !reveal && styles.hidden]}>= {problem.answer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 6,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  prompt: { fontSize: fontSizes.problem, fontWeight: '900', color: colors.text },
  answer: { fontSize: fontSizes.title, fontWeight: '800', color: colors.correct },
  hidden: { opacity: 0 },
});
