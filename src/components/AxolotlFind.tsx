import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { create } from 'zustand';

import { Text } from '@/components/AppText';
import { Axolotl } from '@/components/Axolotl';
import { BigButton } from '@/components/BigButton';
import { Confetti, Poof } from '@/components/Motion';
import { SkillQuestionCard } from '@/components/SkillQuestionCard';
import { colors, radius, spacing } from '@/constants/theme';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { AnswerRecord, Problem } from '@/types';
import { AXOLOTL_NAME, coinsFor, colorOf, hasCrown, JACKPOT, levelFor, RUN_MAX, runQuestion, type HideSpot } from '@/utils/axolotl';
import { createRng, randomSeed } from '@/utils/seededRandom';

/** Lolo was just tapped: the find panel is open over whatever screen it was on. */
export const useLoloFind = create<{ open: boolean; show: () => void; hide: () => void }>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));

/**
 * Lolo hiding at `spot`: a small part of it showing (head over an edge, tail out, or head
 * above water), blinking and wiggling. A tap poofs it out and opens the find panel.
 */
export function HiddenLolo({ spot, size, style }: { spot: HideSpot; size: number; style?: StyleProp<ViewStyle> }) {
  const profile = useActiveProfile();
  const show = useLoloFind((s) => s.show);
  const [poof, setPoof] = useState(0);
  if (!profile) return null;
  return (
    <Pressable
      onPress={() => {
        setPoof((n) => n + 1);
        show();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${AXOLOTL_NAME} the axolotl is hiding here`}
      hitSlop={size * 0.25}
      style={[{ position: 'absolute', width: size, height: size }, style]}
    >
      <Axolotl size={size} pose={spot.pose} flip={spot.flip} color={colorOf(profile)} crown={hasCrown(profile)} />
      {poof > 0 ? <Poof key={poof} size={size * 1.4} style={{ left: size / 2, top: size / 2 }} /> : null}
    </Pressable>
  );
}

type Step =
  | { kind: 'hello' }
  | { kind: 'question'; problem: Problem; n: number; answered: boolean | null; over: boolean }
  | { kind: 'done'; missed: boolean };

/** What today's run has paid so far, shown as Lolo's treasure jar. */
interface Jar {
  coins: number;
  stars: number;
  learned: number;
  run: number;
  best: boolean;
  unlock: string | null;
}

/** Put once at the top of the app: the panel that opens when Lolo is found. */
export function AxolotlFindHost() {
  const open = useLoloFind((s) => s.open);
  return open ? <FindPanel /> : null;
}

/**
 * Lolo's run: question after question, harder as it goes, until a miss or RUN_MAX right.
 * Each right answer pays straight away (into the jar), so stopping or leaving keeps it all.
 */
function FindPanel() {
  const profile = useActiveProfile();
  const hide = useLoloFind((s) => s.hide);
  const start = useProfiles((s) => s.startLolo);
  const answer = useProfiles((s) => s.answerLolo);
  const [step, setStep] = useState<Step>({ kind: 'hello' });
  const [jar, setJar] = useState<Jar>({ coins: 0, stars: 0, learned: 0, run: 0, best: false, unlock: null });
  const rng = useMemo(() => createRng(randomSeed()), []);
  if (!profile) return null;
  const color = colorOf(profile);
  const crown = hasCrown(profile);

  const ask = (n: number) => setStep({ kind: 'question', problem: runQuestion(profile, n, rng), n, answered: null, over: false });

  const begin = () => {
    const r = start(profile.id);
    if (!r.ok) return hide();
    setJar((j) => ({ ...j, unlock: r.unlock }));
    ask(0);
  };

  const next = step.kind === 'question' ? coinsFor(jar.run + 1) : 0;
  const mood = step.kind === 'done' ? (step.missed && jar.run === 0 ? 'smile' : 'happy') : step.kind === 'question' && step.answered === false ? 'sad' : step.kind === 'question' && step.answered ? 'happy' : 'smile';
  const words =
    step.kind === 'hello'
      ? `You found me! Answer my questions. Each right one is worth more, until you miss one!`
      : step.kind === 'question'
        ? step.answered === true
          ? step.over
            ? `WOW! ${RUN_MAX} in a row! You win my jackpot!`
            : `Yes! ${jar.run} in a row! The next one is harder.`
          : step.answered === false
            ? 'Oh no, so close! Look at how it works.'
            : `Question ${step.n + 1}, worth 🪙 ${next}${jar.run + 1 === RUN_MAX ? ` + ${JACKPOT} jackpot` : ''}!`
        : jar.run === 0
          ? 'Thanks for finding me! Here’s a little treat. See you tomorrow!'
          : `${jar.run} in a row! See you tomorrow in a new spot.`;

  return (
    <View style={styles.cover}>
      <View style={styles.card}>
        <ScrollView contentContainerStyle={styles.inner}>
          <View style={styles.top}>
            <Axolotl size={step.kind === 'question' ? 72 : 120} mood={mood} color={color} crown={crown} />
            <View style={styles.bubble}>
              <Text style={styles.name}>{AXOLOTL_NAME}</Text>
              <Text style={styles.words}>{words}</Text>
            </View>
          </View>

          {step.kind !== 'hello' ? (
            <View style={styles.jar} accessible accessibilityLabel={`${jar.run} right in a row, ${jar.coins} coins and ${jar.stars} stars so far`}>
              <Text style={styles.jarText}>🫙 {jar.run} in a row</Text>
              <Text style={styles.jarText}>
                🪙 {jar.coins}
                {jar.stars ? `   ⭐ ${jar.stars}` : ''}
              </Text>
            </View>
          ) : null}

          {step.kind === 'hello' ? (
            <>
              <BigButton label="❓ Ask me!" color={colors.primary} onPress={begin} />
              <BigButton label="Later" outline small onPress={hide} accessibilityHint="Lolo stays hiding here until you come back" />
            </>
          ) : null}

          {step.kind === 'question' ? (
            <>
              <SkillQuestionCard
                key={step.n}
                problem={step.problem}
                progress={step.problem.skill ? profile.skills?.[step.problem.skill] : undefined}
                onAnswered={(given, right, helped) => {
                  const level = levelFor(step.n, profile.grade);
                  const pay = answer(profile.id, {
                    problem: step.problem,
                    difficulty: level.difficulty,
                    grade: level.grade,
                    given,
                    correct: right,
                    points: 0,
                    ...(helped ? { helped } : {}),
                  });
                  if (pay) {
                    setJar((j) => ({
                      ...j,
                      coins: j.coins + pay.coins,
                      stars: j.stars + pay.stars,
                      learned: j.learned + pay.learned,
                      run: pay.run,
                      best: j.best || pay.best,
                    }));
                  }
                  setStep({ ...step, answered: right, over: pay?.over ?? true });
                }}
              />
              {step.answered === true && !step.over ? (
                <>
                  <BigButton label={`➡️ Next question: 🪙 ${coinsFor(jar.run + 1)}`} color={colors.correct} onPress={() => ask(step.n + 1)} />
                  <BigButton label="Stop and keep my coins" outline small color={colors.primary} onPress={() => setStep({ kind: 'done', missed: false })} />
                </>
              ) : null}
              {step.answered !== null && step.over ? (
                <BigButton label="🎁 See my treasure" color={colors.correct} onPress={() => setStep({ kind: 'done', missed: !step.answered })} />
              ) : null}
            </>
          ) : null}

          {step.kind === 'done' ? (
            <>
              <Text style={styles.reward}>
                🪙 +{jar.coins}
                {jar.stars ? `   ⭐ +${jar.stars}` : ''}
              </Text>
              {jar.best ? <Text style={styles.unlock}>🏆 Your best run ever: {jar.run}!</Text> : null}
              {jar.learned > 0 ? <Text style={styles.note}>You learned a new skill!</Text> : null}
              {jar.unlock ? <Text style={styles.unlock}>🎉 {jar.unlock}</Text> : null}
              <BigButton label="Bye, Lolo!" color={colors.primary} onPress={hide} />
            </>
          ) : null}
        </ScrollView>
        {step.kind === 'done' && jar.run > 0 ? <Confetti burst={1} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(30, 24, 40, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    zIndex: 1000,
    elevation: 1000,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  inner: { padding: spacing.md, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bubble: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm },
  name: { fontSize: 16, fontWeight: '900', color: colors.accentStrong },
  words: { fontSize: 18, fontWeight: '700', color: colors.text },
  reward: { fontSize: 30, fontWeight: '900', color: colors.text, textAlign: 'center' },
  note: { fontSize: 16, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  unlock: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  jar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  jarText: { fontSize: 18, fontWeight: '900', color: colors.text },
});
