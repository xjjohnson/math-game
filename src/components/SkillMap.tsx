import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { colors, radius, spacing, TAP_TARGET } from '@/constants/theme';
import type { GameConfig, Profile } from '@/types';
import { QUESTIONS_PER_ROUND } from '@/utils/gameSession';
import { randomSeed } from '@/utils/seededRandom';
import { SKILLS, STRANDS, strandsForGrade } from '@/utils/skills/catalog';
import { skillState, type SkillState } from '@/utils/skills/plan';

const STATE_LOOK: Record<SkillState, { icon: string; label: string; color: string }> = {
  known: { icon: '✅', label: 'Got it', color: colors.correct },
  learning: { icon: '🌱', label: 'Learning now', color: colors.accentStrong },
  later: { icon: '🔒', label: 'Coming up', color: colors.textMuted },
};

const gradeName = (grade: number) => (grade === 0 ? 'K' : `Gr ${grade}`);

/**
 * Every skill near the player's grade, by area, marked got it / learning now /
 * coming up. Tapping one practises just that skill. The parent view adds each
 * skill's numbers (tries, right, help opened, date learned).
 */
export function SkillMap({ profile, parent = false }: { profile: Pick<Profile, 'grade' | 'skills'>; parent?: boolean }) {
  const strands = strandsForGrade(profile.grade);
  const [open, setOpen] = useState<string | null>(null);
  const practise = (skill: string) => {
    const config: GameConfig = {
      mode: { kind: 'skills', focus: skill },
      difficulty: 'medium',
      grade: profile.grade,
      timer: null,
      adaptive: false,
      questionCount: QUESTIONS_PER_ROUND,
      seed: randomSeed(),
    };
    router.push({ pathname: '/play', params: { config: JSON.stringify(config) } });
  };

  return (
    <View style={styles.wrap}>
      {STRANDS.filter((s) => strands.includes(s.value)).map((strand) => {
        const skills = SKILLS.filter(
          (s) => s.strand === strand.value && s.grade <= profile.grade + 1 && (parent || s.grade >= profile.grade - 1),
        );
        if (skills.length === 0) return null;
        const states = skills.map((s) => skillState(profile, s));
        const got = states.filter((s) => s === 'known').length;
        const expanded = open === strand.value;
        return (
          <View key={strand.value} style={styles.strand}>
            <Pressable
              onPress={() => setOpen(expanded ? null : strand.value)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${strand.label}: ${got} of ${skills.length} skills learned`}
              style={styles.strandHeader}
            >
              <Text style={styles.strandTitle}>
                {strand.emoji} {strand.label}
              </Text>
              <View style={styles.pips} importantForAccessibility="no-hide-descendants">
                {states.map((st, i) => (
                  <View key={i} style={[styles.pip, { backgroundColor: st === 'known' ? colors.correct : st === 'learning' ? colors.accentStrong : colors.disabled }]} />
                ))}
              </View>
              <Text style={styles.count}>
                {got}/{skills.length} {expanded ? '▲' : '▼'}
              </Text>
            </Pressable>
            {expanded
              ? skills.map((skill, i) => {
                  const look = STATE_LOOK[states[i]];
                  const p = profile.skills?.[skill.id];
                  return (
                    <Pressable
                      key={skill.id}
                      onPress={() => practise(skill.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${skill.title}, ${look.label}. Practise it.`}
                      style={({ pressed }) => [styles.skill, pressed && styles.pressed]}
                    >
                      <Text style={styles.icon}>{look.icon}</Text>
                      <View style={styles.skillText}>
                        <Text style={styles.skillTitle}>{skill.title}</Text>
                        <Text style={styles.example}>
                          {skill.example}
                          {parent && p
                            ? `  ·  ${p.right}/${p.tries} right${p.helped ? `, help ${p.helped}×` : ''}${p.learnedOn ? `, learned ${p.learnedOn}` : ''}`
                            : ''}
                        </Text>
                      </View>
                      <Text style={[styles.grade, { color: look.color }]}>{gradeName(skill.grade)}</Text>
                    </Pressable>
                  );
                })
              : null}
          </View>
        );
      })}
      <Text style={styles.note}>✅ got it · 🌱 learning now · 🔒 coming up. Tap a skill to practise it.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  strand: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, overflow: 'hidden' },
  strandHeader: { minHeight: TAP_TARGET, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  strandTitle: { fontSize: 18, fontWeight: '800', color: colors.text, flexShrink: 1 },
  pips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'flex-end' },
  pip: { width: 10, height: 10, borderRadius: 5 },
  count: { fontSize: 16, fontWeight: '800', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  skill: {
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: { backgroundColor: colors.background },
  icon: { fontSize: 22 },
  skillText: { flex: 1 },
  skillTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  example: { fontSize: 14, color: colors.textMuted },
  grade: { fontSize: 14, fontWeight: '800' },
  note: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
