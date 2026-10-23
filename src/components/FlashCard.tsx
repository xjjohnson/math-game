import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/AppText';
import { ColumnWork } from '@/components/ColumnWork';
import { PopIn } from '@/components/PopIn';
import { OPERATIONS } from '@/constants/difficulty';
import type { CardStyle } from '@/constants/shop';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import type { Problem } from '@/types';
import { columnLayout, type ColumnEntry, type ColumnLayout, type ColumnRow } from '@/utils/columnEntry';
import { spokenProblem } from '@/utils/feedback';

interface Props {
  problem: Problem;
  /** Shows the answer under the problem (after a miss). */
  reveal?: boolean;
  /** Answer boxes for a stacked problem the player types into. */
  column?: ColumnProps;
  /** Look bought in the shop; defaults to the classic white card. */
  cardStyle?: CardStyle;
  /** Shows a speaker button that reads the problem aloud. */
  onSpeak?: () => void;
}

const SYMBOLS = Object.fromEntries(OPERATIONS.map((o) => [o.value, o.symbol])) as Record<
  Problem['operation'],
  string
>;

/**
 * Multi-digit +, − and × are written in columns, like on paper, so the player
 * can work them out place by place. One-digit facts and division stay on one line.
 */
export function isStacked(problem: Problem): boolean {
  return (
    !problem.story &&
    problem.operation !== 'divide' &&
    Math.max(Math.abs(problem.a), Math.abs(problem.b)) >= 10
  );
}

export interface ColumnProps {
  layout: ColumnLayout;
  entry: ColumnEntry;
  selectable: boolean;
  pending?: string;
  flyCarries?: boolean;
  finished?: boolean;
  allowNegative?: boolean;
  onSelect: (row: ColumnRow, col: number) => void;
  onToggleSign?: () => void;
}

export function FlashCard({ problem, reveal = false, column, cardStyle, onSpeak }: Props) {
  const palette = usePalette();
  const look = cardStyle ?? {
    background: colors.surface,
    text: colors.text,
    border: null,
    borderStyle: 'solid' as const,
  };
  const ink = { color: look.text };

  return (
    <PopIn
      style={[
        styles.card,
        {
          backgroundColor: look.background,
          borderColor: look.border ?? palette.operations[problem.operation],
          borderStyle: look.borderStyle,
        },
      ]}
      accessible
      accessibilityLabel={spokenProblem(problem)}
    >
      {problem.story ? (
        <>
          <Text style={[styles.story, ink]}>{problem.story}</Text>
          <Text style={[styles.storyAnswer, { color: palette.correct }, !reveal && styles.hidden]}>
            {problem.prompt} = {problem.answer}
          </Text>
        </>
      ) : isStacked(problem) ? (
        <ColumnWork
          problem={problem}
          layout={column?.layout ?? columnLayout(problem)}
          symbol={SYMBOLS[problem.operation]}
          ink={look.text}
          correctColor={palette.correct}
          entry={column?.entry ?? null}
          reveal={reveal}
          selectable={column?.selectable}
          pending={column?.pending}
          flyCarries={column?.flyCarries}
          finished={column?.finished}
          allowNegative={column?.allowNegative}
          onSelect={column?.onSelect}
          onToggleSign={column?.onToggleSign}
        />
      ) : (
        <>
          <Text style={[styles.prompt, ink]} adjustsFontSizeToFit numberOfLines={1}>
            {problem.prompt}
          </Text>
          <Text style={[styles.answer, { color: palette.correct }, !reveal && styles.hidden]}>
            = {problem.answer}
          </Text>
        </>
      )}
      {onSpeak ? (
        <Pressable
          onPress={onSpeak}
          style={styles.speaker}
          accessibilityRole="button"
          accessibilityLabel="Read the problem out loud"
          hitSlop={12}
        >
          <Text style={styles.speakerIcon}>🔊</Text>
        </Pressable>
      ) : null}
    </PopIn>
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
  answer: { fontSize: fontSizes.title, fontWeight: '800' },
  hidden: { opacity: 0 },
  story: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
    // Leaves room for the speaker button in the corner.
    paddingHorizontal: 36,
  },
  storyAnswer: { fontSize: fontSizes.button, fontWeight: '800', marginTop: spacing.sm },
  speaker: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: spacing.xs },
  speakerIcon: { fontSize: 28 },
});
