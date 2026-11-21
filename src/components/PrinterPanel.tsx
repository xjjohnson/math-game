import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Picked } from '@/components/Motion';
import { PrintedToy } from '@/components/Printer3D';
import { SkillQuestionCard } from '@/components/SkillQuestionCard';
import { FILAMENTS, PRINT_TOYS, PRINTS_PER_SPOOL, SPOOL_PRICE, type FilamentId, type PrintToyId } from '@/constants/printer';
import { colors, radius, spacing } from '@/constants/theme';
import type { AnswerRecord, Problem, Profile } from '@/types';
import { filamentLeft, printerCheck, unlocked } from '@/utils/printer';
import { createRng, randomSeed } from '@/utils/seededRandom';

interface Props {
  profile: Profile;
  /** Still printing the last toy. */
  busy: boolean;
  onBuySpool: (filament: FilamentId) => void;
  /** The printer check was answered right: print it. `history` holds every answer to it, for the skill record. */
  onPrint: (toy: PrintToyId, filament: FilamentId, history: AnswerRecord[]) => void;
  onClose: () => void;
  /** Says something in the buddy's bubble. */
  say: (text: string) => void;
}

/**
 * The 3D printer's panel: pick a toy (stars unlock more) and a filament colour (bought by
 * the spool with coins), then answer one printer check question to start printing.
 */
export function PrinterPanel({ profile, busy, onBuySpool, onPrint, onClose, say }: Props) {
  const [toy, setToy] = useState<PrintToyId>('star');
  const firstColor = FILAMENTS.find((f) => unlocked(profile, f) && filamentLeft(profile, f.id) > 0)?.id ?? 'red';
  const [filament, setFilament] = useState<FilamentId>(firstColor);
  const [check, setCheck] = useState<{ problem: Problem; n: number; answered: boolean | null } | null>(null);
  const history = useRef<AnswerRecord[]>([]);
  const rng = useMemo(() => createRng(randomSeed()), []);
  const left = filamentLeft(profile, filament);

  const start = () => {
    if (busy) return say('The printer is still busy. Watch it go!');
    if (left < 1) return say(`Out of ${FILAMENTS.find((f) => f.id === filament)?.name.toLowerCase()} filament. Buy a spool for ${SPOOL_PRICE} coins!`);
    history.current = [];
    setCheck({ problem: printerCheck(profile, rng), n: 0, answered: null });
    say('Printer check! Answer to warm up the printer.');
  };

  if (check) {
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.title}>🖨️ Printer check</Text>
        <SkillQuestionCard
          key={check.n}
          problem={check.problem}
          progress={check.problem.skill ? profile.skills?.[check.problem.skill] : undefined}
          onAnswered={(given, right, helped) => {
            history.current.push({
              problem: check.problem,
              difficulty: 'easy',
              grade: profile.grade,
              given,
              correct: right,
              points: 0,
              ...(helped ? { helped } : {}),
            });
            setCheck({ ...check, answered: right });
            say(right ? 'Right! The printer is warming up...' : 'Not quite. Look at how it works, then try another one.');
          }}
        />
        {check.answered === true ? (
          <BigButton
            label="▶️ Start printing"
            color={colors.correct}
            onPress={() => {
              const answers = history.current;
              setCheck(null);
              onPrint(toy, filament, answers);
            }}
          />
        ) : null}
        {check.answered === false ? (
          <BigButton
            label="Try another question"
            color={colors.primary}
            onPress={() => setCheck({ problem: printerCheck(profile, rng), n: check.n + 1, answered: null })}
          />
        ) : null}
        <BigButton label="Back" outline small onPress={() => setCheck(null)} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>🖨️ 3D printer</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the printer" hitSlop={10} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.label}>Pick a toy</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {PRINT_TOYS.map((t) => {
          const open = unlocked(profile, t);
          return (
            <Pressable
              key={t.id}
              onPress={() => (open ? setToy(t.id) : say(`The ${t.name.toLowerCase()} unlocks at ${t.stars} stars. You have ${profile.stars}!`))}
              accessibilityRole="button"
              accessibilityLabel={open ? t.name : `${t.name}, needs ${t.stars} stars`}
              accessibilityState={{ selected: toy === t.id, disabled: !open }}
            >
              <Picked on={toy === t.id} radius={radius.md}>
                <View style={[styles.tile, !open && styles.locked]}>
                  <PrintedToy toy={t.id} filament={open ? filament : 'white'} width={44} height={44} />
                  <Text style={styles.small} numberOfLines={1}>
                    {open ? t.name : `⭐ ${t.stars}`}
                  </Text>
                </View>
              </Picked>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.label}>Pick a color</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {FILAMENTS.map((f) => {
          const open = unlocked(profile, f);
          const n = filamentLeft(profile, f.id);
          return (
            <Pressable
              key={f.id}
              onPress={() => (open ? setFilament(f.id) : say(`${f.name} filament unlocks at ${f.stars} stars. You have ${profile.stars}!`))}
              accessibilityRole="button"
              accessibilityLabel={open ? `${f.name}, ${n} prints left` : `${f.name}, needs ${f.stars} stars`}
              accessibilityState={{ selected: filament === f.id, disabled: !open }}
            >
              <Picked on={filament === f.id} radius={24}>
                <View style={[styles.spool, !open && styles.locked]}>
                  <View
                    style={[
                      styles.dot,
                      f.id === 'rainbow' ? styles.rainbow : { backgroundColor: f.color },
                    ]}
                  />
                  <Text style={styles.small}>{open ? `×${n}` : `⭐ ${f.stars}`}</Text>
                </View>
              </Picked>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.actions}>
        <BigButton
          small
          outline
          label={`+ Spool 🪙 ${SPOOL_PRICE}`}
          accessibilityHint={`Buys ${PRINTS_PER_SPOOL} prints of this color`}
          disabled={profile.coins < SPOOL_PRICE}
          onPress={() => onBuySpool(filament)}
          style={styles.action}
        />
        <BigButton small label={busy ? 'Printing…' : '🖨️ Print'} color={colors.primary} disabled={busy || left < 1} onPress={start} style={styles.action} />
      </View>
      <Text style={styles.hint}>
        {left < 1 ? `Buy a spool to print ${PRINTS_PER_SPOOL} toys in this color.` : `${left} ${left === 1 ? 'print' : 'prints'} left in this color.`} More toys unlock with stars.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, paddingBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  close: { position: 'absolute', right: spacing.sm, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, fontWeight: '900', color: colors.textMuted },
  label: { fontSize: 14, fontWeight: '800', color: colors.textMuted, paddingHorizontal: spacing.sm },
  row: { gap: spacing.sm + 2, paddingHorizontal: spacing.sm + 2, paddingVertical: 6, alignItems: 'center' },
  tile: {
    width: 68,
    height: 76,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  spool: {
    width: 56,
    height: 64,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#4E3324' },
  rainbow: { backgroundColor: '#FFC93C', borderColor: '#8E5BD8', borderWidth: 4 },
  small: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  locked: { opacity: 0.45 },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  action: { flex: 1 },
  hint: { fontSize: 14, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
});
