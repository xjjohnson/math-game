import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { StreakCalendar } from '@/components/StreakCalendar';
import { OPERATIONS } from '@/constants/difficulty';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { useActiveProfile } from '@/store/profiles';
import { dateKey, dayStreak } from '@/utils/dates';
import { accuracy } from '@/utils/progress';

export function ProgressScreen() {
  const profile = useActiveProfile();
  if (!profile) {
    return (
      <Screen title="My progress">
        <Text style={styles.empty}>Pick a player first.</Text>
      </Screen>
    );
  }

  const today = dateKey();
  const days = dayStreak(profile.playDates, today);

  return (
    <Screen title={`${profile.avatar} ${profile.name}`}>
      <View style={styles.tiles}>
        <Tile value={String(profile.coins)} label="🪙 Coins" />
        <Tile value={String(profile.stars)} label="⭐ Stars" />
        <Tile value={String(profile.bestStreak)} label="🔥 Best streak" />
        <Tile value={String(days)} label={days === 1 ? '📅 Day in a row' : '📅 Days in a row'} />
      </View>

      <Text style={styles.heading}>How you're doing</Text>
      {OPERATIONS.map((op) => {
        const stats = profile.stats[op.value];
        const pct = accuracy(stats);
        return (
          <View key={op.value} style={styles.opRow}>
            <View style={styles.opHeader}>
              <Text style={[styles.opLabel, { color: colors.operations[op.value] }]}>
                {op.symbol} {op.label}
              </Text>
              <Text style={styles.opValue}>
                {pct === null ? 'Not tried yet' : `${pct}% right (${stats.correct}/${stats.attempted})`}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${pct ?? 0}%`, backgroundColor: colors.operations[op.value] },
                ]}
              />
            </View>
          </View>
        );
      })}

      <Text style={styles.heading}>Days played</Text>
      <StreakCalendar playDates={profile.playDates} today={today} />
    </Screen>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: fontSizes.body, color: colors.text, textAlign: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexBasis: '45%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tileValue: { fontSize: fontSizes.title, fontWeight: '900', color: colors.text },
  tileLabel: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  heading: { fontSize: fontSizes.button, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  opRow: { gap: spacing.xs },
  opHeader: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  opLabel: { fontSize: fontSizes.body, fontWeight: '800' },
  opValue: { fontSize: 16, fontWeight: '700', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  track: { height: 18, borderRadius: radius.md, backgroundColor: colors.disabled, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.md },
});
