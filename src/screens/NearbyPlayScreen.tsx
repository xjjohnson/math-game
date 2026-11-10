import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { LevelPicker } from '@/components/LevelPicker';
import { MatchOptions } from '@/components/MatchOptions';
import { MonsterBar } from '@/components/MonsterBar';
import { OptionGroup } from '@/components/OptionGroup';
import { QuestionPanel } from '@/components/QuestionPanel';
import { Screen } from '@/components/Screen';
import { TimerBar } from '@/components/TimerBar';
import { stickerText } from '@/constants/art';
import { DEFAULT_GRADE, levelShort } from '@/constants/grades';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';
import { useTimer } from '@/hooks/useTimer';
import type { Peer, Transport } from '@/services/multiplayer';
import { createNearbyTransport } from '@/services/nearbyTransport';
import { townSession } from '@/services/townSession';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { AnswerRecord, Level, Operation, Problem } from '@/types';
import { resolveInputStyle } from '@/utils/inputStyle';
import {
  answerMine,
  COOP_WAVES,
  isOver,
  isTeamMode,
  matchProblem,
  setupLevel,
  MONSTER,
  monsterFor,
  mySeat,
  outcomeFor,
  playerLeft,
  RACE_TARGET,
  receive,
  RELAY,
  relayLap,
  runner,
  stageSeconds,
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
  MIN_GAME_VERSION,
  PROTOCOL_VERSION,
  TOWN_MARK,
  type GameMessage,
  type MatchMode,
  type MatchSetup,
  type PlayerInfo,
} from '@/utils/multiplayer/protocol';
import { advertName, GAME_MARK, newToken, shouldYield, shownName, tokenOf } from '@/utils/multiplayer/autoHost';
import { multiplayerRound } from '@/utils/multiplayer/rounds';
import { allGranted, checkPermissions, devicePermissions } from '@/utils/nearbyPermissions';
import { randomSeed } from '@/utils/seededRandom';
import { playSound } from '@/utils/soundEffects';
import { Nearby } from '../../modules/math-nearby';

/** choose (getting ready) → finding → lobby (as guest, or as host when nobody else is); then playing; gone when the game ends early. */
type Phase = 'choose' | 'finding' | 'lobby' | 'playing' | 'gone';

const MODES: { value: MatchMode; label: string }[] = [
  { value: 'race', label: `🏁 Race\nFirst to ${RACE_TARGET} right wins` },
  { value: 'coop', label: `🛡️ Co-op Defense\nBeat ${COOP_WAVES.length} waves together` },
  { value: 'monster', label: `🐉 Monster Battle\nTeam up to beat it in ${MONSTER.seconds / 60} minutes` },
  { value: 'relay', label: `🏃 Relay\nOne at a time, ${RELAY.laps} laps, help each other` },
];

const MEDALS = ['🥇', '🥈', '🥉'];
const VERSION_MISMATCH = 'Some phones have a different version of Math Game. Update them all, then try again.';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
/** A guest that just connected says hello within this long; a host doesn't give way meanwhile. */
const HELLO_MS = 5000;

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

/** Up to 8 phones over Nearby: one hosts, the rest join, then Race or one of the team games. */
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
  const foundRef = useRef<Peer[]>([]);
  foundRef.current = found;
  /** When each game found nearby was first seen, by its id. */
  const seenAt = useRef(new Map<string, number>());
  /** This phone's tag when it hosts, so two hosts can agree which one gives way. */
  const token = useRef(newToken());
  /** Bumped to stop a join-or-host run that is under way. */
  const run = useRef(0);
  /** When a guest last connected, while its hello is on the way. */
  const lastConnect = useRef(0);
  const [needsPermission, setNeedsPermission] = useState(false);
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
    // Only one Nearby link at a time: a community visit ends when a match screen opens.
    townSession().stop();
    const t = createNearbyTransport();
    transport.current = t;
    if (!t) return;

    const updateRoster = (players: PlayerInfo[]) => {
      setRoster(players);
      if (isHostRef.current) t.send({ type: 'lobby', players }).catch(() => undefined);
    };

    const offs = [
      // Community visits advertise too; only games belong in this list.
      t.on('peerFound', (peer) => {
        if (peer.name.startsWith(TOWN_MARK)) return;
        if (!seenAt.current.has(peer.id)) seenAt.current.set(peer.id, Date.now());
        setFound((f) => (foundRef.current = [...f.filter((p) => p.id !== peer.id), peer]));
      }),
      t.on('peerLost', ({ id }) => {
        seenAt.current.delete(id);
        setFound((f) => (foundRef.current = f.filter((p) => p.id !== id)));
      }),
      t.on('connected', ({ id, code: digits }) => {
        if (isHostRef.current) {
          lastConnect.current = Date.now();
          // Late or extra phones are turned away; the rest wait for their hello.
          if (phaseRef.current === 'playing' || rosterRef.current.length >= MAX_PLAYERS) {
            t.send({ type: 'bye' }, id).catch(() => undefined);
          }
          return;
        }
        // Joined: stop searching, which makes the connection slow and flaky.
        t.stopLooking?.();
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
            if (message.version < MIN_GAME_VERSION) {
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
            if (message.version < MIN_GAME_VERSION) setNotice(VERSION_MISMATCH);
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
      run.current++;
      transport.current = null;
      offs.forEach((off) => off());
      t.send({ type: 'bye' }).catch(() => undefined);
      t.disconnect();
    };
    // Set up once for the life of the screen; callbacks read the refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Join or host as soon as the screen opens.
  useEffect(() => {
    if (Nearby) void start();
    // Once, when the screen opens; start() reads the refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from the permission screen: try again.
  useFocusEffect(
    useCallback(() => {
      if (needsPermission) void start();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsPermission]),
  );

  if (!Nearby) {
    return (
      <Screen>
        <Text style={styles.body}>Playing on several phones needs the Math Game app on Android.</Text>
      </Screen>
    );
  }

  const myName = `${stickerText(me.avatar)} ${me.name}`;

  /**
   * Join or host, as soon as the screen opens: look once for a game someone is
   * already hosting and join it; if there is none, host, and stay the host.
   * While nobody has joined, a host gives way to another host it finds, so two
   * phones that started together still end up in one game (see shouldYield).
   */
  const start = async () => {
    const mine = ++run.current;
    const alive = () => run.current === mine && transport.current !== null;
    const list = devicePermissions();
    if (!allGranted(await checkPermissions(list), list)) {
      setNeedsPermission(true);
      setPhase('choose');
      return;
    }
    setNeedsPermission(false);
    setNotice(null);
    let joinName: string | null = null;
    while (alive()) {
      seenAt.current.clear();
      setFound((foundRef.current = []));
      setIsHost(false);
      setMyId(HOST_ID);
      setRoster([]);
      setPhase('finding');
      try {
        await transport.current?.discover();
      } catch (e) {
        setNotice(errorText(e));
        setPhase('choose');
        return;
      }
      // Give hosts a moment to be found; the wait differs per phone so two phones don't decide together.
      await wait(joinName ? 1500 : 3000 + Math.random() * 3000);
      // Stop if the screen closed, or a game was tapped and joined meanwhile.
      if (!alive() || phaseRef.current !== 'finding') return;
      const games = foundRef.current;
      const game = (joinName ? games.find((p) => p.name === joinName) : undefined) ?? games[0];
      if (game) {
        await transport.current?.connect(myName, game.id).catch(() => undefined);
        for (let i = 0; i < 12 && alive() && phaseRef.current === 'finding'; i++) await wait(500);
        if (!alive() || phaseRef.current !== 'finding') return;
      }
      joinName = null;
      try {
        await transport.current?.host(advertName(GAME_MARK, token.current, myName));
      } catch (e) {
        setNotice(errorText(e));
        setPhase('choose');
        return;
      }
      setIsHost(true);
      setMyId(HOST_ID);
      setRoster([me]);
      setPhase('lobby');
      await transport.current?.lookAround?.().catch(() => undefined);
      const other = await watchForHosts(alive);
      if (!other) return;
      joinName = other;
    }
  };

  /** While hosting in the lobby with nobody else yet: the name of another host to give way to, or null. */
  const watchForHosts = async (alive: () => boolean): Promise<string | null> => {
    let looking = true;
    while (alive() && isHostRef.current && phaseRef.current === 'lobby') {
      await wait(1000);
      if (!alive() || !isHostRef.current || phaseRef.current !== 'lobby') break;
      // Friends are here: stop searching, which makes their connections flaky. Start again if they all leave.
      const friends = rosterRef.current.length > 1;
      if (friends && looking) {
        transport.current?.stopLooking?.();
        looking = false;
      } else if (!friends && !looking) {
        await transport.current?.lookAround?.().catch(() => undefined);
        looking = true;
        continue;
      }
      // Friends are here, or one is saying hello: stay the host.
      if (friends || Date.now() - lastConnect.current < HELLO_MS) continue;
      const now = Date.now();
      for (const peer of foundRef.current) {
        if (shouldYield(token.current, tokenOf(peer.name, GAME_MARK), now - (seenAt.current.get(peer.id) ?? now))) return peer.name;
      }
    }
    return null;
  };

  const startGame = () => {
    const setup: MatchSetup = { mode, operation, difficulty: level.difficulty, grade: level.grade, seed: randomSeed() };
    send({ type: 'start', setup, players: roster });
    // No more searching during the game.
    transport.current?.stopLooking?.();
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
    <Screen>
      {notice ? (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      ) : null}

      {phase === 'choose' ? (
        <>
          <Text style={styles.body}>
            {needsPermission
              ? 'Playing on several phones needs permission to find phones nearby.'
              : `Your phone joins a game nearby, or hosts one if there isn't one yet. Up to ${MAX_PLAYERS} phones in all.`}
          </Text>
          {needsPermission ? (
            <BigButton label="Allow nearby play" color={colors.primary} onPress={() => router.push('/permissions')} />
          ) : (
            <BigButton label="🔍 Find a game" color={colors.primary} onPress={() => void start()} />
          )}
        </>
      ) : null}

      {phase === 'finding' ? (
        <View style={styles.section}>
          <Text style={styles.heading}>{found.length ? 'Joining a game…' : 'Looking for a game nearby…'}</Text>
          <Text style={styles.body}>If nobody is hosting one, your phone will host it.</Text>
          {found.map((peer) => (
            <Pressable
              key={peer.id}
              onPress={() =>
                transport.current?.connect(myName, peer.id).catch((e) => setNotice(errorText(e)))
              }
              accessibilityRole="button"
              accessibilityLabel={`Join ${shownName(peer.name, GAME_MARK)}`}
              style={({ pressed }) => [styles.peer, pressed && styles.pressed]}
            >
              <Text style={styles.peerName}>{shownName(peer.name, GAME_MARK)}</Text>
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
                  {stickerText(p.avatar)} {p.name}
                </Text>
                <Text style={styles.playerTag}>{p.id === HOST_ID ? 'host' : p.id === myId ? 'you' : ''}</Text>
              </View>
            ))}
          </View>
          <LevelPicker label="Your grade (everyone picks their own)" level={level} onChange={setLevel} />
          {mode === 'relay' ? (
            <Text style={styles.body}>In a Relay everyone shares one card, so it uses the host's level.</Text>
          ) : null}
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
  /** Relay: the card this phone just answered, kept on screen until its ✓ or ✗ has shown. */
  const [pending, setPending] = useState<number | null>(null);
  const saved = useRef(false);
  const over = isOver(match);
  const host = me === HOST_ID;
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? 'Someone';

  const team = isTeamMode(setup.mode);
  const seconds = stageSeconds(match);
  const secondsLeft = useTimer(team ? seconds : null, !over, match.wave, () => {
    if (host) onTimeUp();
  });

  useEffect(() => {
    if (!over || saved.current || !profile) return;
    saved.current = true;
    playSound(outcomeFor(match) === 'won' ? 'reward' : 'wrong');
    const played = (setup.mode === 'relay' && setupLevel(setup)) || level;
    const key = `${setup.mode}:${setup.operation}:g${played.grade}:${played.difficulty}`;
    recordRound(profile.id, multiplayerRound(key, history, played.difficulty));
  }, [over, match, profile, recordRound, setup, history, level]);

  if (over) {
    const won = outcomeFor(match) === 'won';
    const ranked = standings(match);
    const titles: Record<MatchMode, [won: string, lost: string]> = {
      race: ['🏆 You win!', `${nameOf(match.winner)} wins!`],
      coop: ['🛡️ You beat every wave!', 'The clock won this time'],
      monster: ['🎉 You beat the monster!', `The ${monsterFor(setup.seed)} got away this time`],
      relay: ['🏃 Your team finished the relay!', 'The clock won this time'],
    };
    const title = titles[setup.mode][won ? 0 : 1];
    return (
      <Screen title={title}>
        {team ? (
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
                  {stickerText(p.avatar)} {p.id === me ? 'You' : p.name}
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

  const record = (problem: Problem, given: number, correct: boolean, at: Level | undefined = level) =>
    setHistory((h) => [
      ...h,
      { problem, difficulty: at?.difficulty ?? setup.difficulty, grade: at?.grade, given, correct, points: 0 },
    ]);

  if (setup.mode === 'relay') {
    // Everyone shares the relay's cards, so they're at the host's level.
    const shared = setupLevel(setup);
    const baton = runner(match);
    const myTurn = baton === me;
    // Keep this phone's own card up through its feedback, even once the baton has moved on.
    const card = pending ?? match.cards;
    const problem = matchProblem(setup, 0, card, shared);
    const playing = players.filter((p) => !match.left.includes(p.id));
    const watching = pending === null && !myTurn;
    const last = match.last && match.last.playerId !== me ? match.last : null;
    const turnText = last?.correct
      ? `✅ ${nameOf(last.playerId)} got it! ${nameOf(baton)}'s turn. Help them out!`
      : last?.playerId === baton
        ? `💪 New card for ${nameOf(baton)}. Help them out!`
        : `${nameOf(baton)}'s turn. Help them out!`;
    return (
      <Screen>
        <View style={styles.section}>
          <Text style={styles.heading}>
            Lap {relayLap(match)} of {RELAY.laps} · team of {playing.length}
          </Text>
          <View style={styles.baton} accessibilityLabel={`${myTurn ? 'Your' : `${nameOf(baton)}'s`} turn`}>
            {playing.map((p) => (
              <Text key={p.id} style={[styles.batonPlayer, p.id === baton && styles.batonNow]}>
                {p.avatar}
              </Text>
            ))}
          </View>
          <ProgressBar label="Team" value={match.waveCorrect} total={waveTarget(match)} color={palette.correct} />
          {secondsLeft !== null ? <TimerBar total={seconds} left={secondsLeft} /> : null}
          <Text style={styles.heading} accessibilityLiveRegion="polite">
            {watching ? turnText : '🏃 Your turn!'}
          </Text>
        </View>
        <View style={[styles.section, watching && styles.watching]}>
          <QuestionPanel
            key={card}
            problem={problem}
            difficulty={setup.difficulty}
            grade={setup.grade}
            inputStyle={resolveInputStyle(profile?.inputStyle, setup.difficulty)}
            disabled={watching}
            silent={watching}
            onAnswer={(given, correct) => {
              setPending(card);
              record(problem, given, correct, shared);
              onAnswer(correct);
            }}
            onNext={() => setPending(null)}
          />
        </View>
      </Screen>
    );
  }

  const problem = matchProblem(setup, mySeat(match), shown, level);
  const waitingForCall = setup.mode === 'race' && match.correct[me] >= RACE_TARGET;

  return (
    <Screen center>
      {setup.mode === 'race' ? (
        <View style={styles.bars}>
          {players.map((p) => (
            <ProgressBar
              key={p.id}
              label={p.id === me ? 'You' : `${stickerText(p.avatar)} ${p.name}`}
              value={match.correct[p.id] ?? 0}
              total={RACE_TARGET}
              color={p.id === me ? palette.correct : colors.accentStrong}
              faded={match.left.includes(p.id)}
            />
          ))}
        </View>
      ) : setup.mode === 'monster' ? (
        <View style={styles.section}>
          <Text style={styles.heading}>Team of {players.length - match.left.length} · every right answer is a hit!</Text>
          <MonsterBar monster={monsterFor(setup.seed)} hits={match.waveCorrect} health={waveTarget(match)} compact />
          {secondsLeft !== null ? <TimerBar total={seconds} left={secondsLeft} /> : null}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.heading}>
            Wave {match.wave + 1} of {COOP_WAVES.length} · team of {players.length - match.left.length}
          </Text>
          <ProgressBar label="Team" value={match.waveCorrect} total={waveTarget(match)} color={palette.correct} />
          {secondsLeft !== null ? <TimerBar total={seconds} left={secondsLeft} /> : null}
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
          record(problem, given, correct);
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
  baton: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  batonPlayer: { fontSize: 32, opacity: 0.35 },
  batonNow: { opacity: 1, transform: [{ scale: 1.3 }] },
  watching: { opacity: 0.6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  faded: { opacity: 0.4 },
  barLabel: { width: 110, fontSize: 18, fontWeight: '800', color: colors.text },
  track: { flex: 1, height: 18, borderRadius: radius.md, backgroundColor: colors.disabled, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.md },
  barValue: { width: 52, textAlign: 'right', fontSize: 18, fontWeight: '800', color: colors.text },
});
