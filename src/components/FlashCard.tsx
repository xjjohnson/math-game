import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/AppText';
import { ColumnWork } from '@/components/ColumnWork';
import { PopIn } from '@/components/PopIn';
import { QuestionPicture } from '@/components/QuestionPicture';
import { OPERATIONS } from '@/constants/difficulty';
import type { CardStyle } from '@/constants/shop';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useBigScreen } from '@/hooks/useBigScreen';
import type { Problem } from '@/types';
import { columnLayout, type ColumnEntry, type ColumnLayout, type ColumnRow } from '@/utils/columnEntry';
import { answerText, spokenProblem } from '@/utils/feedback';

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
    !problem.ask &&
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
      {problem.ask ? (
        <SkillFace problem={problem} reveal={reveal} ink={look.text} correctColor={palette.correct} color={palette.operations[problem.operation]} big={big} />
      ) : problem.story ? (
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

/**
 * A question that isn't a plain sum: what to do, its picture, and a line with
 * a box for the answer (the box fills in once the answer is shown).
 */
function SkillFace({
  problem,
  reveal,
  ink,
  correctColor,
  color,
  big,
}: {
  problem: Problem;
  reveal: boolean;
  ink: string;
  correctColor: string;
  color: string;
  big: boolean;
}) {
  const { width } = useWindowDimensions();
  const pictureWidth = Math.min(width - 80, big ? 520 : 360);
  const shown = answerText(problem, problem.answer);
  return (
    <>
      <Text style={[styles.ask, big && styles.askBig, { color: ink }]}>{problem.ask}</Text>
      {problem.picture ? (
        <View style={styles.picture}>
          <QuestionPicture
            key={problem.prompt + problem.ask}
            picture={problem.picture}
            width={pictureWidth}
            flashMs={reveal ? undefined : problem.flashMs}
            color={color}
          />
        </View>
      ) : null}
      {problem.prompt ? (
        <Text style={[styles.skillPrompt, big && styles.skillPromptBig, { color: ink }]} adjustsFontSizeToFit numberOfLines={2}>
          {reveal && problem.prompt.includes('☐') ? (
            <>
              {problem.prompt.split('☐')[0]}
              <Text style={{ color: correctColor }}>{shown}</Text>
              {problem.prompt.split('☐').slice(1).join('☐')}
            </>
          ) : (
            problem.prompt
          )}
        </Text>
      ) : null}
      {/* Only on the page once shown, so it can't be found early. */}
      {reveal && (!problem.prompt || !problem.prompt.includes('☐')) ? (
        <Text style={[styles.storyAnswer, { color: correctColor }]}>{shown}</Text>
      ) : null}
    </>
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
  ask: { fontSize: 22, fontWeight: '800', lineHeight: 30, textAlign: 'center', paddingHorizontal: 30 },
  askBig: { fontSize: 30, lineHeight: 40 },
  picture: { marginVertical: spacing.sm, alignItems: 'center' },
  skillPrompt: { fontSize: 44, fontWeight: '900', textAlign: 'center' },
  skillPromptBig: { fontSize: 64 },
});
