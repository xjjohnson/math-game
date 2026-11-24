import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { BlanketFort } from '@/components/BlanketFort';
import { SkillQuestionCard } from '@/components/SkillQuestionCard';
import { colors, spacing } from '@/constants/theme';
import type { AnswerRecord, Problem, Profile } from '@/types';
import { printerCheck } from '@/utils/printer';
import { createRng, randomSeed } from '@/utils/seededRandom';

interface Props {
  profile: Profile;
  /** The fort check was answered right: set the fort up. `history` holds every answer, for the skill record. */
  onBuilt: (history: AnswerRecord[]) => void;
  onClose: () => void;
  say: (text: string) => void;
}

/**
 * Setting up a new blanket fort: one fort check question from the child's skill list (the same
 * kind as the printer check). A wrong answer gets help and another question; nothing is lost.
 * It only happens once per fort.
 */
export function FortPanel({ profile, onBuilt, onClose, say }: Props) {
  const rng = useMemo(() => createRng(randomSeed()), []);
  const [check, setCheck] = useState<{ problem: Problem; n: number; answered: boolean | null } | null>(null);
  const history = useRef<AnswerRecord[]>([]);

  if (!check) {
    return (
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.title}>⛺ Blanket fort</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.close}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.picture}>
          <BlanketFort width={124} height={80} blanket={null} />
          <Text style={styles.arrow}>➜</Text>
          <BlanketFort width={124} height={80} blanket="stars" />
        </View>
        <Text style={styles.hint}>Answer one fort check question to clip the blanket on and build it!</Text>
        <BigButton
          label="🧷 Build the fort"
          color={colors.primary}
          onPress={() => {
            history.current = [];
            setCheck({ problem: printerCheck(profile, rng), n: 0, answered: null });
            say('Fort check! We need clothespins to hold the blanket up.');
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>🧷 Fort check</Text>
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
          say(right ? 'Right! Clip, clip, clip... the blanket is going up!' : 'Not quite. Look at how it works, then try another one.');
        }}
      />
      {check.answered === true ? (
        <BigButton
          label="⛺ Put the blanket up"
          color={colors.correct}
          onPress={() => {
            const answers = history.current;
            setCheck(null);
            onBuilt(answers);
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

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, paddingBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  close: { position: 'absolute', right: spacing.sm, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, fontWeight: '900', color: colors.textMuted },
  picture: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  arrow: { fontSize: 28, fontWeight: '900', color: colors.textMuted },
  hint: { fontSize: 15, fontWeight: '700', color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.sm },
});
