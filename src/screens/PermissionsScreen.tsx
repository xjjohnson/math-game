import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import {
  allGranted,
  checkPermissions,
  devicePermissions,
  requestPermissions,
  type PermissionStatus,
} from '@/utils/nearbyPermissions';
import { Nearby } from '../../modules/math-nearby';

const MARKS: Record<PermissionStatus, string> = { granted: '✓', denied: '○', blocked: '✗' };

/** Checks and asks for what Nearby needs before any two-phone play. */
export function PermissionsScreen() {
  const palette = usePalette();
  const list = devicePermissions();
  const [statuses, setStatuses] = useState<Record<string, PermissionStatus>>({});

  const refresh = useCallback(async () => {
    if (list.length) setStatuses(await checkPermissions(list));
    // The list only depends on the Android version, which can't change while running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!Nearby) {
    return (
      <Screen title="Play nearby">
        <Text style={styles.body}>
          Playing with a friend uses Bluetooth and Wi-Fi between two Android phones, so it only
          works in the Math Game app on Android. It isn't in the web version or in Expo Go.
        </Text>
      </Screen>
    );
  }

  const ready = allGranted(statuses, list);
  const blocked = list.some(({ permission }) => statuses[permission] === 'blocked');

  return (
    <Screen title="Play nearby">
      <Text style={styles.body}>
        To find a friend's phone, Math Game needs these. Nothing leaves the two phones, and no
        internet is used.
      </Text>
      <View style={styles.list}>
        {list.map(({ permission, label }) => {
          const status = statuses[permission] ?? 'denied';
          const color =
            status === 'granted' ? palette.correct : status === 'blocked' ? palette.wrong : colors.textMuted;
          return (
            <View
              key={permission}
              style={styles.row}
              accessible
              accessibilityLabel={`${label}: ${status === 'granted' ? 'allowed' : 'not allowed yet'}`}
            >
              <Text style={[styles.mark, { color }]}>{MARKS[status]}</Text>
              <Text style={styles.label}>{label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>Bluetooth and Wi-Fi also need to be switched on.</Text>

      {ready ? (
        <BigButton label="📡 Try the Nearby test" color={colors.correct} onPress={() => router.push('/nearby-test')} />
      ) : (
        <BigButton
          label="Allow"
          color={colors.correct}
          onPress={async () => setStatuses(await requestPermissions(list))}
        />
      )}
      {blocked ? (
        <>
          <Text style={styles.note}>
            Some were turned down for good. Allow them in the phone's settings under Math Game, then
            come back.
          </Text>
          <BigButton label="Open phone settings" outline onPress={() => Linking.openSettings()} />
          <BigButton label="Check again" outline onPress={refresh} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: fontSizes.body, color: colors.text },
  list: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mark: { width: 28, fontSize: fontSizes.button, fontWeight: '900', textAlign: 'center' },
  label: { flex: 1, fontSize: fontSizes.body, fontWeight: '700', color: colors.text },
  note: { fontSize: 16, color: colors.textMuted },
});
