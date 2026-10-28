import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { LevelRow } from '@/components/LevelPicker';
import { MatchOptions } from '@/components/MatchOptions';
import { MonsterBar } from '@/components/MonsterBar';
import { QuestionPanel } from '@/components/QuestionPanel';
import { Screen } from '@/components/Screen';
import { Sticker } from '@/components/Sticker';
import { stickerText } from '@/constants/art';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { useProfiles } from '@/store/profiles';
import { DEFAULT_GRADE, levelShort } from '@/constants/grades';
import type { Level, Operation } from '@/types';
import { resolveInputStyle } from '@/utils/inputStyle';
import {
  PASS_QUESTIONS,
  passProblem,
  passReducer,
  MAX_PASS_PLAYERS,
  passScores,
  passWinners,
  startPass,
  teamHits,
  teamTarget,
  teamWon,
  type PassPlayer,
  type PassState,
} from '@/utils/multiplayer/passAndPlay';
import { monsterFor } from '@/utils/multiplayer/match';
import { multiplayerRound } from '@/utils/multiplayer/rounds';
import { randomSeed } from '@/utils/seededRandom';
import { playSound } from '@/utils/soundEffects';

const GUESTS: Record<string, Omit<PassPlayer, 'level'>> = {
  'guest-1': { name: 'Guest 1', avatar: '🙂' },
  'guest-2': { name: 'Guest 2', avatar: '😎' },
  'guest-3': { name: 'Guest 3', avatar: '🤠' },
  'guest-4': { name: 'Guest 4', avatar: '🥳' },
  'guest-5': { name: 'Guest 5', avatar: '🤓' },
  'guest-6': { name: 'Guest 6', avatar: '😺' },
};

const GUEST_LEVEL: Level = { grade: DEFAULT_GRADE, difficulty: 'easy' };

const MEDALS = ['🥇', '🥈', '🥉'];

/** 2 to 6 players on one phone: each answers 10, then hands it on. Team Up has them share one monster. */
export function PassPlayScreen() {
  const team = useLocalSearchParams<{ team?: string }>().team === '1';
  const [game, setGame] = useState<PassState | null>(null);
  if (!game) return <Setup team={team} onStart={setGame} />;
  return <Game key={game.seed} start={game} onAgain={() => setGame(null)} />;
}

function Setup({ team, onStart }: { team: boolean; onStart: (state: PassState) => void }) {
  const { profiles, activeProfileId } = useProfiles();
  const others = profiles.filter((p) => p.id !== activeProfileId);
  // Seats in the order players were picked; that's the order they take turns.
  const [seats, setSeats] = useState<string[]>([activeProfileId ?? 'guest-1', others[0]?.id ?? 'guest-2']);
  const [operation, setOperation] = useState<Operation>('add');
  // Levels changed on this screen, by seat id; the rest come from each profile.
  const [levels, setLevels] = useState<Record<string, Level>>({});

  const options = [
    ...profiles.map((p) => ({ id: p.id, label: `${stickerText(p.avatar)} ${p.name}` })),
    ...Object.entries(GUESTS).map(([id, g]) => ({ id, label: `${g.avatar} ${g.name}` })),
  ];
  const levelOf = (id: string): Level => {
    if (levels[id]) return levels[id];
    const p = profiles.find((x) => x.id === id);
    return p ? { grade: p.grade, difficulty: p.lastDifficulty } : GUEST_LEVEL;
  };
  const player = (id: string): PassPlayer => {
    const p = profiles.find((x) => x.id === id);
    const level = levelOf(id);
    return p ? { name: p.name, avatar: p.avatar, profileId: p.id, level } : { ...GUESTS[id], level };
  };
  const toggle = (id: string) =>
    setSeats((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_PASS_PLAYERS ? [...s, id] : s));

  return (
    <Screen title={team ? 'Team up' : 'Take turns'}>
      {team ? (
        <Text style={styles.note}>
          Take turns answering 10 each. Every right answer hits the monster, so beat it together!
        </Text>
      ) : null}
      <View style={styles.group} accessibilityLabel="Players">
        <Text style={styles.label}>
          Who's playing? Tap to add or remove ({seats.length} of up to {MAX_PASS_PLAYERS})
        </Text>
        <View style={styles.options}>
          {options.map((o) => {
            const seat = seats.indexOf(o.id);
            return (
              <BigButton
                key={o.id}
                label={seat >= 0 ? `${seat + 1}. ${o.label}` : o.label}
                outline={seat < 0}
                selected={seat >= 0}
                disabled={seat < 0 && seats.length >= MAX_PASS_PLAYERS}
                onPress={() => toggle(o.id)}
                style={styles.option}
              />
            );
          })}
        </View>
      </View>
      <MatchOptions operation={operation} onChange={setOperation} />
      {seats.length ? (
        <View style={styles.group}>
          <Text style={styles.label}>Each player's grade and difficulty</Text>
          {seats.map((id) => {
            const p = player(id);
            return (
              <LevelRow
                key={id}
                name={`${stickerText(p.avatar)} ${p.name}`}
                level={p.level}
                onChange={(level) => setLevels((l) => ({ ...l, [id]: level }))}
              />
            );
          })}
        </View>
      ) : null}
      {seats.length < 2 ? <Text style={styles.note}>Pick at least two players.</Text> : null}
      <BigButton
        label="Start"
        color={colors.correct}
        disabled={seats.length < 2}
        onPress={() => onStart(startPass(seats.map(player), operation, randomSeed(), team))}
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
  // Who leads among the players who have finished their turn.
  const done = scores.slice(0, state.turn);
  const leader = done.length ? done.indexOf(Math.max(...done)) : null;

  // Pay each saved profile for their own answers once the game ends.
  useEffect(() => {
    if (state.phase !== 'finished' || saved.current) return;
    saved.current = true;
    playSound('reward');
    state.players.forEach((p, i) => {
      if (!p.profileId) return;
      const key = `${state.team ? 'team' : 'pass'}:${state.operation}:g${p.level.grade}:${p.level.difficulty}`;
      recordRound(p.profileId, multiplayerRound(key, state.histories[i], p.level.difficulty));
    });
  }, [state, recordRound]);

  const monster = monsterFor(state.seed);

  if (state.phase === 'finished' && state.team) {
    const won = teamWon(state);
    return (
      <Screen title={won ? '🎉 You beat the monster!' : `The ${monster} got away this time`}>
        <MonsterBar monster={monster} hits={teamHits(state)} health={teamTarget(state)} />
        <Text style={styles.note}>
          {won ? 'Great teamwork!' : `So close! The team needed ${teamTarget(state)} hits.`}
        </Text>
        <View style={styles.standings}>
          {state.players.map((p, seat) => (
            <View key={seat} style={styles.scoreRow}>
              <Text style={styles.place}>⭐</Text>
              <Text style={styles.scoreName} numberOfLines={1}>
                {p.avatar} {p.name}
              </Text>
              <Text style={styles.scoreValue}>{scores[seat]} hits</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>Players with a profile got coins for their right answers.</Text>
        <BigButton label="Play again" color={colors.correct} onPress={onAgain} />
        <BigButton label="Home" outline onPress={() => router.dismissAll()} />
      </Screen>
    );
  }

  if (state.phase === 'finished') {
    const winners = passWinners(state);
    const top = state.players[winners[0]];
    const ranked = state.players.map((p, seat) => ({ ...p, seat })).sort((a, b) => scores[b.seat] - scores[a.seat]);
    return (
      <Screen title={winners.length > 1 ? "It's a tie!" : `${stickerText(top.avatar)} ${top.name} wins!`}>
        <View style={styles.standings}>
          {ranked.map((p) => {
            const place = scores.filter((x) => x > scores[p.seat]).length;
            return (
              <View key={p.seat} style={[styles.scoreRow, winners.includes(p.seat) && styles.winnerRow]}>
                <Text style={styles.place}>{MEDALS[place] ?? `${place + 1}.`}</Text>
                <Text style={styles.scoreName} numberOfLines={1}>
                  {stickerText(p.avatar)} {p.name}
                </Text>
                <Text style={styles.scoreValue}>
                  {scores[p.seat]} / {PASS_QUESTIONS}
                </Text>
              </View>
            );
          })}
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
        <Sticker value={current.avatar} size={96} style={styles.handoffAvatar} />
        <Text style={styles.handoffName}>{current.name}, it's your turn</Text>
        <Text style={styles.note}>{levelShort(current.level)}</Text>
        {state.team ? (
          <>
            <MonsterBar monster={monster} hits={teamHits(state)} health={teamTarget(state)} compact />
            <Text style={styles.note}>
              {teamWon(state)
                ? 'The monster is beaten! Keep going for more coins.'
                : `The team needs ${teamTarget(state) - teamHits(state)} more hits.`}
            </Text>
          </>
        ) : leader !== null ? (
          <Text style={styles.note}>
            Best so far: {state.players[leader].name} with {scores[leader]}. Can you beat it?
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
          {stickerText(current.avatar)} {current.name}
        </Text>
        <Text style={styles.status}>
          {state.index + 1} / {PASS_QUESTIONS}
        </Text>
        <Text style={styles.status}>✓ {scores[state.turn]}</Text>
      </View>
      {state.team ? <MonsterBar monster={monster} hits={teamHits(state)} health={teamTarget(state)} compact /> : null}
      <QuestionPanel
        key={`${state.turn}-${state.index}`}
        problem={passProblem(state)}
        difficulty={current.level.difficulty}
        grade={current.level.grade}
        inputStyle={resolveInputStyle(owner?.inputStyle, current.level.difficulty)}
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
  handoffAvatar: { alignSelf: 'center' },
  handoffName: { fontSize: fontSizes.title, fontWeight: '900', color: colors.text, textAlign: 'center' },
  group: { gap: spacing.sm },
  label: { fontSize: fontSizes.body, fontWeight: '700', color: colors.textMuted },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { flexGrow: 1, flexBasis: '45%' },
  standings: { gap: spacing.sm },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
  },
  winnerRow: { borderColor: colors.correct, borderWidth: 5 },
  place: { width: 40, fontSize: fontSizes.button, fontWeight: '900', color: colors.text, textAlign: 'center' },
  scoreName: { flex: 1, fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  scoreValue: { fontSize: fontSizes.button, fontWeight: '900', color: colors.text },
});
