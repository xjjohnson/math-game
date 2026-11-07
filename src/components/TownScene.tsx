import { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { Sticker } from '@/components/Sticker';
import { BUILDINGS } from '@/utils/town';
import { colors, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { townSession, useTownState, WAVE_MS } from '@/services/townSession';
import { clampSpot, spotFor } from '@/utils/multiplayer/scene';
import type { TownPerson, TownPlace } from '@/utils/multiplayer/protocol';

const TOKEN = 64;
const SCENES: Record<TownPlace, { emoji: string; tint: string; floor: string; name: string }> = {
  street: { emoji: '🏘️', tint: '#E3F2FD', floor: '#CFD8DC', name: 'the street' },
  shop: { emoji: '🏪', tint: '#FFEBEE', floor: '#FFCDD2', name: 'the shop' },
  bakery: { emoji: '🥐', tint: '#FFF8E1', floor: '#FFE0B2', name: 'the bakery' },
  library: { emoji: '📚', tint: '#EDE7F6', floor: '#D1C4E9', name: 'the library' },
  park: { emoji: '🌳', tint: '#E8F5E9', floor: '#C8E6C9', name: 'the park' },
};

/**
 * A little shared room for one place. Everyone who is there appears as a
 * token; anyone can drag any token, and everybody's phone follows live.
 * Shows nothing when this phone isn't visiting with friends.
 */
export function TownScene({ place, height = 200 }: { place: TownPlace; height?: number }) {
  const { people, spots, myId, waves, status } = useTownState();
  const [width, setWidth] = useState(0);
  if (status === 'off') return null;
  const look = SCENES[place];
  const here = people.filter((p) => p.place === place);
  const others = here.filter((p) => p.id !== myId);
  const backdrop = place === 'street' ? BUILDINGS.map((b) => b.emoji).join('  ') : `${look.emoji}  ${look.emoji}  ${look.emoji}`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading} accessibilityLiveRegion="polite">
        {others.length ? `In ${look.name}: ${others.map((p) => p.name).join(', ')}` : `You're in ${look.name}. Waiting for friends…`}
      </Text>
      <View
        style={[styles.scene, { height, backgroundColor: look.tint }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityLabel={`Shared scene for ${look.name}. Drag people around.`}
      >
        <Text style={styles.backdrop}>{backdrop}</Text>
        <View style={[styles.floor, { backgroundColor: look.floor }]} />
        {width > 0
          ? here.map((p, i) => (
              <Token
                key={p.id}
                person={p}
                isMe={p.id === myId}
                waving={Date.now() - (waves[p.id] ?? 0) < WAVE_MS}
                spot={spotFor(spots[p.id], i, here.length)}
                width={width}
                height={height}
              />
            ))
          : null}
      </View>
      {others.length ? (
        <Pressable
          onPress={() => townSession().wave()}
          accessibilityRole="button"
          accessibilityLabel="Wave hello"
          style={({ pressed }) => [styles.waveButton, pressed && styles.pressed]}
        >
          <Text style={styles.waveText}>👋 Wave hello</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Token({
  person,
  isMe,
  waving,
  spot,
  width,
  height,
}: {
  person: TownPerson;
  isMe: boolean;
  waving: boolean;
  spot: { x: number; y: number };
  width: number;
  height: number;
}) {
  // While a finger is down this token follows it locally; everyone else gets throttled updates.
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef(spot);
  const last = useRef(0);
  const latest = useRef({ spot, width, height });
  latest.current = { spot, width, height };

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
        const { width: w, height: h } = latest.current;
        const next = clampSpot(start.current.x + g.dx / w, start.current.y + g.dy / h);
        setDrag(next);
        const now = Date.now();
        if (now - last.current > 70) {
          last.current = now;
          townSession().moveTo(person.id, next.x, next.y);
        }
      },
      onPanResponderRelease: (_e, g) => {
        const { width: w, height: h } = latest.current;
        const next = clampSpot(start.current.x + g.dx / w, start.current.y + g.dy / h);
        townSession().moveTo(person.id, next.x, next.y);
        setDrag(null);
      },
      onPanResponderTerminate: () => setDrag(null),
    }),
  ).current;

  const at = drag ?? spot;
  return (
    <View
      {...pan.panHandlers}
      accessibilityLabel={`${isMe ? 'You' : person.name}. Drag to move.`}
      style={[styles.token, { left: at.x * width - TOKEN / 2, top: at.y * height - TOKEN / 2 }, drag && styles.dragging]}
    >
      <Text style={styles.wave}>{waving ? '👋' : ' '}</Text>
      <Sticker value={person.avatar} size={TOKEN - 20} />
      <Text style={[styles.name, isMe && styles.me]} numberOfLines={1}>
        {isMe ? 'You' : person.name}
      </Text>
    </View>
  );
}

/** Tiny avatars for a building tile on the street. */
export function PeopleBadges({ place }: { place: TownPlace }) {
  const { people, myId, status } = useTownState();
  if (status === 'off') return null;
  const here = people.filter((p) => p.place === place && p.id !== myId);
  if (!here.length) return null;
  return (
    <View style={styles.badges} accessibilityLabel={`${here.map((p) => p.name).join(', ')} here`}>
      {here.slice(0, 4).map((p) => (
        <Sticker key={p.id} value={p.avatar} size={28} />
      ))}
      {here.length > 4 ? <Text style={styles.name}>+{here.length - 4}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, alignItems: 'stretch' },
  heading: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center' },
  scene: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 3, borderColor: colors.border },
  backdrop: { position: 'absolute', top: 6, left: 0, right: 0, textAlign: 'center', fontSize: 40, opacity: 0.5 },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  token: { position: 'absolute', width: TOKEN, alignItems: 'center' },
  dragging: { transform: [{ scale: 1.15 }], zIndex: 10 },
  wave: { fontSize: 18, height: 22 },
  name: { fontSize: 13, fontWeight: '700', color: colors.text },
  me: { color: colors.primary },
  waveButton: { alignSelf: 'center', minHeight: TAP_TARGET, paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.primary },
  waveText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  pressed: { transform: [{ scale: 0.97 }] },
  badges: { flexDirection: 'row', gap: 2, alignItems: 'center' },
});
