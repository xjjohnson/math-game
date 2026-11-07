import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BuddyFigure } from '@/components/BuddyFigure';
import { FLOOR, Interior } from '@/components/community/Interiors';
import { townSession, useTownState, WAVE_MS } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';
import type { TownPerson, TownPlace } from '@/utils/multiplayer/protocol';
import { clampSpot, spotFor, type Spot } from '@/utils/multiplayer/scene';
import type { BuildingId } from '@/utils/town';

const FURS = ['#F2B880', '#E57373', '#81C784', '#64B5F6', '#BA68C8', '#FFD54F', '#4DB6AC', '#F06292'];
const BELLIES = ['#FFE3C2', '#FFCDD2', '#C8E6C9', '#BBDEFB', '#E1BEE7', '#FFF9C4', '#B2DFDB', '#F8BBD0'];

/** The same color for the same player on every phone. */
export function colorIndex(id: string): number {
  let n = 0;
  for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) % 997;
  return n % FURS.length;
}

/** Keeps people on the floor and inside the room. */
const onFloor = (s: Spot): Spot => {
  const c = clampSpot(s.x, s.y, 0.07);
  return { x: c.x, y: Math.max(FLOOR + 0.04, Math.min(0.97, c.y)) };
};

interface Props {
  place: TownPlace;
  onDoor: (id: BuildingId) => void;
  onExit: () => void;
}

/**
 * A full-screen, side-view place. Everyone who is here stands in it as their
 * character, and anyone can drag anyone around; with a visit running, every
 * phone follows live. Without one it's just you, in the same room.
 */
export function CommunityRoom({ place, onDoor, onExit }: Props) {
  const profile = useActiveProfile();
  const { people, spots, myId, waves, status } = useTownState();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [soloSpots, setSoloSpots] = useState<Record<string, Spot>>({});
  const [soloWave, setSoloWave] = useState(0);

  const visiting = status !== 'off';
  const here: TownPerson[] = visiting
    ? people.filter((p) => p.place === place)
    : [{ id: 'me', name: profile?.name ?? 'You', avatar: profile?.avatar ?? '🙂', place }];
  const self = visiting ? myId : 'me';
  const spotsNow = visiting ? spots : soloSpots;
  const { w, h } = size;
  const token = Math.max(96, Math.min(160, Math.round(h * 0.3)));

  const move = (id: string, x: number, y: number) => {
    if (visiting) townSession().moveTo(id, x, y);
    else setSoloSpots((s) => ({ ...s, [id]: { x, y } }));
  };
  const wave = () => {
    if (visiting) townSession().wave();
    else {
      setSoloWave(Date.now());
      setTimeout(() => setSoloWave(0), WAVE_MS);
    }
  };

  const ordered = here
    .map((p, i) => ({ p, spot: onFloor(spotFor(spotsNow[p.id], i, here.length)) }))
    .sort((a, b) => a.spot.y - b.spot.y);

  return (
    <View style={styles.fill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {w > 0 ? (
        <>
          <Interior place={place} width={w} height={h} onDoor={onDoor} onExit={onExit} />
          {ordered.map(({ p, spot }) => (
            <Person
              key={p.id}
              person={p}
              isMe={p.id === self}
              waving={visiting ? Date.now() - (waves[p.id] ?? 0) < WAVE_MS : p.id === self && soloWave > 0}
              spot={spot}
              w={w}
              h={h}
              token={token}
              onMove={(x, y) => move(p.id, x, y)}
              onTap={() => p.id === self && wave()}
            />
          ))}
        </>
      ) : null}
    </View>
  );
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
}

function Person({ person, isMe, waving, spot, w, h, token, onMove, onTap }: PersonProps) {
  // While a finger is down the person follows it here; other phones get throttled updates.
  const [drag, setDrag] = useState<Spot | null>(null);
  const start = useRef(spot);
  const last = useRef(0);
  const latest = useRef({ spot, w, h, onMove, onTap });
  latest.current = { spot, w, h, onMove, onTap };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = latest.current.spot;
        setDrag(latest.current.spot);
      },
      onPanResponderMove: (_e, g) => {
        const { w: cw, h: ch, onMove: send } = latest.current;
        const next = onFloor({ x: start.current.x + g.dx / cw, y: start.current.y + g.dy / ch });
        setDrag(next);
        const now = Date.now();
        if (now - last.current > 70) {
          last.current = now;
          send(next.x, next.y);
        }
      },
      onPanResponderRelease: (_e, g) => {
        const { w: cw, h: ch, onMove: send, onTap: tap } = latest.current;
        if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) tap();
        else {
          const next = onFloor({ x: start.current.x + g.dx / cw, y: start.current.y + g.dy / ch });
          send(next.x, next.y);
        }
        setDrag(null);
      },
      onPanResponderTerminate: () => setDrag(null),
    }),
  ).current;

  const at = drag ?? spot;
  const i = colorIndex(person.id);
  return (
    <View
      {...pan.panHandlers}
      accessibilityLabel={`${isMe ? 'You' : person.name}. Drag to move.`}
      style={[styles.person, { width: token, left: at.x * w - token / 2, top: at.y * h - token - 14 }, drag && styles.lifted]}
    >
      <Text style={styles.wave}>{waving ? '👋' : ' '}</Text>
      <BuddyFigure value={person.avatar} size={token} fur={FURS[i]} belly={BELLIES[i]} dressed={{}} />
      <Text style={[styles.name, isMe && styles.me]} numberOfLines={1}>
        {isMe ? 'You' : person.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  person: { position: 'absolute', alignItems: 'center' },
  lifted: { transform: [{ scale: 1.12 }], zIndex: 50 },
  wave: { fontSize: 24, height: 30 },
  name: { fontSize: 14, fontWeight: '800', color: '#3B2B25', backgroundColor: 'rgba(255,255,255,0.75)', paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden' },
  me: { color: '#3B5BFF' },
});
