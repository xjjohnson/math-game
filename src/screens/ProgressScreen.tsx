import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { StreakCalendar } from '@/components/StreakCalendar';
import { stickerText } from '@/constants/art';
import { BADGES } from '@/constants/badges';
import { OPERATIONS } from '@/constants/difficulty';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { useActiveProfile } from '@/store/profiles';
import { dateKey, dayStreak } from '@/utils/dates';
import { accuracy } from '@/utils/progress';
import { emptyWeek, goalCount, WEEKLY_GOAL_BONUS, WEEKLY_GOALS, weekKey } from '@/utils/weekly';

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
  const week =
    profile.week && profile.week.week === weekKey(today) ? profile.week : emptyWeek(today);

  return (
    <Screen title={`${stickerText(profile.avatar)} ${profile.name}`}>
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

      <Text style={styles.heading}>This week's goals</Text>
      <Text style={styles.note}>
        Finish all three for the 🏆 Weekly Champ badge and {WEEKLY_GOAL_BONUS} coins.
      </Text>
      {WEEKLY_GOALS.map((goal) => {
        const count = Math.min(goalCount(week, goal.id), goal.target);
        const done = count >= goal.target;
        return (
          <View key={goal.id} style={styles.opRow}>
            <View style={styles.opHeader}>
              <Text style={styles.goalLabel}>
                {done ? '✅' : '⬜'} {goal.label}
              </Text>
              <Text style={styles.opValue}>
                {count} / {goal.target}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${(count / goal.target) * 100}%`,
                    backgroundColor: done ? colors.correct : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}

      <Text style={styles.heading}>
        Badges ({profile.badges.length}/{BADGES.length})
      </Text>
      <View style={styles.badges}>
        {BADGES.map((badge) => {
          const earned = profile.badges.includes(badge.id);
          return (
            <View
              key={badge.id}
              style={[styles.badge, !earned && styles.badgeLocked]}
              accessibilityLabel={`${badge.name}: ${earned ? 'earned' : badge.how}`}
            >
              <Text style={styles.badgeEmoji}>{earned ? badge.emoji : '🔒'}</Text>
              <Text style={styles.badgeName}>{badge.name}</Text>
              {earned ? null : <Text style={styles.badgeHow}>{badge.how}</Text>}
            </View>
          );
        })}
      </View>

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
  note: { fontSize: 16, color: colors.textMuted },
  goalLabel: { fontSize: fontSizes.body, fontWeight: '700', color: colors.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    flexBasis: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  badgeLocked: { opacity: 0.6, borderStyle: 'dashed' },
  badgeEmoji: { fontSize: 32 },
  badgeName: { fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center' },
  badgeHow: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
