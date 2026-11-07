import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { PeopleBadges, PeopleHere } from '@/components/PeopleHere';
import { VisitPanel } from '@/components/VisitPanel';
import { Screen } from '@/components/Screen';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { usePlace } from '@/hooks/usePlace';
import { useActiveProfile } from '@/store/profiles';
import { dateKey } from '@/utils/dates';
import { BUILDINGS, shiftDone } from '@/utils/town';

/** The community: a street of buildings, each with one little job a day. */
export function TownScreen() {
  const profile = useActiveProfile();
  const today = dateKey();
  usePlace('street');
  if (!profile) return <Screen title="Community"><Text style={styles.intro}>Make a player first.</Text></Screen>;

  return (
    <Screen title="🏘️ Community">
      <Text style={styles.intro}>Visit a building and do a quick job. Come back every day!</Text>
      <Text style={styles.coins}>🪙 {profile.coins}</Text>
      <VisitPanel />
      <PeopleHere place="street" wave />
      <View style={styles.street}>
        {BUILDINGS.map((b) => {
          const done = shiftDone(profile, b.id, today);
          return (
            <Pressable
              key={b.id}
              onPress={() => router.push({ pathname: '/shift', params: { building: b.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${b.name}. ${b.job} ${done ? 'Done for today.' : ''}`}
              style={({ pressed }) => [styles.building, { borderColor: b.color }, pressed && styles.pressed]}
            >
              <View style={[styles.roof, { backgroundColor: b.color }]} />
              <Text style={styles.emoji}>{b.emoji}</Text>
              <Text style={styles.name}>{b.name}</Text>
              <Text style={styles.job}>{b.job}</Text>
              <PeopleBadges place={b.id} />
              <Text style={[styles.badge, done && styles.badgeDone]}>
                {done ? '✓ Done today' : b.reward === 'coins' ? 'Earn coins' : 'Earn buddy hearts'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.school, { borderColor: colors.primary }]}>
        <Text style={styles.name}>🏫 School</Text>
        <Text style={styles.job}>Learn a new way to work out answers.</Text>
        <BigButton label="📚 Go to class" color={colors.primary} onPress={() => router.push('/learn')} />
      </View>
      <BigButton label="🐾 Back to my buddy's home" color={colors.operations.divide} outline onPress={() => router.push('/buddy')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: fontSizes.body, color: colors.textMuted, textAlign: 'center' },
  coins: { fontSize: fontSizes.button, fontWeight: '800', color: colors.text, textAlign: 'center' },
  street: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  building: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: TAP_TARGET * 2,
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  pressed: { transform: [{ scale: 0.97 }] },
  roof: { alignSelf: 'stretch', height: 18, marginBottom: spacing.xs },
  emoji: { fontSize: 52 },
  name: { fontSize: fontSizes.body + 2, fontWeight: '900', color: colors.text, textAlign: 'center' },
  job: { fontSize: 16, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.sm },
  badge: { fontSize: 15, fontWeight: '800', color: colors.primary },
  badgeDone: { color: colors.correct },
  school: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 4, backgroundColor: colors.surface, alignItems: 'center' },
});
