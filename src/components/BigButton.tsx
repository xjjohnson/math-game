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
}: Props) {
  const background = disabled ? colors.disabled : outline ? colors.surface : color;
  const foreground = outline ? color : textColor;
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
        { backgroundColor: background, borderColor: outline ? color : colors.border },
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

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
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  label: { fontSize: fontSizes.button, fontWeight: '800', textAlign: 'center' },
});
