import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { colors, fontSizes } from '@/constants/theme';
import { Nearby } from '../../modules/math-nearby';

export function MultiplayerScreen() {
  return (
    <Screen title="Play with a friend">
      <BigButton
        label="📱📱 Two phones"
        color={colors.primary}
        disabled={!Nearby}
        accessibilityHint="Race or team up with a friend on another phone nearby."
        onPress={() => router.push('/nearby-play')}
      />
      <Text style={styles.note}>
        {Nearby
          ? 'Race to 10 or team up against the clock. Works without Wi-Fi or internet.'
          : 'Two phones needs the Math Game app on Android.'}
      </Text>
      <BigButton
        label="📱 One phone, take turns"
        color={colors.accent}
        accessibilityHint="Two players answer 10 questions each on this device."
        onPress={() => router.push('/pass-play')}
      />
      <Text style={styles.note}>Each player answers 10, then hands the phone over.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: fontSizes.body, color: colors.textMuted, textAlign: 'center' },
});
