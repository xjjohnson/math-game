import { StyleSheet } from 'react-native';

import { Text } from '@/components/AppText';
import { ColumnWork } from '@/components/ColumnWork';
import { PopIn } from '@/components/PopIn';
import { OPERATIONS } from '@/constants/difficulty';
import type { CardStyle } from '@/constants/shop';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useBigScreen } from '@/hooks/useBigScreen';
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

export function FlashCard({ problem, reveal = false, column, cardStyle }: Props) {
  const palette = usePalette();
  const big = useBigScreen();
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
      {look.corners ? <Corners pair={look.corners} /> : null}
      {problem.story ? (
        <>
          <Text style={[styles.story, big && styles.storyBig, ink]}>{problem.story}</Text>
          {/* Only put on the page once shown, so it can't be found early (working out the sum is part of a story). */}
          <Text style={[styles.storyAnswer, { color: palette.correct }]}>
            {reveal ? `${problem.prompt} = ${problem.answer}` : ' '}
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
          <Text style={[styles.prompt, big && styles.promptBig, ink]} adjustsFontSizeToFit numberOfLines={1}>
            {problem.prompt}
          </Text>
          {/* "= ?" holds the answer's place until it is shown, so the card never looks half done. */}
          <Text style={[styles.answer, big && styles.answerBig, { color: reveal ? palette.correct : colors.textMuted }]}>
            = {reveal ? problem.answer : '?'}
          </Text>
        </>
      )}
    </PopIn>
  );
}

/** Two little pictures drawn in the card's four corners. */
function Corners({ pair }: { pair: [string, string] }) {
  const [first, second] = pair;
  return (
    <>
      <Text style={[styles.corner, { top: 4, left: 8 }]}>{first}</Text>
      <Text style={[styles.corner, { bottom: 4, left: 8 }]}>{second}</Text>
      <Text style={[styles.corner, { top: 4, right: 8 }]}>{second}</Text>
      <Text style={[styles.corner, { bottom: 4, right: 8 }]}>{first}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', fontSize: 22 },
  card: {
    borderWidth: 6,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  prompt: { fontSize: fontSizes.problem, fontWeight: '900' },
  answer: { fontSize: fontSizes.title, fontWeight: '800' },
  promptBig: { fontSize: 96 },
  answerBig: { fontSize: 52 },
  storyBig: { fontSize: 32, lineHeight: 44 },
  story: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 34,
    textAlign: 'center',
    // Leaves room for the corner pictures some card looks have.
    paddingHorizontal: 36,
  },
  storyAnswer: { fontSize: fontSizes.button, fontWeight: '800', marginTop: spacing.sm },
});
