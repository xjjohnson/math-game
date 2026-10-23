import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { CompanionBubble } from '@/components/CompanionBubble';
import { FlashCard, isStacked } from '@/components/FlashCard';
import { ColumnHint } from '@/components/ColumnHint';
import { ColumnPad, NumberPad } from '@/components/NumberPad';
import { PopIn } from '@/components/PopIn';
import { Screen } from '@/components/Screen';
import { TimerBar } from '@/components/TimerBar';
import { findBadge } from '@/constants/badges';
import { DIFFICULTIES } from '@/constants/difficulty';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useColumnAnswer } from '@/hooks/useColumnAnswer';
import { useGameSession } from '@/hooks/useGameSession';
import { useTimer } from '@/hooks/useTimer';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { GameConfig } from '@/types';
import { speakProblem, stopSpeaking, vibrate } from '@/utils/feedback';
import {
  correctCount,
  highScoreKey,
  lastAnswer,
  QUESTIONS_PER_ROUND,
  type SessionState,
} from '@/utils/gameSession';
import { resolveInputStyle } from '@/utils/inputStyle';
import type { RoundOutcome } from '@/utils/progress';
import { DAILY_PASS, STREAK_MILESTONE } from '@/utils/rewards';
import { randomSeed } from '@/utils/seededRandom';
import { cardStyleFor, companionFor } from '@/utils/shop';
import { playSound } from '@/utils/soundEffects';

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
    if (
      result &&
      (result.dailyBonusCoins > 0 ||
        result.weeklyBonusCoins > 0 ||
        result.newBadges.length > 0 ||
        result.newHighScore ||
        result.stars === 3)
    ) {
      playSound('reward');
    }
  }, [state, profile, config, recordRound]);

  const allowNegative =
    DIFFICULTIES[state.difficulty].allowNegatives &&
    state.problem.operation === 'subtract' &&
    !state.problem.story;
  const column = useColumnAnswer(state.problem, { allowNegative, teach: !!config.showWork });

  if (state.phase === 'finished') {
    return (
      <Results state={state} outcome={outcome} daily={!!config.dailyDate} onPlayAgain={onPlayAgain} />
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
        <Text style={styles.status}>⭐ {state.score}</Text>
      </View>
      {config.adaptive ? (
        <Text style={styles.level}>Level: {DIFFICULTIES[state.difficulty].label}</Text>
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

      {companion ? (
        <CompanionBubble
          companion={companion}
          correct={showFeedback ? last.correct : null}
          turn={state.index}
        />
      ) : null}

      {showFeedback ? (
        <Text style={[styles.feedback, { color: last.correct ? palette.correct : palette.wrong }]}>
          {last.correct
            ? `✓ Great job! +${last.points}`
            : last.given === null
              ? "✗ Time's up!"
              : '✗ Not quite. Remember this one!'}
        </Text>
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

function Results({
  state,
  outcome,
  daily,
  onPlayAgain,
}: {
  state: SessionState;
  outcome: RoundOutcome | null;
  daily: boolean;
  onPlayAgain: () => void;
}) {
  const right = correctCount(state);
  const total = state.history.length;
  const missed = state.history.filter((r) => !r.correct);
  const cheer = right === total ? 'Perfect round!' : right >= total * 0.7 ? 'Awesome work!' : 'Good practice!';

  return (
    <Screen title={cheer}>
      {outcome ? (
        <View style={styles.rewards}>
          <View style={styles.starRow} accessible accessibilityLabel={`${outcome.stars} out of 3 stars`}>
            {[0, 1, 2].map((i) => (
              <PopIn key={i} delay={250 * i} damping={9}>
                <Text style={[styles.stars, i >= outcome.stars && styles.starEmpty]}>
                  {i < outcome.stars ? '★' : '☆'}
                </Text>
              </PopIn>
            ))}
          </View>
          <Text style={styles.coins}>+{outcome.coins} 🪙</Text>
          {outcome.streakBonusCoins > 0 ? (
            <Text style={styles.bonus}>Includes +{outcome.streakBonusCoins} for streaks of {STREAK_MILESTONE}</Text>
          ) : null}
          {outcome.dailyBonusCoins > 0 ? (
            <Text style={styles.bonus}>🎉 Daily challenge complete! +{outcome.dailyBonusCoins} bonus</Text>
          ) : daily ? (
            <Text style={styles.bonus}>Get {DAILY_PASS} right to win the daily bonus.</Text>
          ) : null}
          {outcome.weeklyBonusCoins > 0 ? (
            <Text style={styles.bonus}>🏆 All weekly goals done! +{outcome.weeklyBonusCoins} bonus</Text>
          ) : null}
          {outcome.newHighScore ? <Text style={styles.highScore}>🏆 New high score!</Text> : null}
          {outcome.newBadges.map((id) => {
            const badge = findBadge(id);
            return badge ? (
              <Text key={id} style={styles.badge}>
                {badge.emoji} New badge: {badge.name}
              </Text>
            ) : null;
          })}
        </View>
      ) : null}
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
      <BigButton label={daily ? 'Home' : 'Change game'} outline onPress={() => router.back()} />
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
  rewards: { alignItems: 'center', gap: spacing.xs },
  starRow: { flexDirection: 'row', gap: spacing.md },
  stars: { fontSize: 56, color: colors.accent },
  starEmpty: { opacity: 0.5 },
  coins: { fontSize: fontSizes.title, fontWeight: '900', color: colors.text },
  bonus: { fontSize: 18, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  badge: { fontSize: fontSizes.body, fontWeight: '900', color: colors.primary, textAlign: 'center' },
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
