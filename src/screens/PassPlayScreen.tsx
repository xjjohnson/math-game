import { router } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { MatchOptions } from '@/components/MatchOptions';
import { OptionGroup } from '@/components/OptionGroup';
import { QuestionPanel } from '@/components/QuestionPanel';
import { Screen } from '@/components/Screen';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { useProfiles } from '@/store/profiles';
import type { Difficulty, Operation } from '@/types';
import { resolveInputStyle } from '@/utils/inputStyle';
import {
  PASS_QUESTIONS,
  passProblem,
  passReducer,
  passScores,
  passWinner,
  startPass,
  type PassPlayer,
  type PassState,
} from '@/utils/multiplayer/passAndPlay';
import { multiplayerRound } from '@/utils/multiplayer/rounds';
import { randomSeed } from '@/utils/seededRandom';
import { playSound } from '@/utils/soundEffects';

const GUESTS: Record<string, PassPlayer> = {
  'guest-1': { name: 'Guest 1', avatar: '🙂' },
  'guest-2': { name: 'Guest 2', avatar: '😎' },
};

/** Two players on one phone: each answers 10, then hands it over. */
export function PassPlayScreen() {
  const [game, setGame] = useState<PassState | null>(null);
  if (!game) return <Setup onStart={setGame} />;
  return <Game key={game.seed} start={game} onAgain={() => setGame(null)} />;
}

function Setup({ onStart }: { onStart: (state: PassState) => void }) {
  const { profiles, activeProfileId } = useProfiles();
  const others = profiles.filter((p) => p.id !== activeProfileId);
  const [first, setFirst] = useState(activeProfileId ?? 'guest-1');
  const [second, setSecond] = useState(others[0]?.id ?? 'guest-2');
  const [operation, setOperation] = useState<Operation>('add');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const options = [
    ...profiles.map((p) => ({ value: p.id, label: `${p.avatar} ${p.name}` })),
    ...Object.entries(GUESTS).map(([value, g]) => ({ value, label: `${g.avatar} ${g.name}` })),
  ];
  const player = (id: string): PassPlayer => {
    const p = profiles.find((x) => x.id === id);
    return p ? { name: p.name, avatar: p.avatar, profileId: p.id } : GUESTS[id];
  };

  return (
    <Screen title="Take turns">
      <OptionGroup label="Player 1" value={first} onChange={setFirst} options={options} />
      <OptionGroup label="Player 2" value={second} onChange={setSecond} options={options} />
      <MatchOptions
        operation={operation}
        difficulty={difficulty}
        onChange={(c) => {
          if (c.operation) setOperation(c.operation);
          if (c.difficulty) setDifficulty(c.difficulty);
        }}
      />
      {first === second ? <Text style={styles.note}>Pick two different players.</Text> : null}
      <BigButton
        label="Start"
        color={colors.correct}
        disabled={first === second}
        onPress={() => onStart(startPass([player(first), player(second)], operation, difficulty, randomSeed()))}
      />
    </Screen>
  );
}

function Game({ start, onAgain }: { start: PassState; onAgain: () => void }) {
  const [state, dispatch] = useReducer(passReducer, start);
  const profiles = useProfiles((s) => s.profiles);
  const recordRound = useProfiles((s) => s.recordRound);
  const saved = useRef(false);
  const current = state.players[state.turn];
  const scores = passScores(state);

  // Pay each saved profile for their own answers once the game ends.
  useEffect(() => {
    if (state.phase !== 'finished' || saved.current) return;
    saved.current = true;
    playSound('reward');
    state.players.forEach((p, i) => {
      if (!p.profileId) return;
      const key = `pass:${state.operation}:${state.difficulty}`;
      recordRound(p.profileId, multiplayerRound(key, state.histories[i], state.difficulty));
    });
  }, [state, recordRound]);

  if (state.phase === 'finished') {
    const winner = passWinner(state);
    return (
      <Screen title={winner === null ? "It's a tie!" : `${state.players[winner].avatar} ${state.players[winner].name} wins!`}>
        <View style={styles.scoreRow}>
          {state.players.map((p, i) => (
            <View key={i} style={[styles.scoreCard, winner === i && styles.winnerCard]}>
              <Text style={styles.scoreAvatar}>{p.avatar}</Text>
              <Text style={styles.scoreName}>{p.name}</Text>
              <Text style={styles.scoreValue}>
                {scores[i]} / {PASS_QUESTIONS}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>Players with a profile got coins for their right answers.</Text>
        <BigButton label="Play again" color={colors.correct} onPress={onAgain} />
        <BigButton label="Home" outline onPress={() => router.dismissAll()} />
      </Screen>
    );
  }

  if (state.phase === 'handoff') {
    return (
      <Screen title={state.turn === 0 ? 'First up' : 'Pass the phone!'}>
        <Text style={styles.handoffAvatar}>{current.avatar}</Text>
        <Text style={styles.handoffName}>{current.name}, it's your turn</Text>
        {state.turn === 1 ? (
          <Text style={styles.note}>
            {state.players[0].name} got {scores[0]}. Can you beat it?
          </Text>
        ) : null}
        <BigButton label="I'm ready" color={colors.correct} onPress={() => dispatch({ type: 'begin' })} />
      </Screen>
    );
  }

  const owner = profiles.find((p) => p.id === current.profileId);
  return (
    <Screen>
      <View style={styles.statusRow}>
        <Text style={styles.status}>
          {current.avatar} {current.name}
        </Text>
        <Text style={styles.status}>
          {state.index + 1} / {PASS_QUESTIONS}
        </Text>
        <Text style={styles.status}>✓ {scores[state.turn]}</Text>
      </View>
      <QuestionPanel
        key={`${state.turn}-${state.index}`}
        problem={passProblem(state)}
        difficulty={state.difficulty}
        inputStyle={resolveInputStyle(owner?.inputStyle, state.difficulty)}
        onAnswer={(given) => dispatch({ type: 'answer', given })}
        onNext={() => dispatch({ type: 'next' })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: fontSizes.body, color: colors.textMuted, textAlign: 'center' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  handoffAvatar: { fontSize: 96, textAlign: 'center' },
  handoffName: { fontSize: fontSizes.title, fontWeight: '900', color: colors.text, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', gap: spacing.md },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
  },
  winnerCard: { borderColor: colors.correct, borderWidth: 5 },
  scoreAvatar: { fontSize: 56 },
  scoreName: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  scoreValue: { fontSize: fontSizes.button, fontWeight: '900', color: colors.text },
});
