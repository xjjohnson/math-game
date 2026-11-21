import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { LessonVisual } from '@/components/LessonVisual';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import type { Problem, SkillProgress } from '@/types';
import { speakText, stopSpeaking } from '@/utils/feedback';
import { diagnose, helpFor } from '@/utils/skills/help';

/**
 * "💡 Help" during a question, and "Show me how" after a miss. Opens on the way
 * that suits the player (pictures, then tricks, then paper), with "Another way"
 * to try the next one. While the question is open it leaves the last step to them.
 */
export function HelpPanel({
  problem,
  progress,
  reveal,
  given,
  color,
  onClose,
}: {
  problem: Problem;
  progress: SkillProgress | undefined;
  /** After a miss: show the whole working, answer included. */
  reveal: boolean;
  given?: number | null;
  color: string;
  onClose: () => void;
}) {
  const { ways, start } = useMemo(() => helpFor(problem, progress, reveal), [problem, progress, reveal]);
  const [wayIndex, setWayIndex] = useState(start);
  const [stepIndex, setStepIndex] = useState(0);
  const slip = reveal && given !== undefined ? diagnose(problem, given) : null;
  const way = ways[wayIndex];
  const step = way?.steps[stepIndex];
  const last = way ? stepIndex === way.steps.length - 1 : true;

  useEffect(() => {
    if (step) speakText(step.text);
  }, [step]);
  useEffect(() => stopSpeaking, []);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} visible>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { borderColor: color }]} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content}>
            {slip ? (
              <View style={styles.slip} accessibilityLiveRegion="polite">
                <Text style={styles.slipText}>🔎 {slip}</Text>
              </View>
            ) : null}
            {way ? (
              <>
                <Text style={[styles.title, { color }]}>
                  {way.emoji} {way.title}
                </Text>
                <View style={styles.dots} accessibilityLabel={`Step ${stepIndex + 1} of ${way.steps.length}`}>
                  {way.steps.map((_, i) => (
                    <View key={i} style={[styles.dot, { borderColor: color }, i <= stepIndex && { backgroundColor: color }]} />
                  ))}
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.text}>{step.text}</Text>
                  <Pressable
                    onPress={() => speakText(step.text, true)}
                    accessibilityRole="button"
                    accessibilityLabel="Read this out loud"
                    hitSlop={12}
                    style={styles.speaker}
                  >
                    <Text style={styles.speakerIcon}>🔊</Text>
                  </Pressable>
                </View>
                {step.visual ? (
                  <View style={styles.visual}>
                    <LessonVisual visual={step.visual} color={color} />
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.text}>Read it again slowly. You can do it!</Text>
            )}
          </ScrollView>
          <View style={styles.nav}>
            <BigButton
              label="◀ Back"
              outline
              color={color}
              small
              disabled={stepIndex === 0}
              onPress={() => setStepIndex(stepIndex - 1)}
              style={styles.navButton}
            />
            {last ? (
              <BigButton label={reveal ? 'Got it ✓' : 'My turn ✓'} color={colors.correct} small onPress={onClose} style={styles.navButton} />
            ) : (
              <BigButton label="Next ▶" color={color} small onPress={() => setStepIndex(stepIndex + 1)} style={styles.navButton} />
            )}
          </View>
          <View style={styles.nav}>
            {ways.length > 1 ? (
              <BigButton
                label="🔀 Another way"
                outline
                small
                onPress={() => {
                  setWayIndex((wayIndex + 1) % ways.length);
                  setStepIndex(0);
                }}
                style={styles.navButton}
              />
            ) : null}
            <BigButton label="Close" outline small color={colors.textMuted} onPress={onClose} style={styles.navButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  content: { gap: spacing.sm },
  slip: { backgroundColor: '#FFF3E0', borderRadius: radius.md, padding: spacing.sm },
  slipText: { fontSize: 17, fontWeight: '700', color: colors.text },
  title: { fontSize: fontSizes.button, fontWeight: '900', textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  text: { flex: 1, fontSize: fontSizes.body + 1, lineHeight: 28, fontWeight: '700', color: colors.text },
  speaker: { padding: spacing.xs, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  speakerIcon: { fontSize: 26 },
  visual: { alignItems: 'center', paddingVertical: spacing.xs },
  nav: { flexDirection: 'row', gap: spacing.sm },
  navButton: { flex: 1 },
});
