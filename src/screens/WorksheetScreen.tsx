import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { SheetPad } from '@/components/NumberPad';
import { isNotable, RoundResults } from '@/components/RoundResults';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { AnswerRecord, GameConfig, Problem } from '@/types';
import { highScoreKey, parseConfig } from '@/utils/gameSession';
import type { RoundOutcome } from '@/utils/progress';
import { randomSeed } from '@/utils/seededRandom';
import { backgroundColor } from '@/utils/shop';
import { playSound } from '@/utils/soundEffects';
import {
  allowsNegative,
  entryValue,
  gradeWorksheet,
  nextBox,
  typeKey,
  worksheetProblems,
  type WorksheetResult,
} from '@/utils/worksheet';

export function WorksheetScreen() {
  const params = useLocalSearchParams<{ config?: string }>();
  const [config, setConfig] = useState(() => parseConfig(params.config));
  return (
    <Sheet key={config.seed} config={config} onPlayAgain={() => setConfig({ ...config, seed: randomSeed() })} />
  );
}

function Sheet({ config, onPlayAgain }: { config: GameConfig; onPlayAgain: () => void }) {
  const profile = useActiveProfile();
  const recordRound = useProfiles((s) => s.recordRound);
  const background = backgroundColor(profile);
  const problems = useMemo(() => worksheetProblems(config), [config]);
  const [entries, setEntries] = useState<string[]>(() => problems.map(() => ''));
  const [selected, setSelected] = useState(0);
  const [askedBlank, setAskedBlank] = useState(false);
  const [result, setResult] = useState<WorksheetResult | null>(null);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);

  const scroll = useRef<ScrollViewInstance>(null);
  const rowY = useRef<number[]>([]);
  const blanks = entries.filter((e) => entryValue(e) === null).length;

  // Keep the box being filled in view above the pad.
  useEffect(() => {
    const y = rowY.current[selected];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - spacing.xl * 2), animated: true });
  }, [selected]);

  const press = (key: string) => {
    const negative = allowsNegative(config, problems[selected]);
    setEntries((list) => list.map((e, i) => (i === selected ? typeKey(e, key, negative) : e)));
    setAskedBlank(false);
  };

  const check = () => {
    if (blanks > 0 && !askedBlank) {
      setAskedBlank(true);
      return;
    }
    const graded = gradeWorksheet(config, problems, entries.map(entryValue));
    setResult(graded);
    if (!profile) return;
    const round = recordRound(profile.id, {
      highScoreKey: highScoreKey(config),
      score: graded.score,
      bestStreak: graded.bestStreak,
      history: graded.history,
      difficulty: config.difficulty,
      dailyDate: config.dailyDate,
    });
    setOutcome(round);
    playSound(round && isNotable(round) ? 'reward' : 'correct');
  };

  if (result) {
    return (
      <RoundResults
        summary={result}
        outcome={outcome}
        onPlayAgain={onPlayAgain}
        details={<MarkedSheet history={result.history} />}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['bottom', 'left', 'right']}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Tap a box and fill in every answer. Then check them all at the end!</Text>
        {problems.map((problem, i) => (
          <View key={i} onLayout={(e) => (rowY.current[i] = e.nativeEvent.layout.y)}>
            <SheetRow
              number={i + 1}
              problem={problem}
              entry={entries[i]}
              selected={i === selected}
              onPress={() => setSelected(i)}
            />
          </View>
        ))}
        {askedBlank ? (
          <Text style={styles.warn}>
            {blanks} {blanks === 1 ? 'answer is' : 'answers are'} empty. Tap again to check anyway.
          </Text>
        ) : null}
        <BigButton
          label={`✓ Check my answers (${problems.length - blanks}/${problems.length})`}
          color={colors.correct}
          onPress={check}
        />
      </ScrollView>
      <View style={[styles.pad, { backgroundColor: background }]}>
        <SheetPad
          onKey={press}
          onNext={() => setSelected(nextBox(entries, selected))}
          allowNegative={allowsNegative(config, problems[selected])}
        />
      </View>
    </SafeAreaView>
  );
}

function SheetRow({
  number,
  problem,
  entry,
  selected,
  onPress,
}: {
  number: number;
  problem: Problem;
  entry: string;
  selected: boolean;
  onPress: () => void;
}) {
  const palette = usePalette();
  const color = palette.operations[problem.operation];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Question ${number}: ${problem.story ?? problem.prompt}. Your answer: ${entry || 'empty'}`}
      accessibilityState={{ selected }}
      style={[styles.row, { borderColor: selected ? color : colors.disabled }, selected && styles.rowOn]}
    >
      <Text style={[styles.number, { color }]}>{number}.</Text>
      <View style={styles.question}>
        {problem.story ? <Text style={styles.story}>{problem.story}</Text> : null}
        <View style={styles.equation}>
          {problem.story ? null : <Text style={styles.prompt}>{problem.prompt} =</Text>}
          <View style={[styles.box, { borderColor: selected ? color : colors.border }]}>
            <Text style={styles.boxText}>{entry || (selected ? '_' : ' ')}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function MarkedSheet({ history }: { history: AnswerRecord[] }) {
  const palette = usePalette();
  return (
    <View style={styles.marked}>
      <Text style={styles.markedTitle}>Your worksheet</Text>
      {history.map((r, i) => (
        <View key={i} style={styles.markedRow}>
          <Text style={[styles.tick, { color: r.correct ? palette.correct : palette.wrong }]}>
            {r.correct ? '✓' : '✗'}
          </Text>
          <Text style={styles.markedText}>
            {r.problem.prompt} = {r.given ?? '?'}
          </Text>
          {r.correct ? null : (
            <Text style={[styles.markedFix, { color: palette.correct }]}>→ {r.problem.answer}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  intro: { fontSize: 18, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TAP_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 3,
    backgroundColor: colors.surface,
  },
  rowOn: { borderWidth: 4 },
  number: { fontSize: fontSizes.body, fontWeight: '900', minWidth: 32 },
  question: { flex: 1, gap: spacing.xs },
  story: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: colors.text },
  equation: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  prompt: { fontSize: fontSizes.button + 4, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  box: {
    minWidth: 96,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    borderWidth: 3,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  boxText: { fontSize: fontSizes.button + 4, fontWeight: '900', color: colors.primary },
  warn: { fontSize: 18, fontWeight: '800', color: colors.wrong, textAlign: 'center' },
  pad: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  marked: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  markedTitle: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  markedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tick: { fontSize: fontSizes.button, fontWeight: '900', width: 28 },
  markedText: { fontSize: fontSizes.body, color: colors.text, fontVariant: ['tabular-nums'] },
  markedFix: { fontSize: fontSizes.body, fontWeight: '900' },
});
