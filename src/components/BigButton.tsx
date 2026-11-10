import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/AppText';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  /** Draws an outline instead of a filled button. */
  outline?: boolean;
  /** For option-style buttons: announced to screen readers. */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  /** Smaller text and side padding, for rows of several buttons on a narrow phone. */
  small?: boolean;
}

/** Extra-large, high-contrast button used throughout the app. */
export function BigButton({
  label,
  onPress,
  color = colors.primary,
  textColor = colors.primaryText,
  disabled = false,
  outline = false,
  selected,
  style,
  accessibilityHint,
  small = false,
}: Props) {
  // Disabled reads as "not now" (pale with dark dashed text), not as a broken grey button.
  const background = disabled ? DISABLED_FILL : outline ? colors.surface : color;
  const foreground = disabled ? colors.textMuted : outline ? color : textColor;
  const border = disabled ? colors.disabled : outline ? color : colors.border;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: border },
        disabled && styles.disabled,
        small && styles.small,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, small && styles.smallLabel, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

const DISABLED_FILL = '#EFEBDF';

const styles = StyleSheet.create({
  button: {
    minHeight: TAP_TARGET,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { borderStyle: 'dashed' },
  small: { paddingHorizontal: spacing.sm },
  smallLabel: { fontSize: 18 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  label: { fontSize: fontSizes.button, fontWeight: '800', textAlign: 'center' },
});
