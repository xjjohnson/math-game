import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { colors, fontSizes, spacing } from '@/constants/theme';

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
}

/** A labelled row of big buttons where exactly one is selected. */
export function OptionGroup<T>({ label, options, value, onChange }: Props<T>) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((o) => (
          <BigButton
            key={o.label}
            label={o.label}
            color={o.color}
            outline={o.value !== value}
            selected={o.value === value}
            onPress={() => onChange(o.value)}
            style={styles.option}
          />
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
});
