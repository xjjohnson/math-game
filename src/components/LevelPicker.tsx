import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { OptionGroup } from '@/components/OptionGroup';
import { GRADE_LIST, GRADES } from '@/constants/grades';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import type { Difficulty, Grade, Level } from '@/types';

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

interface Props {
  level: Level;
  onChange: (level: Level) => void;
  /** Label over the grade buttons. */
  label?: string;
}

/** Grade buttons, then easy, medium and hard for that grade. */
export function LevelPicker({ level, onChange, label = 'Grade' }: Props) {
  const grade = GRADES[level.grade];
  return (
    <>
      <OptionGroup<Grade>
        label={label}
        value={level.grade}
        onChange={(g) => onChange({ ...level, grade: g })}
        compact
        options={GRADE_LIST.map((g) => ({ value: g, label: GRADES[g].short }))}
      />
      <OptionGroup<Difficulty>
        label={`Difficulty in ${grade.name}`}
        value={level.difficulty}
        onChange={(difficulty) => onChange({ ...level, difficulty })}
        options={DIFFICULTY_ORDER.map((d) => ({
          value: d,
          label: `${grade.levels[d].label}\n${grade.levels[d].description}`,
        }))}
      />
    </>
  );
}

/** One line per player: their name, a grade stepper, and a tap-to-change difficulty. */
export function LevelRow({ name, level, onChange }: { name: string; level: Level; onChange: (level: Level) => void }) {
  const step = (by: number) => {
    const next = Math.min(6, Math.max(0, level.grade + by)) as Grade;
    onChange({ ...level, grade: next });
  };
  const nextDifficulty = DIFFICULTY_ORDER[(DIFFICULTY_ORDER.indexOf(level.difficulty) + 1) % DIFFICULTY_ORDER.length];
  const grade = GRADES[level.grade];
  return (
    <View style={styles.row}>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Small label="−" hint={`Lower grade for ${name}`} disabled={level.grade === 0} onPress={() => step(-1)} />
      <Text style={styles.grade}>{grade.short}</Text>
      <Small label="+" hint={`Higher grade for ${name}`} disabled={level.grade === 6} onPress={() => step(1)} />
      <Pressable
        onPress={() => onChange({ ...level, difficulty: nextDifficulty })}
        accessibilityRole="button"
        accessibilityLabel={`${name}: ${grade.levels[level.difficulty].label}. Tap for ${grade.levels[nextDifficulty].label}.`}
        style={({ pressed }) => [styles.difficulty, pressed && styles.pressed]}
      >
        <Text style={styles.difficultyText}>{grade.levels[level.difficulty].label}</Text>
      </Pressable>
    </View>
  );
}

function Small({ label, hint, disabled, onPress }: { label: string; hint: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={hint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.small, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text style={styles.smallText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: TAP_TARGET },
  name: { flex: 1, fontSize: fontSizes.body, fontWeight: '700', color: colors.text },
  grade: { minWidth: 48, textAlign: 'center', fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  small: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallText: { fontSize: fontSizes.button, fontWeight: '900', color: colors.text },
  difficulty: {
    minWidth: 96,
    height: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyText: { fontSize: 18, fontWeight: '800', color: colors.primaryText },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.95 }] },
});
