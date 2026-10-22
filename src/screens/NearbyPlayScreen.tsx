import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { MatchOptions } from '@/components/MatchOptions';
import { OptionGroup } from '@/components/OptionGroup';
import { QuestionPanel } from '@/components/QuestionPanel';
import { Screen } from '@/components/Screen';
import { TimerBar } from '@/components/TimerBar';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useTimer } from '@/hooks/useTimer';
import type { Peer, Transport } from '@/services/multiplayer';
import { createNearbyTransport } from '@/services/nearbyTransport';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { AnswerRecord, Difficulty, Operation } from '@/types';
import { resolveInputStyle } from '@/utils/inputStyle';
import {
  answerMine,
  COOP_WAVES,
  isOver,
  matchProblem,
  other,
  outcomeFor,
  RACE_TARGET,
  receive,
  startMatch,
  waveTimeUp,
  type MatchState,
  type Step,
} from '@/utils/multiplayer/match';
import {
  PROTOCOL_VERSION,
  type GameMessage,
  type MatchMode,
  type MatchSetup,
  type Role,
} from '@/utils/multiplayer/protocol';
import { multiplayerRound } from '@/utils/multiplayer/rounds';
import { allGranted, checkPermissions, devicePermissions } from '@/utils/nearbyPermissions';
import { randomSeed } from '@/utils/seededRandom';
import { playSound } from '@/utils/soundEffects';
import { Nearby } from '../../modules/math-nearby';

type Phase = 'choose' | 'hosting' | 'finding' | 'lobby' | 'playing' | 'gone';

interface Friend extends Peer {
  avatar: string;
  code: string;
}

const MODES: { value: MatchMode; label: string }[] = [
  { value: 'race', label: `🏁 Race\nFirst to ${RACE_TARGET} right wins` },
  { value: 'coop', label: `🛡️ Co-op Defense\nBeat ${COOP_WAVES.length} waves together` },
];

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Two phones over Nearby: find each other, then Race or Co-op Defense. */
export function NearbyPlayScreen() {
  const profile = useActiveProfile();
  const me = { name: profile?.name ?? 'Player', avatar: profile?.avatar ?? '🙂' };

  const transport = useRef<Transport | null>(null);
  const [phase, setPhase] = useState<Phase>('choose');
  const [role, setRole] = useState<Role>('host');
  const [found, setFound] = useState<Peer[]>([]);
  const [friend, setFriend] = useState<Friend | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Host's picks, kept between rematches.
  const [mode, setMode] = useState<MatchMode>('race');
  const [operation, setOperation] = useState<Operation>('add');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  // The match lives in a ref too, so transport callbacks always see the latest state.
  const matchRef = useRef<MatchState | null>(null);
  const [match, setMatchState] = useState<MatchState | null>(null);
  const setMatch = (state: MatchState | null) => {
    matchRef.current = state;
    setMatchState(state);
  };

  const send = useCallback((message: GameMessage) => {
    transport.current?.send(message).catch(() => undefined);
  }, []);

  const apply = useCallback(
    ([state, out]: Step) => {
      matchRef.current = state;
      setMatchState(state);
      out.forEach(send);
    },
    [send],
  );

  const begin = useCallback((setup: MatchSetup, as: Role) => {
    setMatch(startMatch(setup, as));
    setPhase('playing');
  }, []);

  useEffect(() => {
    const t = createNearbyTransport();
    transport.current = t;
    if (!t) return;
    const offs = [
      t.on('peerFound', (peer) => setFound((f) => [...f.filter((p) => p.id !== peer.id), peer])),
      t.on('peerLost', ({ id }) => setFound((f) => f.filter((p) => p.id !== id))),
      t.on('connected', ({ id, name, code }) => {
        setFriend({ id, name, code, avatar: '🙂' });
        setPhase('lobby');
        playSound('reward');
        t.send({ type: 'hello', version: PROTOCOL_VERSION, name: me.name, avatar: me.avatar }).catch(() => undefined);
      }),
      t.on('disconnected', () => {
        setPhase('gone');
        setMatch(null);
      }),
      t.on('error', (text) => setNotice(text)),
      t.on('message', ({ message }) => {
        switch (message.type) {
          case 'hello':
            if (message.version !== PROTOCOL_VERSION) {
              setNotice('The two phones have different versions of Math Game. Update both, then try again.');
            }
            setFriend((f) => (f ? { ...f, name: message.name, avatar: message.avatar } : f));
            break;
          case 'start':
            begin(message.setup, 'guest');
            break;
          case 'bye':
            setPhase('gone');
            setMatch(null);
            break;
          default:
            if (matchRef.current) apply(receive(matchRef.current, message));
        }
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      t.send({ type: 'bye' }).catch(() => undefined);
      t.disconnect();
    };
    // Set up once for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!Nearby) {
    return (
      <Screen title="Two phones">
        <Text style={styles.body}>Playing on two phones needs the Math Game app on Android.</Text>
      </Screen>
    );
  }

  const go = async (next: 'hosting' | 'finding') => {
    const list = devicePermissions();
    if (!allGranted(await checkPermissions(list), list)) {
      router.push('/permissions');
      return;
    }
    setNotice(null);
    setFound([]);
    try {
      if (next === 'hosting') await transport.current?.host(`${me.avatar} ${me.name}`);
      else await transport.current?.discover();
      setRole(next === 'hosting' ? 'host' : 'guest');
      setPhase(next);
    } catch (e) {
      setNotice(errorText(e));
    }
  };

  const startGame = () => {
    const setup: MatchSetup = { mode, operation, difficulty, seed: randomSeed() };
    send({ type: 'start', setup });
    begin(setup, 'host');
  };

  const leave = () => {
    send({ type: 'bye' });
    router.back();
  };

  if (phase === 'playing' && match) {
    return (
      <Match
        key={match.setup.seed}
        match={match}
        friend={friend}
        onAnswer={(correct) => matchRef.current && apply(answerMine(matchRef.current, correct))}
        onTimeUp={() => matchRef.current && apply(waveTimeUp(matchRef.current))}
        onRematch={() => {
          setMatch(null);
          setPhase('lobby');
        }}
        onLeave={leave}
      />
    );
  }

  return (
    <Screen title="Two phones">
      {notice ? (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      ) : null}

      {phase === 'choose' ? (
        <>
          <Text style={styles.body}>One phone hosts the game. The other one joins it.</Text>
          <BigButton label="📣 Host a game" color={colors.primary} onPress={() => go('hosting')} />
          <BigButton label="🔍 Join a game" color={colors.accent} onPress={() => go('finding')} />
        </>
      ) : null}

      {phase === 'hosting' ? (
        <View style={styles.center}>
          <Text style={styles.big}>📣</Text>
          <Text style={styles.body}>Waiting for a friend to join… On their phone, tap Join a game.</Text>
        </View>
      ) : null}

      {phase === 'finding' ? (
        <View style={styles.section}>
          <Text style={styles.heading}>{found.length ? 'Tap a game to join' : 'Looking for games nearby…'}</Text>
          {found.map((peer) => (
            <Pressable
              key={peer.id}
              onPress={() =>
                transport.current?.connect(`${me.avatar} ${me.name}`, peer.id).catch((e) => setNotice(errorText(e)))
              }
              accessibilityRole="button"
              accessibilityLabel={`Join ${peer.name}`}
              style={({ pressed }) => [styles.peer, pressed && styles.pressed]}
            >
              <Text style={styles.peerName}>{peer.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {phase === 'lobby' && friend ? (
        <>
          <Text style={styles.heading}>
            Playing with {friend.avatar} {friend.name}
            {friend.code ? ` · code ${friend.code}` : ''}
          </Text>
          {role === 'host' ? (
            <>
              <OptionGroup label="Game" value={mode} onChange={setMode} options={MODES} />
              <MatchOptions
                operation={operation}
                difficulty={difficulty}
                onChange={(c) => {
                  if (c.operation) setOperation(c.operation);
                  if (c.difficulty) setDifficulty(c.difficulty);
                }}
              />
              <BigButton label="Start" color={colors.correct} onPress={startGame} />
            </>
          ) : (
            <Text style={styles.body}>
              {friend.name} is picking the game. It starts on both phones at once.
            </Text>
          )}
        </>
      ) : null}

      {phase === 'gone' ? (
        <Text style={styles.body}>
          {friend ? `${friend.name} left the game.` : 'The other phone disconnected.'} Go back to start a new
          one.
        </Text>
      ) : null}

      {phase !== 'choose' ? <BigButton label="Leave" outline color={colors.wrong} onPress={leave} /> : null}
    </Screen>
  );
}

function Match({
  match,
  friend,
  onAnswer,
  onTimeUp,
  onRematch,
  onLeave,
}: {
  match: MatchState;
  friend: Friend | null;
  onAnswer: (correct: boolean) => void;
  onTimeUp: () => void;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const profile = useActiveProfile();
  const recordRound = useProfiles((s) => s.recordRound);
  const palette = usePalette();
  const { setup, me } = match;
  const [shown, setShown] = useState(0);
  const [history, setHistory] = useState<AnswerRecord[]>([]);
  const saved = useRef(false);
  const over = isOver(match);
  const them = other(me);
  const friendName = friend?.name ?? 'Friend';

  const wave = COOP_WAVES[match.wave];
  const secondsLeft = useTimer(setup.mode === 'coop' ? wave.seconds : null, !over, match.wave, () => {
    if (me === 'host') onTimeUp();
  });

  useEffect(() => {
    if (!over || saved.current || !profile) return;
    saved.current = true;
    playSound(outcomeFor(match) === 'won' ? 'reward' : 'wrong');
    recordRound(profile.id, multiplayerRound(`${setup.mode}:${setup.operation}:${setup.difficulty}`, history, setup.difficulty));
  }, [over, match, profile, recordRound, setup, history]);

  if (over) {
    const won = outcomeFor(match) === 'won';
    const title =
      setup.mode === 'race'
        ? won
          ? '🏆 You win!'
          : `${friendName} wins!`
        : won
          ? '🛡️ You beat every wave!'
          : 'The clock won this time';
    return (
      <Screen title={title}>
        {setup.mode === 'race' ? (
          <Text style={styles.body}>
            You got {match.correct[me]} right. {friendName} got {match.correct[them]}.
          </Text>
        ) : (
          <Text style={styles.body}>
            Team total: {match.correct.host + match.correct.guest} right. You got {match.correct[me]}, {friendName}{' '}
            got {match.correct[them]}.
          </Text>
        )}
        {me === 'host' ? (
          <BigButton label="Play again" color={colors.correct} onPress={onRematch} />
        ) : (
          <Text style={styles.body}>Waiting for {friendName} to start another game…</Text>
        )}
        <BigButton label="Leave" outline color={colors.wrong} onPress={onLeave} />
      </Screen>
    );
  }

  const problem = matchProblem(setup, me, shown);
  const waitingForCall = setup.mode === 'race' && match.correct[me] >= RACE_TARGET;

  return (
    <Screen>
      {setup.mode === 'race' ? (
        <View style={styles.section}>
          <ProgressBar label="You" value={match.correct[me]} total={RACE_TARGET} color={palette.correct} />
          <ProgressBar label={friendName} value={match.correct[them]} total={RACE_TARGET} color={colors.accent} />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.heading}>
            Wave {match.wave + 1} of {COOP_WAVES.length}
          </Text>
          <ProgressBar label="Team" value={match.waveCorrect} total={wave.target} color={palette.correct} />
          {secondsLeft !== null ? <TimerBar total={wave.seconds} left={secondsLeft} /> : null}
        </View>
      )}
      <QuestionPanel
        key={shown}
        problem={problem}
        difficulty={setup.difficulty}
        inputStyle={resolveInputStyle(profile?.inputStyle, setup.difficulty)}
        disabled={waitingForCall}
        onAnswer={(given, correct) => {
          setHistory((h) => [...h, { problem, difficulty: setup.difficulty, given, correct, points: 0 }]);
          onAnswer(correct);
        }}
        onNext={() => setShown((i) => i + 1)}
      />
    </Screen>
  );
}

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = Math.min(1, value / total);
  return (
    <View style={styles.barRow} accessible accessibilityLabel={`${label}: ${value} of ${total}`}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>
        {value}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: fontSizes.body, color: colors.text, textAlign: 'center' },
  notice: { fontSize: fontSizes.body, fontWeight: '700', color: colors.wrong, textAlign: 'center' },
  center: { alignItems: 'center', gap: spacing.md },
  big: { fontSize: 72 },
  section: { gap: spacing.sm },
  heading: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text, textAlign: 'center' },
  peer: {
    minHeight: TAP_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  peerName: { fontSize: fontSizes.button, fontWeight: '800', color: colors.text },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 90, fontSize: 18, fontWeight: '800', color: colors.text },
  track: { flex: 1, height: 20, borderRadius: radius.md, backgroundColor: colors.disabled, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.md },
  barValue: { width: 52, textAlign: 'right', fontSize: 18, fontWeight: '800', color: colors.text },
});
