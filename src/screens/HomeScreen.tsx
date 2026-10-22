import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { colors, fontSizes, spacing } from '@/constants/theme';
import { useActiveProfile } from '@/store/profiles';

export function HomeScreen() {
  const profile = useActiveProfile();

  return (
    <Screen title="Math Game">
      <View style={styles.profile}>
        {profile ? (
          <>
            <Text style={styles.avatar}>{profile.avatar}</Text>
            <Text style={styles.name}>Hi, {profile.name}!</Text>
            <Text style={styles.stats}>
              🪙 {profile.coins}   ⭐ {profile.stars}
            </Text>
          </>
        ) : (
          <Text style={styles.name}>Make a profile to start playing.</Text>
        )}
      </View>

      <BigButton
        label="Play"
        color={colors.correct}
        disabled={!profile}
        onPress={() => router.push('/mode')}
      />
      <BigButton
        label={profile ? 'Switch player' : 'Create a player'}
        color={colors.accent}
        onPress={() => router.push('/profiles')}
      />
      <BigButton label="Settings" outline onPress={() => router.push('/settings')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  avatar: { fontSize: 72 },
  name: { fontSize: fontSizes.button, fontWeight: '700', color: colors.text, textAlign: 'center' },
  stats: { fontSize: fontSizes.body, color: colors.textMuted },
});
