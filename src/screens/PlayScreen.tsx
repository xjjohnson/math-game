import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { FlashCard } from '@/components/FlashCard';
import { NumberPad } from '@/components/NumberPad';
import { Screen } from '@/components/Screen';
import { TimerBar } from '@/components/TimerBar';
import { DIFFICULTIES } from '@/constants/difficulty';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { useGameSession } from '@/hooks/useGameSession';
import { useTimer } from '@/hooks/useTimer';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { Difficulty, GameConfig, InputStyle } from '@/types';
import {
  correctCount,
  highScoreKey,
  lastAnswer,
  QUESTIONS_PER_ROUND,
  type SessionState,
} from '@/utils/gameSession';
import { randomSeed } from '@/utils/seededRandom';

/** How long a right answer stays on screen before the next card. */
const CORRECT_PAUSE_MS = 900;

function parseConfig(raw: string | undefined): GameConfig {
  const fallback: GameConfig = {
    mode: { kind: 'operation', operation: 'add' },
    difficulty: 'easy',
    timer: null,
    adaptive: false,
    questionCount: QUESTIONS_PER_ROUND,
    seed: randomSeed(),
  };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as GameConfig;
    if (!parsed.mode || !(parsed.difficulty in DIFFICULTIES)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

/** "Auto" means multiple choice on Easy and the number pad above it. */
function resolveInputStyle(style: InputStyle | undefined, difficulty: Difficulty): InputStyle {
  if (style === 'choices' || style === 'numpad') return style;
  return difficulty === 'easy' ? 'choices' : 'numpad';
}

export function PlayScreen() {
  const params = useLocalSearchParams<{ config?: string }>();
  const [config, setConfig] = useState(() => parseConfig(params.config));

  // A new seed remounts the round from scratch.
  return (
    <Round
      key={config.seed}
      config={config}
      onPlayAgain={() => setConfig({ ...config, seed: randomSeed() })}
    />
  );
}

function Round({ config, onPlayAgain }: { config: GameConfig; onPlayAgain: () => void }) {
  const profile = useActiveProfile();
  const recordRound = useProfiles((s) => s.recordRound);
  const [state, dispatch] = useGameSession(config);
  const [newHighScore, setNewHighScore] = useState(false);
  const saved = useRef(false);

  const asking = state.phase === 'question';
  const secondsLeft = useTimer(config.timer, asking, state.index, () => dispatch({ type: 'timeout' }));
  const last = lastAnswer(state);
  const inputStyle = resolveInputStyle(profile?.inputStyle, state.difficulty);

  // Right answers move on by themselves; wrong ones wait so the player can read the fix.
  useEffect(() => {
    if (state.phase !== 'feedback' || !last?.correct) return;
    const id = setTimeout(() => dispatch({ type: 'next' }), CORRECT_PAUSE_MS);
    return () => clearTimeout(id);
  }, [state.phase, last, dispatch]);

  useEffect(() => {
    if (state.phase !== 'finished' || saved.current || !profile) return;
    saved.current = true;
    setNewHighScore(
      recordRound(profile.id, {
        highScoreKey: highScoreKey(config),
        score: state.score,
        bestStreak: state.bestStreak,
        history: state.history,
      }),
    );
  }, [state, profile, config, recordRound]);

  if (state.phase === 'finished') {
    return <Results state={state} newHighScore={newHighScore} onPlayAgain={onPlayAgain} />;
  }

  const answer = (given: number) =>
    dispatch({ type: 'answer', given, secondsLeft: config.timer === null ? null : secondsLeft });
  const showFeedback = state.phase === 'feedback' && last;
  const allowNegative = DIFFICULTIES[state.difficulty].allowNegatives && state.problem.operation === 'subtract';

  return (
    <Screen>
      <View style={styles.statusRow}>
        <Text style={styles.status}>
          {state.index + 1} / {config.questionCount}
        </Text>
        <Text style={styles.status}>🔥 {state.streak}</Text>
        <Text style={styles.status}>⭐ {state.score}</Text>
      </View>
      {config.adaptive ? (
        <Text style={styles.level}>Level: {DIFFICULTIES[state.difficulty].label}</Text>
      ) : null}
      {config.timer !== null && secondsLeft !== null ? (
        <TimerBar total={config.timer} left={secondsLeft} />
      ) : null}

      <FlashCard problem={state.problem} reveal={!!showFeedback && !last.correct} />

      {showFeedback ? (
        <Text style={[styles.feedback, { color: last.correct ? colors.correct : colors.wrong }]}>
          {last.correct
            ? `Great job! +${last.points}`
            : last.given === null
              ? "Time's up!"
              : 'Not quite. Remember this one!'}
        </Text>
      ) : null}

      {inputStyle === 'choices' ? (
        <ChoiceButtons
          choices={state.problem.choices}
          selected={showFeedback ? (last.given ?? Number.NaN) : null}
          answer={state.problem.answer}
          onSelect={answer}
        />
      ) : showFeedback ? null : (
        <NumberPad key={state.index} onSubmit={answer} allowNegative={allowNegative} />
      )}

      {showFeedback && !last.correct ? (
        <BigButton label="Next" onPress={() => dispatch({ type: 'next' })} />
      ) : null}
    </Screen>
  );
}

function Results({
  state,
  newHighScore,
  onPlayAgain,
}: {
  state: SessionState;
  newHighScore: boolean;
  onPlayAgain: () => void;
}) {
  const right = correctCount(state);
  const total = state.history.length;
  const missed = state.history.filter((r) => !r.correct);
  const cheer = right === total ? 'Perfect round!' : right >= total * 0.7 ? 'Awesome work!' : 'Good practice!';

  return (
    <Screen title={cheer}>
      {newHighScore ? <Text style={styles.highScore}>🏆 New high score!</Text> : null}
      <View style={styles.summary}>
        <Stat label="Score" value={String(state.score)} />
        <Stat label="Right" value={`${right} / ${total}`} />
        <Stat label="Best streak" value={String(state.bestStreak)} />
      </View>
      {missed.length > 0 ? (
        <View style={styles.missed}>
          <Text style={styles.missedTitle}>Practice these</Text>
          {missed.map((r, i) => (
            <Text key={i} style={styles.missedItem}>
              {r.problem.prompt} = {r.problem.answer}
            </Text>
          ))}
        </View>
      ) : null}
      <BigButton label="Play again" color={colors.correct} onPress={onPlayAgain} />
      <BigButton label="Change game" outline onPress={() => router.back()} />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  status: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  level: { fontSize: 16, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  feedback: { fontSize: fontSizes.button, fontWeight: '800', textAlign: 'center' },
  highScore: { fontSize: fontSizes.button, fontWeight: '900', color: colors.accent, textAlign: 'center' },
  summary: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: fontSizes.button + 4, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  missed: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  missedTitle: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  missedItem: { fontSize: fontSizes.body, color: colors.text, fontVariant: ['tabular-nums'] },
});
