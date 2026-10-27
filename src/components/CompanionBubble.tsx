import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BuddyFace } from '@/components/BuddyFace';
import type { Companion } from '@/constants/shop';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';

interface Props {
  companion: Companion;
  /** null while the question is still open. */
  correct: boolean | null;
  /** Picks which line to say, so it changes from question to question. */
  turn: number;
  /** What the buddy wears for its level. */
  gift?: string | null;
}

/** The player's buddy, cheering right answers and encouraging after misses. */
export function CompanionBubble({ companion, correct, turn, gift }: Props) {
  const lines = correct === null ? null : correct ? companion.cheers : companion.comforts;
  const line = lines ? lines[turn % lines.length] : null;
  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <View style={correct === true && styles.bounce}>
        <BuddyFace value={companion.emoji} size={44} gift={gift} />
      </View>
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
