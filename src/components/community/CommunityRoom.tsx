import { useEffect, useRef, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { Text } from '@/components/AppText';
import { BuddyFigure } from '@/components/BuddyFigure';
import { FLOOR, Interior } from '@/components/community/Interiors';
import { ACCESSORIES, GLASSES } from '@/components/VisitPanel';
import { townSession, useTownState, WAVE_MS } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';
import {
  bakedSwitch,
  inOven,
  INSIDE_SCREENS,
  isInside,
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

/**
 * Where things were put while playing alone, kept while the app is open so a
 * tidy shop is still tidy after doing the job. On a visit the host keeps them instead.
 */
const soloMemory: Record<string, Spot> = {};

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
  | { key: string; kind: 'prop'; prop: PropDef; spot: Spot; baked: boolean };

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
  const [dragging, setDragging] = useState(false);
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
  const spotsNow = visiting ? spots : soloSpots;
  const { w, h } = size;
  const roomW = Math.round(w * ROOM_SCREENS[place]);
  const token = Math.max(96, Math.min(160, Math.round(h * 0.3)));

  const move = (id: string, x: number, y: number) => {
    if (visiting) townSession().moveTo(id, x, y);
    else {
      // People and buddies start fresh each time; things in the rooms stay where they were put.
      if (id.startsWith('~')) soloMemory[id] = { x, y };
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

  const props: Piece[] = inside
    ? PLACE_PROPS[place].map((prop) => {
        const key = propPieceId(place, prop.id);
        const saved = spotsNow[key];
        return { key, kind: 'prop', prop, spot: saved ?? { x: prop.x, y: prop.y }, baked: !!prop.bakeTo && isOn(bakedSwitch(prop.id)) };
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

  return (
    <View style={styles.fill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {w > 0 ? (
        <ScrollView
          ref={scroller}
          horizontal
          scrollEnabled={!dragging}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: roomW, height: h }}
        >
          <Interior place={place} width={roomW} viewWidth={w} height={h} switches={switches} onSwitch={flip} onDoor={onDoor} onExit={onExit} />
          {pieces.map((piece) =>
            piece.kind === 'person' ? (
              <Person
                key={piece.key}
                person={piece.person}
                isMe={piece.person.id === self}
                waving={visiting ? Date.now() - (waves[piece.person.id] ?? 0) < WAVE_MS : piece.person.id === self && soloWave > 0}
                spot={piece.spot}
                w={roomW}
                h={h}
                token={token}
                onMove={(x, y) => move(piece.key, x, y)}
                onTap={wave}
                onDragging={setDragging}
              />
            ) : piece.kind === 'pal' ? (
              <Pal
                key={piece.key}
                value={piece.value}
                mine={piece.person.id === self}
                spot={piece.spot}
                w={roomW}
                h={h}
                size={palSize}
                onMove={(x, y) => move(piece.key, x, y)}
                onDragging={setDragging}
              />
            ) : (
              <Prop
                key={piece.key}
                prop={piece.prop}
                baked={piece.baked}
                spot={piece.spot}
                w={roomW}
                h={h}
                size={piece.prop.big ? propSize * 1.4 : propSize}
                onMove={(x, y) => move(piece.key, x, y)}
                land={(s) => settle(place as InsidePlace, piece.prop, s.x, s.y)}
                onDragging={setDragging}
              />
            ),
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

interface DragArgs {
  spot: Spot;
  w: number;
  h: number;
  enabled: boolean;
  onMove: (x: number, y: number) => void;
  onTap?: () => void;
  onDragging: (on: boolean) => void;
  /** Keeps the piece in bounds while it's carried (people stay on the floor). */
  fit?: (s: Spot) => Spot;
  /** Where it ends up when let go (things drop onto a shelf). */
  land?: (s: Spot) => Spot;
}

/** Drag a piece with one finger. Others' pieces get no handlers, so touches pass through them. */
function useDrag(args: DragArgs) {
  // While a finger is down the piece follows it here; other phones get throttled updates.
  const [drag, setDrag] = useState<Spot | null>(null);
  const start = useRef(args.spot);
  const last = useRef(0);
  const latest = useRef(args);
  latest.current = args;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => latest.current.enabled,
      onMoveShouldSetPanResponder: () => latest.current.enabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = latest.current.spot;
        setDrag(latest.current.spot);
        latest.current.onDragging(true);
      },
      onPanResponderMove: (_e, g) => {
        const { w: cw, h: ch, onMove: send, fit = onFloor } = latest.current;
        const next = fit({ x: start.current.x + g.dx / cw, y: start.current.y + g.dy / ch });
        setDrag(next);
        const now = Date.now();
        if (now - last.current > 70) {
          last.current = now;
          send(next.x, next.y);
        }
      },
      onPanResponderRelease: (_e, g) => {
        const { w: cw, h: ch, onMove: send, onTap: tap, fit = onFloor, land } = latest.current;
        if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6 && tap) tap();
        else {
          const held = fit({ x: start.current.x + g.dx / cw, y: start.current.y + g.dy / ch });
          const next = land ? land(held) : held;
          send(next.x, next.y);
        }
        setDrag(null);
        latest.current.onDragging(false);
      },
      onPanResponderTerminate: () => {
        setDrag(null);
        latest.current.onDragging(false);
      },
    }),
  ).current;

  return { handlers: args.enabled ? pan.panHandlers : {}, at: drag ?? args.spot, lifted: drag !== null };
}

interface PersonProps {
  person: TownPerson;
  isMe: boolean;
  waving: boolean;
  spot: Spot;
  w: number;
  h: number;
  token: number;
  onMove: (x: number, y: number) => void;
  onTap: () => void;
  onDragging: (on: boolean) => void;
}

function Person({ person, isMe, waving, spot, w, h, token, onMove, onTap, onDragging }: PersonProps) {
  const { handlers, at, lifted } = useDrag({ spot, w, h, enabled: isMe, onMove, onTap, onDragging });
  const i = colorIndex(person.id);
  const acc = person.acc && (ACCESSORIES as readonly string[]).includes(person.acc) ? person.acc : undefined;
  return (
    <View
      {...handlers}
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
  w: number;
  h: number;
  size: number;
  onMove: (x: number, y: number) => void;
  onDragging: (on: boolean) => void;
}

/** One of a player's buddies; only its owner can move it. */
function Pal({ value, mine, spot, w, h, size, onMove, onDragging }: PalProps) {
  const { handlers, at, lifted } = useDrag({ spot, w, h, enabled: mine, onMove, onDragging });
  return (
    <View
      {...handlers}
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
  baked: boolean;
  spot: Spot;
  w: number;
  h: number;
  size: number;
  onMove: (x: number, y: number) => void;
  land: (s: Spot) => Spot;
  onDragging: (on: boolean) => void;
}

/** A thing in the room anyone can pick up: it drops onto the shelf or counter under it when let go. */
function Prop({ prop, baked, spot, w, h, size, onMove, land, onDragging }: PropProps) {
  const { handlers, at, lifted } = useDrag({ spot, w, h, enabled: true, onMove, onDragging, fit: inRoom, land });
  const box = size * 1.25;
  return (
    <View
      {...handlers}
      accessibilityLabel={`${baked && prop.bakeTo ? prop.bakeTo : prop.emoji}. Drag to move.`}
      style={[styles.prop, { width: box, height: box, left: at.x * w - box / 2, top: at.y * h - box + size * 0.1 }, lifted && styles.lifted]}
    >
      <Text style={{ fontSize: size, lineHeight: box }}>{baked && prop.bakeTo ? prop.bakeTo : prop.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  person: { position: 'absolute', alignItems: 'center' },
  prop: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
  lifted: { transform: [{ scale: 1.12 }], zIndex: 50 },
  wave: { fontSize: 24, height: 30 },
  acc: { position: 'absolute', alignSelf: 'center', textAlign: 'center', left: 0, right: 0 },
  name: { fontSize: 14, fontWeight: '800', color: '#3B2B25', backgroundColor: 'rgba(255,255,255,0.75)', paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden' },
  me: { color: '#3B5BFF' },
});
