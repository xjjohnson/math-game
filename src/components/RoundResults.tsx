import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { PopIn } from '@/components/PopIn';
import { Screen } from '@/components/Screen';
import { findBadge } from '@/constants/badges';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import type { AnswerRecord } from '@/types';
import type { RoundOutcome } from '@/utils/progress';
import { DAILY_PASS, STREAK_MILESTONE } from '@/utils/rewards';

export interface RoundSummary {
  score: number;
  bestStreak: number;
  history: AnswerRecord[];
}

/** True when a round earned something worth the reward sound. */
export function isNotable(outcome: RoundOutcome): boolean {
  return (
    outcome.dailyBonusCoins > 0 ||
    outcome.weeklyBonusCoins > 0 ||
    outcome.newBadges.length > 0 ||
    outcome.newHighScore ||
    outcome.stars === 3
  );
}

/**
 * End-of-round screen: stars, coins, bonuses and a summary. `details` replaces
 * the "Practice these" list (the worksheet shows the whole marked page instead).
 */
export function RoundResults({
  summary,
  outcome,
  daily = false,
  details,
  onPlayAgain,
}: {
  summary: RoundSummary;
  outcome: RoundOutcome | null;
  daily?: boolean;
  details?: ReactNode;
  onPlayAgain: () => void;
}) {
  const right = summary.history.filter((r) => r.correct).length;
  const total = summary.history.length;
  const missed = summary.history.filter((r) => !r.correct);
  const cheer = right === total ? 'Perfect round!' : right >= total * 0.7 ? 'Awesome work!' : 'Good practice!';

  return (
    <Screen title={cheer}>
      {outcome ? (
        <View style={styles.rewards}>
          <View style={styles.starRow} accessible accessibilityLabel={`${outcome.stars} out of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <PopIn key={i} delay={250 * i} damping={9}>
                <Text style={[styles.stars, i >= outcome.stars && styles.starEmpty]}>
                  {i < outcome.stars ? '★' : '☆'}
                </Text>
              </PopIn>
            ))}
          </View>
          <Text style={styles.coins}>
            +{outcome.coins} 🪙   +{outcome.starsEarned} ⭐
          </Text>
          {outcome.starMultiplier > 1 && outcome.stars > 0 ? (
            <Text style={styles.bonus}>
              Harder levels pay more: each star counted {outcome.starMultiplier} times
            </Text>
          ) : null}
          {outcome.streakBonusCoins > 0 ? (
            <Text style={styles.bonus}>Includes +{outcome.streakBonusCoins} for streaks of {STREAK_MILESTONE}</Text>
          ) : null}
          {outcome.dailyBonusCoins > 0 ? (
            <Text style={styles.bonus}>🎉 Daily challenge complete! +{outcome.dailyBonusCoins} bonus</Text>
          ) : daily ? (
            <Text style={styles.bonus}>Get {DAILY_PASS} right to win the daily bonus.</Text>
          ) : null}
          {outcome.weeklyBonusCoins > 0 ? (
            <Text style={styles.bonus}>🏆 All weekly goals done! +{outcome.weeklyBonusCoins} bonus</Text>
          ) : null}
          {outcome.newHighScore ? <Text style={styles.highScore}>🏆 New high score!</Text> : null}
          {outcome.newBadges.map((id) => {
            const badge = findBadge(id);
            return badge ? (
              <Text key={id} style={styles.badge}>
                {badge.emoji} New badge: {badge.name}
              </Text>
            ) : null;
          })}
        </View>
      ) : null}
      <View style={styles.summary}>
        <Stat label="Points" value={String(summary.score)} />
        <Stat label="Right" value={`${right} / ${total}`} />
        <Stat label="Best streak" value={String(summary.bestStreak)} />
      </View>
      {details ??
        (missed.length > 0 ? (
          <View style={styles.missed}>
            <Text style={styles.missedTitle}>Practice these</Text>
            {missed.map((r, i) => (
              <Text key={i} style={styles.missedItem}>
                {r.problem.prompt} = {r.problem.answer}
              </Text>
            ))}
          </View>
        ) : null)}
      <BigButton label="Play again" color={colors.correct} onPress={onPlayAgain} />
      <BigButton label={daily ? 'Home' : 'Change game'} outline onPress={() => router.back()} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  highScore: { fontSize: fontSizes.button, fontWeight: '900', color: colors.accent, textAlign: 'center' },
  rewards: { alignItems: 'center', gap: spacing.xs },
  starRow: { flexDirection: 'row', gap: spacing.md },
  stars: { fontSize: 56, color: colors.accent },
  starEmpty: { opacity: 0.5 },
  coins: { fontSize: fontSizes.title, fontWeight: '900', color: colors.text },
  bonus: { fontSize: 18, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  badge: { fontSize: fontSizes.body, fontWeight: '900', color: colors.primary, textAlign: 'center' },
  summary: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: fontSizes.button + 4, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  missed: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  missedTitle: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  missedItem: { fontSize: fontSizes.body, color: colors.text, fontVariant: ['tabular-nums'] },
});
