import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { PopIn } from '@/components/PopIn';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';

interface Props {
  monster: string;
  /** Hits the team has landed so far. */
  hits: number;
  /** The monster's full health. */
  health: number;
  /** One short row, to sit above a question. */
  compact?: boolean;
}

/** A team's monster with its health bar; it wobbles each time it's hit. */
export function MonsterBar({ monster, hits, health, compact }: Props) {
  const left = Math.max(0, health - hits);
  const beaten = left === 0;
  return (
    <View
      style={compact ? styles.row : styles.wrap}
      accessible
      accessibilityLabel={beaten ? 'The monster is beaten!' : `Monster health: ${left} of ${health}`}
    >
      {/* Remounting on every hit replays the pop, so the monster flinches. */}
      <PopIn key={hits} damping={6}>
        <Text style={[styles.monster, compact && styles.compact]}>{beaten ? '💫' : monster}</Text>
      </PopIn>
      <View style={[styles.row, compact && styles.grow]}>
        <Text style={styles.heart}>❤️</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(left / health) * 100}%` }]} />
        </View>
        <Text style={styles.value}>
          {left}/{health}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xs },
  monster: { fontSize: 96, textAlign: 'center' },
  compact: { fontSize: 40 },
  grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  heart: { fontSize: fontSizes.body },
  track: { flex: 1, height: 20, borderRadius: radius.md, backgroundColor: colors.disabled, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.md, backgroundColor: colors.wrong },
  value: { width: 64, textAlign: 'right', fontSize: 18, fontWeight: '800', color: colors.text },
});
