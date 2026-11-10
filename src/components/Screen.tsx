import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { TabBar, type TabId } from '@/components/TabBar';
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
  /** Shows the bottom tab bar with this tab highlighted. */
  tab?: TabId;
  /** Lets the page use more of a wide tablet (side-by-side layouts) and fill its height. */
  wide?: boolean;
  /** Pinned under the scrolling part, e.g. a Start button that must always show. */
  footer?: ReactNode;
  /** Centers the content up and down, so a game on a tablet doesn't leave the bottom half empty. */
  center?: boolean;
}

/** Standard page wrapper: safe area, scrolling, centered column for tablets and PC. */
export function Screen({ title, children, compact = false, noHeader = false, tab, wide = false, footer, center = false }: Props) {
  const profile = useActiveProfile();
  const background = backgroundColor(profile);
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: background }]}
      // The header bar already sits below the status bar, so only header-less screens pad the top.
      edges={
        noHeader
          ? ['top', ...(tab ? [] : ['bottom' as const]), 'left', 'right']
          : [...(tab ? [] : ['bottom' as const]), 'left', 'right']
      }
    >
      <BackgroundDecor decor={backgroundDecor(profile)} />
      <ScrollView contentContainerStyle={[styles.content, compact && styles.compact, wide && styles.wide, center && styles.center]}>
        {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
      {tab ? <TabBar active={tab} /> : null}
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
  wide: { maxWidth: 1100, flexGrow: 1 },
  center: { flexGrow: 1, justifyContent: 'center', maxWidth: 760 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
