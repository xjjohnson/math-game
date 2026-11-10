import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Picked } from '@/components/Motion';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';

interface Option<T> {
  value: T;
  label: string;
  color?: string;
}

interface Props<T> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Four buttons to a row instead of two, for short labels. */
  compact?: boolean;
}

/** A labelled row of big buttons where exactly one is selected. */
export function OptionGroup<T>({ label, options, value, onChange, compact }: Props<T>) {
  // Two big buttons side by side don't fit labels like "🎨 Backgrounds" on a narrow phone.
  const narrow = useWindowDimensions().width < 400;
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((o) => (
          <Picked key={o.label} on={o.value === value} ring={o.color} radius={radius.lg} grow={1.04} style={[styles.option, compact && styles.compact]}>
            <BigButton
              label={o.label}
              color={o.color}
              outline={o.value !== value}
              selected={o.value === value}
              onPress={() => onChange(o.value)}
              small={narrow || compact}
            />
          </Picked>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  label: { fontSize: fontSizes.body, fontWeight: '700', color: colors.textMuted },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { flexGrow: 1, flexBasis: '45%' },
  compact: { flexBasis: '22%' },
});
