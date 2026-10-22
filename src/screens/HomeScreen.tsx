import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { DIFFICULTIES, OPERATIONS } from '@/constants/difficulty';
import { colors, fontSizes, spacing } from '@/constants/theme';
import { useActiveProfile } from '@/store/profiles';
import { dateKey, dayStreak } from '@/utils/dates';
import { DAILY_CHALLENGE_BONUS, DAILY_PASS, dailyChallengeConfig } from '@/utils/rewards';

export function HomeScreen() {
  const profile = useActiveProfile();
  const today = dateKey();

  const daily = profile ? dailyChallengeConfig(today, profile.lastDifficulty) : null;
  const dailyDone = profile?.dailyChallengeDate === today;
  const dailyOperation = daily?.mode.kind === 'operation' ? daily.mode.operation : undefined;
  const dailyOp = OPERATIONS.find((o) => o.value === dailyOperation);
  const days = profile ? dayStreak(profile.playDates, today) : 0;

  return (
    <Screen title="Math Game">
      <View style={styles.profile}>
        {profile ? (
          <>
            <Text style={styles.avatar}>{profile.avatar}</Text>
            <Text style={styles.name}>Hi, {profile.name}!</Text>
            <Text style={styles.stats}>
              🪙 {profile.coins}   ⭐ {profile.stars}   📅 {days} {days === 1 ? 'day' : 'days'}
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
      {profile && daily && dailyOp ? (
        <BigButton
          label={dailyDone ? '✓ Daily challenge done' : `⚡ Daily challenge: ${dailyOp.label}`}
          color={colors.primary}
          outline={dailyDone}
          accessibilityHint={`${DIFFICULTIES[daily.difficulty].label}, 30 seconds a question. Get ${DAILY_PASS} right for ${DAILY_CHALLENGE_BONUS} bonus coins.`}
          onPress={() =>
            router.push({ pathname: '/play', params: { config: JSON.stringify(daily) } })
          }
        />
      ) : null}
      {profile ? (
        <BigButton label="My progress" color={colors.accent} onPress={() => router.push('/progress')} />
      ) : null}
      <BigButton
        label={profile ? 'Switch player' : 'Create a player'}
        color={profile ? colors.textMuted : colors.accent}
        outline={!!profile}
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
  stats: { fontSize: fontSizes.body, color: colors.textMuted, fontVariant: ['tabular-nums'] },
});
