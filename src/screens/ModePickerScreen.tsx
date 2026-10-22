import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { DIFFICULTIES, OPERATIONS, TIMER_OPTIONS } from '@/constants/difficulty';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { Difficulty, GameConfig, InputStyle, Operation, TimerSetting } from '@/types';
import { QUESTIONS_PER_ROUND } from '@/utils/gameSession';
import { randomSeed } from '@/utils/seededRandom';

type Choice = Operation | 'tables';

const TABLES = Array.from({ length: 12 }, (_, i) => i + 1);

const INPUT_OPTIONS: { value: InputStyle; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'choices', label: 'Pick an answer' },
  { value: 'numpad', label: 'Type it in' },
];

export function ModePickerScreen() {
  const profile = useActiveProfile();
  const updateProfile = useProfiles((s) => s.updateProfile);

  const [choice, setChoice] = useState<Choice>('add');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [timer, setTimer] = useState<TimerSetting>(null);
  const [adaptive, setAdaptive] = useState(false);
  const [tables, setTables] = useState<number[]>([2]);
  const [includeDivision, setIncludeDivision] = useState(false);

  const isTables = choice === 'tables';

  const toggleTable = (n: number) =>
    setTables((current) =>
      current.includes(n) ? current.filter((t) => t !== n) : [...current, n].sort((a, b) => a - b),
    );

  const start = () => {
    const config: GameConfig = {
      mode: isTables
        ? { kind: 'tables', tables, includeDivision }
        : { kind: 'operation', operation: choice },
      // Times tables score like Medium; the tables themselves set the challenge.
      difficulty: isTables ? 'medium' : difficulty,
      timer,
      adaptive: !isTables && adaptive,
      questionCount: QUESTIONS_PER_ROUND,
      seed: randomSeed(),
    };
    router.push({ pathname: '/play', params: { config: JSON.stringify(config) } });
  };

  return (
    <Screen title="Choose a game">
      <OptionGroup<Choice>
        label="Practice"
        value={choice}
        onChange={setChoice}
        options={[
          ...OPERATIONS.map((o) => ({
            value: o.value as Choice,
            label: `${o.symbol}  ${o.label}`,
            color: colors.operations[o.value],
          })),
          { value: 'tables', label: '🔢  Times tables', color: colors.text },
        ]}
      />

      {isTables ? (
        <View style={styles.section}>
          <Text style={styles.label}>Which tables?</Text>
          <View style={styles.tables}>
            {TABLES.map((n) => {
              const on = tables.includes(n);
              return (
                <Pressable
                  key={n}
                  onPress={() => toggleTable(n)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${n} times table`}
                  accessibilityState={{ checked: on }}
                  style={[styles.table, on && styles.tableOn]}
                >
                  <Text style={[styles.tableText, on && styles.tableTextOn]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
          <ToggleRow label="Mix in division facts" value={includeDivision} onChange={setIncludeDivision} />
        </View>
      ) : (
        <>
          <OptionGroup
            label="Difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => ({
              value: d,
              label: `${DIFFICULTIES[d].label}\n${DIFFICULTIES[d].description}`,
            }))}
          />
          <ToggleRow label="Change difficulty as I play" value={adaptive} onChange={setAdaptive} />
        </>
      )}

      <OptionGroup label="Timer (per question)" value={timer} onChange={setTimer} options={TIMER_OPTIONS} />

      {profile ? (
        <OptionGroup
          label="How to answer"
          value={profile.inputStyle}
          onChange={(inputStyle) => updateProfile(profile.id, { inputStyle })}
          options={INPUT_OPTIONS}
        />
      ) : null}

      <BigButton
        label="Start"
        color={colors.correct}
        disabled={isTables && tables.length === 0}
        onPress={start}
      />
    </Screen>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.correct, false: colors.disabled }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  label: { fontSize: fontSizes.body, fontWeight: '700', color: colors.textMuted },
  tables: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  table: {
    width: TAP_TARGET,
    height: TAP_TARGET,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.text,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableOn: { backgroundColor: colors.text },
  tableText: { fontSize: fontSizes.button, fontWeight: '800', color: colors.text },
  tableTextOn: { color: colors.primaryText },
  toggleRow: {
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleLabel: { flex: 1, fontSize: fontSizes.body, fontWeight: '700', color: colors.text },
});
