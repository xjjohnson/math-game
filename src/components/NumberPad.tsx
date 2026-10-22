import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';

interface Props {
  onSubmit: (value: number) => void;
  /** Show a minus key for answers that can be negative. */
  allowNegative?: boolean;
  disabled?: boolean;
  /** Called as the player types, e.g. to show the entry inside a stacked problem. */
  onEntryChange?: (entry: string) => void;
  /** Hide the pad's own answer box (when the entry is shown elsewhere). */
  hideDisplay?: boolean;
}

const MAX_DIGITS = 6;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', '⌫'];

/** Big on-screen number pad. On web, the keyboard's digits, Backspace, - and Enter work too. */
export function NumberPad({
  onSubmit,
  allowNegative = false,
  disabled = false,
  onEntryChange,
  hideDisplay = false,
}: Props) {
  const [entry, setEntry] = useState('');

  useEffect(() => {
    onEntryChange?.(entry);
  }, [entry, onEntryChange]);

  const press = (key: string) => {
    if (disabled) return;
    setEntry((current) => {
      if (key === '⌫') return current.slice(0, -1);
      if (key === '±') {
        if (!allowNegative) return current;
        return current.startsWith('-') ? current.slice(1) : `-${current}`;
      }
      const digits = current.replace('-', '');
      if (digits.length >= MAX_DIGITS) return current;
      if (digits === '0') return current.replace('0', key);
      return current + key;
    });
  };

  const submit = () => {
    if (disabled || entry === '' || entry === '-') return;
    onSubmit(Number(entry));
    setEntry('');
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === '-') press('±');
      else if (e.key === 'Enter') submit();
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <View style={styles.wrap}>
      {hideDisplay ? null : (
        <View style={styles.display} accessibilityLiveRegion="polite">
          <Text style={styles.displayText} accessibilityLabel={`Your answer: ${entry || 'empty'}`}>
            {entry || ' '}
          </Text>
        </View>
      )}
      <View style={styles.grid}>
        {KEYS.map((key) => {
          const hidden = key === '±' && !allowNegative;
          return (
            <Pressable
              key={key}
              onPress={() => press(key)}
              disabled={disabled || hidden}
              accessibilityRole="button"
              accessibilityLabel={key === '⌫' ? 'Delete' : key === '±' ? 'Minus' : key}
              style={({ pressed }) => [
                styles.key,
                hidden && styles.hidden,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.keyText}>{key === '±' ? '−' : key}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={submit}
        disabled={disabled || entry === '' || entry === '-'}
        accessibilityRole="button"
        accessibilityLabel="Check answer"
        style={({ pressed }) => [
          styles.key,
          styles.check,
          (disabled || entry === '' || entry === '-') && styles.checkDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.keyText, styles.checkText]}>Check</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  display: {
    minHeight: TAP_TARGET,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayText: { fontSize: 40, fontWeight: '900', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  key: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: TAP_TARGET,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { opacity: 0 },
  pressed: { transform: [{ scale: 0.95 }], backgroundColor: colors.background },
  keyText: { fontSize: fontSizes.button + 4, fontWeight: '800', color: colors.text },
  check: { backgroundColor: colors.correct, flexBasis: 'auto', flexGrow: 0 },
  checkDisabled: { backgroundColor: colors.disabled },
  checkText: { color: colors.primaryText },
});
