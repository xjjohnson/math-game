import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  PanResponder,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { Text } from '@/components/AppText';
import { BuddyFace } from '@/components/BuddyFace';
import { findRoomItem, FLOOR_COLORS, HOME_AREAS, WALL_COLORS, type AreaId } from '@/constants/room';
import type { Room, RoomSpot } from '@/types';
import { AREA_COUNT, BUDDY_KEY, FLOOR_LINE } from '@/utils/room';

export interface HomeBuddy {
  /** Shop item id. */
  id: string;
  emoji: string;
  gift: string | null;
  name: string;
  spot: RoomSpot;
}

interface Props {
  room: Room;
  buddies: HomeBuddy[];
  /** Area in view, an index into HOME_AREAS. Changing it scrolls there. */
  area: number;
  onAreaChange: (area: number) => void;
  /** Put-away mode: tapping a thing sends it to the toy box instead. */
  tidying: boolean;
  /** October: the living room window gets a pumpkin and a bat. */
  spooky: boolean;
  onMove: (key: string, spot: RoomSpot) => void;
  onTapThing: (key: string) => void;
  onTapBuddy: (buddyId: string) => void;
}

const TRIM = '#A86B45';
const OUTLINE = '#5B3A24';
/** Below this many pixels of movement a touch counts as a tap. */
const TAP_SLOP = 6;
/** Holding a dragged thing this close to the side scrolls the home that way. */
const EDGE = 40;
const EDGE_STEP = 9;

/** Lets a dragged piece scroll the home when it is held at the side. */
interface Scroller {
  /** Scrolls by up to `dx` pixels and returns how far it really moved. */
  scrollBy: (dx: number) => number;
  scrollX: () => number;
  viewWidth: number;
}

/**
 * A side-view home, drawn with flat shapes: a living room, kitchen and bedroom side by
 * side that scroll left and right. Buddies and placed things can be dragged anywhere
 * in the home; lower things draw in front.
 */
export function BuddyRoom(props: Props) {
  const { room, buddies, area, onAreaChange, tidying, spooky, onMove, onTapThing, onTapBuddy } = props;
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const scrollX = useRef(0);
  const reported = useRef(area);
  const height = Math.round(width * 0.75);
  const homeWidth = width * AREA_COUNT;

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  // Scroll to the area picked outside (the area buttons), but not to one we just reported.
  useEffect(() => {
    if (width === 0) return;
    if (area !== reported.current || Math.round(scrollX.current / width) !== area) {
      reported.current = area;
      scroll.current?.scrollTo({ x: area * width, animated: scrollX.current !== 0 || area !== 0 });
    }
  }, [area, width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = e.nativeEvent.contentOffset.x;
    if (width === 0) return;
    const now = Math.min(AREA_COUNT - 1, Math.max(0, Math.round(scrollX.current / width)));
    if (now !== reported.current) {
      reported.current = now;
      onAreaChange(now);
    }
  };

  const scroller: Scroller = {
    viewWidth: width,
    scrollX: () => scrollX.current,
    scrollBy: (dx) => {
      const to = Math.min(homeWidth - width, Math.max(0, scrollX.current + dx));
      const moved = to - scrollX.current;
      if (moved !== 0) {
        scrollX.current = to;
        scroll.current?.scrollTo({ x: to, animated: false });
      }
      return moved;
    },
  };

  const pieces = [
    ...buddies.map((b) => ({ key: BUDDY_KEY + b.id, x: b.spot.x, y: b.spot.y, size: 0.34, buddy: b })),
    ...room.things
      .filter((t) => t.placed)
      .map((t) => ({
        key: t.key,
        x: t.x,
        y: t.y,
        size: findRoomItem(t.itemId)?.size ?? 0.12,
        buddy: undefined,
        emoji: findRoomItem(t.itemId)?.emoji,
      })),
  ].sort((a, b) => a.y - b.y);

  return (
    <View style={styles.frame} onLayout={onLayout} accessibilityLabel="The buddies' home">
      {width > 0 ? (
        <ScrollView
          ref={scroll}
          horizontal
          scrollEnabled={!dragging}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          style={{ height }}
          contentContainerStyle={{ width: homeWidth, height }}
        >
          {HOME_AREAS.map((a, i) => (
            <Area
              key={a.id}
              id={a.id}
              index={i}
              width={width}
              wall={WALL_COLORS[room.paint[i]?.wall ?? 0] ?? WALL_COLORS[0]}
              floor={FLOOR_COLORS[room.paint[i]?.floor ?? 0] ?? FLOOR_COLORS[0]}
              spooky={spooky}
            />
          ))}
          {pieces.map((piece) => (
            <Draggable
              key={piece.key}
              spot={piece}
              pixels={Math.round(piece.size * height)}
              home={{ width: homeWidth, height }}
              scroller={scroller}
              onLift={setDragging}
              onMove={(spot) => onMove(piece.key, spot)}
              onTap={() => (piece.buddy ? onTapBuddy(piece.buddy.id) : onTapThing(piece.key))}
              wobble={tidying && !piece.buddy}
            >
              {piece.buddy ? (
                <BuddyFace
                  value={piece.buddy.emoji}
                  size={Math.round((piece.size * height) / 1.25)}
                  gift={piece.buddy.gift}
                />
              ) : (
                <Text style={{ fontSize: Math.round(piece.size * height * 0.85) }}>{piece.emoji}</Text>
              )}
            </Draggable>
          ))}
        </ScrollView>
      ) : (
        <View style={{ aspectRatio: 4 / 3 }} />
      )}
    </View>
  );
}

interface AreaProps {
  id: AreaId;
  index: number;
  width: number;
  wall: string;
  floor: string;
  spooky: boolean;
}

/** One area's wall, floor and the built-in bits that make it that room. */
function Area({ id, index, width, wall, floor, spooky }: AreaProps) {
  return (
    <View style={[styles.area, { left: index * width, width, backgroundColor: wall }]}>
      <View style={[styles.floor, { top: `${FLOOR_LINE * 100}%`, backgroundColor: floor }]} />
      <View style={[styles.baseboard, { top: `${FLOOR_LINE * 100 - 2}%` }]} />
      {id === 'living' ? <LivingRoom spooky={spooky} /> : null}
      {id === 'kitchen' ? <Kitchen /> : null}
      {id === 'bedroom' ? <Bedroom /> : null}
      {index > 0 ? <View style={styles.divider} /> : null}
    </View>
  );
}

function LivingRoom({ spooky }: { spooky: boolean }) {
  return (
    <>
      <View style={styles.door}>
        <View style={styles.doorPanel} />
        <View style={styles.knob} />
      </View>
      <View style={styles.window}>
        <View style={styles.sky}>
          <Text style={styles.sun}>{spooky ? '🦇' : '☀️'}</Text>
          <Text style={styles.tree}>🌳</Text>
          {spooky ? <Text style={styles.pumpkin}>🎃</Text> : null}
          <View style={styles.hill} />
        </View>
        <View style={styles.mullion} />
        <View style={styles.sill} />
      </View>
    </>
  );
}

function Kitchen() {
  return (
    <>
      <View style={styles.cupboards}>
        <View style={styles.cupboardDoor} />
        <View style={styles.cupboardDoor} />
        <View style={styles.cupboardDoor} />
      </View>
      <View style={styles.counter}>
        <View style={styles.counterTop} />
        <View style={styles.counterDoors}>
          <View style={styles.cupboardDoor} />
          <View style={[styles.cupboardDoor, styles.oven]}>
            <View style={styles.ovenWindow} />
          </View>
          <View style={styles.cupboardDoor} />
        </View>
      </View>
      <View style={styles.tap} />
      <View style={styles.fridge}>
        <View style={[styles.fridgeHandle, { top: '18%' }]} />
        <View style={styles.fridgeLine} />
        <View style={[styles.fridgeHandle, { top: '50%' }]} />
      </View>
    </>
  );
}

function Bedroom() {
  return (
    <>
      <View style={[styles.window, styles.nightWindow]}>
        <View style={[styles.sky, styles.night]}>
          <Text style={styles.moon}>🌙</Text>
          <Text style={styles.star}>⭐</Text>
        </View>
        <View style={styles.mullion} />
        <View style={styles.sill} />
      </View>
      <View style={styles.shelf} />
      <View style={styles.rug} />
    </>
  );
}

interface DraggableProps {
  spot: RoomSpot;
  /** Drawn height in pixels; the spot is the middle of its bottom edge. */
  pixels: number;
  home: { width: number; height: number };
  scroller: Scroller;
  onLift: (lifted: boolean) => void;
  onMove: (spot: RoomSpot) => void;
  onTap: () => void;
  wobble: boolean;
  children: ReactNode;
}

function Draggable(props: DraggableProps) {
  const { spot, pixels, home, wobble, children } = props;
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  // PanResponder is made once, so it reads the latest props through a ref.
  const latest = useRef(props);
  latest.current = props;
  // How far the home scrolled under the finger during this drag, and the edge scrolling timer.
  const gesture = useRef({ extra: 0, dx: 0, dy: 0, fingerX: 0, dir: 0 });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopEdgeScroll = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stopEdgeScroll, []);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the page from scrolling while something is being dragged.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { spot: s, home: h, pixels: px, scroller } = latest.current;
        // Where the finger is across the visible part of the home.
        const fingerX = s.x * h.width - px / 2 + e.nativeEvent.locationX - scroller.scrollX();
        gesture.current = { extra: 0, dx: 0, dy: 0, fingerX, dir: 0 };
        latest.current.onLift(true);
        setDrag({ dx: 0, dy: 0 });
      },
      onPanResponderMove: (_, g) => {
        const now = gesture.current;
        now.dx = g.dx;
        now.dy = g.dy;
        const x = now.fingerX + g.dx;
        const { viewWidth } = latest.current.scroller;
        now.dir = x < EDGE ? -1 : x > viewWidth - EDGE ? 1 : 0;
        if (now.dir !== 0 && !timer.current) {
          timer.current = setInterval(() => {
            const g2 = gesture.current;
            if (g2.dir === 0) return stopEdgeScroll();
            g2.extra += latest.current.scroller.scrollBy(g2.dir * EDGE_STEP);
            setDrag({ dx: g2.dx + g2.extra, dy: g2.dy });
          }, 16);
        }
        setDrag({ dx: g.dx + now.extra, dy: g.dy });
      },
      onPanResponderRelease: (_, g) => {
        stopEdgeScroll();
        setDrag(null);
        const { spot: s, home: h } = latest.current;
        const dx = g.dx + gesture.current.extra;
        latest.current.onLift(false);
        if (Math.abs(dx) < TAP_SLOP && Math.abs(g.dy) < TAP_SLOP) latest.current.onTap();
        else latest.current.onMove({ x: s.x + dx / h.width, y: s.y + g.dy / h.height });
      },
      onPanResponderTerminate: () => {
        stopEdgeScroll();
        setDrag(null);
        latest.current.onLift(false);
      },
    }),
  ).current;

  const left = spot.x * home.width - pixels / 2 + (drag?.dx ?? 0);
  const top = spot.y * home.height - pixels + (drag?.dy ?? 0);
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
  frame: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 4,
    borderColor: OUTLINE,
    overflow: 'hidden',
  },
  area: { position: 'absolute', top: 0, bottom: 0 },
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 3,
    borderColor: OUTLINE,
  },
  baseboard: { position: 'absolute', left: 0, right: 0, height: '2%', backgroundColor: TRIM },
  divider: {
    position: 'absolute',
    left: -5,
    top: 0,
    bottom: `${(1 - FLOOR_LINE) * 100}%`,
    width: 10,
    backgroundColor: TRIM,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: OUTLINE,
  },
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
  pumpkin: { position: 'absolute', right: '14%', bottom: '4%', fontSize: 22, zIndex: 1 },
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
  cupboards: {
    position: 'absolute',
    left: '6%',
    top: '8%',
    width: '54%',
    height: '18%',
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: TRIM,
    borderWidth: 3,
    borderColor: OUTLINE,
  },
  cupboardDoor: {
    flex: 1,
    borderWidth: 2,
    borderColor: OUTLINE,
    borderRadius: 3,
    backgroundColor: '#C68B5E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    position: 'absolute',
    left: '6%',
    top: '42%',
    width: '54%',
    height: `${FLOOR_LINE * 100 - 42}%`,
    backgroundColor: TRIM,
    borderWidth: 3,
    borderColor: OUTLINE,
  },
  counterTop: { height: 10, backgroundColor: '#8FA3B0', borderBottomWidth: 2, borderColor: OUTLINE },
  counterDoors: { flex: 1, flexDirection: 'row', gap: 4, padding: 4 },
  oven: { backgroundColor: '#5F6B73' },
  ovenWindow: { width: '70%', height: '45%', borderRadius: 3, backgroundColor: '#2B2F33' },
  tap: {
    position: 'absolute',
    left: '22%',
    top: '36%',
    width: 12,
    height: '6%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#8FA3B0',
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  fridge: {
    position: 'absolute',
    right: '8%',
    top: '12%',
    width: '24%',
    height: `${FLOOR_LINE * 100 - 12}%`,
    backgroundColor: '#F4F7F9',
    borderWidth: 3,
    borderColor: OUTLINE,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  fridgeLine: { position: 'absolute', left: 0, right: 0, top: '38%', height: 3, backgroundColor: OUTLINE },
  fridgeHandle: {
    position: 'absolute',
    left: '10%',
    width: 6,
    height: '14%',
    borderRadius: 3,
    backgroundColor: '#8FA3B0',
  },
  nightWindow: { left: '10%', right: undefined, width: '34%' },
  night: { backgroundColor: '#2E3A6E' },
  moon: { position: 'absolute', left: '12%', top: '10%', fontSize: 26 },
  star: { position: 'absolute', right: '12%', top: '40%', fontSize: 16 },
  shelf: {
    position: 'absolute',
    right: '10%',
    top: '30%',
    width: '32%',
    height: 10,
    backgroundColor: TRIM,
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  rug: {
    position: 'absolute',
    left: '22%',
    width: '56%',
    top: '80%',
    height: '10%',
    borderRadius: 999,
    backgroundColor: '#F48FB1',
    borderWidth: 2,
    borderColor: OUTLINE,
    opacity: 0.85,
  },
  piece: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
  lifted: { transform: [{ scale: 1.12 }], zIndex: 10 },
  wobble: { transform: [{ rotate: '-6deg' }], opacity: 0.85 },
});
