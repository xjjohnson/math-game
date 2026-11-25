import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { colors, radius, spacing } from '@/constants/theme';

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['⌫', '0', '±'],
];

/**
 * The answer shown above the pad: digits grow left to right, like any number.
 * `onPress` puts the typing back here after the player used a scratch box.
 */
export function AnswerDisplay({
  text,
  negative = false,
  active = true,
  onPress,
  onToggleSign,
  fill = false,
}: {
  text: string;
  negative?: boolean;
  active?: boolean;
  onPress?: () => void;
  /** Shows a tappable minus for answers that can be negative. */
  onToggleSign?: () => void;
  /** Taller and bigger, for the landscape layout. */
  fill?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Your answer: ${text ? `${negative ? 'minus ' : ''}${text}` : 'empty'}`}
      accessibilityLiveRegion="polite"
      style={[styles.display, fill && styles.displayFill, active && styles.displayActive]}
    >
      {onToggleSign ? (
        <Pressable
          onPress={onToggleSign}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={negative ? 'Minus sign on. Tap to remove' : 'Tap to make the answer negative'}
          style={[styles.sign, negative && styles.signOn]}
        >
          <Text style={[styles.signText, negative && styles.signTextOn]}>−</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.text, fill && styles.textFill]} numberOfLines={1} adjustsFontSizeToFit>
        {negative ? '−' : ''}
        {text}
        {active ? <Text style={styles.caret}>│</Text> : null}
      </Text>
    </Pressable>
  );
}

/** Keys that stretch to fill the height they are given, with Check pinned under them. */
export function FillKeys({
  onKey,
  onCheck,
  canCheck,
  allowNegative = false,
  checkLabel = '✓ Check',
}: {
  onKey: (key: string) => void;
  onCheck: () => void;
  canCheck: boolean;
  allowNegative?: boolean;
  checkLabel?: string;
}) {
  return (
    <View style={styles.keys}>
      <View style={styles.grid}>
        {ROWS.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((key) => {
              const hidden = key === '±' && !allowNegative;
              return (
                <Pressable
                  key={key}
                  onPress={() => onKey(key)}
                  disabled={hidden}
                  accessibilityRole="button"
                  accessibilityLabel={key === '⌫' ? 'Delete' : key === '±' ? 'Minus' : key}
                  style={({ pressed }) => [styles.key, hidden && styles.hidden, pressed && styles.pressed]}
                >
                  <Text style={styles.keyText}>{key === '±' ? '−' : key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Pressable
        onPress={onCheck}
        disabled={!canCheck}
        accessibilityRole="button"
        accessibilityLabel="Check answer"
        style={({ pressed }) => [styles.check, !canCheck && styles.checkOff, pressed && styles.pressed]}
      >
        <Text style={styles.checkText}>{checkLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  display: {
    minHeight: 72,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  displayFill: { minHeight: 100 },
  displayActive: { borderColor: colors.primary, borderWidth: 4 },
  text: { fontSize: 44, fontWeight: '900', color: colors.text, textAlign: 'right', fontVariant: ['tabular-nums'], flexShrink: 1 },
  textFill: { fontSize: 72 },
  caret: { color: colors.primary, fontWeight: '300' },
  sign: {
    width: 48,
    height: 48,
    borderRadius: radius.md / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.disabled,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 'auto',
  },
  signOn: { borderStyle: 'solid', borderColor: colors.primary, backgroundColor: '#E8ECFF' },
  signText: { fontSize: 30, fontWeight: '800', color: colors.textMuted },
  signTextOn: { color: colors.primary },
  keys: { flex: 1, gap: spacing.sm, minHeight: 0 },
  grid: { flex: 1, gap: spacing.sm, minHeight: 0 },
  row: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  key: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { opacity: 0 },
  pressed: { transform: [{ scale: 0.97 }], backgroundColor: colors.background },
  keyText: { fontSize: 40, fontWeight: '800', color: colors.text },
  check: {
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.correct,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOff: { backgroundColor: colors.disabled },
  checkText: { fontSize: 32, fontWeight: '900', color: colors.primaryText },
});
