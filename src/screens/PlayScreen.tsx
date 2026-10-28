import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { CompanionBubble } from '@/components/CompanionBubble';
import { CountingAid } from '@/components/CountingAid';
import { FlashCard, isStacked } from '@/components/FlashCard';
import { ColumnHint } from '@/components/ColumnHint';
import { ColumnPad, NumberPad } from '@/components/NumberPad';
import { PopIn } from '@/components/PopIn';
import { isNotable, RoundResults } from '@/components/RoundResults';
import { Screen } from '@/components/Screen';
import { TimerBar } from '@/components/TimerBar';
import { difficultyConfigFor } from '@/constants/grades';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useColumnAnswer } from '@/hooks/useColumnAnswer';
import { useGameSession } from '@/hooks/useGameSession';
import { useTimer } from '@/hooks/useTimer';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { GameConfig } from '@/types';
import { buddyGift } from '@/utils/buddy';
import { countingModel } from '@/utils/countingAid';
import { speakProblem, stopSpeaking, vibrate } from '@/utils/feedback';
import {
  highScoreKey,
  lastAnswer,
  parseConfig,
} from '@/utils/gameSession';
import { resolveInputStyle } from '@/utils/inputStyle';
import type { RoundOutcome } from '@/utils/progress';
import { STREAK_MILESTONE } from '@/utils/rewards';
import { randomSeed } from '@/utils/seededRandom';
import { cardStyleFor, companionFor } from '@/utils/shop';
import { playSound } from '@/utils/soundEffects';

/** How long a right answer stays on screen before the next card. */
const CORRECT_PAUSE_MS = 900;

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
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [counting, setCounting] = useState(false);
  const saved = useRef(false);

  const asking = state.phase === 'question';
  const secondsLeft = useTimer(config.timer, asking, state.index, () => dispatch({ type: 'timeout' }));
  const last = lastAnswer(state);
  const inputStyle = resolveInputStyle(profile?.inputStyle, state.difficulty);
  const companion = companionFor(profile);
  const palette = usePalette();

  // Read each new problem aloud when that setting is on; stop when leaving the round.
  useEffect(() => {
    if (state.phase === 'question') speakProblem(state.problem);
  }, [state.problem, state.phase]);
  useEffect(() => stopSpeaking, []);
  // Each new question starts with the counting picture put away.
  useEffect(() => setCounting(false), [state.index]);

  useEffect(() => {
    if (state.phase !== 'feedback' || !last) return;
    vibrate(last.correct ? 'correct' : 'wrong');
    if (!last.correct) playSound('wrong');
    else playSound(state.streak % STREAK_MILESTONE === 0 ? 'streak' : 'correct');
  }, [state.phase, state.streak, last]);

  // Right answers move on by themselves; wrong ones wait so the player can read the fix.
  useEffect(() => {
    if (state.phase !== 'feedback' || !last?.correct) return;
    const id = setTimeout(() => dispatch({ type: 'next' }), CORRECT_PAUSE_MS);
    return () => clearTimeout(id);
  }, [state.phase, last, dispatch]);

  useEffect(() => {
    if (state.phase !== 'finished' || saved.current || !profile) return;
    saved.current = true;
    const result = recordRound(profile.id, {
      highScoreKey: highScoreKey(config),
      score: state.score,
      bestStreak: state.bestStreak,
      history: state.history,
      difficulty: config.difficulty,
      dailyDate: config.dailyDate,
    });
    setOutcome(result);
    if (result && isNotable(result)) playSound('reward');
  }, [state, profile, config, recordRound]);

  const allowNegative =
    difficultyConfigFor(state.difficulty, config.grade).allowNegatives &&
    state.problem.operation === 'subtract' &&
    !state.problem.story;
  const column = useColumnAnswer(state.problem, { allowNegative, teach: !!config.showWork });
  const countModel = useMemo(() => countingModel(state.problem), [state.problem]);

  if (state.phase === 'finished') {
    return (
      <RoundResults summary={state} outcome={outcome} daily={!!config.dailyDate} onPlayAgain={onPlayAgain} />
    );
  }

  const answer = (given: number) =>
    dispatch({ type: 'answer', given, secondsLeft: config.timer === null ? null : secondsLeft });
  const showFeedback = state.phase === 'feedback' && last;
  // Show-my-work needs the boxes, so it types even when the player usually taps choices.
  const typingColumns = isStacked(state.problem) && (inputStyle !== 'choices' || !!config.showWork);

  return (
    <Screen compact>
      <View style={styles.statusRow}>
        <Text style={styles.status}>
          {state.index + 1} / {config.questionCount}
        </Text>
        <Text style={styles.status}>🔥 {state.streak}</Text>
        {/* Points, not stars: stars are only handed out at the end of a round. */}
        <Text style={styles.status} accessibilityLabel={`${state.score} points`}>
          🎯 {state.score}
        </Text>
      </View>
      {config.adaptive ? (
        <Text style={styles.level}>Level: {difficultyConfigFor(state.difficulty, config.grade).label}</Text>
      ) : null}
      {config.timer !== null && secondsLeft !== null ? (
        <TimerBar total={config.timer} left={secondsLeft} />
      ) : null}

      <FlashCard
        key={`card-${state.index}`}
        problem={state.problem}
        reveal={!!showFeedback}
        column={
          typingColumns && !showFeedback
            ? {
                layout: column.layout,
                entry: column.entry,
                selectable: !column.teaching,
                pending: column.hint?.typed,
                flyCarries: column.teaching,
                finished: column.hint?.done,
                allowNegative,
                onSelect: column.select,
                onToggleSign: () => column.press('±'),
              }
            : undefined
        }
        cardStyle={cardStyleFor(profile)}
        onSpeak={() => speakProblem(state.problem, true)}
      />

      {countModel && !showFeedback ? (
        <Pressable
          onPress={() => setCounting((on) => !on)}
          accessibilityRole="button"
          accessibilityState={{ expanded: counting }}
          style={styles.countToggle}
          hitSlop={6}
        >
          <Text style={styles.countToggleText}>{counting ? 'Hide counting' : '🧮 Count it out'}</Text>
        </Pressable>
      ) : null}
      {countModel && counting && !showFeedback ? (
        <CountingAid key={`count-${state.index}`} problem={state.problem} model={countModel} />
      ) : null}

      {companion ? (
        <CompanionBubble
          companion={companion}
          correct={showFeedback ? last.correct : null}
          turn={state.index}
          gift={buddyGift(profile)}
        />
      ) : null}

      {showFeedback ? (
        <PopIn key={`feedback-${state.index}`} damping={10}>
          <Text style={[styles.feedback, { color: last.correct ? palette.correct : palette.wrong }]}>
            {last.correct
              ? `✓ Great job! +${last.points} points`
              : last.given === null
                ? "✗ Time's up!"
                : '✗ Not quite. Remember this one!'}
          </Text>
        </PopIn>
      ) : null}

      {inputStyle === 'choices' && !typingColumns ? (
        <ChoiceButtons
          choices={state.problem.choices}
          selected={showFeedback ? (last.given ?? Number.NaN) : null}
          answer={state.problem.answer}
          onSelect={answer}
        />
      ) : showFeedback ? null : typingColumns ? (
        <>
          {column.hint ? <ColumnHint hint={column.hint} /> : null}
          <ColumnPad
            onKey={column.press}
            canCheck={column.value !== null}
            onCheck={() => column.value !== null && answer(column.value)}
          />
        </>
      ) : (
        <NumberPad key={`pad-${state.index}`} onSubmit={answer} allowNegative={allowNegative} />
      )}

      {showFeedback && !last.correct ? (
        <BigButton label="Next" onPress={() => dispatch({ type: 'next' })} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', justifyContent: 'space-between' },
  status: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  level: { fontSize: 16, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  countToggle: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  countToggleText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  feedback: { fontSize: fontSizes.button, fontWeight: '800', textAlign: 'center' },
});
