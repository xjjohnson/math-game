import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import type { Problem } from '@/types';
import { tapItem, type CountItem, type CountModel } from '@/utils/countingAid';

interface Props {
  problem: Problem;
  model: CountModel;
}

const DOT = 34;

/** Tap-to-count picture of a problem. Each tap writes the running count on what was tapped. */
export function CountingAid({ problem, model }: Props) {
  const palette = usePalette();
  const [order, setOrder] = useState<number[]>([]);

  // Number every item across the groups so a tap can be remembered by its index.
  const flat = useMemo(() => model.groups.flatMap((g) => g.items), [model]);
  const countAt = useMemo(() => {
    const counts = new Map<number, number>();
    let total = 0;
    for (const i of order) {
      total += flat[i].value;
      counts.set(i, total);
    }
    return counts;
  }, [order, flat]);
  const total = order.reduce((sum, i) => sum + flat[i].value, 0);

  // Division's color is already orange, so its second color is blue.
  const second = problem.operation === 'divide' ? colors.primary : colors.accent;
  const tint = (item: CountItem) => (item.part === 'a' ? palette.operations[problem.operation] : second);

  let index = 0;
  return (
    <View style={styles.panel}>
      <Text style={styles.tip}>{model.tip}</Text>
      <View style={[styles.groups, model.layout === 'rows' && styles.rows]}>
        {model.groups.map((group, g) => (
          <View key={g} style={[styles.group, model.layout === 'rows' && styles.rowGroup]}>
            {model.layout === 'frames' ? <Text style={styles.groupLabel}>{group.label}</Text> : null}
            <View
              style={[
                styles.items,
                model.layout === 'frames' &&
                  (group.items.some((it) => it.shape !== 'dot') ? styles.blockFrame : styles.frame),
              ]}
            >
              {group.items.map((item) => {
                const i = index++;
                const count = countAt.get(i);
                const counted = count !== undefined;
                return (
                  <Pressable
                    key={i}
                    disabled={item.crossed}
                    onPress={() => setOrder((o) => tapItem(o, i))}
                    accessibilityRole="button"
                    accessibilityLabel={
                      item.crossed ? 'Taken away' : counted ? `Counted ${count}` : `Count ${item.value}`
                    }
                    hitSlop={2}
                    style={[
                      styles[item.shape],
                      { borderColor: tint(item) },
                      counted && { backgroundColor: tint(item) },
                      item.crossed && styles.crossed,
                    ]}
                  >
                    <Text
                      style={[styles.count, counted && styles.countOn, item.shape !== 'dot' && styles.countBig]}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                    >
                      {item.crossed ? '✗' : counted ? String(count) : item.shape === 'dot' ? '' : String(item.value)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.total} accessibilityLiveRegion="polite">
          You counted: <Text style={styles.totalNumber}>{total}</Text>
        </Text>
        {order.length > 0 ? (
          <Pressable onPress={() => setOrder([])} accessibilityRole="button" style={styles.reset} hitSlop={8}>
            <Text style={styles.resetText}>Start over</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  tip: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  groups: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  rows: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'center', gap: spacing.xs },
  group: { alignItems: 'center', gap: spacing.xs },
  rowGroup: { flexDirection: 'row' },
  groupLabel: { fontSize: 18, fontWeight: '800', color: colors.textMuted },
  items: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  // Five across, like a ten-frame, so groups of five are easy to see.
  frame: { maxWidth: DOT * 5 + 4 * 4 },
  blockFrame: { maxWidth: 280, alignItems: 'flex-end' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  // A tall rod, like a base-ten block.
  ten: {
    width: DOT,
    height: DOT * 3,
    borderRadius: 6,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  hundred: {
    width: DOT * 3,
    height: DOT * 3,
    borderRadius: 6,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  crossed: { opacity: 0.45, borderStyle: 'dashed' },
  count: { fontSize: 14, fontWeight: '900', color: colors.textMuted },
  countOn: { color: colors.primaryText },
  countBig: { fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  total: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  totalNumber: { color: colors.primary, fontSize: fontSizes.button },
  reset: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  resetText: { fontSize: 16, fontWeight: '800', color: colors.primary, textDecorationLine: 'underline' },
});
