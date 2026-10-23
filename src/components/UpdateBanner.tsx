import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { useAppUpdate } from '@/hooks/useAppUpdate';

/** Shows on Home only when a newer version of the app is on the release page. */
export function UpdateBanner() {
  const { status, install } = useAppUpdate();
  if (status !== 'available' && status !== 'downloading' && status !== 'error') return null;
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Text style={styles.title}>🎉 A new version of Math Game is ready</Text>
      <Text style={styles.body}>
        {status === 'error'
          ? "The download didn't finish. Check the internet and try again."
          : 'Your coins and progress stay. The first time, Android asks to allow Math Game to install apps.'}
      </Text>
      <BigButton
        label={status === 'downloading' ? 'Downloading…' : 'Update now'}
        color={colors.correct}
        disabled={status === 'downloading'}
        onPress={install}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.correct,
  },
  title: { fontSize: fontSizes.body, fontWeight: '900', color: colors.text },
  body: { fontSize: 16, color: colors.textMuted },
});
