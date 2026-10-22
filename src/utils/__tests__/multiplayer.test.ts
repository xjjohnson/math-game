import { createMockPair } from '@/services/mockTransport';
import type { Transport } from '@/services/multiplayer';
import {
  answerMine,
  COOP_WAVES,
  isOver,
  matchProblem,
  outcomeFor,
  RACE_TARGET,
  receive,
  startMatch,
  waveTimeUp,
  type MatchState,
  type Step,
} from '@/utils/multiplayer/match';
import {
  PASS_QUESTIONS,
  passProblem,
  passReducer,
  passScores,
  passWinner,
  startPass,
  type PassState,
} from '@/utils/multiplayer/passAndPlay';
import { encodeMessage, parseMessage, type MatchSetup, type Role } from '@/utils/multiplayer/protocol';

const race: MatchSetup = { mode: 'race', operation: 'add', difficulty: 'easy', seed: 42 };
const coop: MatchSetup = { ...race, mode: 'coop' };

/** Two phones over the mock transport, each keeping its own match state. */
async function twoPhones(setup: MatchSetup) {
  const [hostT, guestT] = createMockPair();
  const phones: Record<Role, { t: Transport; state: MatchState }> = {
    host: { t: hostT, state: startMatch(setup, 'host') },
    guest: { t: guestT, state: startMatch(setup, 'guest') },
  };
  const apply = (role: Role, [state, out]: Step) => {
    phones[role].state = state;
    out.forEach((m) => phones[role].t.send(m));
  };
  (['host', 'guest'] as const).forEach((role) =>
    phones[role].t.on('message', ({ message }) => apply(role, receive(phones[role].state, message))),
  );
  await hostT.host('Host');
  let found = '';
  guestT.on('peerFound', (p) => (found = p.id));
  await guestT.discover();
  await guestT.connect('Guest', found);
  return {
    answer: (role: Role, correct: boolean) => apply(role, answerMine(phones[role].state, correct)),
    timeUp: () => apply('host', waveTimeUp(phones.host.state)),
    state: (role: Role) => phones[role].state,
  };
}

describe('protocol', () => {
  it('round-trips every message', () => {
    const messages = [
      { type: 'hello', version: 1, name: 'Ava', avatar: '🐼' },
      { type: 'start', setup: race },
      { type: 'answer', cardIndex: 3, correct: true, playerId: 'guest' },
      { type: 'wave', wave: 1 },
      { type: 'end', winner: 'host' },
      { type: 'end', result: 'lost' },
      { type: 'bye' },
    ] as const;
    for (const m of messages) expect(parseMessage(encodeMessage(m))).toEqual(m);
  });

  it('ignores anything it does not understand', () => {
    expect(parseMessage('not json')).toBeNull();
    expect(parseMessage('{"type":"answer","cardIndex":"3","correct":true,"playerId":"guest"}')).toBeNull();
    expect(parseMessage('{"type":"start","setup":{"mode":"race","operation":"pow","difficulty":"easy","seed":1}}')).toBeNull();
    expect(parseMessage('{"type":"explode"}')).toBeNull();
  });
});

describe('matches', () => {
  it('gives both racers the same cards and co-op players different ones', () => {
    expect(matchProblem(race, 'host', 4)).toEqual(matchProblem(race, 'guest', 4));
    const coopCards = (role: Role) => [0, 1, 2, 3, 4].map((i) => matchProblem(coop, role, i).prompt);
    expect(coopCards('host')).not.toEqual(coopCards('guest'));
  });

  it('race: the host calls the first to 10 the winner on both phones', async () => {
    const game = await twoPhones(race);
    for (let i = 0; i < RACE_TARGET - 1; i++) {
      game.answer('host', true);
      game.answer('guest', true);
    }
    game.answer('host', false);
    expect(isOver(game.state('host'))).toBe(false);
    game.answer('guest', true);
    expect(outcomeFor(game.state('guest'))).toBe('won');
    expect(outcomeFor(game.state('host'))).toBe('lost');
    expect(game.state('host').correct).toEqual({ host: 9, guest: 10 });
    expect(game.state('host').myIndex).toBe(10);
    // Answers after the end change nothing.
    game.answer('host', true);
    expect(game.state('host').correct.host).toBe(9);
  });

  it('co-op: right answers from both phones clear the waves together', async () => {
    const game = await twoPhones(coop);
    for (const [w, wave] of COOP_WAVES.entries()) {
      expect(game.state('guest').wave).toBe(w);
      for (let i = 0; i < wave.target; i++) game.answer(i % 2 ? 'guest' : 'host', true);
    }
    expect(outcomeFor(game.state('host'))).toBe('won');
    expect(outcomeFor(game.state('guest'))).toBe('won');
  });

  it("co-op: the wave is lost when the host's timer runs out first", async () => {
    const game = await twoPhones(coop);
    game.answer('guest', true);
    game.answer('host', false);
    game.timeUp();
    expect(outcomeFor(game.state('guest'))).toBe('lost');
    expect(game.state('host').correct).toEqual({ host: 0, guest: 1 });
  });

  it('only the host referees', () => {
    const [state, out] = waveTimeUp(startMatch(coop, 'guest'));
    expect(out).toEqual([]);
    expect(isOver(state)).toBe(false);
  });
});

describe('pass-and-play', () => {
  const play = (state: PassState, rightFor: (turn: number, i: number) => boolean) => {
    let s = passReducer(state, { type: 'begin' });
    while (s.phase !== 'finished') {
      if (s.phase === 'handoff') s = passReducer(s, { type: 'begin' });
      const p = passProblem(s);
      s = passReducer(s, { type: 'answer', given: rightFor(s.turn, s.index) ? p.answer : p.answer + 1 });
      s = passReducer(s, { type: 'next' });
    }
    return s;
  };
  const players = [
    { name: 'Ava', avatar: '🐼' },
    { name: 'Leo', avatar: '🦊' },
  ] as [{ name: string; avatar: string }, { name: string; avatar: string }];

  it('takes turns, hands over once, and picks the winner', () => {
    const start = startPass(players, 'multiply', 'medium', 7);
    let s = passReducer(start, { type: 'begin' });
    for (let i = 0; i < PASS_QUESTIONS; i++) {
      s = passReducer(s, { type: 'answer', given: passProblem(s).answer });
      s = passReducer(s, { type: 'next' });
    }
    expect(s.phase).toBe('handoff');
    expect(s.turn).toBe(1);

    const done = play(start, (turn, i) => turn === 0 || i < 4);
    expect(passScores(done)).toEqual([10, 4]);
    expect(passWinner(done)).toBe(0);
    expect(passWinner(play(start, () => true))).toBeNull();
  });

  it("gives the second player different questions", () => {
    const s = passReducer(startPass(players, 'add', 'easy', 7), { type: 'begin' });
    expect(passProblem({ ...s, turn: 1 }).prompt === passProblem(s).prompt &&
      passProblem({ ...s, turn: 1, index: 1 }).prompt === passProblem({ ...s, index: 1 }).prompt).toBe(false);
  });
});
