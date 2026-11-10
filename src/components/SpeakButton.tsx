import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/AppText';
import { colors, radius } from '@/constants/theme';

interface Props {
  onPress: () => void;
}

/** Reads the problem out loud. Sits above the card so it never covers an answer box. */
export function SpeakButton({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Read the problem out loud"
      hitSlop={4}
    >
      <Text style={styles.icon}>🔊</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: '#E4DEC8',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.94 }] },
  icon: { fontSize: 26 },
});
