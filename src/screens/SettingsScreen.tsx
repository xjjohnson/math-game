import { router } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { BUILD_NUMBER } from '@/constants/build';
import { colors, fontSizes, spacing, TAP_TARGET } from '@/constants/theme';
import { useAppUpdate, type UpdateStatus } from '@/hooks/useAppUpdate';
import { useSettings, type ReduceMotion, type Settings } from '@/store/settings';

type ToggleKey = Exclude<keyof Settings, 'reduceMotion' | 'parentPin' | 'coinPayout'>;

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: 'sound', label: 'Sound effects' },
  { key: 'textToSpeech', label: 'Read problems aloud' },
  { key: 'haptics', label: 'Vibrate on answers' },
  { key: 'dyslexiaFont', label: 'Dyslexia-friendly font' },
  { key: 'colorblindPalette', label: 'Colorblind-safe colors' },
];

const MOTION_OPTIONS: { value: ReduceMotion; label: string }[] = [
  { value: 'system', label: 'Use device setting' },
  { value: 'on', label: 'Less motion' },
  { value: 'off', label: 'Full motion' },
];

export function SettingsScreen() {
  const settings = useSettings();

  return (
    <Screen title="Settings">
      {TOGGLES.map(({ key, label }) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Switch
            value={settings[key]}
            onValueChange={(value) => settings.update({ [key]: value })}
            accessibilityLabel={label}
            trackColor={{ true: colors.correct, false: colors.disabled }}
          />
        </View>
      ))}
      <OptionGroup
        label="Animations"
        value={settings.reduceMotion}
        onChange={(reduceMotion) => settings.update({ reduceMotion })}
        options={MOTION_OPTIONS}
      />
      <Text style={styles.note}>
        Reading aloud uses the device voice. Vibration works on phones only. Sound effects are placeholder tones in the browser.
      </Text>
      <BigButton label="📡 Play nearby (test)" outline onPress={() => router.push('/permissions')} />
      <BigButton label="🔒 Parent area" color={colors.text} onPress={() => router.push('/parent')} />
      <BigButton label="Reset settings" outline color={colors.wrong} onPress={settings.reset} />
      <AppVersion />
    </Screen>
  );
}

const UPDATE_TEXT: Record<UpdateStatus, string> = {
  idle: '',
  checking: 'Checking for a new version…',
  none: "You have the newest version.",
  available: 'A new version is ready.',
  downloading: 'Downloading the new version…',
  error: "The download didn't finish. Check the internet and try again.",
};

function AppVersion() {
  const { canUpdate, status, latest, checkAgain, install } = useAppUpdate();
  if (!canUpdate) {
    return <Text style={styles.note}>App updates are only for the Android app from GitHub.</Text>;
  }
  return (
    <View style={styles.section}>
      <Text style={styles.note}>
        Version: build {BUILD_NUMBER}
        {latest ? ` · newest is build ${latest}` : ''}. {UPDATE_TEXT[status]}
      </Text>
      {status === 'available' || status === 'downloading' || status === 'error' ? (
        <BigButton
          label={status === 'downloading' ? 'Downloading…' : 'Update now'}
          color={colors.correct}
          disabled={status === 'downloading'}
          onPress={install}
        />
      ) : (
        <BigButton
          label="Check for updates"
          outline
          disabled={status === 'checking'}
          onPress={checkAgain}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  row: {
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: { flex: 1, fontSize: fontSizes.body, fontWeight: '700', color: colors.text },
  note: { fontSize: 16, color: colors.textMuted },
});
