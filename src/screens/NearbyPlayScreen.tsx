import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { LevelPicker } from '@/components/LevelPicker';
import { MatchOptions } from '@/components/MatchOptions';
import { OptionGroup } from '@/components/OptionGroup';
import { QuestionPanel } from '@/components/QuestionPanel';
import { Screen } from '@/components/Screen';
import { TimerBar } from '@/components/TimerBar';
import { DEFAULT_GRADE, levelShort } from '@/constants/grades';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useTimer } from '@/hooks/useTimer';
import type { Peer, Transport } from '@/services/multiplayer';
import { createNearbyTransport } from '@/services/nearbyTransport';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { AnswerRecord, Level, Operation } from '@/types';
import { resolveInputStyle } from '@/utils/inputStyle';
import {
  answerMine,
  COOP_WAVES,
  isOver,
  matchProblem,
  mySeat,
  outcomeFor,
  playerLeft,
  RACE_TARGET,
  receive,
  standings,
  startMatch,
  waveTarget,
  waveTimeUp,
  type MatchState,
  type Step,
} from '@/utils/multiplayer/match';
import {
  HOST_ID,
  MAX_PLAYERS,
  PROTOCOL_VERSION,
  type GameMessage,
  type MatchMode,
  type MatchSetup,
  type PlayerInfo,
} from '@/utils/multiplayer/protocol';
import { multiplayerRound } from '@/utils/multiplayer/rounds';
import { allGranted, checkPermissions, devicePermissions } from '@/utils/nearbyPermissions';
import { randomSeed } from '@/utils/seededRandom';
import { playSound } from '@/utils/soundEffects';
import { Nearby } from '../../modules/math-nearby';

/** choose → (host) lobby, or (guest) finding → lobby; then playing; gone when the game ends early. */
type Phase = 'choose' | 'finding' | 'lobby' | 'playing' | 'gone';

const MODES: { value: MatchMode; label: string }[] = [
  { value: 'race', label: `🏁 Race\nFirst to ${RACE_TARGET} right wins` },
  { value: 'coop', label: `🛡️ Co-op Defense\nBeat ${COOP_WAVES.length} waves together` },
];

const MEDALS = ['🥇', '🥈', '🥉'];
const VERSION_MISMATCH = 'Some phones have a different version of Math Game. Update them all, then try again.';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Keeps a value in state for rendering and in a ref for transport callbacks. */
function useStateRef<T>(initial: T) {
  const ref = useRef(initial);
  const [value, setValue] = useState(initial);
  const set = useCallback((next: T) => {
    ref.current = next;
    setValue(next);
  }, []);
  return [value, set, ref] as const;
}

/** Up to 8 phones over Nearby: one hosts, the rest join, then Race or Co-op Defense. */
export function NearbyPlayScreen() {
  const profile = useActiveProfile();
  const me: PlayerInfo = { id: HOST_ID, name: profile?.name ?? 'Player', avatar: profile?.avatar ?? '🙂' };

  const transport = useRef<Transport | null>(null);
  const [phase, setPhase, phaseRef] = useStateRef<Phase>('choose');
  const [isHost, setIsHost, isHostRef] = useStateRef(false);
  /** Everyone in the game, host first. The host keeps it; guests get copies. */
  const [roster, setRoster, rosterRef] = useStateRef<PlayerInfo[]>([]);
  /** This phone's player id; a guest learns it from the host's welcome. */
  const [myId, setMyId, myIdRef] = useStateRef<string>(HOST_ID);
  const [found, setFound] = useState<Peer[]>([]);
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [goneText, setGoneText] = useState('');

  // Host's picks, kept between rematches.
  const [mode, setMode] = useState<MatchMode>('race');
  const [operation, setOperation] = useState<Operation>('add');
  // This phone's own grade and difficulty; every player picks their own.
  const [level, setLevel] = useState<Level>({
    grade: profile?.grade ?? DEFAULT_GRADE,
    difficulty: profile?.lastDifficulty ?? 'easy',
  });

  const [match, setMatch, matchRef] = useStateRef<MatchState | null>(null);

  const send = useCallback((message: GameMessage, to?: string) => {
    transport.current?.send(message, to).catch(() => undefined);
  }, []);

  const apply = useCallback(
    ([state, out]: Step) => {
      setMatch(state);
      out.forEach((m) => send(m));
    },
    [send, setMatch],
  );

  const end = useCallback(
    (text: string) => {
      setGoneText(text);
      setPhase('gone');
      setMatch(null);
    },
    [setMatch, setPhase],
  );

  useEffect(() => {
    const t = createNearbyTransport();
    transport.current = t;
    if (!t) return;

    const updateRoster = (players: PlayerInfo[]) => {
      setRoster(players);
      if (isHostRef.current) t.send({ type: 'lobby', players }).catch(() => undefined);
    };

    const offs = [
      t.on('peerFound', (peer) => setFound((f) => [...f.filter((p) => p.id !== peer.id), peer])),
      t.on('peerLost', ({ id }) => setFound((f) => f.filter((p) => p.id !== id))),
      t.on('connected', ({ id, code: digits }) => {
        if (isHostRef.current) {
          // Late or extra phones are turned away; the rest wait for their hello.
          if (phaseRef.current === 'playing' || rosterRef.current.length >= MAX_PLAYERS) {
            t.send({ type: 'bye' }, id).catch(() => undefined);
          }
          return;
        }
        setCode(digits);
        setPhase('lobby');
        playSound('reward');
        t.send({ type: 'hello', version: PROTOCOL_VERSION, name: me.name, avatar: me.avatar }).catch(() => undefined);
      }),
      t.on('disconnected', ({ id }) => {
        if (!isHostRef.current) {
          end('The host phone left the game.');
          return;
        }
        if (!rosterRef.current.some((p) => p.id === id)) return;
        updateRoster(rosterRef.current.filter((p) => p.id !== id));
        if (matchRef.current) {
          apply(playerLeft(matchRef.current, id));
          if (rosterRef.current.length < 2) end('Everyone else left the game.');
        }
      }),
      t.on('error', (text) => setNotice(text)),
      t.on('message', ({ id, message }) => {
        switch (message.type) {
          case 'hello':
            if (!isHostRef.current || phaseRef.current !== 'lobby') return;
            t.send({ type: 'welcome', version: PROTOCOL_VERSION, you: id }, id).catch(() => undefined);
            if (message.version !== PROTOCOL_VERSION) {
              setNotice(VERSION_MISMATCH);
              return;
            }
            playSound('reward');
            updateRoster([
              ...rosterRef.current.filter((p) => p.id !== id),
              { id, name: message.name, avatar: message.avatar },
            ]);
            break;
          case 'welcome':
            if (message.version !== PROTOCOL_VERSION) setNotice(VERSION_MISMATCH);
            setMyId(message.you);
            break;
          case 'lobby':
            if (!isHostRef.current) setRoster(message.players);
            break;
          case 'start':
            if (isHostRef.current) return;
            setRoster(message.players);
            setMatch(startMatch(message.setup, message.players, myIdRef.current));
            setPhase('playing');
            break;
          case 'bye':
            if (!isHostRef.current) end('The host ended the game, or it was already full.');
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
    // Set up once for the life of the screen; callbacks read the refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!Nearby) {
    return (
      <Screen title="Several phones">
        <Text style={styles.body}>Playing on several phones needs the Math Game app on Android.</Text>
      </Screen>
    );
  }

  const go = async (asHost: boolean) => {
    const list = devicePermissions();
    if (!allGranted(await checkPermissions(list), list)) {
      router.push('/permissions');
      return;
    }
    setNotice(null);
    setFound([]);
    try {
      if (asHost) await transport.current?.host(`${me.avatar} ${me.name}`);
      else await transport.current?.discover();
      setIsHost(asHost);
      setMyId(HOST_ID);
      setRoster(asHost ? [me] : []);
      setPhase(asHost ? 'lobby' : 'finding');
    } catch (e) {
      setNotice(errorText(e));
    }
  };

  const startGame = () => {
    const setup: MatchSetup = { mode, operation, difficulty: level.difficulty, seed: randomSeed() };
    send({ type: 'start', setup, players: roster });
    setMatch(startMatch(setup, roster, HOST_ID));
    setPhase('playing');
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
        level={level}
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

  const friends = roster.length - 1;

  return (
    <Screen title="Several phones">
      {notice ? (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      ) : null}

      {phase === 'choose' ? (
        <>
          <Text style={styles.body}>
            One phone hosts the game. Everyone else joins it, up to {MAX_PLAYERS} phones in all.
          </Text>
          <BigButton label="📣 Host a game" color={colors.primary} onPress={() => go(true)} />
          <BigButton label="🔍 Join a game" color={colors.accent} onPress={() => go(false)} />
        </>
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

      {phase === 'lobby' ? (
        <>
          <View style={styles.section} accessibilityLiveRegion="polite">
            <Text style={styles.heading}>
              {isHost
                ? friends
                  ? `${roster.length} players ready`
                  : 'Waiting for friends… On their phones, tap Join a game.'
                : `Joined${code ? ` · code ${code}` : ''}. Waiting for the host to start.`}
            </Text>
            {roster.map((p) => (
              <View key={p.id} style={styles.playerRow}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {p.avatar} {p.name}
                </Text>
                <Text style={styles.playerTag}>{p.id === HOST_ID ? 'host' : p.id === myId ? 'you' : ''}</Text>
              </View>
            ))}
          </View>
          <LevelPicker label="Your grade (everyone picks their own)" level={level} onChange={setLevel} />
          {isHost ? (
            <>
              <OptionGroup label="Game" value={mode} onChange={setMode} options={MODES} />
              <MatchOptions operation={operation} onChange={setOperation} />
              <BigButton
                label={friends ? `Start with ${roster.length} players` : 'Start'}
                color={colors.correct}
                disabled={!friends}
                onPress={startGame}
              />
            </>
          ) : null}
        </>
      ) : null}

      {phase === 'gone' ? <Text style={styles.body}>{goneText} Go back to start a new one.</Text> : null}

      {phase !== 'choose' ? <BigButton label="Leave" outline color={colors.wrong} onPress={leave} /> : null}
    </Screen>
  );
}

function Match({
  match,
  level,
  onAnswer,
  onTimeUp,
  onRematch,
  onLeave,
}: {
  match: MatchState;
  level: Level;
  onAnswer: (correct: boolean) => void;
  onTimeUp: () => void;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const profile = useActiveProfile();
  const recordRound = useProfiles((s) => s.recordRound);
  const palette = usePalette();
  const { setup, me, players } = match;
  const [shown, setShown] = useState(0);
  const [history, setHistory] = useState<AnswerRecord[]>([]);
  const saved = useRef(false);
  const over = isOver(match);
  const host = me === HOST_ID;
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Someone';

  const wave = COOP_WAVES[match.wave];
  const secondsLeft = useTimer(setup.mode === 'coop' ? wave.seconds : null, !over, match.wave, () => {
    if (host) onTimeUp();
  });

  useEffect(() => {
    if (!over || saved.current || !profile) return;
    saved.current = true;
    playSound(outcomeFor(match) === 'won' ? 'reward' : 'wrong');
    const key = `${setup.mode}:${setup.operation}:g${level.grade}:${level.difficulty}`;
    recordRound(profile.id, multiplayerRound(key, history, level.difficulty));
  }, [over, match, profile, recordRound, setup, history, level]);

  if (over) {
    const won = outcomeFor(match) === 'won';
    const ranked = standings(match);
    const title =
      setup.mode === 'race'
        ? won
          ? '🏆 You win!'
          : `${nameOf(match.winner)} wins!`
        : won
          ? '🛡️ You beat every wave!'
          : 'The clock won this time';
    return (
      <Screen title={title}>
        {setup.mode === 'coop' ? (
          <Text style={styles.body}>
            Team total: {ranked.reduce((sum, p) => sum + p.correct, 0)} right.
          </Text>
        ) : null}
        <View style={styles.section}>
          {ranked.map((p) => {
            const place = ranked.filter((x) => x.correct > p.correct).length;
            const left = match.left.includes(p.id);
            return (
              <View key={p.id} style={[styles.playerRow, p.id === match.winner && styles.winnerRow]}>
                <Text style={styles.place}>
                  {setup.mode === 'race' ? (MEDALS[place] ?? `${place + 1}.`) : '⭐'}
                </Text>
                <Text style={styles.playerName} numberOfLines={1}>
                  {p.avatar} {p.id === me ? 'You' : p.name}
                  {left ? ' (left)' : ''}
                </Text>
                <Text style={styles.playerScore}>{p.correct}</Text>
              </View>
            );
          })}
        </View>
        {host ? (
          <BigButton label="Play again" color={colors.correct} onPress={onRematch} />
        ) : (
          <Text style={styles.body}>Waiting for {nameOf(HOST_ID)} to start another game…</Text>
        )}
        <BigButton label="Leave" outline color={colors.wrong} onPress={onLeave} />
      </Screen>
    );
  }

  const problem = matchProblem(setup, mySeat(match), shown, level);
  const waitingForCall = setup.mode === 'race' && match.correct[me] >= RACE_TARGET;

  return (
    <Screen>
      {setup.mode === 'race' ? (
        <View style={styles.bars}>
          {players.map((p) => (
            <ProgressBar
              key={p.id}
              label={p.id === me ? 'You' : `${p.avatar} ${p.name}`}
              value={match.correct[p.id] ?? 0}
              total={RACE_TARGET}
              color={p.id === me ? palette.correct : colors.accent}
              faded={match.left.includes(p.id)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.heading}>
            Wave {match.wave + 1} of {COOP_WAVES.length} · team of {players.length - match.left.length}
          </Text>
          <ProgressBar label="Team" value={match.waveCorrect} total={waveTarget(match)} color={palette.correct} />
          {secondsLeft !== null ? <TimerBar total={wave.seconds} left={secondsLeft} /> : null}
        </View>
      )}
      <Text style={styles.body}>Your level: {levelShort(level)}</Text>
      <QuestionPanel
        key={shown}
        problem={problem}
        difficulty={level.difficulty}
        grade={level.grade}
        inputStyle={resolveInputStyle(profile?.inputStyle, level.difficulty)}
        disabled={waitingForCall}
        onAnswer={(given, correct) => {
          setHistory((h) => [
            ...h,
            { problem, difficulty: level.difficulty, grade: level.grade, given, correct, points: 0 },
          ]);
          onAnswer(correct);
        }}
        onNext={() => setShown((i) => i + 1)}
      />
    </Screen>
  );
}

function ProgressBar({
  label,
  value,
  total,
  color,
  faded,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  faded?: boolean;
}) {
  const pct = Math.min(1, value / total);
  return (
    <View
      style={[styles.barRow, faded && styles.faded]}
      accessible
      accessibilityLabel={`${label}: ${value} of ${total}${faded ? ', left the game' : ''}`}
    >
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
  section: { gap: spacing.sm },
  bars: { gap: spacing.xs },
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
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
  },
  winnerRow: { borderColor: colors.correct, borderWidth: 5 },
  place: { width: 40, fontSize: fontSizes.button, fontWeight: '900', textAlign: 'center', color: colors.text },
  playerName: { flex: 1, fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  playerTag: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  playerScore: { fontSize: fontSizes.button, fontWeight: '900', color: colors.text },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  faded: { opacity: 0.4 },
  barLabel: { width: 110, fontSize: 18, fontWeight: '800', color: colors.text },
  track: { flex: 1, height: 18, borderRadius: radius.md, backgroundColor: colors.disabled, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.md },
  barValue: { width: 52, textAlign: 'right', fontSize: 18, fontWeight: '800', color: colors.text },
});
