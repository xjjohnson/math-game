import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type HostInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { Text } from '@/components/AppText';
import { BuddyFigure } from '@/components/BuddyFigure';
import { FLOOR, Interior } from '@/components/community/Interiors';
import { ACCESSORIES, GLASSES } from '@/components/VisitPanel';
import { townSession, useTownState, WAVE_MS } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';
import {
  bake,
  madeRecipe,
  madeToUnit,
  addToMask,
  maskEmojis,
  maskToUnit,
  unitToMask,
  recipeFor,
  unitToMade,
  MADE_SLOTS,
} from '@/utils/bakery';
import {
  bakedSwitch,
  BOWL,
  inOven,
  INSIDE_SCREENS,
  isInside,
  madeSwitch,
  BOWL_SWITCH,
  MIXER_MIDDLE,
  onBowl,
  onMixer,
  PLACE_PROPS,
  propPieceId,
  settle,
  switchPieceId,
  type InsidePlace,
  type PropDef,
} from '@/utils/multiplayer/placeProps';
import { buddyPieceId, type TownPerson, type TownPlace } from '@/utils/multiplayer/protocol';
import type { Spot } from '@/utils/multiplayer/scene';
import type { BuildingId } from '@/utils/town';

const FURS = ['#F2B880', '#E57373', '#81C784', '#64B5F6', '#BA68C8', '#FFD54F', '#4DB6AC', '#F06292'];
const BELLIES = ['#FFE3C2', '#FFCDD2', '#C8E6C9', '#BBDEFB', '#E1BEE7', '#FFF9C4', '#B2DFDB', '#F8BBD0'];

/** The same color for the same player on every phone. */
export function colorIndex(id: string): number {
  let n = 0;
  for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) % 997;
  return n % FURS.length;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Keeps people on the floor and inside the room. */
const onFloor = (s: Spot): Spot => ({ x: clamp(s.x, 0.02, 0.98), y: clamp(s.y, FLOOR + 0.04, 0.97) });
/** Keeps a prop inside the room while it's carried. */
const inRoom = (s: Spot): Spot => ({ x: clamp(s.x, 0.01, 0.99), y: clamp(s.y, 0.08, 0.95) });

/** How many screens wide each place is; the street and the buildings are long, so they scroll. */
export const ROOM_SCREENS: Record<TownPlace, number> = { street: 2.8, ...INSIDE_SCREENS };

/** How long something sits in the hot oven before it's baked. */
const BAKE_MS = 3000;
/** How long the mixer whirrs before the bowl is mixed. */
const MIX_MS = 1500;
/** On joining a friend, things this phone moved this recently are put back the way this phone had them. */
const KEEP_MY_CHANGES_MS = 10 * 60 * 1000;

/**
 * Where things were put while playing alone, kept while the app is open so a
 * tidy shop is still tidy after doing the job. On a visit the host keeps them instead.
 */
const soloMemory: Record<string, Spot> = {};
/** When each remembered thing last changed, by this phone or a friend. */
const memoryTime: Record<string, number> = {};
function remember(id: string, spot: Spot) {
  soloMemory[id] = { x: spot.x, y: spot.y };
  memoryTime[id] = Date.now();
}

/** Where someone stands until they are moved: along the floor near the door, in order. */
function standSpot(saved: Spot | undefined, index: number, inside: boolean, count: number): Spot {
  if (saved) return onFloor(saved);
  if (inside) return { x: 0.1 + index * 0.05, y: index % 2 === 0 ? 0.72 : 0.82 };
  return { x: (index + 1) / (count + 1), y: index % 2 === 0 ? 0.68 : 0.78 };
}

interface Props {
  place: TownPlace;
  onDoor: (id: BuildingId) => void;
  onExit: () => void;
}

type Piece =
  | { key: string; kind: 'person'; person: TownPerson; spot: Spot }
  | { key: string; kind: 'pal'; person: TownPerson; spot: Spot; value: string }
  | { key: string; kind: 'prop'; prop: PropDef; spot: Spot; baked: boolean; shown: string; badge?: string; caption?: string; batter?: boolean };

/**
 * A full-screen, side-view place. Everyone who is here stands in it as their
 * character; you can move yourself, your buddies, and the things in the room
 * (cans on the shop shelves, books in the library). With a visit running,
 * every phone follows live. Without one it's just you, in the same room.
 */
export function CommunityRoom({ place, onDoor, onExit }: Props) {
  const profile = useActiveProfile();
  const { people, spots, myId, waves, status, look } = useTownState();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [soloSpots, setSoloSpots] = useState<Record<string, Spot>>(() => ({ ...soloMemory }));
  const [soloWave, setSoloWave] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);

  const visiting = status !== 'off';
  const inside = isInside(place);
  const here: TownPerson[] = visiting
    ? people.filter((p) => p.place === place)
    : [
        {
          id: 'me',
          name: profile?.name ?? 'You',
          avatar: profile?.avatar ?? '🙂',
          place,
          ...(look.buddies.length ? { buddies: look.buddies } : {}),
          ...(look.acc ? { acc: look.acc } : {}),
        },
      ];
  const self = visiting ? myId : 'me';
  // Hosting or looking, the things in the rooms stay as this phone left them; a guest sees the host's.
  const spotsNow = visiting ? (status === 'joined' ? spots : { ...soloMemory, ...spots }) : soloSpots;
  const { w, h } = size;
  const roomW = Math.round(w * ROOM_SCREENS[place]);
  const token = Math.max(96, Math.min(160, Math.round(h * 0.3)));

  const move = (id: string, x: number, y: number) => {
    // People and buddies start fresh each time; things in the rooms stay where they were put,
    // even when the visit restarts (a phone left alone keeps looking again and again).
    if (id.startsWith('~')) remember(id, { x, y });
    if (visiting) townSession().moveTo(id, x, y);
    else {
      setSoloSpots((s) => ({ ...s, [id]: { x, y } }));
    }
  };
  const wave = () => {
    if (visiting) townSession().wave();
    else {
      setSoloWave(Date.now());
      setTimeout(() => setSoloWave(0), WAVE_MS);
    }
  };

  // A visit that starts (or starts again) hosting begins from the room as it is, not from the shelves.
  useEffect(() => {
    if (status !== 'hosting') return;
    const session = townSession();
    const known = session.getState().spots;
    for (const [id, spot] of Object.entries(soloMemory)) if (!known[id]) session.moveTo(id, spot.x, spot.y);
  }, [status]);

  // Joining a friend: once their room has arrived, put back what this phone changed lately, so a
  // bowl you just filled doesn't turn back into the friend's older one. After that, keep up with them.
  const joinedAt = useRef(0);
  useEffect(() => {
    if (status !== 'joined') return;
    joinedAt.current = Date.now();
    const timer = setTimeout(() => {
      const session = townSession();
      const theirs = session.getState().spots;
      const cutoff = Date.now() - KEEP_MY_CHANGES_MS;
      for (const [id, mine] of Object.entries(soloMemory)) {
        const now = theirs[id];
        if ((memoryTime[id] ?? 0) > cutoff && (!now || now.x !== mine.x || now.y !== mine.y)) session.moveTo(id, mine.x, mine.y);
      }
      joinedAt.current = 0;
    }, 1500);
    return () => clearTimeout(timer);
  }, [status]);
  useEffect(() => {
    if (!visiting || joinedAt.current) return;
    for (const [id, spot] of Object.entries(spots)) {
      const kept = soloMemory[id];
      if (id.startsWith('~') && (!kept || kept.x !== spot.x || kept.y !== spot.y)) remember(id, spot);
    }
  }, [visiting, spots]);

  // Switches (an oven, a swing) are kept like pieces: x is 1 while it's on.
  const isOn = (name: string) => inside && (spotsNow[switchPieceId(place, name)]?.x ?? 0) >= 0.5;
  const switches: Record<string, boolean> = {};
  if (inside) {
    for (const id of Object.keys(spotsNow)) {
      const prefix = switchPieceId(place, '');
      if (id.startsWith(prefix)) switches[id.slice(prefix.length)] = isOn(id.slice(prefix.length));
    }
  }
  const flip = (name: string) => {
    if (!inside) return;
    move(switchPieceId(place, name), isOn(name) ? 0 : 1, 0);
  };

  // Start the view on this player, and move it again when they walk into another place.
  const mine = standSpot(spotsNow[self], Math.max(0, here.findIndex((p) => p.id === self)), inside, here.length);
  useEffect(() => {
    if (w > 0) scroller.current?.scrollTo({ x: Math.max(0, mine.x * roomW - w / 2), animated: false });
    // Only when the place or screen size changes, not on every step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, w, roomW]);

  // The bakery's mixing bowl: what is in it, kept as a switch so every phone agrees.
  const bakery = place === 'bakery';
  const bowlSwitch = switchPieceId('bakery', BOWL_SWITCH);
  const bowlMask = bakery ? unitToMask(spotsNow[bowlSwitch]?.x ?? 0) : 0;
  const bowlMixed = bowlMask !== 0 && (spotsNow[bowlSwitch]?.y ?? 0) >= 0.5;
  const bowlSpot: Spot = spotsNow[propPieceId('bakery', BOWL.id)] ?? { x: BOWL.x, y: BOWL.y };
  const latest = useRef({ spotsNow, bowlSpot, bowlMask, bowlMixed });
  latest.current = { spotsNow, bowlSpot, bowlMask, bowlMixed };

  const props: Piece[] = inside
    ? PLACE_PROPS[place].flatMap((prop): Piece[] => {
        const key = propPieceId(place, prop.id);
        const spot = spotsNow[key] ?? { x: prop.x, y: prop.y };
        if (prop.made !== undefined) {
          // A finished treat only shows while its slot says there is one.
          const n = unitToMade(spotsNow[switchPieceId(place, madeSwitch(prop.made))]?.y ?? 0);
          if (n === null) return [];
          const r = madeRecipe(n);
          return [{ key, kind: 'prop', prop, spot, baked: false, shown: r.emoji, caption: r.name }];
        }
        const baked = !!prop.bakeTo && isOn(bakedSwitch(prop.id));
        const piece: Piece = { key, kind: 'prop', prop, spot, baked, shown: baked && prop.bakeTo ? prop.bakeTo : prop.emoji };
        if (prop.bowl && bowlMask) {
          piece.batter = bowlMixed;
          if (bowlMixed) piece.caption = 'Mixed!';
          else piece.badge = maskEmojis(bowlMask);
        }
        return [piece];
      })
    : [];

  // Things left in the hot oven bake after a moment.
  const ovenOn = place === 'bakery' && isOn('oven');
  const baking = props
    .filter((p): p is Extract<Piece, { kind: 'prop' }> => p.kind === 'prop' && !!p.prop.bakeTo && !p.baked && inOven(p.spot))
    .map((p) => p.prop.id)
    .join(',');
  useEffect(() => {
    if (!ovenOn || !baking) return;
    const timer = setTimeout(() => {
      for (const id of baking.split(',')) move(switchPieceId('bakery', bakedSwitch(id)), 1, 0);
    }, BAKE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ovenOn, baking]);

  // A bowl of ingredients left in the hot oven turns into a treat on the rack.
  const bowlBaking = ovenOn && bowlMask !== 0 && inOven(bowlSpot);
  useEffect(() => {
    if (!bowlBaking) return;
    const timer = setTimeout(() => {
      const { spotsNow: now, bowlSpot: at, bowlMask: mask, bowlMixed: mixed } = latest.current;
      const recipe = bake(mask, mixed);
      if (!recipe) return;
      // The first free spot for it, or the first spot again when the counter is full.
      const free = Array.from({ length: MADE_SLOTS }, (_, i) => i).find((i) => unitToMade(now[switchPieceId('bakery', madeSwitch(i))]?.y ?? 0) === null) ?? 0;
      move(propPieceId('bakery', `made${free}`), at.x, Math.min(0.95, at.y + 0.001));
      move(switchPieceId('bakery', madeSwitch(free)), 1, madeToUnit(recipeFor(mask, mixed)));
      // The bowl is empty again, ready for the next one.
      move(bowlSwitch, 0, 0);
    }, BAKE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bowlBaking, bowlMask]);

  // The bowl on the stand mixer with the mixer whirring: after a moment it's all mixed into batter.
  const mixing = bakery && isOn('mixer') && bowlMask !== 0 && !bowlMixed && onMixer(bowlSpot);
  useEffect(() => {
    if (!mixing) return;
    const timer = setTimeout(() => {
      move(bowlSwitch, maskToUnit(latest.current.bowlMask), 1);
      move(switchPieceId('bakery', 'mixer'), 0, 0);
    }, MIX_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixing, bowlMask]);

  /** An ingredient let go over the bowl goes in it, and the ingredient itself goes back to its shelf to use again. */
  const intoBowl = (prop: PropDef, s: Spot): boolean => prop.ingredient !== undefined && onBowl(s, latest.current.bowlSpot);
  const dropIngredient = (prop: PropDef, s: Spot) => {
    if (!intoBowl(prop, s)) return;
    move(bowlSwitch, maskToUnit(addToMask(latest.current.bowlMask, prop.ingredient as number)), 0);
  };
  /** Tap the bowl to tip it out (on the mixer, tapping it starts the mixer); tap a finished treat to eat it. */
  const tapProp = (prop: PropDef): (() => void) | undefined => {
    if (prop.bowl) return () => (onMixer(latest.current.bowlSpot) ? flip('mixer') : move(bowlSwitch, 0, 0));
    if (prop.made !== undefined) return () => move(switchPieceId('bakery', madeSwitch(prop.made as number)), 0, 0);
    return undefined;
  };

  const palSize = token * 0.5;
  const propSize = Math.round(token * 0.3);
  /** Everything in the room: things, people, and the buddies they brought, sorted so nearer things draw on top. */
  const pieces: Piece[] = [
    ...props,
    ...here.flatMap((p, i) => {
      const spot = standSpot(spotsNow[p.id], i, inside, here.length);
      const list: Piece[] = [{ key: p.id, kind: 'person', person: p, spot }];
      (p.buddies ?? []).forEach((b, n) => {
        const id = buddyPieceId(p.id, n);
        // Until a buddy is moved it stands next to its owner.
        const beside = onFloor({ x: spot.x + ((n + 1) * token * 0.55) / roomW, y: spot.y });
        list.push({ key: id, kind: 'pal', person: p, value: b, spot: spotsNow[id] ? onFloor(spotsNow[id]) : beside });
      });
      return list;
    }),
  ];
  pieces.sort((a, b) => a.spot.y - b.spot.y);

  // Everything that can be picked up, with where it is on screen, topmost first so a finger gets the front one.
  const grabs: Grab[] = pieces
    .map((piece): Grab => {
      const x = piece.spot.x * roomW;
      const y = piece.spot.y * h;
      if (piece.kind === 'person') {
        return {
          key: piece.key,
          enabled: piece.person.id === self,
          spot: piece.spot,
          box: { left: x - token / 2, top: y - token - 44, width: token, height: token + 64 },
          fit: onFloor,
          onTap: wave,
        };
      }
      if (piece.kind === 'pal') {
        return {
          key: piece.key,
          enabled: piece.person.id === self,
          spot: piece.spot,
          box: { left: x - palSize / 2, top: y - palSize - 6, width: palSize, height: palSize + 6 },
          fit: onFloor,
        };
      }
      const size = piece.prop.big ? propSize * 1.4 : propSize;
      const box = size * 1.25;
      const prop = piece.prop;
      return {
        key: piece.key,
        enabled: true,
        spot: piece.spot,
        box: { left: x - box / 2, top: y - box + size * 0.1, width: box, height: box },
        fit: inRoom,
        land: (s) => {
          if (intoBowl(prop, s)) return { x: prop.x, y: prop.y };
          const at = settle(place as InsidePlace, prop, s.x, s.y);
          return prop.bowl && onMixer(at) ? { ...at, x: MIXER_MIDDLE } : at;
        },
        onDrop: prop.ingredient !== undefined ? (s) => dropIngredient(prop, s) : undefined,
        onTap: tapProp(prop),
      };
    })
    .reverse();
  const touch = useMultiTouch({ grabs, roomW, h, viewW: w, scroller, move });

  return (
    <View
      ref={touch.frameRef}
      style={styles.fill}
      onLayout={(e) => {
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
        touch.measure();
      }}
    >
      {w > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          scrollEnabled={!touch.holding}
          onScroll={touch.onScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: roomW, height: h }}
        >
          <Interior place={place} width={roomW} viewWidth={w} height={h} switches={switches} onSwitch={flip} onDoor={onDoor} onExit={onExit} />
          <View style={[styles.layer, { width: roomW, height: h }]} pointerEvents="box-none" {...touch.handlers}>
            {pieces.map((piece) => {
              const held = touch.dragAt[piece.key];
              const spot = held ?? piece.spot;
              return piece.kind === 'person' ? (
                <Person
                  key={piece.key}
                  person={piece.person}
                  isMe={piece.person.id === self}
                  waving={visiting ? Date.now() - (waves[piece.person.id] ?? 0) < WAVE_MS : piece.person.id === self && soloWave > 0}
                  spot={spot}
                  lifted={!!held}
                  w={roomW}
                  h={h}
                  token={token}
                />
              ) : piece.kind === 'pal' ? (
                <Pal key={piece.key} value={piece.value} mine={piece.person.id === self} spot={spot} lifted={!!held} w={roomW} h={h} size={palSize} />
              ) : (
                <Prop
                  key={piece.key}
                  prop={piece.prop}
                  shown={piece.shown}
                  badge={piece.badge}
                  batter={piece.batter}
                  caption={piece.caption}
                  spot={spot}
                  lifted={!!held}
                  w={roomW}
                  h={h}
                  size={piece.prop.big ? propSize * 1.4 : propSize}
                />
              );
            })}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

/** A finger moved less than this (in points) is a tap. */
const TAP_SLOP = 6;
/** Holding something this close to the side of the screen scrolls the room that way. */
const EDGE = 40;
const EDGE_STEP = 10;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Something in the room a finger can pick up. */
interface Grab {
  key: string;
  /** Only your own person and buddies (and the room's things) can be picked up. */
  enabled: boolean;
  spot: Spot;
  /** Where it is drawn, in the room's points. */
  box: Box;
  /** Keeps it in bounds while it's carried (people stay on the floor). */
  fit: (s: Spot) => Spot;
  /** Where it ends up when let go (things drop onto a shelf). */
  land?: (s: Spot) => Spot;
  /** Called with the spot it was let go at (before landing), just before it's sent; after a drag, not a tap. */
  onDrop?: (s: Spot) => void;
  onTap?: () => void;
}

interface Track {
  /** What this finger carries; none means this finger slides the room along. */
  grab: Grab | null;
  startSpot: Spot;
  startX: number;
  startY: number;
  startScroll: number;
  pageX: number;
  pageY: number;
  moved: boolean;
  sentAt: number;
}

interface TouchArgs {
  grabs: Grab[];
  roomW: number;
  h: number;
  viewW: number;
  scroller: React.RefObject<ScrollViewInstance | null>;
  move: (id: string, x: number, y: number) => void;
}

/**
 * Several fingers at once, like the buddy home: each finger can carry its own
 * thing, and a finger that lands on nothing while something is held slides the
 * room along under it. Holding something at the side of the screen scrolls too.
 */
function useMultiTouch(args: TouchArgs) {
  const latest = useRef(args);
  latest.current = args;
  const frameRef = useRef<HostInstance>(null);
  const frame = useRef({ x: 0, y: 0 });
  const scrollX = useRef(0);
  const tracks = useRef(new Map<number, Track>());
  const edgeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [dragAt, setDragAt] = useState<Record<string, Spot>>({});
  const [holding, setHolding] = useState(false);

  useEffect(() => () => {
    if (edgeTimer.current) clearInterval(edgeTimer.current);
  }, []);

  const measure = () =>
    frameRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      frame.current = { x: pageX ?? 0, y: pageY ?? 0 };
    });

  const toRoom = (pageX: number, pageY: number) => ({ x: pageX - frame.current.x + scrollX.current, y: pageY - frame.current.y });

  const grabAt = (pageX: number, pageY: number): Grab | null => {
    const at = toRoom(pageX, pageY);
    const held = new Set([...tracks.current.values()].map((t) => t.grab?.key));
    return (
      latest.current.grabs.find(
        (g) => g.enabled && !held.has(g.key) && at.x >= g.box.left && at.x <= g.box.left + g.box.width && at.y >= g.box.top && at.y <= g.box.top + g.box.height,
      ) ?? null
    );
  };

  /** Where a carried thing is now, in shares of the room. */
  const spotOf = (t: Track): Spot => {
    const { roomW, h } = latest.current;
    const dx = t.pageX - t.startX + (scrollX.current - t.startScroll);
    const dy = t.pageY - t.startY;
    return (t.grab as Grab).fit({ x: t.startSpot.x + dx / roomW, y: t.startSpot.y + dy / h });
  };

  const show = () => {
    const next: Record<string, Spot> = {};
    for (const t of tracks.current.values()) if (t.grab && t.moved) next[t.grab.key] = spotOf(t);
    setDragAt(next);
    setHolding(tracks.current.size > 0);
  };

  const scrollBy = (dx: number) => {
    const { roomW, viewW, scroller } = latest.current;
    const to = Math.min(Math.max(0, roomW - viewW), Math.max(0, scrollX.current + dx));
    if (to === scrollX.current) return;
    scrollX.current = to;
    scroller.current?.scrollTo({ x: to, animated: false });
  };

  const stopEdge = () => {
    if (edgeTimer.current) clearInterval(edgeTimer.current);
    edgeTimer.current = null;
  };
  const edgeDir = () => {
    for (const t of tracks.current.values()) {
      if (!t.grab || !t.moved) continue;
      const x = t.pageX - frame.current.x;
      if (x < EDGE) return -1;
      if (x > latest.current.viewW - EDGE) return 1;
    }
    return 0;
  };

  const send = (t: Track, force = false) => {
    if (!t.grab) return;
    const now = Date.now();
    if (!force && now - t.sentAt < 70) return;
    t.sentAt = now;
    const s = spotOf(t);
    latest.current.move(t.grab.key, s.x, s.y);
  };

  const start = (id: number, pageX: number, pageY: number) => {
    if (tracks.current.has(id)) return;
    const grab = grabAt(pageX, pageY);
    // Nothing under this finger and nothing held yet: let the room scroll as usual.
    if (!grab && tracks.current.size === 0) return;
    tracks.current.set(id, {
      grab,
      startSpot: grab ? grab.spot : { x: 0, y: 0 },
      startX: pageX,
      startY: pageY,
      startScroll: scrollX.current,
      pageX,
      pageY,
      moved: false,
      sentAt: 0,
    });
    show();
  };

  const moveTouches = (touches: readonly { identifier: number | string; pageX: number; pageY: number }[]) => {
    let changed = false;
    for (const touch of touches) {
      const t = tracks.current.get(Number(touch.identifier));
      if (!t) continue;
      if (!t.grab) {
        // Sliding the room: whatever is held rides along under its finger.
        scrollBy(t.pageX - touch.pageX);
        t.pageX = touch.pageX;
        t.pageY = touch.pageY;
        changed = true;
        continue;
      }
      t.pageX = touch.pageX;
      t.pageY = touch.pageY;
      if (!t.moved && Math.abs(t.pageX - t.startX) < TAP_SLOP && Math.abs(t.pageY - t.startY) < TAP_SLOP) continue;
      t.moved = true;
      changed = true;
    }
    if (!changed) return;
    for (const t of tracks.current.values()) if (t.grab && t.moved) send(t);
    show();
    if (!edgeTimer.current && edgeDir() !== 0) {
      edgeTimer.current = setInterval(() => {
        const dir = edgeDir();
        if (dir === 0 || tracks.current.size === 0) return stopEdge();
        scrollBy(dir * EDGE_STEP);
        for (const t of tracks.current.values()) if (t.grab && t.moved) send(t);
        show();
      }, 16);
    }
  };

  const end = (id: number) => {
    const t = tracks.current.get(id);
    if (!t) return;
    tracks.current.delete(id);
    if (tracks.current.size === 0) stopEdge();
    if (t.grab) {
      if (!t.moved) t.grab.onTap?.();
      else {
        const held = spotOf(t);
        const final = t.grab.land ? t.grab.land(held) : held;
        t.grab.onDrop?.(held);
        latest.current.move(t.grab.key, final.x, final.y);
      }
    }
    show();
  };

  const touchesOf = (e: GestureResponderEvent) => (e.nativeEvent.changedTouches?.length ? e.nativeEvent.changedTouches : [e.nativeEvent]);

  const handlers = {
    onStartShouldSetResponder: (e: GestureResponderEvent) => grabAt(e.nativeEvent.pageX, e.nativeEvent.pageY) !== null,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      measure();
      start(Number(e.nativeEvent.identifier), e.nativeEvent.pageX, e.nativeEvent.pageY);
    },
    onResponderStart: (e: GestureResponderEvent) => touchesOf(e).forEach((t) => start(Number(t.identifier), t.pageX, t.pageY)),
    onResponderMove: (e: GestureResponderEvent) => moveTouches(e.nativeEvent.touches?.length ? e.nativeEvent.touches : [e.nativeEvent]),
    onResponderEnd: (e: GestureResponderEvent) => touchesOf(e).forEach((t) => end(Number(t.identifier))),
    onResponderRelease: () => [...tracks.current.keys()].forEach(end),
    onResponderTerminate: () => {
      tracks.current.clear();
      stopEdge();
      show();
    },
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = e.nativeEvent.contentOffset.x;
  };

  return { frameRef, measure, handlers, dragAt, holding, onScroll };
}

interface PersonProps {
  person: TownPerson;
  isMe: boolean;
  waving: boolean;
  spot: Spot;
  lifted: boolean;
  w: number;
  h: number;
  token: number;
}

function Person({ person, isMe, waving, spot: at, lifted, w, h, token }: PersonProps) {
  const i = colorIndex(person.id);
  const acc = person.acc && (ACCESSORIES as readonly string[]).includes(person.acc) ? person.acc : undefined;
  return (
    <View
      pointerEvents={isMe ? 'auto' : 'none'}
      accessibilityLabel={isMe ? 'You. Drag to move.' : person.name}
      style={[styles.person, { width: token, left: at.x * w - token / 2, top: at.y * h - token - 14 }, lifted && styles.lifted]}
    >
      <Text style={styles.wave}>{waving ? '👋' : ' '}</Text>
      <View>
        <BuddyFigure value={person.avatar} size={token} fur={FURS[i]} belly={BELLIES[i]} dressed={{}} />
        {acc ? (
          <Text
            style={[
              styles.acc,
              GLASSES.includes(acc)
                ? { top: token * 0.2, fontSize: token * 0.34 }
                : { top: -token * 0.12, fontSize: token * 0.36 },
            ]}
          >
            {acc}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.name, isMe && styles.me]} numberOfLines={1}>
        {isMe ? 'You' : person.name}
      </Text>
    </View>
  );
}

interface PalProps {
  value: string;
  mine: boolean;
  spot: Spot;
  lifted: boolean;
  w: number;
  h: number;
  size: number;
}

/** One of a player's buddies; only its owner can move it. */
function Pal({ value, mine, spot: at, lifted, w, h, size }: PalProps) {
  return (
    <View
      pointerEvents={mine ? 'auto' : 'none'}
      accessibilityLabel={mine ? 'Your buddy. Drag to move.' : 'A buddy'}
      style={[styles.person, { width: size, left: at.x * w - size / 2, top: at.y * h - size - 6 }, lifted && styles.lifted]}
    >
      <BuddyFigure value={value} size={size} fur="#F2B880" belly="#FFE3C2" dressed={{}} />
    </View>
  );
}

interface PropProps {
  prop: PropDef;
  /** What to draw: its emoji, or what it turned into. */
  shown: string;
  /** A little row of emoji above it (what is in the bowl). */
  badge?: string;
  /** A name under it (what a finished treat is). */
  caption?: string;
  /** The bowl is full of mixed batter. */
  batter?: boolean;
  spot: Spot;
  lifted: boolean;
  w: number;
  h: number;
  size: number;
}

/** A thing in the room anyone can pick up: it drops onto the shelf or counter under it when let go. */
function Prop({ prop, shown, badge, caption, batter, spot: at, lifted, w, h, size }: PropProps) {
  const box = size * 1.25;
  const label = prop.bowl ? 'Mixing bowl. Drop food on it, then put it in the oven. Tap to tip it out.' : caption ? `${caption}. Tap to eat.` : `${shown}. Drag to move.`;
  return (
    <View
      accessibilityLabel={label}
      style={[styles.prop, { width: box, height: box, left: at.x * w - box / 2, top: at.y * h - box + size * 0.1 }, lifted && styles.lifted]}
    >
      <Text style={{ fontSize: size, lineHeight: box }}>{shown}</Text>
      {batter ? <View pointerEvents="none" style={[styles.batter, { top: box * 0.42, left: box * 0.16, right: box * 0.16, height: box * 0.16 }]} /> : null}
      {badge ? (
        <Text pointerEvents="none" numberOfLines={2} style={[styles.tag, { bottom: box * 0.7, left: -box * 0.1, right: -box * 0.1, fontSize: 14, lineHeight: 17 }]}>
          {badge}
        </Text>
      ) : null}
      {caption ? (
        <Text pointerEvents="none" numberOfLines={2} style={[styles.tag, styles.caption, { top: box * 0.95, left: -box * 0.4, right: -box * 0.4, fontSize: 11 }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  layer: { position: 'absolute', left: 0, top: 0 },
  person: { position: 'absolute', alignItems: 'center' },
  prop: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
  tag: { position: 'absolute', textAlign: 'center', fontWeight: '800', color: '#3B2B25' },
  caption: { fontWeight: '900', color: '#3B2B25' },
  batter: { position: 'absolute', backgroundColor: '#E9C27D', borderRadius: 999, borderWidth: 2, borderColor: '#B98A45' },
  lifted: { transform: [{ scale: 1.12 }], zIndex: 50 },
  wave: { fontSize: 24, height: 30 },
  acc: { position: 'absolute', alignSelf: 'center', textAlign: 'center', left: 0, right: 0 },
  name: { fontSize: 14, fontWeight: '800', color: '#3B2B25', backgroundColor: 'rgba(255,255,255,0.75)', paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden' },
  me: { color: '#3B5BFF' },
});
