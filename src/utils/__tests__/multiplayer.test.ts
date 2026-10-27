import { createMockNetwork } from '@/services/mockTransport';
import type { Transport } from '@/services/multiplayer';
import {
  answerMine,
  COOP_WAVES,
  isOver,
  matchProblem,
  MONSTER,
  monsterFor,
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
  PASS_QUESTIONS,
  passProblem,
  passReducer,
  passScores,
  passWinners,
  startPass,
  TEAM_UP_PER_PLAYER,
  teamHits,
  teamTarget,
  teamWon,
  type PassPlayer,
  type PassState,
} from '@/utils/multiplayer/passAndPlay';
import {
  encodeMessage,
  HOST_ID,
  parseMessage,
  type MatchSetup,
  type PlayerInfo,
} from '@/utils/multiplayer/protocol';

const race: MatchSetup = { mode: 'race', operation: 'add', difficulty: 'easy', seed: 42 };
const coop: MatchSetup = { ...race, mode: 'coop' };
const monster: MatchSetup = { ...race, mode: 'monster' };

/**
 * A host and `count - 1` guests over the mock network, each phone keeping its
 * own match state. Player ids are the host's and the guests' transport ids, the
 * way the host's phone names them.
 */
async function phones(setup: MatchSetup, count: number) {
  const net = createMockNetwork(count);
  const ids = net.map((t, i) => (i === 0 ? HOST_ID : (t as Transport & { id: string }).id));
  const players: PlayerInfo[] = ids.map((id, i) => ({ id, name: `P${i}`, avatar: '🙂' }));
  const state: MatchState[] = ids.map((id) => startMatch(setup, players, id));
  const apply = (i: number, [next, out]: Step) => {
    state[i] = next;
    out.forEach((m) => net[i].send(m));
  };
  net.forEach((t, i) => t.on('message', ({ message }) => apply(i, receive(state[i], message))));
  await net[0].host('Host');
  for (const guest of net.slice(1)) await guest.connect('Guest', 'phone-0');
  return {
    ids,
    answer: (i: number, correct: boolean) => apply(i, answerMine(state[i], correct)),
    timeUp: () => apply(0, waveTimeUp(state[0])),
    leave: (i: number) => {
      net[i].disconnect();
      apply(0, playerLeft(state[0], ids[i]));
    },
    state: (i: number) => state[i],
  };
}

describe('protocol', () => {
  it('round-trips every message', () => {
    const players = [{ id: 'host', name: 'Ava', avatar: '🐼' }, { id: 'x1', name: 'Leo', avatar: '🦊' }];
    const messages = [
      { type: 'hello', version: 2, name: 'Ava', avatar: '🐼' },
      { type: 'welcome', version: 2, you: 'x1' },
      { type: 'lobby', players },
      { type: 'start', setup: race, players },
      { type: 'start', setup: monster, players },
      { type: 'answer', correct: true, playerId: 'x1' },
      { type: 'wave', wave: 1 },
      { type: 'left', playerId: 'x1' },
      { type: 'end', winner: 'host' },
      { type: 'end', result: 'lost' },
      { type: 'bye' },
    ] as const;
    for (const m of messages) expect(parseMessage(encodeMessage(m))).toEqual(m);
  });

  it('ignores anything it does not understand', () => {
    expect(parseMessage('not json')).toBeNull();
    expect(parseMessage('{"type":"answer","correct":"yes","playerId":"x1"}')).toBeNull();
    expect(
      parseMessage('{"type":"start","setup":{"mode":"race","operation":"pow","difficulty":"easy","seed":1},"players":[]}'),
    ).toBeNull();
    expect(parseMessage('{"type":"lobby","players":[{"id":"","name":"A","avatar":"x"}]}')).toBeNull();
    expect(parseMessage('{"type":"explode"}')).toBeNull();
  });
});

describe('matches', () => {
  it('gives racers the same cards and each co-op player their own', () => {
    expect(matchProblem(race, 0, 4)).toEqual(matchProblem(race, 3, 4));
    const coopCards = (seat: number) => [0, 1, 2, 3, 4].map((i) => matchProblem(coop, seat, i).prompt).join();
    expect(new Set([0, 1, 2, 3].map(coopCards)).size).toBe(4);
  });

  it('race with 4 players: everyone sees every score and the same winner', async () => {
    const game = await phones(race, 4);
    for (let i = 0; i < RACE_TARGET - 1; i++) [0, 1, 2, 3].forEach((p) => game.answer(p, true));
    game.answer(0, false);
    expect(isOver(game.state(2))).toBe(false);
    game.answer(2, true);
    expect(outcomeFor(game.state(2))).toBe('won');
    for (const p of [0, 1, 3]) {
      expect(outcomeFor(game.state(p))).toBe('lost');
      expect(game.state(p).winner).toBe(game.ids[2]);
    }
    // Every phone counted every answer exactly once.
    for (const p of [0, 1, 2, 3]) expect(standings(game.state(p)).map((s) => s.correct)).toEqual([10, 9, 9, 9]);
    // Answers after the end change nothing.
    game.answer(1, true);
    expect(game.state(1).correct[game.ids[1]]).toBe(9);
  });

  it('co-op with 4 players: the wave target grows with the team', async () => {
    const game = await phones(coop, 4);
    expect(waveTarget(game.state(0))).toBe(COOP_WAVES[0].perPlayer * 4);
    for (const [w, wave] of COOP_WAVES.entries()) {
      expect(game.state(3).wave).toBe(w);
      for (let i = 0; i < wave.perPlayer * 4; i++) game.answer(i % 4, true);
    }
    for (const p of [0, 1, 2, 3]) expect(outcomeFor(game.state(p))).toBe('won');
  });

  it('co-op for two still needs 6, 8, then 10', async () => {
    const game = await phones(coop, 2);
    expect(COOP_WAVES.map((w) => w.perPlayer * 2)).toEqual([6, 8, 10]);
    expect(waveTarget(game.state(1))).toBe(6);
  });

  it("co-op: the wave is lost when the host's timer runs out first", async () => {
    const game = await phones(coop, 3);
    game.answer(1, true);
    game.answer(0, false);
    game.timeUp();
    expect(outcomeFor(game.state(1))).toBe('lost');
    expect(outcomeFor(game.state(2))).toBe('lost');
  });

  it('a player leaving shrinks the co-op target and the rest play on', async () => {
    const game = await phones(coop, 3);
    for (let i = 0; i < 5; i++) game.answer(i % 2, true);
    expect(game.state(0).wave).toBe(0);
    // 3 players need 9; with 2 left the 5 they have and one more clears it (6).
    game.leave(2);
    expect(game.state(1).left).toEqual([game.ids[2]]);
    game.answer(1, true);
    expect(game.state(1).wave).toBe(1);
  });

  it('monster battle with 3 players: everyone hits one monster and wins together', async () => {
    const game = await phones(monster, 3);
    expect(waveTarget(game.state(1))).toBe(MONSTER.perPlayer * 3);
    // Teammates get their own cards, like co-op.
    expect(matchProblem(monster, 1, 0)).toEqual(matchProblem(coop, 1, 0));
    for (let i = 0; i < MONSTER.perPlayer * 3 - 1; i++) game.answer(i % 3, true);
    game.answer(2, false);
    expect(isOver(game.state(0))).toBe(false);
    expect(game.state(2).waveCorrect).toBe(MONSTER.perPlayer * 3 - 1);
    game.answer(1, true);
    for (const p of [0, 1, 2]) expect(outcomeFor(game.state(p))).toBe('won');
  });

  it('monster battle: the monster gets away if the clock runs out, and shrinks when someone leaves', async () => {
    const lost = await phones(monster, 2);
    lost.answer(1, true);
    lost.timeUp();
    expect(outcomeFor(lost.state(1))).toBe('lost');

    const game = await phones(monster, 3);
    for (let i = 0; i < MONSTER.perPlayer * 2 - 1; i++) game.answer(i % 2, true);
    game.leave(2);
    expect(waveTarget(game.state(0))).toBe(MONSTER.perPlayer * 2);
    game.answer(0, true);
    expect(outcomeFor(game.state(1))).toBe('won');
  });

  it('every phone shows the same monster', () => {
    expect(monsterFor(monster.seed)).toBe(monsterFor(42));
    expect(new Set([0, 1, 2, 3, 4, 5, 6].map(monsterFor)).size).toBe(7);
  });

  it('only the host referees', () => {
    const players = [{ id: HOST_ID, name: 'A', avatar: '🙂' }, { id: 'g', name: 'B', avatar: '🙂' }];
    const [state, out] = waveTimeUp(startMatch(coop, players, 'g'));
    expect(out).toEqual([]);
    expect(isOver(state)).toBe(false);
  });
});

describe('pass-and-play', () => {
  const play = (state: PassState, rightFor: (turn: number, i: number) => boolean) => {
    let s = state;
    while (s.phase !== 'finished') {
      if (s.phase === 'handoff') s = passReducer(s, { type: 'begin' });
      const p = passProblem(s);
      s = passReducer(s, { type: 'answer', given: rightFor(s.turn, s.index) ? p.answer : p.answer + 1 });
      s = passReducer(s, { type: 'next' });
    }
    return s;
  };
  const players: PassPlayer[] = ['Ava', 'Leo', 'Mia', 'Sam'].map((name) => ({ name, avatar: '🙂' }));

  it('hands the phone round all 4 players, then picks the winner', () => {
    const start = startPass(players, 'multiply', 'medium', 7);
    let s = passReducer(start, { type: 'begin' });
    for (let i = 0; i < PASS_QUESTIONS; i++) {
      s = passReducer(s, { type: 'answer', given: passProblem(s).answer });
      s = passReducer(s, { type: 'next' });
    }
    expect(s.phase).toBe('handoff');
    expect(s.turn).toBe(1);

    const done = play(start, (turn, i) => i < 10 - turn * 2);
    expect(passScores(done)).toEqual([10, 8, 6, 4]);
    expect(passWinners(done)).toEqual([0]);
    expect(passWinners(play(start, (turn) => turn !== 2))).toEqual([0, 1, 3]);
  });

  it('gives every player different questions', () => {
    const s = passReducer(startPass(players, 'add', 'easy', 7), { type: 'begin' });
    const cards = (turn: number) => [0, 1, 2, 3].map((index) => passProblem({ ...s, turn, index }).prompt).join();
    expect(new Set([0, 1, 2, 3].map(cards)).size).toBe(4);
  });
});

describe('team up on one phone', () => {
  const players: PassPlayer[] = ['Ava', 'Leo', 'Mia'].map((name) => ({ name, avatar: '🙂' }));
  const play = (state: PassState, right: number[]) => {
    let s = state;
    while (s.phase !== 'finished') {
      if (s.phase === 'handoff') s = passReducer(s, { type: 'begin' });
      const p = passProblem(s);
      s = passReducer(s, { type: 'answer', given: s.index < right[s.turn] ? p.answer : p.answer + 1 });
      s = passReducer(s, { type: 'next' });
    }
    return s;
  };

  it("adds everyone's right answers against one monster", () => {
    const start = startPass(players, 'add', 'easy', 7, true);
    expect(teamTarget(start)).toBe(TEAM_UP_PER_PLAYER * 3);
    // A strong player can carry a teammate who is still learning.
    const carried = play(start, [10, 9, 2]);
    expect(teamHits(carried)).toBe(21);
    expect(teamWon(carried)).toBe(true);
    expect(teamWon(play(start, [10, 8, 2]))).toBe(false);
  });

  it('take turns stays a competition', () => {
    expect(startPass(players, 'add', 'easy', 7).team).toBe(false);
  });
});
