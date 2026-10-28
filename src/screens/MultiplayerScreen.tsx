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
        label="📱📱 Several phones"
        color={colors.primary}
        disabled={!Nearby}
        accessibilityHint="Race, or team up against waves or a monster, with up to 7 friends on their own phones nearby."
        onPress={() => router.push('/nearby-play')}
      />
      <Text style={styles.note}>
        {Nearby
          ? 'Up to 8 phones. Race to 10, or team up to beat the waves or a monster. No Wi-Fi or internet needed.'
          : 'Playing on several phones needs the Math Game app on Android.'}
      </Text>
      <BigButton
        label="📱 One phone, take turns"
        color={colors.accent}
        accessibilityHint="Up to 6 players answer 10 questions each on this device."
        onPress={() => router.push('/pass-play')}
      />
      <Text style={styles.note}>2 to 6 players. Each answers 10, then hands the phone on.</Text>
      <BigButton
        label="🤝 One phone, team up"
        color={colors.correct}
        accessibilityHint="Up to 6 players take turns on this device and hit one monster together."
        onPress={() => router.push({ pathname: '/pass-play', params: { team: '1' } })}
      />
      <Text style={styles.note}>2 to 6 players take turns, and every right answer hits the same monster.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: fontSizes.body, color: colors.textMuted, textAlign: 'center' },
});
