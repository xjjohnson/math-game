import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { BuddyFace } from '@/components/BuddyFace';
import { Screen } from '@/components/Screen';
import { Sticker } from '@/components/Sticker';
import { UpdateBanner } from '@/components/UpdateBanner';
import { OPERATIONS } from '@/constants/difficulty';
import { GRADES, levelName } from '@/constants/grades';
import { colors, fontSizes, spacing } from '@/constants/theme';
import { useActiveProfile } from '@/store/profiles';
import { buddyGift } from '@/utils/buddy';
import { dateKey, dayStreak } from '@/utils/dates';
import { DAILY_CHALLENGE_BONUS, DAILY_PASS, dailyChallengeConfig } from '@/utils/rewards';
import { randomSeed } from '@/utils/seededRandom';
import { companionFor } from '@/utils/shop';
import { reviewConfig } from '@/utils/weakSpots';

export function HomeScreen() {
  const profile = useActiveProfile();
  const today = dateKey();

  const daily = profile
    ? dailyChallengeConfig(today, { grade: profile.grade, difficulty: profile.lastDifficulty })
    : null;
  const dailyDone = profile?.dailyChallengeDate === today;
  const dailyOperation = daily?.mode.kind === 'operation' ? daily.mode.operation : undefined;
  const dailyOp = OPERATIONS.find((o) => o.value === dailyOperation);
  const days = profile ? dayStreak(profile.playDates, today) : 0;
  const companion = companionFor(profile);
  const tricky = profile ? Object.keys(profile.missed).length : 0;

  return (
    <Screen title="Math Game" noHeader>
      <UpdateBanner />
      <View style={styles.profile}>
        {profile ? (
          <>
            <View style={styles.faces}>
              <Sticker value={profile.avatar} size={72} />
              {companion ? (
                <Pressable
                  onPress={() => router.push('/buddy')}
                  accessibilityRole="button"
                  accessibilityLabel="Visit my buddy"
                >
                  <BuddyFace value={companion.emoji} size={44} gift={buddyGift(profile)} />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.name}>Hi, {profile.name}!</Text>
            <Text style={styles.stats}>
              🪙 {profile.coins}   ⭐ {profile.stars}   📅 {days} {days === 1 ? 'day' : 'days'}
            </Text>
            <Text style={styles.stats}>🎓 {GRADES[profile.grade].name}</Text>
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
        label="📚 Learn how"
        color={colors.primary}
        outline
        accessibilityHint="Step-by-step ways to work out answers, like counting on, carrying and long division."
        onPress={() => router.push('/learn')}
      />
      {profile && daily && dailyOp ? (
        <BigButton
          label={dailyDone ? '✓ Daily challenge done' : `⚡ Daily challenge: ${dailyOp.label}`}
          color={colors.primary}
          outline={dailyDone}
          accessibilityHint={`${levelName({ grade: profile.grade, difficulty: daily.difficulty })}, 30 seconds a question. Get ${DAILY_PASS} right for ${DAILY_CHALLENGE_BONUS} bonus coins.`}
          onPress={() =>
            router.push({ pathname: '/play', params: { config: JSON.stringify(daily) } })
          }
        />
      ) : null}
      {profile && tricky > 0 ? (
        <BigButton
          label={`🎯 Practice tricky ones (${tricky})`}
          color={colors.operations.multiply}
          accessibilityHint="Ten easy-going questions on facts you missed lately. Get one right twice to clear it."
          onPress={() => {
            const config = reviewConfig(profile.missed, randomSeed());
            if (config) router.push({ pathname: '/play', params: { config: JSON.stringify(config) } });
          }}
        />
      ) : null}
      {profile ? (
        <BigButton
          label="👥 Play with a friend"
          color={colors.operations.add}
          onPress={() => router.push('/multiplayer')}
        />
      ) : null}
      {profile ? (
        <View style={styles.pair}>
          <BigButton
            label="🛍️ Shop"
            color={colors.operations.subtract}
            onPress={() => router.push('/shop')}
            style={styles.half}
          />
          <BigButton
            label="🐾 My buddy"
            color={colors.operations.divide}
            onPress={() => router.push('/buddy')}
            style={styles.half}
          />
          <BigButton
            label="My progress"
            color={colors.accent}
            onPress={() => router.push('/progress')}
            style={styles.half}
          />
        </View>
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
  faces: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  half: { flexGrow: 1, flexBasis: '40%' },
  name: { fontSize: fontSizes.button, fontWeight: '700', color: colors.text, textAlign: 'center' },
  stats: { fontSize: fontSizes.body, color: colors.textMuted, fontVariant: ['tabular-nums'] },
});
