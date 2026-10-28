import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { LessonVisual } from '@/components/LessonVisual';
import { Screen } from '@/components/Screen';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import type { GameConfig } from '@/types';
import { speakText, stopSpeaking } from '@/utils/feedback';
import { QUESTIONS_PER_ROUND } from '@/utils/gameSession';
import { findLesson, type Lesson } from '@/utils/lessons';
import { createRng, randomSeed } from '@/utils/seededRandom';

export function LessonScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lesson = findLesson(id);
  if (!lesson) {
    return (
      <Screen title="Lesson not found">
        <BigButton label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <LessonSteps lesson={lesson} />;
}

function LessonSteps({ lesson }: { lesson: Lesson }) {
  const palette = usePalette();
  const color = palette.operations[lesson.operation];
  const [seed, setSeed] = useState(randomSeed);
  const [index, setIndex] = useState(0);
  const steps = useMemo(() => lesson.build(createRng(seed)), [lesson, seed]);
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => speakText(step.text), [step]);
  useEffect(() => stopSpeaking, []);

  const practice = () => {
    const config: GameConfig = {
      mode: lesson.practice.mode,
      difficulty: lesson.practice.difficulty,
      timer: null,
      adaptive: false,
      showWork: lesson.practice.showWork,
      questionCount: QUESTIONS_PER_ROUND,
      seed: randomSeed(),
    };
    router.push({ pathname: '/play', params: { config: JSON.stringify(config) } });
  };

  return (
    <Screen title={`${lesson.emoji} ${lesson.title}`}>
      <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${steps.length}`}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.progress, { borderColor: color }, i <= index && { backgroundColor: color }]} />
        ))}
      </View>

      <View style={[styles.card, { borderColor: color }]}>
        <Text style={styles.text}>{step.text}</Text>
        <Pressable
          onPress={() => speakText(step.text, true)}
          style={styles.speaker}
          accessibilityRole="button"
          accessibilityLabel="Read this out loud"
          hitSlop={12}
        >
          <Text style={styles.speakerIcon}>🔊</Text>
        </Pressable>
        {step.visual ? (
          <View style={styles.visual}>
            <LessonVisual visual={step.visual} color={color} />
          </View>
        ) : null}
      </View>

      <View style={styles.nav}>
        <BigButton
          label="◀ Back"
          outline
          color={color}
          disabled={index === 0}
          onPress={() => setIndex(index - 1)}
          style={styles.navButton}
        />
        {last ? (
          <BigButton
            label="Again ↺"
            outline
            color={color}
            onPress={() => setIndex(0)}
            style={styles.navButton}
          />
        ) : (
          <BigButton label="Next ▶" color={color} onPress={() => setIndex(index + 1)} style={styles.navButton} />
        )}
      </View>
      {last ? <BigButton label="🎯 Practice this" color={colors.correct} onPress={practice} /> : null}
      <BigButton
        label="🔀 New example"
        outline
        onPress={() => {
          setSeed(randomSeed());
          setIndex(0);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  progress: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 4,
    padding: spacing.md,
    gap: spacing.md,
    minHeight: 260,
  },
  text: { fontSize: fontSizes.body + 2, lineHeight: 30, fontWeight: '700', color: colors.text, paddingRight: 36 },
  speaker: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: spacing.xs },
  speakerIcon: { fontSize: 28 },
  visual: { alignItems: 'center' },
  nav: { flexDirection: 'row', gap: spacing.md },
  navButton: { flex: 1 },
});
