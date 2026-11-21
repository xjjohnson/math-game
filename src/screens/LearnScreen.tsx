import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useActiveProfile } from '@/store/profiles';
import { STRANDS } from '@/utils/skills/catalog';
import { ALL_LESSONS } from '@/utils/skills/skillLessons';

const gradeName = (grade: number) => (grade === 0 ? 'K' : `Grade ${grade}`);

/**
 * "Learn how": the lessons, grouped by part of math (counting, adding, time...),
 * youngest methods first. Lessons above the player's grade wait at the bottom.
 */
export function LearnScreen() {
  const palette = usePalette();
  const grade = useActiveProfile()?.grade ?? 12;
  const sections = STRANDS.map((s) => ({
    ...s,
    lessons: ALL_LESSONS.filter((l) => l.strand === s.value && l.grade <= grade + 1),
  })).filter((s) => s.lessons.length > 0);
  return (
    <Screen>
      <Text style={styles.intro}>Pick a way to work out answers. These are the ways you learn them at school.</Text>
      {sections.map((o) => (
        <View key={o.value} style={styles.section}>
          <Text style={[styles.heading, { color: palette.operations[o.lessons[0].operation] }]}>
            {o.emoji}  {o.label}
          </Text>
          {o.lessons.map((lesson) => (
            <Pressable
              key={lesson.id}
              onPress={() => router.push({ pathname: '/lesson', params: { id: lesson.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${lesson.title}, ${gradeName(lesson.grade)}. ${lesson.summary}`}
              style={({ pressed }) => [
                styles.card,
                { borderColor: palette.operations[lesson.operation] },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.emoji}>{lesson.emoji}</Text>
              <View style={styles.cardText}>
                <Text style={styles.title}>{lesson.title}</Text>
                <Text style={styles.summary}>{lesson.summary}</Text>
              </View>
              <View style={[styles.ages, { backgroundColor: palette.operations[lesson.operation] }]}>
                <Text style={styles.agesText}>{gradeName(lesson.grade)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: fontSizes.body, color: colors.textMuted, textAlign: 'center' },
  section: { gap: spacing.sm },
  heading: { fontSize: fontSizes.button, fontWeight: '900' },
  card: {
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 3,
    backgroundColor: colors.surface,
  },
  pressed: { transform: [{ scale: 0.98 }] },
  emoji: { fontSize: 36 },
  cardText: { flex: 1, gap: 2 },
  title: { fontSize: fontSizes.body + 2, fontWeight: '900', color: colors.text },
  summary: { fontSize: 16, color: colors.textMuted },
  ages: { borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  agesText: { fontSize: 14, fontWeight: '800', color: colors.primaryText },
});
