import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { CompanionBubble } from '@/components/CompanionBubble';
import { CountingAid } from '@/components/CountingAid';
import { FlashCard, isStacked } from '@/components/FlashCard';
import { ClockSetter, CoinPurse } from '@/components/HandsOn';
import { HelpPanel } from '@/components/HelpPanel';
import { ColumnHint } from '@/components/ColumnHint';
import { ColumnPad, NumberPad } from '@/components/NumberPad';
import { PopIn } from '@/components/PopIn';
import { isNotable, RoundResults } from '@/components/RoundResults';
import { Screen } from '@/components/Screen';
import { SpeakButton } from '@/components/SpeakButton';
import { TimerBar } from '@/components/TimerBar';
import { difficultyConfigFor } from '@/constants/grades';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useColumnAnswer } from '@/hooks/useColumnAnswer';
import { useGameSession } from '@/hooks/useGameSession';
import { useTimer } from '@/hooks/useTimer';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import { useSettings } from '@/store/settings';
import type { GameConfig } from '@/types';
import { buddyGift } from '@/utils/buddy';
import { countingModel } from '@/utils/countingAid';
import { answerText, speakProblem, stopSpeaking, vibrate } from '@/utils/feedback';
import {
  highScoreKey,
  lastAnswer,
  parseConfig,
} from '@/utils/gameSession';
import { resolveInputStyle } from '@/utils/inputStyle';
import type { RoundOutcome } from '@/utils/progress';
import { coinsForAnswer, SPEEDY_SECONDS, STREAK_MILESTONE } from '@/utils/rewards';
import { randomSeed } from '@/utils/seededRandom';
import { handsOnCard } from '@/utils/skills/handsOn';
import { diagnose, waysFor } from '@/utils/skills/help';
import { freshRound, withPlan } from '@/utils/skills/plan';
import { cardStyleFor, companionFor } from '@/utils/shop';
import { playSound } from '@/utils/soundEffects';

/** How long a right answer stays on screen before the next card. */
const CORRECT_PAUSE_MS = 900;

/** Coins one right answer pays, with the parent's payout setting applied. */
function coinsPerAnswer(record: Parameters<typeof coinsForAnswer>[0]): number {
  return Math.round(coinsForAnswer(record) * useSettings.getState().coinPayout);
}

export function PlayScreen() {
  const params = useLocalSearchParams<{ config?: string }>();
  const [config, setConfig] = useState(() => parseConfig(params.config));

  // A new seed remounts the round from scratch.
  return (
    <Round
      key={config.seed}
      config={config}
      onPlayAgain={() => setConfig(freshRound(config, randomSeed()))}
    />
  );
}

function Round({ config: asked, onPlayAgain }: { config: GameConfig; onPlayAgain: () => void }) {
  const profile = useActiveProfile();
  // Skill rounds pick their skills from the player once, when the round starts.
  const [config] = useState(() => withPlan(asked, profile));
  const recordRound = useProfiles((s) => s.recordRound);
  const noteSkillHelp = useProfiles((s) => s.noteSkillHelp);
  const [state, dispatch] = useGameSession(config);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [counting, setCounting] = useState(false);
  // Help is open: 'ask' while the question is open, 'miss' after a wrong answer.
  const [help, setHelp] = useState<'ask' | 'miss' | null>(null);
  // The question help was opened on before answering (that answer doesn't count toward learning).
  const [helpedAt, setHelpedAt] = useState<number | null>(null);
  const saved = useRef(false);

  const asking = state.phase === 'question';
  const secondsLeft = useTimer(config.timer, asking, state.index, () => dispatch({ type: 'timeout' }));
  const last = lastAnswer(state);
  const inputStyle = state.problem.choiceOnly
    ? 'choices'
    : resolveInputStyle(profile?.inputStyle, state.difficulty, config.grade);
  const companion = companionFor(profile);
  const palette = usePalette();

  // Read each new problem aloud when that setting is on; stop when leaving the round.
  useEffect(() => {
    if (state.phase === 'question') speakProblem(state.problem);
  }, [state.problem, state.phase]);
  useEffect(() => stopSpeaking, []);
  // Each new question starts with the counting picture put away.
  useEffect(() => {
    setCounting(false);
    setHelp(null);
  }, [state.index]);

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
  const roundCoins = state.history.reduce((sum, r) => sum + (r.correct ? coinsPerAnswer(r) : 0), 0);
  const column = useColumnAnswer(state.problem, { allowNegative, teach: !!config.showWork });
  const countModel = useMemo(() => countingModel(state.problem), [state.problem]);
  const canHelp = useMemo(() => waysFor(state.problem, false).length > 0, [state.problem]);
  const slip = useMemo(
    () => (state.phase === 'feedback' && last && !last.correct ? diagnose(last.problem, last.given) : null),
    [state.phase, last],
  );

  if (state.phase === 'finished') {
    return (
      <RoundResults summary={state} outcome={outcome} daily={!!config.dailyDate} onPlayAgain={onPlayAgain} />
    );
  }

  const answer = (given: number) =>
    dispatch({
      type: 'answer',
      given,
      secondsLeft: config.timer === null ? null : secondsLeft,
      helped: helpedAt === state.index,
    });
  const openHelp = (kind: 'ask' | 'miss') => {
    setHelp(kind);
    if (kind === 'ask') setHelpedAt(state.index);
    if (profile && state.problem.skill) noteSkillHelp(profile.id, state.problem.skill);
  };
  const showFeedback = state.phase === 'feedback' && last;
  // Show-my-work needs the boxes, so it types even when the player usually taps choices.
  const typingColumns = isStacked(state.problem) && (inputStyle !== 'choices' || !!config.showWork);
  // Set-the-clock and fill-the-purse questions are answered on the clock or purse itself.
  const handsOn = state.problem.interact;
  const card = handsOnCard(state.problem, !!showFeedback);

  return (
    <Screen compact center>
      <View style={styles.statusRow}>
        <Text style={styles.status}>
          {state.index + 1} / {config.questionCount}
        </Text>
        <Text style={styles.status}>🔥 {state.streak}</Text>
        {/* Coins so far this round; stars are handed out at the end. */}
        <Text style={styles.status} accessibilityLabel={`${roundCoins} coins this round`}>
          🪙 {roundCoins}
        </Text>
        <SpeakButton onPress={() => speakProblem(state.problem, true)} />
      </View>
      {config.adaptive ? (
        <Text style={styles.level}>Level: {difficultyConfigFor(state.difficulty, config.grade).label}</Text>
      ) : null}
      {config.timer !== null && secondsLeft !== null ? (
        <TimerBar total={config.timer} left={secondsLeft} speedy={config.dailyDate ? SPEEDY_SECONDS : undefined} />
      ) : null}

      <FlashCard
        key={`card-${state.index}`}
        problem={card}
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
      />

      {!showFeedback && (countModel || (canHelp && config.timer === null)) ? (
        <View style={styles.aidRow}>
          {countModel ? (
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
          {canHelp && config.timer === null ? (
            <Pressable
              onPress={() => openHelp('ask')}
              accessibilityRole="button"
              accessibilityLabel="Help with this question"
              style={styles.countToggle}
              hitSlop={6}
            >
              <Text style={styles.countToggleText}>💡 Help</Text>
            </Pressable>
          ) : null}
        </View>
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
              ? `✓ Great job! +${coinsPerAnswer(last)} 🪙`
              : last.given === null
                ? "✗ Time's up!"
                : '✗ Not quite. Remember this one!'}
          </Text>
          {slip ? <Text style={styles.slip}>{slip}</Text> : null}
        </PopIn>
      ) : null}

      {handsOn ? (
        showFeedback ? (
          !last.correct && last.given !== null ? (
            <Text style={styles.slip}>
              The right answer is {answerText(state.problem, state.problem.answer)}. You {handsOn.kind === 'setClock' ? 'showed' : 'put in'} {answerText(state.problem, last.given)}.
            </Text>
          ) : null
        ) : handsOn.kind === 'setClock' ? (
          <ClockSetter key={`clock-${state.index}`} step={handsOn.step} from={handsOn.from} onCheck={answer} />
        ) : (
          <CoinPurse key={`purse-${state.index}`} coins={handsOn.coins} from={handsOn.from} onCheck={answer} />
        )
      ) : inputStyle === 'choices' && !typingColumns ? (
        <ChoiceButtons
          choices={state.problem.choices}
          selected={showFeedback ? (last.given ?? Number.NaN) : null}
          answer={state.problem.answer}
          onSelect={answer}
          label={(c) => answerText(state.problem, c)}
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
        <View style={styles.missRow}>
          {canHelp ? (
            <BigButton label="💡 Show me how" outline onPress={() => openHelp('miss')} style={styles.missButton} />
          ) : null}
          <BigButton label="Next" onPress={() => dispatch({ type: 'next' })} style={styles.missButton} />
        </View>
      ) : null}

      {help ? (
        <HelpPanel
          key={`help-${state.index}-${help}`}
          problem={state.problem}
          progress={state.problem.skill ? profile?.skills?.[state.problem.skill] : undefined}
          reveal={help === 'miss'}
          given={help === 'miss' ? last?.given : undefined}
          color={palette.operations[state.problem.operation]}
          onClose={() => setHelp(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  aidRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  slip: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: spacing.xs },
  missRow: { flexDirection: 'row', gap: spacing.sm },
  missButton: { flex: 1 },
  feedback: { fontSize: fontSizes.button, fontWeight: '800', textAlign: 'center' },
});
