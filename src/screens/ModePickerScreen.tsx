import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { OPERATIONS, TIMER_OPTIONS } from '@/constants/difficulty';
import { DEFAULT_GRADE, GRADE_LIST, GRADES } from '@/constants/grades';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { Difficulty, GameChoices, GameConfig, InputStyle, Level, Operation, TimerSetting } from '@/types';
import { QUESTIONS_PER_ROUND } from '@/utils/gameSession';
import { randomSeed } from '@/utils/seededRandom';

type Choice = Operation | 'tables';

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

const TABLES = Array.from({ length: 12 }, (_, i) => i + 1);

const INPUT_OPTIONS: { value: InputStyle; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'choices', label: 'Pick it' },
  { value: 'numpad', label: 'Type it' },
];

export function ModePickerScreen() {
  const profile = useActiveProfile();
  const updateProfile = useProfiles((s) => s.updateProfile);

  // Starts with whatever was picked last time, so "same again" is one tap on Start.
  const last = profile?.lastGame;
  const [choice, setChoice] = useState<Choice>(last?.choice ?? 'add');
  const [level, setLevel] = useState<Level>({
    grade: profile?.grade ?? DEFAULT_GRADE,
    difficulty: profile?.lastDifficulty ?? 'easy',
  });
  const { difficulty } = level;
  const [timer, setTimer] = useState<TimerSetting>(last?.timer ?? null);
  const [adaptive, setAdaptive] = useState(last?.adaptive ?? false);
  const [tables, setTables] = useState<number[]>(last?.tables.length ? last.tables : [2]);
  const [includeDivision, setIncludeDivision] = useState(last?.includeDivision ?? false);
  const [wordProblems, setWordProblems] = useState(last?.wordProblems ?? false);
  const [showWork, setShowWork] = useState(last?.showWork ?? false);
  const [worksheet, setWorksheet] = useState(last?.worksheet ?? false);
  const [more, setMore] = useState(false);

  const isTables = choice === 'tables';

  const toggleTable = (n: number) =>
    setTables((current) =>
      current.includes(n) ? current.filter((t) => t !== n) : [...current, n].sort((a, b) => a - b),
    );

  const start = () => {
    if (profile) {
      const lastGame: GameChoices = {
        choice,
        tables,
        includeDivision,
        timer,
        adaptive,
        wordProblems,
        showWork,
        worksheet,
      };
      updateProfile(profile.id, { lastGame });
    }
    const config: GameConfig = {
      mode: isTables
        ? { kind: 'tables', tables, includeDivision }
        : { kind: 'operation', operation: choice },
      // Times tables score like Medium; the tables themselves set the challenge.
      difficulty: isTables ? 'medium' : difficulty,
      grade: isTables ? undefined : level.grade,
      // A worksheet is answered at the player's own pace, in any order.
      timer: worksheet ? null : timer,
      adaptive: !isTables && !worksheet && adaptive,
      wordProblems: !isTables && wordProblems,
      showWork: !isTables && !worksheet && showWork,
      worksheet,
      questionCount: QUESTIONS_PER_ROUND,
      seed: randomSeed(),
    };
    router.push({ pathname: worksheet ? '/worksheet' : '/play', params: { config: JSON.stringify(config) } });
  };

  const grade = GRADES[level.grade];
  const taught = isTables || GRADES[level.grade].taught.includes(choice as Operation);

  // A one-line summary so the closed "More options" row still says what's on.
  const summary = [
    worksheet && 'Worksheet',
    !worksheet && timer && `${timer}s timer`,
    !isTables && adaptive && !worksheet && 'Adapts',
    !isTables && wordProblems && 'Stories',
    !isTables && showWork && !worksheet && 'Show my work',
  ].filter(Boolean) as string[];

  return (
    <Screen
      // Start stays on screen however many options are open.
      footer={
        <BigButton
          label="Start"
          color={colors.correct}
          disabled={isTables && tables.length === 0}
          onPress={start}
        />
      }
    >
      <View style={styles.tiles}>
        {OPERATIONS.map((o) => (
          <Tile
            key={o.value}
            symbol={o.symbol}
            label={o.label}
            color={colors.operations[o.value]}
            on={choice === o.value}
            onPress={() => setChoice(o.value)}
          />
        ))}
        <Tile symbol="🔢" label="Times tables" color={colors.text} on={isTables} onPress={() => setChoice('tables')} wide />
      </View>

      {isTables ? (
        <View style={styles.card}>
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
        <View style={styles.card}>
          <Text style={styles.label}>Grade</Text>
          <View style={styles.chips}>
            {GRADE_LIST.map((g) => (
              <Chip
                key={g}
                label={GRADES[g].short}
                on={level.grade === g}
                hint={GRADES[g].name}
                onPress={() => {
                  setLevel({ ...level, grade: g });
                  // The grade sticks to the player, so it's ready next time and for the daily challenge.
                  if (profile && g !== profile.grade) updateProfile(profile.id, { grade: g });
                }}
              />
            ))}
          </View>
          <Text style={styles.label}>How hard?</Text>
          <View style={styles.chips}>
            {DIFFICULTY_ORDER.map((d) => (
              <Chip
                key={d}
                label={grade.levels[d].label}
                on={difficulty === d}
                wide
                onPress={() => setLevel({ ...level, difficulty: d })}
              />
            ))}
          </View>
          <Text style={styles.note}>{grade.levels[difficulty].description}</Text>
          {!taught ? (
            <Text style={styles.note}>{grade.name} doesn't usually do this yet, so the numbers stay small.</Text>
          ) : null}
        </View>
      )}

      <Pressable
        onPress={() => setMore((m) => !m)}
        accessibilityRole="button"
        accessibilityState={{ expanded: more }}
        accessibilityLabel="More options"
        style={styles.moreRow}
      >
        <View style={styles.moreText}>
          <Text style={styles.moreTitle}>⚙️  More options</Text>
          {!more && summary.length > 0 ? <Text style={styles.note}>{summary.join(' · ')}</Text> : null}
        </View>
        <Text style={styles.chevron}>{more ? '▲' : '▼'}</Text>
      </Pressable>

      {more ? (
        <View style={styles.card}>
          <ToggleRow
            label="📝 Worksheet (all questions on one page)"
            value={worksheet}
            onChange={setWorksheet}
          />
          {!isTables ? (
            <>
              {worksheet ? null : (
                <ToggleRow label="Change difficulty as I play" value={adaptive} onChange={setAdaptive} />
              )}
              <ToggleRow label="Word problems (little stories)" value={wordProblems} onChange={setWordProblems} />
              {choice !== 'divide' && !worksheet ? (
                <>
                  <ToggleRow
                    label="✏️ Show my work (carry and borrow)"
                    value={showWork}
                    onChange={(on) => {
                      setShowWork(on);
                      // Working column by column takes time, so turn the timer off.
                      if (on) setTimer(null);
                    }}
                  />
                  {showWork ? (
                    <Text style={styles.note}>
                      Bigger problems go one column at a time, starting with the ones.
                      {' One-digit problems are answered in one go.'}
                    </Text>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
          {worksheet ? null : (
            <>
              <Text style={styles.label}>Timer (per question)</Text>
              <View style={styles.chips}>
                {TIMER_OPTIONS.map((t) => (
                  <Chip
                    key={t.label}
                    label={t.value ? `${t.value}s` : 'No timer'}
                    on={timer === t.value}
                    wide
                    onPress={() => setTimer(t.value)}
                  />
                ))}
              </View>
              {profile ? (
                <>
                  <Text style={styles.label}>How to answer</Text>
                  <View style={styles.chips}>
                    {INPUT_OPTIONS.map((o) => (
                      <Chip
                        key={o.value}
                        label={o.label}
                        on={profile.inputStyle === o.value}
                        wide
                        onPress={() => updateProfile(profile.id, { inputStyle: o.value })}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function Tile({
  symbol,
  label,
  color,
  on,
  onPress,
  wide,
}: {
  symbol: string;
  label: string;
  color: string;
  on: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  // On a narrow phone the symbol goes above the word, so "Multiplication" fits.
  const narrow = useWindowDimensions().width < 400 && !wide;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [
        styles.tile,
        wide && styles.tileWide,
        narrow && styles.tileNarrow,
        { borderColor: color, backgroundColor: on ? color : colors.surface },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.tileSymbol, { color: on ? colors.primaryText : color }]}>{symbol}</Text>
      <Text style={[styles.tileLabel, { color: on ? colors.primaryText : color }]}>{label}</Text>
    </Pressable>
  );
}

function Chip({
  label,
  on,
  onPress,
  wide,
  hint,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  wide?: boolean;
  hint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={hint ?? label}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.chip, wide && styles.chipWide, on && styles.chipOn, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>
        {label}
      </Text>
    </Pressable>
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
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 80,
    borderRadius: radius.lg,
    borderWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tileWide: { flexBasis: '100%' },
  tileNarrow: { flexDirection: 'column', gap: 0, paddingVertical: spacing.xs },
  tileSymbol: { fontSize: 30, fontWeight: '900' },
  tileLabel: { fontSize: 18, fontWeight: '800' },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: '#E4DEC8',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minWidth: 56,
    height: 56,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWide: { flexGrow: 1, flexBasis: '28%', paddingHorizontal: 4 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  chipTextOn: { color: colors.primaryText },
  moreRow: {
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: '#E4DEC8',
    backgroundColor: colors.surface,
  },
  moreText: { flex: 1 },
  moreTitle: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  chevron: { fontSize: 20, color: colors.textMuted },
  pressed: { transform: [{ scale: 0.97 }] },
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
  note: { fontSize: 16, color: colors.textMuted },
  toggleRow: {
    minHeight: TAP_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleLabel: { flex: 1, fontSize: fontSizes.body, fontWeight: '700', color: colors.text },
});
