import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontSizes, spacing } from '@/constants/theme';

interface Props {
  title?: string;
  children: ReactNode;
}

/** Standard page wrapper: safe area, scrolling, centered column for tablets and PC. */
export function Screen({ title, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
