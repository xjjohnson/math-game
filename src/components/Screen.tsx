import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { BackgroundDecor } from '@/components/BackgroundDecor';
import { colors, fontSizes, spacing } from '@/constants/theme';
import { useActiveProfile } from '@/store/profiles';
import { backgroundColor, backgroundDecor } from '@/utils/shop';

interface Props {
  title?: string;
  children: ReactNode;
  /** Tighter spacing, so a whole game screen fits a phone. */
  compact?: boolean;
  /** For screens without a header bar, which then need the top safe area too. */
  noHeader?: boolean;
}

/** Standard page wrapper: safe area, scrolling, centered column for tablets and PC. */
export function Screen({ title, children, compact = false, noHeader = false }: Props) {
  const profile = useActiveProfile();
  const background = backgroundColor(profile);
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: background }]}
      // The header bar already sits below the status bar, so only header-less screens pad the top.
      edges={noHeader ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}
    >
      <BackgroundDecor decor={backgroundDecor(profile)} />
      <ScrollView contentContainerStyle={[styles.content, compact && styles.compact]}>
        {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  compact: { paddingVertical: spacing.md, gap: spacing.sm },
  title: {
    fontSize: fontSizes.title,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
