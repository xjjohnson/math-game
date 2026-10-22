import { StyleSheet, Switch, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { colors, fontSizes, spacing, TAP_TARGET } from '@/constants/theme';
import { useSettings, type ReduceMotion, type Settings } from '@/store/settings';

type ToggleKey = Exclude<keyof Settings, 'reduceMotion'>;

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
        Sound effects work now (placeholder tones in the browser). Speech, fonts, colors and vibration switch on in a later phase.
      </Text>
      <BigButton label="Reset settings" outline color={colors.wrong} onPress={settings.reset} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
