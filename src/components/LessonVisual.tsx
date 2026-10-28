import { Platform, StyleSheet, Text as RNText, View } from 'react-native';

import { Text } from '@/components/AppText';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import type { LessonVisual as Visual, WorkLine } from '@/utils/lessons';

/** Draws one lesson picture: a number line, dots, ten-frames, written working and so on. */
export function LessonVisual({ visual, color }: { visual: Visual; color: string }) {
  switch (visual.kind) {
    case 'numberLine':
      return <NumberLine {...visual} color={color} />;
    case 'dots':
      return (
        <View style={styles.dotGroups}>
          {visual.groups.map((n, g) => (
            <View key={g} style={[styles.dotGroup, { borderColor: color }]}>
              {Array.from({ length: n }, (_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: g % 2 === 0 ? color : colors.accent }]} />
              ))}
            </View>
          ))}
        </View>
      );
    case 'array':
      return (
        <View style={styles.array} accessible accessibilityLabel={`${visual.rows} rows of ${visual.cols}`}>
          {Array.from({ length: visual.rows }, (_, r) => (
            <View key={r} style={styles.arrayRow}>
              {Array.from({ length: visual.cols }, (_, c) => (
                <View key={c} style={[styles.dot, { backgroundColor: r % 2 === 0 ? color : colors.accent }]} />
              ))}
            </View>
          ))}
        </View>
      );
    case 'tenFrames':
      return (
        <View style={styles.frames}>
          {visual.frames.map((filled, f) => (
            <View key={f} style={styles.frame} accessible accessibilityLabel={`${filled} in this ten-frame`}>
              {Array.from({ length: 10 }, (_, i) => (
                <View key={i} style={styles.cell}>
                  {i < filled ? (
                    <View style={[styles.dot, { backgroundColor: f === 0 ? color : colors.accent }]} />
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case 'work':
      return (
        <View style={styles.paper}>
          {visual.lines.map((line, i) => (
            <WorkText key={i} line={line} color={color} />
          ))}
        </View>
      );
    case 'skip':
      return (
        <View style={styles.chips}>
          {visual.numbers.map((n, i) => (
            <View key={i} style={[styles.chip, { borderColor: color }, i === visual.numbers.length - 1 && { backgroundColor: color }]}>
              <Text style={[styles.chipText, i === visual.numbers.length - 1 && styles.chipTextOn]}>{n}</Text>
            </View>
          ))}
        </View>
      );
    case 'big':
      return (
        <Text style={styles.big} adjustsFontSizeToFit numberOfLines={2}>
          {visual.text}
        </Text>
      );
  }
}

const MONO = Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' });

function WorkText({ line, color }: { line: WorkLine; color: string }) {
  const palette = usePalette();
  const tone =
    line.tone === 'mark'
      ? { color: colors.accent }
      : line.tone === 'answer'
        ? { color: palette.correct }
        : line.tone === 'struck'
          ? { textDecorationLine: 'line-through' as const, color: colors.textMuted }
          : line.tone === 'note'
            ? { color }
            : null;
  // Leading spaces line the columns up; keep them out of the strike-through.
  const indent = line.text.length - line.text.trimStart().length;
  // Plain RN Text: the dyslexia font isn't monospaced, so columns would drift.
  return (
    <RNText style={[styles.work, { fontFamily: MONO }]}>
      {line.text.slice(0, indent)}
      <RNText style={tone}>{line.text.slice(indent)}</RNText>
    </RNText>
  );
}

function NumberLine({
  min,
  max,
  start,
  hops,
  color,
}: {
  min: number;
  max: number;
  start: number;
  hops: number[];
  color: string;
}) {
  // Where each hop lands, and how big it was.
  const landings = new Map<number, number>();
  let at = start;
  for (const hop of hops) {
    at += hop;
    landings.set(at, hop);
  }
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <View style={styles.line} accessible accessibilityLabel={`Number line from ${min} to ${max}, starting at ${start}`}>
      <View style={styles.axis} />
      {ticks.map((n) => {
        const hop = landings.get(n);
        const isStart = n === start;
        const isEnd = hops.length > 0 && n === at;
        return (
          <View key={n} style={styles.tick}>
            <Text style={[styles.hop, { color }]} numberOfLines={1}>
              {hop === undefined ? ' ' : hop > 0 ? `+${hop}` : `${hop}`}
            </Text>
            <View
              style={[
                styles.mark,
                (isStart || hop !== undefined) && { backgroundColor: color, borderColor: color },
                isStart && styles.startMark,
                isEnd && { backgroundColor: colors.correct, borderColor: colors.correct },
              ]}
            />
            <Text style={[styles.tickLabel, (isStart || isEnd) && styles.tickLabelOn]} numberOfLines={1}>
              {n}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 22;

const styles = StyleSheet.create({
  line: { flexDirection: 'row', width: '100%', paddingVertical: spacing.sm },
  axis: { position: 'absolute', left: 0, right: 0, top: spacing.sm + 22 + 7, height: 3, backgroundColor: colors.text },
  tick: { flex: 1, alignItems: 'center' },
  hop: { height: 22, fontSize: 13, fontWeight: '900' },
  mark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  startMark: { transform: [{ scale: 1.3 }] },
  tickLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
  tickLabelOn: { fontSize: 16, fontWeight: '900', color: colors.text },
  dotGroups: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  dotGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: spacing.sm,
    borderWidth: 3,
    borderRadius: radius.md,
    maxWidth: DOT * 5 + 4 * 4 + spacing.sm * 2 + 6,
    justifyContent: 'center',
  },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  array: { alignItems: 'center', gap: 4 },
  arrayRow: { flexDirection: 'row', gap: 4 },
  frames: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  frame: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: (DOT + 10) * 5 + 6,
    borderWidth: 3,
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  cell: {
    width: DOT + 10,
    height: DOT + 10,
    borderWidth: 1,
    borderColor: colors.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paper: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  work: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  chip: {
    minWidth: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 3,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: fontSizes.button, fontWeight: '900', color: colors.text },
  chipTextOn: { color: colors.primaryText },
  big: { fontSize: fontSizes.title, fontWeight: '900', color: colors.text, textAlign: 'center' },
});
