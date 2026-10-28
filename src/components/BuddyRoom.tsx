import { useRef, useState, type ReactNode } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Text } from '@/components/AppText';
import { BuddyFace } from '@/components/BuddyFace';
import { findRoomItem, FLOOR_COLORS, WALL_COLORS } from '@/constants/room';
import type { Room, RoomSpot } from '@/types';
import { FLOOR_LINE } from '@/utils/room';

interface Props {
  room: Room;
  buddy: { emoji: string; gift: string | null; name: string };
  /** Put-away mode: tapping a thing sends it to the toy box instead. */
  tidying: boolean;
  onMove: (key: string, spot: RoomSpot) => void;
  onTapThing: (key: string) => void;
  onTapBuddy: () => void;
}

const TRIM = '#A86B45';
const OUTLINE = '#5B3A24';
/** Below this many pixels of movement a touch counts as a tap. */
const TAP_SLOP = 6;

/**
 * A side-view room, drawn with flat shapes: wall, floor, window and door. The
 * buddy and every placed thing can be dragged around; lower things draw in front.
 */
export function BuddyRoom({ room, buddy, tidying, onMove, onTapThing, onTapBuddy }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout);
  const { width, height } = size;

  const pieces = [
    { key: 'buddy', x: room.buddy.x, y: room.buddy.y, size: 0.34 },
    ...room.things
      .filter((t) => t.placed)
      .map((t) => ({ key: t.key, x: t.x, y: t.y, size: findRoomItem(t.itemId)?.size ?? 0.12 })),
  ].sort((a, b) => a.y - b.y);

  return (
    <View
      style={[styles.room, { backgroundColor: WALL_COLORS[room.wall] ?? WALL_COLORS[0] }]}
      onLayout={onLayout}
      accessibilityLabel={`${buddy.name}'s room`}
    >
      <View
        style={[
          styles.floor,
          {
            top: `${FLOOR_LINE * 100}%`,
            backgroundColor: FLOOR_COLORS[room.floor] ?? FLOOR_COLORS[0],
          },
        ]}
      />
      <View style={[styles.baseboard, { top: `${FLOOR_LINE * 100 - 2}%` }]} />
      <View style={styles.door}>
        <View style={styles.doorPanel} />
        <View style={styles.knob} />
      </View>
      <View style={styles.window}>
        <View style={styles.sky}>
          <Text style={styles.sun}>☀️</Text>
          <Text style={styles.tree}>🌳</Text>
          <View style={styles.hill} />
        </View>
        <View style={styles.mullion} />
        <View style={styles.sill} />
      </View>

      {width > 0
        ? pieces.map((piece) => (
            <Draggable
              key={piece.key}
              spot={piece}
              pixels={Math.round(piece.size * height)}
              room={size}
              onMove={(spot) => onMove(piece.key, spot)}
              onTap={() => (piece.key === 'buddy' ? onTapBuddy() : onTapThing(piece.key))}
              wobble={tidying && piece.key !== 'buddy'}
            >
              {piece.key === 'buddy' ? (
                <BuddyFace
                  value={buddy.emoji}
                  size={Math.round((piece.size * height) / 1.25)}
                  gift={buddy.gift}
                />
              ) : (
                <Text style={{ fontSize: Math.round(piece.size * height * 0.85) }}>
                  {findRoomItem(room.things.find((t) => t.key === piece.key)?.itemId ?? '')?.emoji}
                </Text>
              )}
            </Draggable>
          ))
        : null}
    </View>
  );
}

interface DraggableProps {
  spot: RoomSpot;
  /** Drawn height in pixels; the spot is the middle of its bottom edge. */
  pixels: number;
  room: { width: number; height: number };
  onMove: (spot: RoomSpot) => void;
  onTap: () => void;
  wobble: boolean;
  children: ReactNode;
}

function Draggable({ spot, pixels, room, onMove, onTap, wobble, children }: DraggableProps) {
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  // PanResponder is made once, so it reads the latest props through a ref.
  const latest = useRef({ spot, room, onMove, onTap });
  latest.current = { spot, room, onMove, onTap };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the page from scrolling while something is being dragged.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => setDrag({ dx: 0, dy: 0 }),
      onPanResponderMove: (_, g) => setDrag({ dx: g.dx, dy: g.dy }),
      onPanResponderRelease: (_, g) => {
        setDrag(null);
        const { spot: s, room: r } = latest.current;
        if (Math.abs(g.dx) < TAP_SLOP && Math.abs(g.dy) < TAP_SLOP) latest.current.onTap();
        else latest.current.onMove({ x: s.x + g.dx / r.width, y: s.y + g.dy / r.height });
      },
      onPanResponderTerminate: () => setDrag(null),
    }),
  ).current;

  const left = spot.x * room.width - pixels / 2 + (drag?.dx ?? 0);
  const top = spot.y * room.height - pixels + (drag?.dy ?? 0);
  return (
    <View
      {...responder.panHandlers}
      style={[
        styles.piece,
        { left, top, width: pixels, height: pixels },
        drag && styles.lifted,
        wobble && styles.wobble,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  room: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: OUTLINE,
    overflow: 'hidden',
  },
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 3,
    borderColor: OUTLINE,
  },
  baseboard: { position: 'absolute', left: 0, right: 0, height: '2%', backgroundColor: TRIM },
  door: {
    position: 'absolute',
    left: '6%',
    top: '14%',
    width: '20%',
    height: '52%',
    backgroundColor: TRIM,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    padding: '8%',
  },
  doorPanel: { flex: 1, borderWidth: 2, borderColor: OUTLINE, borderRadius: 4, opacity: 0.5 },
  knob: {
    position: 'absolute',
    right: '12%',
    top: '52%',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F2C14E',
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  window: {
    position: 'absolute',
    right: '8%',
    top: '10%',
    width: '40%',
    height: '34%',
    backgroundColor: TRIM,
    borderWidth: 3,
    borderColor: OUTLINE,
    padding: 6,
  },
  sky: {
    flex: 1,
    backgroundColor: '#9ED8F5',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  sun: { position: 'absolute', right: '8%', top: '6%', fontSize: 22 },
  tree: { position: 'absolute', left: '8%', bottom: '4%', fontSize: 34, zIndex: 1 },
  hill: {
    position: 'absolute',
    left: '-20%',
    right: '-20%',
    bottom: '-60%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#8CCB7A',
  },
  mullion: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 5,
    marginLeft: -2,
    backgroundColor: TRIM,
  },
  sill: {
    position: 'absolute',
    left: -8,
    right: -8,
    bottom: -10,
    height: 10,
    backgroundColor: TRIM,
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  piece: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
  lifted: { transform: [{ scale: 1.12 }], zIndex: 10 },
  wobble: { transform: [{ rotate: '-6deg' }], opacity: 0.85 },
});

