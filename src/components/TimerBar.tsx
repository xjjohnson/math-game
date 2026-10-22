import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

interface Props {
  total: number;
  left: number;
}

/** Shrinking bar plus whole seconds left; turns red in the last 3 seconds. */
export function TimerBar({ total, left }: Props) {
  const urgent = left <= 3;
  const fill = urgent ? colors.wrong : colors.accent;
  return (
    <View style={styles.row} accessibilityLabel={`${Math.ceil(left)} seconds left`}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(left / total) * 100}%`, backgroundColor: fill }]} />
      </View>
      <Text style={[styles.seconds, urgent && { color: colors.wrong }]}>{Math.ceil(left)}s</Text>
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
  seconds: {
    width: 48,
    textAlign: 'right',
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
