import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useOtaUpdate } from '@/hooks/useOtaUpdate';

/**
 * Shows on Home only when there's something new: a whole new app on the
 * release page, or new stuff that already downloaded over the air.
 */
export function UpdateBanner() {
  const { status, install } = useAppUpdate();
  const ota = useOtaUpdate();
  if (status !== 'available' && status !== 'downloading' && status !== 'error') {
    return ota.ready ? <RestartBanner onRestart={ota.restart} /> : null;
  }
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

function RestartBanner({ onRestart }: { onRestart: () => void }) {
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Text style={styles.title}>✨ New stuff is ready</Text>
      <Text style={styles.body}>It already downloaded. Your coins and progress stay.</Text>
      <BigButton label="Restart to get it" color={colors.correct} onPress={onRestart} />
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
