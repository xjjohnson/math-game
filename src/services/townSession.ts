import { useSyncExternalStore } from 'react';

import { stickerText } from '@/constants/art';
import type { Peer, Transport } from '@/services/multiplayer';
import { chalkboard, type Chalkboard } from '@/services/chalkboard';
import { easelBoard, type EaselBoard } from '@/services/easel';
import { createNearbyTransport } from '@/services/nearbyTransport';
import type { NumberLevel, PaintAction } from '@/utils/easel';
import type { HomeSnapshot } from '@/utils/homeVisit';
import { advertName, newToken, shownName, tokenOf } from '@/utils/multiplayer/autoHost';
import { isSharedPiece } from '@/utils/multiplayer/placeProps';
import {
  HOST_ID,
  MAX_PLAYERS,
  ownerOf,
  paintBatches,
  PROTOCOL_VERSION,
  FARM_VERSION,
  TOWN_MARK,
  type ChalkStroke,
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
  /** The friend's visit this phone is joining right now (their shown name), after a tap on Join. */
  joining: string | null;
  /** Joined, the link dropped, and this phone is quietly getting back in. Friends stay on screen meanwhile. */
  reconnecting: boolean;
  /** Visits nearby the player said "Not now" to (advertised names), so they aren't asked again. */
  skipped: string[];
}

/** A visit nearby that this player can join. */
export interface NearbyVisit {
  /** The advertised name, used to join it. */
  name: string;
  /** What to show: the host's sticker and name. */
  shown: string;
}

/** Visits hosted nearby that this phone could join: only while it is on its own. */
export function joinableVisits(state: TownState): NearbyVisit[] {
  if (state.status !== 'hosting' || state.joining) return [];
  if (state.people.some((p) => p.id !== state.myId)) return [];
  const seen = new Set<string>();
  const out: NearbyVisit[] = [];
  for (const p of state.found) {
    if (!p.name.startsWith(TOWN_MARK) || seen.has(p.name)) continue;
    seen.add(p.name);
    out.push({ name: p.name, shown: shownName(p.name, TOWN_MARK) });
  }
  return out;
}

export interface HomeVisit {
  of: string;
  name: string;
  status: 'loading' | 'ready' | 'none';
  snap: HomeSnapshot | null;
}

/** How long to look for a friend's visit after tapping Join, and to wait for it to say welcome. */
export const JOIN_WAIT_MS = 8000;

/** A dropped link gets this long to come back before the friend is gone. */
export const RECONNECT_MS = 15000;

/** Joining: if the host sends no picture for the easel within this long, it has none, so this phone shares its own. */
const EASEL_WAIT_MS = 1500;

/** How long to wait for a friend's phone to send its home. */
export const HOME_WAIT_MS = 8000;

const OFF: TownState = {
  status: 'off',
  found: [],
  myId: HOST_ID,
  people: [],
  waves: {},
  spots: {},
  notice: null,
  look: { buddies: [], chosen: false },
  home: null,
  joining: null,
  reconnecting: false,
  skipped: [],
};

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

  /** The tag this phone advertises when it hosts, so two phones that tap Join on each other agree who goes. */
  private readonly token = newToken();

  constructor(
    private readonly makeTransport: () => Transport | null,
    /** The school chalkboard this phone shows (tests give each phone its own). */
    private readonly board: Chalkboard = chalkboard(),
    /** The School easel this phone shows (tests give each phone its own). */
    private readonly easel: EaselBoard = easelBoard(),
  ) {}

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
  /** Starts fresh as a host (the screens use `open`, which also looks for friends). */
  async host(me: Omit<PlayerInfo, 'id'>) {
    if (!this.begin(me, true)) return;
    try {
      await this.transport!.host(advertName(TOWN_MARK, this.token, `${stickerText(me.avatar)} ${me.name}`));
    } catch (e) {
      this.leave(errorText(e));
      return;
    }
    this.roster = [this.me];
    this.set({ status: 'hosting' });
    this.publish();
  }

  /** Starts fresh, looking for a visit to join by its id with `join`. */
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
    this.role = 'guest';
    this.hostPeer = peerId;
    this.hostName = this.state.found.find((p) => p.id === peerId)?.name ?? null;
    try {
      await this.transport?.connect(`${stickerText(this.me.avatar)} ${this.me.name}`, peerId);
    } catch (e) {
      this.set({ notice: errorText(e) });
    }
  }

  /** Hangs up and clears the visit. Only for really leaving: switching or reconnecting never calls it. */
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
    this.clearAway();
    if (this.easelTimer) clearTimeout(this.easelTimer);
    this.easelTimer = null;
    this.role = 'host';
    this.hostName = null;
    this.hostPeer = null;
    this.welcomed = false;
    this.looking = false;
    this.places.clear();
    this.spots.clear();
    this.set({ ...OFF, look: this.state.look, skipped: this.state.skipped, notice });
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

  // --- connecting with one tap ---
  /** Which side of the link this phone is on right now. */
  private role: 'host' | 'guest' = 'host';
  /** Guest: the advertised name and link id of the host this phone is with. */
  private hostName: string | null = null;
  private hostPeer: string | null = null;
  /** Bumped by every new join, reconnect, re-host or stop, so an older one that is still waiting gives up. */
  private flow = 0;
  /** Host: friends whose link dropped, kept on screen while they get back in. */
  private away = new Map<string, ReturnType<typeof setTimeout>>();
  /** Host: searching for other visits (only while nobody has joined). */
  private looking = false;
  /** Guest: when the host last sent an easel picture. */
  private easelAt = 0;
  private easelTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Opens the community. The phone offers a visit of its own straight away and
   * keeps an eye out for friends' visits; it never joins or switches by itself.
   * A friend's visit shows up in `joinableVisits` and is joined with `joinVisit`.
   */
  async open(me: Omit<PlayerInfo, 'id'>) {
    if (this.active) return;
    const { buddies, acc } = this.state.look;
    this.me = { id: HOST_ID, ...me, buddies: buddies.length ? buddies : undefined, acc };
    const t = this.makeTransport();
    if (!t) {
      this.set({ notice: 'Visiting needs the Math Game app on Android.' });
      return;
    }
    this.transport = t;
    this.listen(t);
    this.set({ ...OFF, look: this.state.look, skipped: this.state.skipped });
    await this.hostAlone(++this.flow, null);
  }

  /** Stops the visit and leaves; it stays off until `open` is called again. */
  stop() {
    this.flow++;
    this.leave();
  }

  /** "Not now": stop asking about this visit. */
  skip(name: string) {
    if (!this.state.skipped.includes(name)) this.set({ skipped: [...this.state.skipped, name] });
  }

  /** Joins the visit a friend is hosting nearby (by its advertised name), after a tap on Join. */
  async joinVisit(name: string, retry = true): Promise<void> {
    const t = this.transport;
    if (!t || this.state.status === 'joined' || this.roster.length > 1) return;
    const run = ++this.flow;
    const alive = () => this.flow === run && this.transport === t;
    const shown = shownName(name, TOWN_MARK);
    this.set({ joining: shown, notice: null });
    if (await this.connectTo(name, alive, JOIN_WAIT_MS)) {
      this.set({ joining: null });
      return;
    }
    if (!alive()) return;
    // Couldn't get in. Most often both friends tapped Join on each other at once; then the
    // phone with the smaller tag tries once more and the other one waits to be joined.
    const mine = this.token;
    const theirs = tokenOf(name, TOWN_MARK);
    await this.hostAlone(run, null);
    if (!alive()) return;
    if (retry && theirs && mine < theirs) {
      await sleep(1500 + Math.random() * 1000);
      if (alive() && this.roster.length <= 1) return this.joinVisit(name, false);
    }
    if (alive() && this.roster.length <= 1) this.set({ joining: null, notice: `Couldn't reach ${shown}. Try again.` });
  }

  /**
   * Looks for the visit called `name` and connects to it. True once the host has said welcome.
   * Everything on screen stays as it is meanwhile.
   */
  private async connectTo(name: string, alive: () => boolean, waitMs: number): Promise<boolean> {
    const t = this.transport!;
    this.role = 'guest';
    this.hostName = name;
    this.hostPeer = null;
    this.looking = false;
    this.set({ status: this.state.status === 'joined' ? 'joined' : 'finding', found: [] });
    try {
      await t.discover();
    } catch {
      return false;
    }
    const until = Date.now() + waitMs;
    let asked: string | null = null;
    while (alive() && Date.now() < until) {
      if (this.welcomed) return true;
      const host = this.state.found.find((p) => p.name === name);
      if (host && host.id !== asked) {
        asked = host.id;
        this.hostPeer = host.id;
        await t.connect(`${stickerText(this.me.avatar)} ${this.me.name}`, host.id).catch(() => {
          asked = null;
        });
      }
      await sleep(250);
    }
    return alive() && this.welcomed;
  }
  /** Guest: the host has said welcome on the current link. */
  private welcomed = false;

  /** The link to the host dropped: keep everyone on screen and quietly get back in. */
  private async reconnect() {
    const name = this.hostName;
    const run = ++this.flow;
    if (!name) return this.hostAlone(run, 'The visit ended.');
    const alive = () => this.flow === run && this.transport !== null;
    this.welcomed = false;
    this.set({ reconnecting: true });
    if (await this.connectTo(name, alive, RECONNECT_MS)) {
      this.set({ reconnecting: false });
      return;
    }
    if (alive()) await this.hostAlone(run, `Lost the visit with ${shownName(name, TOWN_MARK)}.`);
  }

  /**
   * Back to this phone's own visit, with nobody else in it yet. Your own person, buddies
   * and the things in the rooms stay where they are; only friends leave the screen.
   */
  private async hostAlone(run: number, notice: string | null) {
    const t = this.transport;
    if (!t) return;
    this.role = 'host';
    this.hostName = null;
    this.hostPeer = null;
    this.welcomed = false;
    this.clearAway();
    this.places.clear();
    // Keep this player's own pieces (moved over to the host id) and the shared things.
    const kept = new Map<string, { x: number; y: number }>();
    for (const [id, spot] of Object.entries(this.state.spots)) {
      if (isSharedPiece(id)) kept.set(id, spot);
      else if (ownerOf(id) === this.state.myId) kept.set(HOST_ID + id.slice(this.state.myId.length), spot);
    }
    this.spots = kept;
    this.roster = [this.me];
    this.looking = false;
    this.set({ myId: HOST_ID, found: [], reconnecting: false, joining: null, ...(notice ? { notice } : {}) });
    try {
      await t.host(advertName(TOWN_MARK, this.token, `${stickerText(this.me.avatar)} ${this.me.name}`));
    } catch (e) {
      if (this.flow === run) this.leave(errorText(e));
      return;
    }
    if (this.flow !== run || this.transport !== t) return;
    this.set({ status: 'hosting' });
    this.publish();
    await this.updateLooking();
  }

  /** Host: look for friends' visits only while nobody has joined; searching makes links slow and flaky. */
  private async updateLooking() {
    if (this.role !== 'host' || !this.transport) return;
    const alone = this.roster.length <= 1;
    if (alone && !this.looking) {
      this.looking = true;
      await this.transport.lookAround?.().catch(() => undefined);
    } else if (!alone && this.looking) {
      this.looking = false;
      this.transport.stopLooking?.();
      this.set({ found: [] });
    }
  }

  private clearAway() {
    this.away.forEach((timer) => clearTimeout(timer));
    this.away.clear();
  }

  // --- where this phone is ---
  /** Call when this player walks to the street or into a building. */
  setPlace(place: TownPlace | null) {
    const moved = this.place !== place;
    this.place = place;
    if (moved && this.state.status !== 'hosting') {
      // People and buddies start fresh in each place (the host does the same with its copy).
      const me = this.state.myId;
      const spots = Object.fromEntries(Object.entries(this.state.spots).filter(([id]) => isSharedPiece(id) || ownerOf(id) !== me));
      this.set({ spots });
    }
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

  // --- the school chalkboard ---
  /** Draws (or grows) a line on the chalkboard, here and on every friend's board. */
  drawChalk(stroke: ChalkStroke) {
    this.board.put(stroke);
    if (this.state.status === 'hosting') this.sendToGuests({ type: 'chalk', stroke });
    else if (this.state.status === 'joined') this.send({ type: 'chalk', stroke });
  }

  /** Wipes the chalkboard clean, here and for everyone. */
  wipeChalk() {
    this.board.wipe();
    if (this.state.status === 'hosting') this.sendToGuests({ type: 'chalk-wipe' });
    else if (this.state.status === 'joined') this.send({ type: 'chalk-wipe' });
  }

  // --- the school easel ---
  /** Paints on the easel (new or grown brush lines, and fills), here and on every friend's easel. */
  paint(actions: PaintAction[]) {
    if (!actions.length) return;
    this.easel.put(actions);
    for (const a of paintBatches(actions)) {
      if (this.state.status === 'hosting') this.sendToGuests({ type: 'paint', a });
      else if (this.state.status === 'joined') this.send({ type: 'paint', a });
    }
  }

  /** Takes back one action on the easel, here and for everyone. */
  undoPaint(id: string) {
    this.easel.remove(id);
    if (this.state.status === 'hosting') this.sendToGuests({ type: 'paint-undo', id });
    else if (this.state.status === 'joined') this.send({ type: 'paint-undo', id });
  }

  /** Puts a fresh sheet on the easel for everyone, and (when opening a saved picture) paints it back on. */
  newPaper(page: string, lv: NumberLevel | null, actions: PaintAction[] = []) {
    this.easel.reset(page, lv);
    if (this.state.status === 'hosting') this.sendToGuests({ type: 'paint-page', page, lv });
    else if (this.state.status === 'joined') this.send({ type: 'paint-page', page, lv });
    this.paint(actions);
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
    this.role = asHost ? 'host' : 'guest';
    this.set({ ...OFF, look: this.state.look, skipped: this.state.skipped, myId: HOST_ID });
    this.listen(t);
    return true;
  }

  private listen(t: Transport) {
    this.offs = [
      t.on('peerFound', (peer) => {
        this.set({ found: [...this.state.found.filter((p) => p.id !== peer.id), peer] });
      }),
      t.on('peerLost', ({ id }) => {
        this.set({ found: this.state.found.filter((p) => p.id !== id) });
      }),
      // Joining and reconnecting say for themselves when they can't get in; other errors are shown.
      t.on('error', (text) => {
        if (!this.state.joining && !this.state.reconnecting) this.set({ notice: text });
      }),
      t.on('connected', ({ id }) => {
        if (this.role === 'host') {
          if (this.roster.length >= MAX_PLAYERS) this.send({ type: 'bye' }, id);
          return; // otherwise wait for its hello
        }
        this.hostPeer = id;
        this.welcomed = false;
        this.set({ status: 'joined' });
        // Joined: stop searching, which makes the connection slow and flaky.
        t.stopLooking?.();
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
        if (this.role === 'host') {
          this.dropLater(id);
          return;
        }
        // An old link going away while switching is nothing to worry about.
        if (id !== this.hostPeer || this.state.status !== 'joined' || this.state.reconnecting) return;
        void this.reconnect();
      }),
      t.on('message', ({ id, message }) => {
        if (this.role === 'host') this.hostHears(id, message);
        else if (id === this.hostPeer) this.guestHears(message);
      }),
    ];
  }

  /** Host: a friend's link dropped. Keep them on screen for a little while in case they get back in. */
  private dropLater(id: string) {
    if (!this.roster.some((p) => p.id === id) || this.away.has(id)) return this.drop(id);
    this.away.set(
      id,
      setTimeout(() => {
        this.away.delete(id);
        this.drop(id);
      }, RECONNECT_MS),
    );
  }

  private hostHears(id: string, message: GameMessage) {
    switch (message.type) {
      case 'hello':
        if (message.version < FARM_VERSION) {
          this.send({ type: 'welcome', version: PROTOCOL_VERSION, you: id }, id);
          // An older phone can play matches but doesn't know this community (it has no farm yet).
          this.send({ type: 'bye' }, id);
          this.set({ notice: `${message.name}'s phone needs the newest Math Game to visit the community.` });
          return;
        }
        if (this.away.has(id)) {
          clearTimeout(this.away.get(id));
          this.away.delete(id);
        }
        {
          // A friend getting back in after a dropped link: their old place in the list goes.
          const back = this.roster.find((p) => p.id !== id && this.away.has(p.id) && p.name === message.name && p.avatar === message.avatar);
          if (back) {
            clearTimeout(this.away.get(back.id));
            this.away.delete(back.id);
            this.roster = this.roster.filter((p) => p.id !== back.id);
            this.places.delete(back.id);
            this.clearSpots(back.id);
          }
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
        // In the list first, so whatever the newcomer says straight after the welcome counts.
        this.send({ type: 'welcome', version: PROTOCOL_VERSION, you: id }, id);
        this.publish();
        void this.updateLooking();
        // The newcomer's chalkboard gets what is on this one, added to what it already has
        // (it sends its own lines over too).
        for (const stroke of this.board.getStrokes()) this.send({ type: 'chalk', stroke }, id);
        // And its easel shows the picture on this one, if there is one; otherwise it shares its own.
        if (!isBlank(this.easel.getPicture())) this.sendEasel(id);
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
      case 'chalk':
      case 'chalk-wipe':
        if (!this.roster.some((p) => p.id === id)) return;
        if (message.type === 'chalk') this.board.put(message.stroke);
        else this.board.wipe();
        this.sendToGuests(message, id);
        break;
      case 'paint':
      case 'paint-undo':
      case 'paint-page':
        if (!this.roster.some((p) => p.id === id)) return;
        if (message.type === 'paint') this.easel.put(message.a);
        else if (message.type === 'paint-undo') this.easel.remove(message.id);
        else this.easel.reset(message.page, message.lv);
        this.sendToGuests(message, id);
        break;
      case 'hi':
        if (!this.roster.some((p) => p.id === id)) return;
        this.markWave(id);
        this.send({ type: 'hi', playerId: id });
        break;
      case 'bye':
        if (this.away.has(id)) {
          clearTimeout(this.away.get(id));
          this.away.delete(id);
        }
        this.drop(id);
        break;
    }
  }

  private guestHears(message: GameMessage) {
    switch (message.type) {
      case 'welcome': {
        // My person and buddies keep where they were, under the id the host gave this phone.
        const before = this.state.myId;
        const mine: [string, { x: number; y: number }][] = [];
        const spots: TownState['spots'] = {};
        for (const [id, spot] of Object.entries(this.state.spots)) {
          if (!isSharedPiece(id) && ownerOf(id) === before) mine.push([message.you + id.slice(before.length), spot]);
          else spots[id] = spot;
        }
        for (const [id, spot] of mine) spots[id] = spot;
        this.welcomed = true;
        this.set({ myId: message.you, spots });
        // Tell the host where we are as soon as we're in, then where my pieces are.
        if (this.place) this.send({ type: 'visit', place: this.place });
        for (const [id, spot] of mine) this.send({ type: 'move', id, ...spot });
        // My chalk lines join the host's board.
        for (const stroke of this.board.getStrokes()) this.send({ type: 'chalk', stroke });
        // If the host has no picture on its easel, mine goes up for everyone.
        this.easelAt = 0;
        const welcomedAt = Date.now();
        if (this.easelTimer) clearTimeout(this.easelTimer);
        this.easelTimer = setTimeout(() => {
          this.easelTimer = null;
          if (this.easelAt >= welcomedAt || this.role !== 'guest') return;
          const pic = this.easel.getPicture();
          if (isBlank(pic)) return;
          this.send({ type: 'paint-page', page: pic.page, lv: pic.lv });
          for (const a of paintBatches(pic.actions)) this.send({ type: 'paint', a });
        }, EASEL_WAIT_MS);
        break;
      }
      case 'town': {
        const spots: TownState['spots'] = {};
        for (const p of message.people) if (p.x !== undefined && p.y !== undefined) spots[p.id] = { x: p.x, y: p.y };
        for (const e of message.spots ?? []) spots[e.id] = { x: e.x, y: e.y };
        // Only this phone moves its own pieces, so its copy wins until the host has caught up.
        const me = this.state.myId;
        for (const [id, spot] of Object.entries(this.state.spots)) if (!isSharedPiece(id) && ownerOf(id) === me && !spots[id]) spots[id] = spot;
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
      case 'chalk':
        this.board.put(message.stroke);
        break;
      case 'chalk-wipe':
        this.board.wipe();
        break;
      case 'paint':
        this.easel.put(message.a);
        break;
      case 'paint-undo':
        this.easel.remove(message.id);
        break;
      case 'paint-page':
        this.easelAt = Date.now();
        this.easel.reset(message.page, message.lv);
        break;
      case 'bye':
        // The host closed its visit: carry on alone, with your own visit open for friends.
        if (this.transport) void this.hostAlone(++this.flow, `${this.hostName ? shownName(this.hostName, TOWN_MARK) : 'The host'} closed the visit.`);
        else this.leave('The host closed the visit.');
        break;
    }
  }

  private drop(id: string) {
    this.roster = this.roster.filter((p) => p.id !== id);
    this.places.delete(id);
    this.clearSpots(id);
    this.publish();
    // Everyone left: look for friends' visits again.
    void this.updateLooking();
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
  /** Sends a newcomer the picture on the easel. */
  private sendEasel(to: string) {
    const { page, lv, actions } = this.easel.getPicture();
    this.send({ type: 'paint-page', page, lv }, to);
    for (const a of paintBatches(actions)) this.send({ type: 'paint', a }, to);
  }

  private sendToGuests(message: GameMessage, except?: string) {
    for (const p of this.roster) if (p.id !== HOST_ID && p.id !== except) this.send(message, p.id);
  }

  private send(message: GameMessage, to?: string) {
    this.transport?.send(message, to).catch(() => undefined);
  }
}

const isBlank = (p: { page: string; actions: unknown[] }) => p.page === 'blank' && p.actions.length === 0;
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
