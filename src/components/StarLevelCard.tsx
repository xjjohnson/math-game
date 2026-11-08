import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { findItem } from '@/constants/shop';
import { colors, radius, spacing } from '@/constants/theme';
import { starProgress } from '@/utils/starLevels';

/** Star level, a bar to the next one, and the reward waiting there. */
export function StarLevelCard({ stars }: { stars: number }) {
  const p = starProgress(stars);
  const reward = p.next?.reward ? findItem(p.next.reward) : undefined;
  const fill = p.next ? Math.min(1, p.into / p.span) : 1;
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={
        p.next
          ? `Star level ${p.level}, ${p.title}. ${p.next.stars - stars} more stars to ${p.next.title}.`
          : `Star level ${p.level}, ${p.title}. Top level!`
      }
    >
      <View style={styles.head}>
        <Text style={styles.title}>⭐ Level {p.level}: {p.title}</Text>
        <Text style={styles.count}>{stars} ⭐</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(fill * 100)}%` }]} />
      </View>
      <Text style={styles.next}>
        {p.next
          ? `${p.next.stars - stars} more ⭐ to ${p.next.title}${reward ? ` and a free ${reward.name}` : ''}`
          : 'Top level! You are a Math Legend.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs, borderWidth: 2, borderColor: '#F0E3B8' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, flexShrink: 1 },
  count: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  track: { height: 14, borderRadius: 7, backgroundColor: '#EFEAD6', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 7 },
  next: { fontSize: 14, color: colors.textMuted },
});
