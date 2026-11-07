import { useSyncExternalStore } from 'react';

import { stickerText } from '@/constants/art';
import type { Peer, Transport } from '@/services/multiplayer';
import { createNearbyTransport } from '@/services/nearbyTransport';
import type { HomeSnapshot } from '@/utils/homeVisit';
import { isSharedPiece } from '@/utils/multiplayer/placeProps';
import {
  HOST_ID,
  MAX_PLAYERS,
  ownerOf,
  PROTOCOL_VERSION,
  TOWN_MARK,
  TOWN_VERSION,
  type GameMessage,
  type PlayerInfo,
  type TownPerson,
  type TownPlace,
} from '@/utils/multiplayer/protocol';

export type TownStatus = 'off' | 'hosting' | 'finding' | 'joined';

export interface TownState {
  status: TownStatus;
  found: Peer[];
  /** This phone's player id ('host' on the host, otherwise given by the host). */
  myId: string;
  /** Everyone who is out in the community right now, with where they are. */
  people: TownPerson[];
  /** Who waved lately, by player id, so the screens can show a 👋. */
  waves: Record<string, number>;
  /** Where people were put in their scene (0 to 1), by player id. People nobody moved aren't listed. */
  spots: Record<string, { x: number; y: number }>;
  notice: string | null;
  /** What this player brings: buddies and an accessory. Kept between visits. */
  look: { buddies: string[]; acc?: string; chosen: boolean };
  /** A friend's buddy home this player asked to see: loading, shown, or not available. */
  home: HomeVisit | null;
}

export interface HomeVisit {
  of: string;
  name: string;
  status: 'loading' | 'ready' | 'none';
  snap: HomeSnapshot | null;
}

/** How long to wait for a friend's phone to send its home. */
export const HOME_WAIT_MS = 8000;

const OFF: TownState = { status: 'off', found: [], myId: HOST_ID, people: [], waves: {}, spots: {}, notice: null, look: { buddies: [], chosen: false }, home: null };

/** How long a wave stays on screen. */
export const WAVE_MS = 3000;

/**
 * Community visits: phones on one Nearby connection (one host, up to 7 guests)
 * that stay linked while the kids walk around the community, so each phone can
 * show who else is on the street or inside the same building.
 *
 * The host is the notice board: guests tell it `visit` whenever they move, and
 * it sends everybody the full `town` list. That keeps every phone's picture the
 * same without phones needing to talk to each other.
 */
export class TownSession {
  private state: TownState = OFF;
  private readonly listeners = new Set<() => void>();
  private transport: Transport | null = null;
  private offs: (() => void)[] = [];
  private me: PlayerInfo = { id: HOST_ID, name: 'Player', avatar: '🙂' };
  private place: TownPlace | null = null;
  /** Host only: who is in the group, and where each one is. */
  private roster: PlayerInfo[] = [];
  private places = new Map<string, TownPlace>();
  private spots = new Map<string, { x: number; y: number }>();

  /** This player's buddy home, for friends who ask to see it. */
  private homeSource: (() => HomeSnapshot | null) | null = null;
  private homeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly makeTransport: () => Transport | null) {}

  // --- store for React ---
  getState = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private set(patch: Partial<TownState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  get active() {
    return this.state.status !== 'off';
  }

  // --- starting and stopping ---
  async host(me: Omit<PlayerInfo, 'id'>) {
    if (!this.begin(me, true)) return;
    try {
      await this.transport!.host(`${TOWN_MARK} ${stickerText(me.avatar)} ${me.name}`);
    } catch (e) {
      this.leave(errorText(e));
      return;
    }
    this.roster = [this.me];
    this.set({ status: 'hosting' });
    this.publish();
  }

  async discover(me: Omit<PlayerInfo, 'id'>) {
    if (!this.begin(me, false)) return;
    try {
      await this.transport!.discover();
    } catch (e) {
      this.leave(errorText(e));
      return;
    }
    this.set({ status: 'finding' });
  }

  async join(peerId: string) {
    try {
      await this.transport?.connect(`${stickerText(this.me.avatar)} ${this.me.name}`, peerId);
    } catch (e) {
      this.set({ notice: errorText(e) });
    }
  }

  leave(notice: string | null = null) {
    const t = this.transport;
    this.transport = null;
    this.offs.forEach((off) => off());
    this.offs = [];
    if (t) {
      t.send({ type: 'bye' }).catch(() => undefined);
      t.disconnect();
    }
    this.roster = [];
    this.places.clear();
    this.spots.clear();
    this.set({ ...OFF, look: this.state.look, notice });
  }

  /** Change the buddies and accessory this player shows in the community. */
  setLook(buddies: string[], acc?: string) {
    this.set({ look: { buddies, acc, chosen: true } });
    this.me = { ...this.me, buddies: buddies.length ? buddies : undefined, acc };
    if (this.state.status === 'hosting') {
      this.roster = this.roster.map((p) => (p.id === HOST_ID ? { ...p, buddies: this.me.buddies, acc } : p));
      this.publish();
    } else if (this.state.status === 'joined') {
      this.send({ type: 'look', buddies, ...(acc ? { acc } : {}) });
    }
  }

  // --- connecting by itself ---
  private autoRun = 0;

  /**
   * Opens the community with no choices to make: look for a visit someone is
   * already hosting and join it, otherwise host one. A phone left hosting alone
   * looks again now and then, so two phones that opened at the same moment
   * still end up together.
   */
  async auto(me: Omit<PlayerInfo, 'id'>) {
    const run = ++this.autoRun;
    const { buddies, acc } = this.state.look;
    this.me = { id: HOST_ID, ...me, buddies: buddies.length ? buddies : undefined, acc };
    const alive = () => this.autoRun === run;
    while (alive()) {
      if (!(await this.discoverOnce(alive))) return;
      // Give hosts a moment to be found; the wait differs per phone so two phones don't decide together.
      await sleep(3000 + Math.random() * 3000);
      if (!alive()) return;
      const host = this.state.found.find((p) => p.name.startsWith(TOWN_MARK));
      if (host) {
        await this.join(host.id);
        for (let i = 0; i < 12 && alive() && this.state.status !== 'joined'; i++) await sleep(500);
        if (this.state.status === 'joined') return this.watchGuest(run);
        continue;
      }
      if (!(await this.hostOnce(alive))) return;
      // Hosting: stay while friends are with us, otherwise look around again soon.
      for (let waited = 0; alive() && waited < 20000 + Math.random() * 10000; waited += 1000) {
        await sleep(1000);
        if (this.roster.length > 1) return this.watchHost(run);
      }
    }
  }

  /** Stops looking for or hosting a visit and leaves; it stays off until `auto` is called again. */
  stop() {
    this.autoRun++;
    this.leave();
  }

  private async watchGuest(run: number) {
    // If the host goes away, try again from the top.
    while (this.autoRun === run && this.state.status === 'joined') await sleep(1000);
    if (this.autoRun === run) void this.auto(this.me);
  }

  private async watchHost(run: number) {
    // A host with nobody left becomes a searcher again.
    while (this.autoRun === run && this.state.status === 'hosting' && this.roster.length > 1) await sleep(1000);
    if (this.autoRun === run && this.state.status === 'hosting') void this.auto(this.me);
  }

  private async discoverOnce(alive: () => boolean): Promise<boolean> {
    this.begin(this.me, false);
    if (!this.transport) return false;
    try {
      await this.transport.discover();
    } catch (e) {
      this.leave(errorText(e));
      return false;
    }
    if (!alive()) return false;
    this.set({ status: 'finding' });
    return true;
  }

  private async hostOnce(alive: () => boolean): Promise<boolean> {
    await this.host(this.me);
    return alive() && this.state.status === 'hosting';
  }

  // --- where this phone is ---
  /** Call when this player walks to the street or into a building. */
  setPlace(place: TownPlace | null) {
    this.place = place;
    if (this.state.status === 'hosting') {
      this.setHostPlace();
      this.publish();
    } else if (this.state.status === 'joined') {
      this.send({ type: 'visit', place });
    }
  }

  /** Leaves `place` only if this phone is still there, so screens can clean up in any order. */
  clearPlace(place: TownPlace) {
    if (this.place === place) this.setPlace(null);
  }

  /** Drag your own person, or one of your buddies, to a spot in the scene. */
  moveTo(id: string, x: number, y: number) {
    // Only your own person and buddies can be moved, plus the things in the rooms, which are everyone's.
    if (ownerOf(id) !== this.state.myId && !isSharedPiece(id)) return;
    this.set({ spots: { ...this.state.spots, [id]: { x, y } } });
    if (this.state.status === 'hosting') {
      this.spots.set(id, { x, y });
      this.sendToGuests({ type: 'move', id, x, y });
    } else if (this.state.status === 'joined') {
      this.send({ type: 'move', id, x, y });
    }
  }

  // --- friends' homes ---
  /** Tells the session how to get this player's home when a friend asks to see it. */
  setHomeSource(source: (() => HomeSnapshot | null) | null) {
    this.homeSource = source;
  }

  /** Asks to see another player's buddy home; it shows up in `home` when it arrives. */
  askHome(of: string, name: string) {
    if (!this.active || of === this.state.myId) return;
    this.set({ home: { of, name, status: 'loading', snap: null } });
    if (this.state.status === 'hosting') this.send({ type: 'home-ask', of }, of);
    else this.send({ type: 'home-ask', of });
    if (this.homeTimer) clearTimeout(this.homeTimer);
    this.homeTimer = setTimeout(() => {
      this.homeTimer = null;
      const h = this.state.home;
      if (h && h.of === of && h.status === 'loading') this.set({ home: { ...h, status: 'none' } });
    }, HOME_WAIT_MS);
  }

  closeHome() {
    if (this.homeTimer) clearTimeout(this.homeTimer);
    this.homeTimer = null;
    this.set({ home: null });
  }

  private myHome(): HomeSnapshot | null {
    try {
      return this.homeSource?.() ?? null;
    } catch {
      return null;
    }
  }

  private gotHome(of: string, snap: HomeSnapshot | null) {
    const h = this.state.home;
    if (h && h.of === of && h.status === 'loading') {
      if (this.homeTimer) clearTimeout(this.homeTimer);
      this.homeTimer = null;
      this.set({ home: { ...h, status: snap ? 'ready' : 'none', snap } });
    }
  }

  wave() {
    this.markWave(this.state.myId);
    if (this.state.status === 'hosting') this.send({ type: 'hi', playerId: HOST_ID });
    else this.send({ type: 'hi' });
  }

  // --- inside ---
  private begin(me: Omit<PlayerInfo, 'id'>, asHost: boolean): boolean {
    this.leave();
    const t = this.makeTransport();
    if (!t) {
      this.set({ notice: 'Visiting needs the Math Game app on Android.' });
      return false;
    }
    this.transport = t;
    const { buddies, acc } = this.state.look;
    this.me = { id: HOST_ID, ...me, buddies: buddies.length ? buddies : undefined, acc };
    this.set({ ...OFF, look: this.state.look, myId: HOST_ID });
    this.listen(t, asHost);
    return true;
  }

  private listen(t: Transport, asHost: boolean) {
    this.offs = [
      t.on('peerFound', (peer) => this.set({ found: [...this.state.found.filter((p) => p.id !== peer.id), peer] })),
      t.on('peerLost', ({ id }) => this.set({ found: this.state.found.filter((p) => p.id !== id) })),
      t.on('error', (text) => this.set({ notice: text })),
      t.on('connected', ({ id }) => {
        if (asHost) {
          if (this.roster.length >= MAX_PLAYERS) this.send({ type: 'bye' }, id);
          return; // otherwise wait for its hello
        }
        this.set({ status: 'joined' });
        this.send({
          type: 'hello',
          version: PROTOCOL_VERSION,
          name: this.me.name,
          avatar: this.me.avatar,
          ...(this.me.buddies?.length ? { buddies: this.me.buddies } : {}),
          ...(this.me.acc ? { acc: this.me.acc } : {}),
        });
      }),
      t.on('disconnected', ({ id }) => {
        if (!asHost) {
          this.leave('The host phone left.');
          return;
        }
        this.drop(id);
      }),
      t.on('message', ({ id, message }) => (asHost ? this.hostHears(id, message) : this.guestHears(message))),
    ];
  }

  private hostHears(id: string, message: GameMessage) {
    switch (message.type) {
      case 'hello':
        this.send({ type: 'welcome', version: PROTOCOL_VERSION, you: id }, id);
        if (message.version < TOWN_VERSION) {
          // An older phone can play matches but doesn't know the community.
          this.send({ type: 'bye' }, id);
          this.set({ notice: `${message.name}'s phone needs the newest Math Game to visit the community.` });
          return;
        }
        if (this.roster.length >= MAX_PLAYERS) return;
        this.roster = [
          ...this.roster.filter((p) => p.id !== id),
          {
            id,
            name: message.name,
            avatar: message.avatar,
            ...(message.buddies ? { buddies: message.buddies } : {}),
            ...(message.acc ? { acc: message.acc } : {}),
          },
        ];
        this.publish();
        break;
      case 'visit':
        if (!this.roster.some((p) => p.id === id)) return;
        if (this.places.get(id) !== message.place) this.clearSpots(id);
        if (message.place) this.places.set(id, message.place);
        else this.places.delete(id);
        this.publish();
        break;
      case 'look':
        this.roster = this.roster.map((p) =>
          p.id === id ? { ...p, buddies: message.buddies.length ? message.buddies : undefined, acc: message.acc } : p,
        );
        this.publish();
        break;
      case 'move':
        // A phone can only move its own pieces, and the things in the rooms.
        if ((ownerOf(message.id) !== id && !isSharedPiece(message.id)) || !this.roster.some((p) => p.id === id)) return;
        this.spots.set(message.id, { x: message.x, y: message.y });
        this.set({ spots: { ...this.state.spots, [message.id]: { x: message.x, y: message.y } } });
        this.sendToGuests(message, id);
        break;
      case 'home-ask':
        if (!this.roster.some((p) => p.id === id)) return;
        if (message.of === HOST_ID) this.send({ type: 'home', of: HOST_ID, home: this.myHome() }, id);
        else if (message.of !== id && this.roster.some((p) => p.id === message.of)) this.send({ type: 'home-ask', of: message.of, for: id }, message.of);
        break;
      case 'home':
        // A phone can only send its own home.
        if (message.of !== id) return;
        if (message.for && message.for !== HOST_ID) {
          if (this.roster.some((p) => p.id === message.for)) this.send(message, message.for);
        } else this.gotHome(id, message.home);
        break;
      case 'hi':
        if (!this.roster.some((p) => p.id === id)) return;
        this.markWave(id);
        this.send({ type: 'hi', playerId: id });
        break;
      case 'bye':
        this.drop(id);
        break;
    }
  }

  private guestHears(message: GameMessage) {
    switch (message.type) {
      case 'welcome':
        this.set({ myId: message.you });
        // Tell the host where we are as soon as we're in.
        if (this.place) this.send({ type: 'visit', place: this.place });
        break;
      case 'town': {
        const spots: TownState['spots'] = {};
        for (const p of message.people) if (p.x !== undefined && p.y !== undefined) spots[p.id] = { x: p.x, y: p.y };
        for (const e of message.spots ?? []) spots[e.id] = { x: e.x, y: e.y };
        this.set({ people: message.people, spots });
        break;
      }
      case 'move':
        this.set({ spots: { ...this.state.spots, [message.id]: { x: message.x, y: message.y } } });
        break;
      case 'hi':
        if (message.playerId) this.markWave(message.playerId);
        break;
      case 'home-ask':
        if (message.of === this.state.myId) {
          this.send({ type: 'home', of: this.state.myId, ...(message.for ? { for: message.for } : {}), home: this.myHome() });
        }
        break;
      case 'home':
        this.gotHome(message.of, message.home);
        break;
      case 'bye':
        this.leave('The host closed the visit.');
        break;
    }
  }

  private drop(id: string) {
    this.roster = this.roster.filter((p) => p.id !== id);
    this.places.delete(id);
    this.clearSpots(id);
    this.publish();
  }

  /** Forget where a player's person and buddies were put. */
  private clearSpots(owner: string) {
    for (const key of [...this.spots.keys()]) if (ownerOf(key) === owner) this.spots.delete(key);
  }

  private setHostPlace() {
    if (this.places.get(HOST_ID) !== (this.place ?? undefined)) this.clearSpots(HOST_ID);
    if (this.place) this.places.set(HOST_ID, this.place);
    else this.places.delete(HOST_ID);
  }

  /** Host: rebuild the list of who is where, show it here and send it to everyone. */
  private publish() {
    this.setHostPlace();
    const people: TownPerson[] = [];
    for (const p of this.roster) {
      const place = this.places.get(p.id);
      const spot = this.spots.get(p.id);
      if (place) people.push({ ...p, place, ...(spot ?? {}) });
    }
    // People first: older phones only read the first few spots.
    const spots: TownState['spots'] = {};
    for (const [id, spot] of this.spots) if (this.places.has(ownerOf(id))) spots[id] = spot;
    for (const [id, spot] of this.spots) if (isSharedPiece(id)) spots[id] = spot;
    this.set({ people, spots });
    this.send({ type: 'town', people, spots: Object.entries(spots).map(([id, spot]) => ({ id, ...spot })) });
  }

  private markWave(id: string) {
    const stamp = Date.now();
    this.set({ waves: { ...this.state.waves, [id]: stamp } });
    // Clear the 👋 once it has had its moment.
    setTimeout(() => {
      if (this.state.waves[id] === stamp) {
        const { [id]: _gone, ...rest } = this.state.waves;
        this.set({ waves: rest });
      }
    }, WAVE_MS);
  }

  /** Host: to every guest except `except`. */
  private sendToGuests(message: GameMessage, except?: string) {
    for (const p of this.roster) if (p.id !== HOST_ID && p.id !== except) this.send(message, p.id);
  }

  private send(message: GameMessage, to?: string) {
    this.transport?.send(message, to).catch(() => undefined);
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

let shared: TownSession | null = null;

/** The one community session for the whole app. */
export function townSession(): TownSession {
  return (shared ??= new TownSession(createNearbyTransport));
}

export function useTownState(): TownState {
  const s = townSession();
  return useSyncExternalStore(s.subscribe, s.getState, s.getState);
}
