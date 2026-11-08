import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { BuddyFace } from '@/components/BuddyFace';
import { Screen } from '@/components/Screen';
import { StarLevelCard } from '@/components/StarLevelCard';
import { Sticker } from '@/components/Sticker';
import { UpdateBanner } from '@/components/UpdateBanner';
import { OPERATIONS } from '@/constants/difficulty';
import { levelName } from '@/constants/grades';
import { colors, radius, spacing } from '@/constants/theme';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import { buddyGift } from '@/utils/buddy';
import { dateKey, dayStreak } from '@/utils/dates';
import { DAILY_CHALLENGE_BONUS, DAILY_PASS, dailyChallengeConfig } from '@/utils/rewards';
import { randomSeed } from '@/utils/seededRandom';
import { companionFor } from '@/utils/shop';
import { reviewConfig } from '@/utils/weakSpots';

/** What the character says, from what the player could do next. */
function greeting(name: string, dailyDone: boolean, tricky: number): string {
  if (!dailyDone) return `Ready for today's challenge, ${name}?`;
  if (tricky > 0) return `Let's fix ${tricky === 1 ? 'a tricky one' : 'some tricky ones'}, ${name}!`;
  return `Hi, ${name}! Let's play!`;
}

export function HomeScreen() {
  const profile = useActiveProfile();
  const today = dateKey();
  const adjustBalance = useProfiles((s) => s.adjustBalance);
  const profileId = profile?.id;
  const profileStars = profile?.stars;
  // Hand over any star-level rewards the stars already reached (e.g. before this update).
  useEffect(() => {
    if (profileId) adjustBalance(profileId, {});
  }, [profileId, profileStars, adjustBalance]);

  const daily = profile
    ? dailyChallengeConfig(today, { grade: profile.grade, difficulty: profile.lastDifficulty })
    : null;
  const dailyDone = profile?.dailyChallengeDate === today;
  const dailyOperation = daily?.mode.kind === 'operation' ? daily.mode.operation : undefined;
  const dailyOp = OPERATIONS.find((o) => o.value === dailyOperation);
  const days = profile ? dayStreak(profile.playDates, today) : 0;
  const companion = companionFor(profile);
  const tricky = profile ? Object.keys(profile.missed).length : 0;
  // A tablet on its side: the street on the left, the buttons beside it, all on one screen.
  const { width, height } = useWindowDimensions();
  const wide = width >= 760 && width > height;

  const scene = (
    <View style={[styles.scene, wide && styles.sceneWide]}>
      <View style={styles.pills}>
        <Pill text={`🪙 ${profile?.coins ?? 0}`} label={`${profile?.coins ?? 0} coins`} />
        <Pill text={`🔥 ${days} ${days === 1 ? 'day' : 'days'}`} label={`${days} day streak`} />
        <Pill text={`⭐ ${profile?.stars ?? 0}`} label={`${profile?.stars ?? 0} stars`} />
      </View>
      {profile ? (
        <>
          <View style={[styles.bubble, wide && styles.bubbleWide]}>
            <Text style={styles.bubbleText}>{greeting(profile.name, dailyDone, tricky)}</Text>
          </View>
          <View style={[styles.cast, wide && styles.castWide]}>
            <Sticker value={profile.avatar} size={wide ? 120 : 84} />
            {companion ? (
              <Pressable
                onPress={() => router.push('/buddy')}
                accessibilityRole="button"
                accessibilityLabel="Visit my buddy"
              >
                <BuddyFace value={companion.emoji} size={wide ? 80 : 56} gift={buddyGift(profile)} />
              </Pressable>
            ) : null}
          </View>
          <View style={[styles.grass, wide && styles.grassWide]} />
        </>
      ) : (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>Make a player to start playing!</Text>
        </View>
      )}
    </View>
  );

  const buttons = (
    <>
      {profile ? (
        <BigButton
          label="▶ Play"
          color={colors.correct}
          style={styles.play}
          onPress={() => router.push('/mode')}
        />
      ) : (
        <BigButton label="Create a player" color={colors.accent} onPress={() => router.push('/profiles')} />
      )}

      {profile && daily && dailyOp ? (
        <View style={styles.pair}>
          <BigButton
            label={dailyDone ? '✓ Daily done' : `⚡ Daily: ${dailyOp.label}`}
            color={colors.primary}
            outline={dailyDone}
            style={styles.half}
            accessibilityHint={`${levelName({ grade: profile.grade, difficulty: daily.difficulty })}, 30 seconds a question. Get ${DAILY_PASS} right for ${DAILY_CHALLENGE_BONUS} bonus coins.`}
            onPress={() => router.push({ pathname: '/play', params: { config: JSON.stringify(daily) } })}
          />
          {tricky > 0 ? (
            <BigButton
              label={`🎯 Tricky ones (${tricky})`}
              color={colors.operations.multiply}
              style={styles.half}
              accessibilityHint="Ten easy-going questions on facts you missed lately. Get one right twice to clear it."
              onPress={() => {
                const config = reviewConfig(profile.missed, randomSeed());
                if (config) router.push({ pathname: '/play', params: { config: JSON.stringify(config) } });
              }}
            />
          ) : null}
        </View>
      ) : null}

      {profile ? (
        <View style={styles.pair}>
          <BigButton label="👥 Friends" color={colors.operations.add} style={styles.half} onPress={() => router.push('/multiplayer')} />
          <BigButton
            label="📚 Learn how"
            color={colors.primary}
            outline
            style={styles.half}
            accessibilityHint="Step-by-step ways to work out answers, like counting on, carrying and long division."
            onPress={() => router.push('/learn')}
          />
        </View>
      ) : null}

      {profile ? <StarLevelCard stars={profile.stars} /> : null}
    </>
  );

  return (
    <Screen title={wide ? undefined : 'Math Game'} noHeader tab="home" wide={wide}>
      <UpdateBanner />
      {wide ? (
        <View style={styles.row}>
          <View style={styles.left}>{scene}</View>
          <View style={styles.right}>{buttons}</View>
        </View>
      ) : (
        <>
          {scene}
          {buttons}
        </>
      )}
    </Screen>
  );
}

function Pill({ text, label }: { text: string; label: string }) {
  return (
    <View style={styles.pill} accessible accessibilityLabel={label}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: '#BFE6FF',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: spacing.md,
    minHeight: 280,
    alignItems: 'center',
  },
  pills: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', gap: spacing.xs },
  pill: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 15, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
    maxWidth: '90%',
  },
  bubbleText: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  cast: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginTop: spacing.md, zIndex: 2 },
  grass: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, backgroundColor: '#A6E39A' },
  // Wide (tablet on its side): the scene on the left, the buttons on the right.
  row: { flex: 1, flexDirection: 'row', gap: spacing.lg },
  left: { flex: 1, justifyContent: 'center' },
  right: { flex: 1, gap: spacing.md, justifyContent: 'center' },
  // Square-ish, so a big tablet doesn't get a tall empty sky.
  sceneWide: { width: '100%', aspectRatio: 1, maxHeight: '100%' },
  // Pushes the greeting and the characters down to stand on the grass.
  bubbleWide: { marginTop: 'auto' },
  castWide: { marginBottom: 90 },
  grassWide: { height: 140 },
  play: { paddingVertical: spacing.lg },
  pair: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1, paddingHorizontal: spacing.sm },
});
