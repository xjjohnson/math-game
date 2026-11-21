import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { colors, radius, spacing } from '@/constants/theme';

interface Props {
  total: number;
  left: number;
  /** Seconds a speed bonus lasts; shows a ⚡ countdown under the bar until then. */
  speedy?: number;
}

/** Shrinking bar plus whole seconds left; turns red in the last 3 seconds. */
export function TimerBar({ total, left, speedy }: Props) {
  const urgent = left <= 3;
  const fill = urgent ? colors.wrong : colors.accent;
  const speedyLeft = speedy === undefined ? 0 : Math.ceil(speedy - (total - left));
  return (
    <View>
      <View style={styles.row} accessibilityLabel={`${Math.ceil(left)} seconds left`}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(left / total) * 100}%`, backgroundColor: fill }]} />
        </View>
        <Text style={[styles.seconds, urgent && { color: colors.wrong }]}>{Math.ceil(left)}s</Text>
      </View>
      {speedy !== undefined ? (
        <Text style={[styles.speedy, speedyLeft <= 0 && styles.speedyGone]}>
          {speedyLeft > 0 ? `⚡ Speed bonus: ${speedyLeft}s` : 'Take your time'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: {
    flex: 1,
    height: 16,
    borderRadius: radius.md,
    backgroundColor: colors.disabled,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.md },
  speedy: { marginTop: spacing.xs, fontSize: 16, fontWeight: '700', color: colors.accentStrong },
  speedyGone: { color: colors.textMuted },
  seconds: {
    width: 64,
    textAlign: 'right',
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
