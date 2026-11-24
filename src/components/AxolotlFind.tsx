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
import { AXOLOTL_NAME, colorOf, hasCrown, lolosQuestion, type HideSpot } from '@/utils/axolotl';
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

type Step = { kind: 'hello' } | { kind: 'question'; problem: Problem; n: number; answered: boolean | null } | { kind: 'paid'; coins: number; stars: number; learned: number; unlock: string | null };

/** Put once at the top of the app: the panel that opens when Lolo is found. */
export function AxolotlFindHost() {
  const open = useLoloFind((s) => s.open);
  return open ? <FindPanel /> : null;
}

function FindPanel() {
  const profile = useActiveProfile();
  const hide = useLoloFind((s) => s.hide);
  const claim = useProfiles((s) => s.claimLolo);
  const [step, setStep] = useState<Step>({ kind: 'hello' });
  const history = useRef<AnswerRecord[]>([]);
  const rng = useMemo(() => createRng(randomSeed()), []);
  if (!profile) return null;
  const color = colorOf(profile);
  const crown = hasCrown(profile);

  const ask = (n: number) => setStep({ kind: 'question', problem: lolosQuestion(profile, rng), n, answered: null });

  const mood = step.kind === 'paid' ? 'happy' : step.kind === 'question' && step.answered === false ? 'sad' : 'smile';
  const words =
    step.kind === 'hello'
      ? 'You found me! Answer my question and I’ll give you a treat.'
      : step.kind === 'question'
        ? step.answered === true
          ? 'Yes! You got it!'
          : step.answered === false
            ? 'Let’s try another one.'
            : 'Here’s my question...'
        : `Thanks for finding me! See you tomorrow in a new spot.`;

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

          {step.kind === 'hello' ? (
            <BigButton label="❓ Ask me!" color={colors.primary} onPress={() => ask(0)} />
          ) : null}

          {step.kind === 'question' ? (
            <>
              <SkillQuestionCard
                key={step.n}
                problem={step.problem}
                progress={step.problem.skill ? profile.skills?.[step.problem.skill] : undefined}
                onAnswered={(given, right, helped) => {
                  history.current.push({
                    problem: step.problem,
                    difficulty: 'easy',
                    grade: profile.grade,
                    given,
                    correct: right,
                    points: 0,
                    ...(helped ? { helped } : {}),
                  });
                  setStep({ ...step, answered: right });
                }}
              />
              {step.answered === true ? (
                <BigButton
                  label="🎁 Get my treat"
                  color={colors.correct}
                  onPress={() => {
                    const r = claim(profile.id, history.current);
                    if (r.ok) setStep({ kind: 'paid', coins: r.coins, stars: r.stars, learned: r.learned, unlock: r.unlock });
                    else hide();
                  }}
                />
              ) : null}
              {step.answered === false ? <BigButton label="Try another question" color={colors.primary} onPress={() => ask(step.n + 1)} /> : null}
            </>
          ) : null}

          {step.kind === 'paid' ? (
            <>
              <Text style={styles.reward}>
                🪙 +{step.coins} {'   '}⭐ +{step.stars}
              </Text>
              {step.learned > 0 ? <Text style={styles.note}>You learned a new skill!</Text> : null}
              {step.unlock ? <Text style={styles.unlock}>🎉 {step.unlock}</Text> : null}
              <BigButton label="Bye, Lolo!" color={colors.primary} onPress={hide} />
            </>
          ) : null}

          {step.kind !== 'paid' ? <BigButton label="Later" outline small onPress={hide} accessibilityHint="Lolo stays hiding here until you come back" /> : null}
        </ScrollView>
        {step.kind === 'paid' ? <Confetti burst={1} /> : null}
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
});
