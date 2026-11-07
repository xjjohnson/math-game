import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { ChangeGiving } from '@/components/ChangeGiving';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { Screen } from '@/components/Screen';
import { colors, fontSizes, spacing } from '@/constants/theme';
import { usePlace } from '@/hooks/usePlace';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import { dateKey } from '@/utils/dates';
import { createRng, randomSeed } from '@/utils/seededRandom';
import { BUILDINGS, changeCoins, shiftDone, shiftPay, shiftQuestions, SHIFT_QUESTIONS, type BuildingId, type ShiftPay } from '@/utils/town';

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
  usePlace(building ? building.id : null);

  if (!building || !profile) return <Screen title="Community"><Text style={styles.text}>Nothing here.</Text></Screen>;
  const alreadyDone = shiftDone(profile, building.id, dateKey()) && !paid;

  if (index >= SHIFT_QUESTIONS) {
    const pay = paid ?? shiftPay(profile, building.id, correct);
    return (
      <Screen title={`${building.emoji} ${building.name}`}>
        <Text style={styles.big}>Shift over!</Text>
        <Text style={styles.text}>You got {correct} out of {SHIFT_QUESTIONS}.</Text>
        <Text style={styles.big}>
          {alreadyDone ? 'Today’s pay was already given. Come back tomorrow!' : pay.hearts > 0 ? `❤️ +${pay.hearts} for your buddy` : `🪙 +${pay.coins}`}
        </Text>
        <BigButton label="Back to the community" onPress={() => router.back()} />
      </Screen>
    );
  }

  const q = questions[index];
  const answered = selected !== null;
  return (
    <Screen title={`${building.emoji} ${building.name}`}>
      {alreadyDone && index === 0 ? (
        <Text style={styles.text}>You already worked here today, so this is just practice (no pay).</Text>
      ) : null}
      <Text style={styles.text}>Question {index + 1} of {SHIFT_QUESTIONS}</Text>
      <Text style={styles.prompt}>{q.prompt}</Text>
      {q.change ? (
        <ChangeGiving
          key={index}
          price={q.change.price}
          paid={q.change.paid}
          answer={q.answer}
          coins={changeCoins(profile.grade)}
          given={selected}
          onGive={(total) => {
            setSelected(total);
            if (total === q.answer) setCorrect((n) => n + 1);
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
            if (last && !alreadyDone) setPaid(finishShift(profile.id, building.id, correct));
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
