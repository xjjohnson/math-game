import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { ChangeGiving } from '@/components/ChangeGiving';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { EggCollecting } from '@/components/EggCollecting';
import { Screen } from '@/components/Screen';
import { colors, fontSizes, spacing } from '@/constants/theme';
import { usePlace } from '@/hooks/usePlace';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import { dateKey } from '@/utils/dates';
import { createRng, randomSeed } from '@/utils/seededRandom';
import { BUILDINGS, changeBills, shiftDone, shiftPay, shiftQuestions, SHIFT_QUESTIONS, type BuildingId, type ShiftPay } from '@/utils/town';

/** One job at a community building: five questions, then pay (once a day). */
export function ShiftScreen() {
  const { building: param } = useLocalSearchParams<{ building: string }>();
  const building = BUILDINGS.find((b) => b.id === param);
  const profile = useActiveProfile();
  const finishShift = useProfiles((s) => s.finishShift);
  const questions = useMemo(
    () => (building && profile ? shiftQuestions(building.id as BuildingId, profile.grade, createRng(randomSeed())) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [building?.id, profile?.id],
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [paid, setPaid] = useState<ShiftPay | null>(null);
  // Worked here already today when the job was opened: this play is a replay.
  const [replay] = useState(() => (building && profile ? shiftDone(profile, building.id, dateKey()) : false));
  usePlace(building ? building.id : null);

  if (!building || !profile) return <Screen title="Community"><Text style={styles.text}>Nothing here.</Text></Screen>;

  if (index >= SHIFT_QUESTIONS) {
    const pay = paid ?? shiftPay(profile, building.id, correct, !replay);
    return (
      <Screen title={`${building.emoji} ${building.name}`}>
        <Text style={styles.big}>Shift over!</Text>
        <Text style={styles.text}>You got {correct} out of {SHIFT_QUESTIONS}.</Text>
        <Text style={styles.big}>{pay.hearts > 0 ? `❤️ +${pay.hearts} for your buddy` : `🪙 +${pay.coins}`}</Text>
        {pay.bonus > 0 ? <Text style={styles.text}>That includes a first-time-today bonus of {pay.bonus}!</Text> : null}
        {replay ? <Text style={styles.text}>You worked here already today, so this was a smaller practice pay. Come back tomorrow for the full pay and a bonus!</Text> : null}
        <BigButton label="Back to the community" onPress={() => router.back()} />
      </Screen>
    );
  }

  const q = questions[index];
  const answered = selected !== null;
  return (
    <Screen title={`${building.emoji} ${building.name}`}>
      {replay && index === 0 ? (
        <Text style={styles.text}>You already worked here today, so this is practice: 1 coin for each right answer.</Text>
      ) : null}
      <Text style={styles.text}>Question {index + 1} of {SHIFT_QUESTIONS}</Text>
      {q.change ? null : <Text style={styles.prompt}>{q.prompt}</Text>}
      {q.change ? (
        <ChangeGiving
          key={index}
          item={q.change.item}
          price={q.change.price}
          paid={q.change.paid}
          hand={q.change.bills}
          grade={profile.grade}
          coins={changeBills(profile.grade)}
          onDone={(rightFirstTry) => {
            setSelected(q.answer);
            if (rightFirstTry) setCorrect((n) => n + 1);
          }}
        />
      ) : q.eggs ? (
        <EggCollecting
          key={index}
          answer={q.answer}
          grade={profile.grade}
          units={q.eggs.units}
          onDone={(rightFirstTry) => {
            setSelected(q.answer);
            if (rightFirstTry) setCorrect((n) => n + 1);
          }}
        />
      ) : (
        <ChoiceButtons
          choices={q.choices}
          answer={q.answer}
          selected={selected}
          onSelect={(c) => {
            setSelected(c);
            if (c === q.answer) setCorrect((n) => n + 1);
          }}
        />
      )}
      {answered ? (
        <BigButton
          label={index + 1 >= SHIFT_QUESTIONS ? 'Finish shift' : 'Next'}
          color={colors.correct}
          onPress={() => {
            const last = index + 1 >= SHIFT_QUESTIONS;
            if (last) setPaid(finishShift(profile.id, building.id, correct));
            setSelected(null);
            setIndex(index + 1);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: fontSizes.body, color: colors.textMuted, textAlign: 'center' },
  prompt: { fontSize: fontSizes.button, fontWeight: '800', color: colors.text, textAlign: 'center', marginVertical: spacing.sm },
  big: { fontSize: fontSizes.button, fontWeight: '900', color: colors.text, textAlign: 'center' },
});
