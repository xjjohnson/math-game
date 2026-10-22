import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { addDays, parseDateKey } from '@/utils/dates';

interface Props {
  playDates: readonly string[];
  today: string;
  /** How many weeks to show, ending with the current week. */
  weeks?: number;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Grid of recent weeks (Sunday first); days with a finished round are filled in. */
export function StreakCalendar({ playDates, today, weeks = 5 }: Props) {
  const played = new Set(playDates);
  const firstDay = addDays(today, -parseDateKey(today).getDay() - (weeks - 1) * 7);

  const rows = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(firstDay, w * 7 + d)),
  );

  return (
    <View style={styles.grid} accessibilityLabel={`Played ${countIn(rows, played)} of the last ${weeks} weeks' days`}>
      <View style={styles.row}>
        {DAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.label}>
            {label}
          </Text>
        ))}
      </View>
      {rows.map((days) => (
        <View key={days[0]} style={styles.row}>
          {days.map((day) => {
            const future = day > today;
            const on = played.has(day);
            return (
              <View
                key={day}
                style={[
                  styles.cell,
                  on && styles.played,
                  day === today && styles.today,
                  future && styles.future,
                ]}
              >
                <Text style={[styles.date, on && styles.playedText]}>{Number(day.slice(8))}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function countIn(rows: string[][], played: Set<string>) {
  return rows.flat().filter((d) => played.has(d)).length;
}

const styles = StyleSheet.create({
  grid: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.xs },
  label: { flex: 1, textAlign: 'center', fontWeight: '800', color: colors.textMuted },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  played: { backgroundColor: colors.accent },
  today: { borderColor: colors.primary },
  future: { opacity: 0.35 },
  date: { fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  playedText: { color: colors.primaryText },
});
