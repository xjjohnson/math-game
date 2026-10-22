import { StyleSheet, Text, View } from 'react-native';

import type { Companion } from '@/constants/shop';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';

interface Props {
  companion: Companion;
  /** null while the question is still open. */
  correct: boolean | null;
  /** Picks which line to say, so it changes from question to question. */
  turn: number;
}

/** The player's buddy, cheering right answers and encouraging after misses. */
export function CompanionBubble({ companion, correct, turn }: Props) {
  const lines = correct === null ? null : correct ? companion.cheers : companion.comforts;
  const line = lines ? lines[turn % lines.length] : null;
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Text style={[styles.emoji, correct === true && styles.bounce]}>{companion.emoji}</Text>
      {line ? (
        <View style={styles.bubble}>
          <Text style={styles.text}>{line}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 56 },
  emoji: { fontSize: 44 },
  bounce: { transform: [{ translateY: -6 }] },
  bubble: {
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
});
