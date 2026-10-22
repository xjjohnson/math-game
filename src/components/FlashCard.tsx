import { StyleSheet, Text, View } from 'react-native';

import type { CardStyle } from '@/constants/shop';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import type { Problem } from '@/types';

interface Props {
  problem: Problem;
  /** Shown under the prompt after answering, e.g. "= 56". */
  reveal?: boolean;
  /** Look bought in the shop; defaults to the classic white card. */
  cardStyle?: CardStyle;
}

const SPOKEN: Record<Problem['operation'], string> = {
  add: 'plus',
  subtract: 'minus',
  multiply: 'times',
  divide: 'divided by',
};

export function FlashCard({ problem, reveal = false, cardStyle }: Props) {
  const look = cardStyle ?? {
    background: colors.surface,
    text: colors.text,
    border: null,
    borderStyle: 'solid' as const,
  };
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: look.background,
          borderColor: look.border ?? colors.operations[problem.operation],
          borderStyle: look.borderStyle,
        },
      ]}
    >
      <Text
        style={[styles.prompt, { color: look.text }]}
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
    borderWidth: 6,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  prompt: { fontSize: fontSizes.problem, fontWeight: '900' },
  answer: { fontSize: fontSizes.title, fontWeight: '800', color: colors.correct },
  hidden: { opacity: 0 },
});
