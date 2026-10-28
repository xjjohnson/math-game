import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { Text } from '@/components/AppText';
import { BuddyFigure, type Dressed } from '@/components/BuddyFigure';
import { PersonFigure, type PersonDressed } from '@/components/PersonFigure';
import { Furniture } from '@/components/Furniture';
import { PopIn } from '@/components/PopIn';
import {
  CUPBOARDS,
  FLOOR_COLORS,
  HOME_AREAS,
  WALL_COLORS,
  type AreaId,
  type Cupboard,
  type FixtureSpot,
  type Season,
} from '@/constants/room';
import type { PersonLook } from '@/constants/wardrobe';
import type { BuddySpot, Room } from '@/types';
import {
  dropBuddy,
  dropThing,
  fixtureBox,
  homeSize,
  layoutHome,
  OPEN_DOOR,
  ridersOf,
  shelvesOf,
  type Box,
  type HomeSize,
  type Piece,
} from '@/utils/home';
import { AREA_COUNT, type Placement } from '@/utils/room';

export interface HomeBuddy {
  /** Shop item id. */
  id: string;
  emoji: string;
  gift: string | null;
  name: string;
  spot: BuddySpot;
  fur: string;
  belly: string;
  dressed: Dressed;
  /** People are drawn from their looks and clothes instead of a face emoji. */
  person?: { look: PersonLook; dressed: PersonDressed };
}

interface Props {
  room: Room;
  buddies: HomeBuddy[];
  /** Area in view, an index into HOME_AREAS. Changing it scrolls there. */
  area: number;
  onAreaChange: (area: number) => void;
  /** Put-away mode: tapping a thing sends it to the toy box instead. */
  tidying: boolean;
  /** This month's holiday, which shows outside the windows. */
  season: Season | null;
  onPlaceThing: (key: string, place: Placement) => void;
  onPlaceBuddy: (buddyId: string, place: Placement) => void;
  onTapThing: (key: string) => void;
  onTapBuddy: (buddyId: string) => void;
  /** A door was opened or shut: a cupboard's name, or "door" and "curtains". */
  onToggle?: (name: string, open: boolean) => void;
}

const TRIM = '#A86B45';
const OUTLINE = '#5B3A24';
const DOOR = '#C68B5E';
/** Below this many pixels of movement a touch counts as a tap. */
const TAP_SLOP = 6;
/** Holding a dragged thing this close to the side scrolls the home that way. */
const EDGE = 40;
const EDGE_STEP = 10;
/** How long a tap's little picture floats over a thing. */
const POP_MS = 1300;

/** Built-ins that are only drawn, plus the front door and windows that open and shut. */
const FRONT_DOOR: FixtureSpot = { area: 'living', left: 0.06, width: 0.2, bottom: 0, height: 0.56 };
const LIVING_WINDOW: FixtureSpot = { area: 'living', left: 0.5, width: 0.44, bottom: 0.27, height: 0.34 };
const BED_WINDOW: FixtureSpot = { area: 'bedroom', left: 0.06, width: 0.3, bottom: 0.33, height: 0.3 };
const WALL_SHELF: FixtureSpot = { area: 'bedroom', left: 0.41, width: 0.19, bottom: 0.415, height: 0.025 };
const COUNTER: FixtureSpot = { area: 'kitchen', left: 0.06, width: 0.54, bottom: 0, height: 0.26 };
const TAP: FixtureSpot = { area: 'kitchen', left: 0.2, width: 0.03, bottom: 0.26, height: 0.06 };
const FRIDGE: FixtureSpot = { area: 'kitchen', left: 0.68, width: 0.24, bottom: 0, height: 0.58 };

/** Lets a dragged piece scroll the home when it is held at the side. */
interface Scroller {
  /** Scrolls by up to `dx` pixels and returns how far it really moved. */
  scrollBy: (dx: number) => number;
  viewWidth: number;
}

interface Pop {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

/**
 * The buddies' home, filling the space it is given: a living room, kitchen and bedroom
 * side by side that scroll left and right, drawn with flat shapes. Buddies and things
 * can be dragged anywhere; small things can go in cupboards, on tables and seats, or
 * into a buddy's hands, and buddies can sit on seats. Doors and curtains open on a tap.
 */
export function BuddyRoom(props: Props) {
  const { room, buddies, area, onAreaChange, tidying, season, onPlaceThing, onPlaceBuddy } = props;
  const { onTapThing, onTapBuddy, onToggle } = props;
  const [view, setView] = useState({ width: 0, height: 0 });
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [lit, setLit] = useState<ReadonlySet<string>>(new Set());
  const [drag, setDrag] = useState<{ keys: Set<string>; dx: number; dy: number } | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const popId = useRef(0);
  const popTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scroll = useRef<ScrollViewInstance>(null);
  const scrollX = useRef(0);
  const reported = useRef(area);
  const size: HomeSize | null = view.width > 0 && view.height > 0 ? homeSize(view.width, view.height) : null;

  useEffect(() => () => popTimers.current.forEach(clearTimeout), []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setView({ width: Math.round(width), height: Math.round(height) });
  };

  /** Scroll position that puts the middle of an area in the middle of the screen. */
  const areaScroll = (i: number) =>
    size ? Math.min(size.width - view.width, Math.max(0, i * size.areaWidth + (size.areaWidth - view.width) / 2)) : 0;
  const areaInView = (x: number) =>
    size ? Math.min(AREA_COUNT - 1, Math.max(0, Math.floor((x + view.width / 2) / size.areaWidth))) : 0;

  // Scroll to the area picked outside (the room buttons), but not to one we just reported.
  useEffect(() => {
    if (!size) return;
    if (area !== reported.current || areaInView(scrollX.current) !== area || scrollX.current === 0) {
      reported.current = area;
      scroll.current?.scrollTo({ x: areaScroll(area), animated: scrollX.current !== 0 });
    }
    // Only when the area or the home's width changes; a drawer opening only changes its height.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, size?.width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = e.nativeEvent.contentOffset.x;
    const now = areaInView(scrollX.current);
    if (now !== reported.current) {
      reported.current = now;
      onAreaChange(now);
    }
  };

  const scroller: Scroller = {
    viewWidth: view.width,
    scrollBy: (dx) => {
      if (!size) return 0;
      const to = Math.min(size.width - view.width, Math.max(0, scrollX.current + dx));
      const moved = to - scrollX.current;
      if (moved !== 0) {
        scrollX.current = to;
        scroll.current?.scrollTo({ x: to, animated: false });
      }
      return moved;
    },
  };

  const pop = (x: number, y: number, emoji: string) => {
    const id = ++popId.current;
    setPops((list) => [...list, { id, x, y, emoji }]);
    popTimers.current.push(setTimeout(() => setPops((list) => list.filter((p) => p.id !== id)), POP_MS));
  };

  const toggle = (id: string, name: string) => {
    const now = !open.has(id);
    setOpen((set) => {
      const next = new Set(set);
      if (now) next.add(id);
      else next.delete(id);
      return next;
    });
    onToggle?.(name, now);
  };

  if (!size) {
    return <View style={styles.frame} onLayout={onLayout} />;
  }

  const pieces = layoutHome(
    room,
    buddies.map((b) => ({ id: b.id, spot: b.spot })),
    size,
    open,
  );
  const byKey = new Map(pieces.map((p) => [p.key, p]));
  const buddyById = new Map(buddies.map((b) => [b.id, b]));

  const tapPiece = (piece: Piece) => {
    if (piece.buddyId) return onTapBuddy(piece.buddyId);
    const item = piece.item;
    if (!tidying && item) {
      if (item.light) {
        setLit((set) => {
          const next = new Set(set);
          if (next.has(piece.key)) next.delete(piece.key);
          else next.add(piece.key);
          return next;
        });
      } else {
        pop(piece.x, piece.y - piece.height, item.fx ?? (item.group === 'kitchen' ? '😋' : '✨'));
      }
    }
    onTapThing(piece.key);
  };

  const dropPiece = (piece: Piece, dx: number, dy: number) => {
    if (piece.buddyId) onPlaceBuddy(piece.buddyId, dropBuddy(pieces, piece, dx, dy, size));
    else onPlaceThing(piece.key, dropThing(pieces, piece, dx, dy, size, open));
  };

  return (
    <View style={styles.frame} onLayout={onLayout} accessibilityLabel="The buddies' home">
      <ScrollView
        ref={scroll}
        horizontal
        scrollEnabled={!drag}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={{ height: size.height }}
        contentContainerStyle={{ width: size.width, height: size.height }}
      >
        {HOME_AREAS.map((a, i) => (
          <Area
            key={a.id}
            id={a.id}
            index={i}
            size={size}
            wall={WALL_COLORS[room.paint[i]?.wall ?? 0] ?? WALL_COLORS[0]}
            floor={FLOOR_COLORS[room.paint[i]?.floor ?? 0] ?? FLOOR_COLORS[0]}
          />
        ))}

        <FrontDoor
          box={fixtureBox(FRONT_DOOR, size)}
          open={open.has('frontDoor')}
          season={season}
          onPress={() => toggle('frontDoor', 'door')}
        />
        <Window
          box={fixtureBox(LIVING_WINDOW, size)}
          shut={open.has('livingCurtains')}
          season={season}
          onPress={() => toggle('livingCurtains', 'curtains')}
        />
        <Window
          box={fixtureBox(BED_WINDOW, size)}
          shut={open.has('bedCurtains')}
          night
          season={season}
          onPress={() => toggle('bedCurtains', 'curtains')}
        />
        <View style={[styles.wallShelf, boxStyle(fixtureBox(WALL_SHELF, size))]} />
        <Counter box={fixtureBox(COUNTER, size)} />
        <Pressable
          onPress={() => {
            const tap = fixtureBox(TAP, size);
            pop(tap.left + tap.width / 2, tap.top, '💧');
          }}
          accessibilityRole="button"
          accessibilityLabel="Kitchen tap"
          style={[styles.tap, boxStyle(fixtureBox(TAP, size))]}
        />
        <View style={[styles.fridge, boxStyle(fixtureBox(FRIDGE, size))]} />
        {CUPBOARDS.map((c) => (
          <CupboardView
            key={c.id}
            cupboard={c}
            size={size}
            open={open.has(c.id)}
            onPress={() => toggle(c.id, c.name)}
          />
        ))}

        {pieces.map((piece) => {
          const riding = drag?.keys.has(piece.key);
          const buddy = piece.buddyId ? buddyById.get(piece.buddyId) : undefined;
          const parent = piece.parent ? byKey.get(piece.parent) : undefined;
          return (
            <Draggable
              key={piece.key}
              box={{ left: piece.x - piece.width / 2, top: piece.y - piece.height, width: piece.width, height: piece.height }}
              offset={riding && drag ? drag : null}
              scroller={scroller}
              onLift={() => setDrag({ keys: ridersOf(pieces, piece.key), dx: 0, dy: 0 })}
              onDrag={(dx, dy) => setDrag((d) => (d ? { ...d, dx, dy } : d))}
              onDrop={(dx, dy) => {
                setDrag(null);
                dropPiece(piece, dx, dy);
              }}
              onCancel={() => setDrag(null)}
              onTap={() => {
                setDrag(null);
                tapPiece(piece);
              }}
              wobble={tidying && !piece.buddyId}
              label={buddy ? buddy.name : piece.item?.name ?? 'Thing'}
            >
              {lit.has(piece.key) ? (
                <View
                  style={[
                    styles.glow,
                    {
                      width: piece.height * 2.4,
                      height: piece.height * 2.4,
                      left: (piece.width - piece.height * 2.4) / 2,
                      top: -piece.height * 0.9,
                    },
                  ]}
                />
              ) : null}
              {buddy ? (
                <>
                  {buddy.person ? (
                    <PersonFigure
                      look={buddy.person.look}
                      size={Math.round(piece.height)}
                      dressed={buddy.person.dressed}
                      gift={buddy.gift}
                    />
                  ) : (
                    <BuddyFigure
                      value={buddy.emoji}
                      size={Math.round(piece.height)}
                      fur={buddy.fur}
                      belly={buddy.belly}
                      dressed={buddy.dressed}
                      gift={buddy.gift}
                    />
                  )}
                  {parent?.item?.sleep ? (
                    <Text style={[styles.zzz, { fontSize: Math.round(piece.height * 0.3) }]}>💤</Text>
                  ) : null}
                </>
              ) : piece.item?.draw ? (
                <Furniture shape={piece.item.draw} width={piece.width} height={piece.height} />
              ) : (
                <Text style={{ fontSize: Math.round(piece.height * 0.85), lineHeight: Math.round(piece.height) }}>
                  {piece.item?.emoji}
                </Text>
              )}
            </Draggable>
          );
        })}

        {pops.map((p) => (
          <PopIn
            key={p.id}
            damping={8}
            style={[styles.pop, { left: p.x - size.unit * 0.06, top: p.y - size.unit * 0.13 }]}
          >
            <Text style={{ fontSize: Math.round(size.unit * 0.09) }}>{p.emoji}</Text>
          </PopIn>
        ))}
      </ScrollView>
    </View>
  );
}

function boxStyle(box: Box) {
  return { left: box.left, top: box.top, width: box.width, height: box.height };
}

interface AreaProps {
  id: AreaId;
  index: number;
  size: HomeSize;
  wall: string;
  floor: string;
}

/** One area's wall and floor. */
function Area({ id, index, size, wall, floor }: AreaProps) {
  return (
    <View style={[styles.area, { left: index * size.areaWidth, width: size.areaWidth, backgroundColor: wall }]}>
      <View style={[styles.floor, { top: size.floorY, backgroundColor: floor }]} />
      <View style={[styles.baseboard, { top: size.floorY - 8 }]} />
      {id === 'bedroom' ? (
        <View
          style={[
            styles.rug,
            { top: size.floorY + (size.height - size.floorY) * 0.45, height: (size.height - size.floorY) * 0.25 },
          ]}
        />
      ) : null}
      {index > 0 ? <View style={[styles.divider, { height: size.floorY }]} /> : null}
    </View>
  );
}

/** What you see through a window or the open front door. */
function Outside({ season, night = false }: { season: Season | null; night?: boolean }) {
  return (
    <View style={[styles.sky, night && styles.night]}>
      {night ? (
        <>
          <Text style={styles.moon}>🌙</Text>
          <Text style={styles.star}>⭐</Text>
        </>
      ) : (
        <>
          <Text style={styles.sun}>{season === 'halloween' ? '🦇' : '☀️'}</Text>
          <Text style={styles.tree}>{season === 'thanksgiving' ? '🍁' : '🌳'}</Text>
        </>
      )}
      {season === 'thanksgiving' ? <Text style={styles.leaf}>🍂</Text> : null}
      {season === 'halloween' && !night ? <Text style={styles.pumpkin}>🎃</Text> : null}
      {season === 'thanksgiving' && !night ? <Text style={styles.pumpkin}>🦃</Text> : null}
      <View style={[styles.hill, night && styles.nightHill]} />
    </View>
  );
}

function FrontDoor({ box, open, season, onPress }: { box: Box; open: boolean; season: Season | null; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={open ? 'Shut the front door' : 'Open the front door'}
      style={[styles.doorFrame, boxStyle(box)]}
    >
      {open ? (
        <>
          <Outside season={season} />
          <View style={[styles.doorOpen, { width: box.width * 0.22 }]} />
        </>
      ) : (
        <View style={styles.door}>
          <View style={styles.doorPanel} />
          <View style={styles.doorPanel} />
          <View style={styles.knob} />
        </View>
      )}
    </Pressable>
  );
}

interface WindowProps {
  box: Box;
  /** Curtains drawn. */
  shut: boolean;
  night?: boolean;
  season: Season | null;
  onPress: () => void;
}

function Window({ box, shut, night = false, season, onPress }: WindowProps) {
  const side = shut ? '50%' : '14%';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={shut ? 'Open the curtains' : 'Close the curtains'}
      style={[styles.window, boxStyle(box)]}
    >
      <Outside season={season} night={night} />
      <View style={styles.mullion} />
      <View style={[styles.curtain, { left: 0, width: side }]} />
      <View style={[styles.curtain, { right: 0, width: side }]} />
      <View style={styles.rod} />
      <View style={styles.sill} />
    </Pressable>
  );
}

function Counter({ box }: { box: Box }) {
  return (
    <View style={[styles.counter, boxStyle(box)]}>
      <View style={styles.counterTop} />
    </View>
  );
}

const INSIDE: Record<Cupboard['kind'], string> = {
  cupboard: '#7A4E30',
  wardrobe: '#6D4C41',
  fridge: '#E3F2FD',
  freezer: '#D6ECFA',
  oven: '#2B2F33',
};

/** A built-in with a door: tap to open it onto its shelves, tap again to shut it. */
function CupboardView({ cupboard: c, size, open, onPress }: { cupboard: Cupboard; size: HomeSize; open: boolean; onPress: () => void }) {
  const box = fixtureBox(c, size);
  const { inner, band } = shelvesOf(c, size);
  const cold = c.kind === 'fridge' || c.kind === 'freezer';
  const doorColor = cold ? '#F4F7F9' : c.kind === 'oven' ? '#5F6B73' : DOOR;
  const label = `${open ? 'Shut' : 'Open'} the ${c.name}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.cupboard, boxStyle(box), cold && styles.coldBox, c.kind === 'wardrobe' && styles.wardrobe]}
    >
      {open ? (
        <View
          style={[
            styles.inside,
            {
              left: inner.left - box.left,
              top: inner.top - box.top,
              width: inner.width,
              height: inner.height,
              backgroundColor: INSIDE[c.kind],
            },
          ]}
        >
          {c.kind === 'wardrobe' ? <View style={styles.rail} /> : null}
          {c.kind === 'oven' ? <View style={styles.ovenGlow} /> : null}
          {cold ? <View style={styles.fridgeLight} /> : null}
          {Array.from({ length: c.shelves }, (_, i) => (
            <View
              key={i}
              style={[styles.board, { top: band * (i + 1) - 4 }, cold && styles.wire, c.kind === 'oven' && styles.rack]}
            />
          ))}
          {/* The open door, seen edge-on at the hinge side. */}
          <View style={[styles.openDoor, { left: 0, backgroundColor: doorColor, width: inner.width * OPEN_DOOR }]} />
          {c.doors > 1 ? (
            <View style={[styles.openDoor, { right: 0, backgroundColor: doorColor, width: inner.width * OPEN_DOOR }]} />
          ) : null}
        </View>
      ) : (
        <View style={styles.doors}>
          {Array.from({ length: c.doors }, (_, i) => (
            <View key={i} style={[styles.cupboardDoor, { backgroundColor: doorColor }, cold && styles.coldDoor]}>
              {c.kind === 'oven' ? <View style={styles.ovenWindow} /> : null}
              <View style={[styles.handle, cold ? styles.coldHandle : i % 2 ? styles.handleLeft : styles.handleRight]} />
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

interface DraggableProps {
  /** Where it is drawn, in pixels across the home. */
  box: Box;
  /** How far it has been carried, while it or what it rests on is being dragged. */
  offset: { dx: number; dy: number } | null;
  scroller: Scroller;
  onLift: () => void;
  onDrag: (dx: number, dy: number) => void;
  onDrop: (dx: number, dy: number) => void;
  onCancel: () => void;
  onTap: () => void;
  wobble: boolean;
  label: string;
  children: ReactNode;
}

function Draggable(props: DraggableProps) {
  const { box, offset, wobble, label, children } = props;
  // PanResponder is made once, so it reads the latest props through a ref.
  const latest = useRef(props);
  latest.current = props;
  // How far the home scrolled under the finger during this drag, and the edge scrolling timer.
  const gesture = useRef({ extra: 0, dx: 0, dy: 0, startX: 0, dir: 0, moved: false });
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
        gesture.current = { extra: 0, dx: 0, dy: 0, startX: e.nativeEvent.pageX, dir: 0, moved: false };
      },
      onPanResponderMove: (_, g) => {
        const now = gesture.current;
        if (!now.moved) {
          if (Math.abs(g.dx) < TAP_SLOP && Math.abs(g.dy) < TAP_SLOP) return;
          now.moved = true;
          latest.current.onLift();
        }
        now.dx = g.dx;
        now.dy = g.dy;
        const x = now.startX + g.dx;
        const { viewWidth } = latest.current.scroller;
        now.dir = x < EDGE ? -1 : x > viewWidth - EDGE ? 1 : 0;
        if (now.dir !== 0 && !timer.current) {
          timer.current = setInterval(() => {
            const g2 = gesture.current;
            if (g2.dir === 0) return stopEdgeScroll();
            g2.extra += latest.current.scroller.scrollBy(g2.dir * EDGE_STEP);
            latest.current.onDrag(g2.dx + g2.extra, g2.dy);
          }, 16);
        }
        latest.current.onDrag(g.dx + now.extra, g.dy);
      },
      onPanResponderRelease: (_, g) => {
        stopEdgeScroll();
        const now = gesture.current;
        if (!now.moved) latest.current.onTap();
        else latest.current.onDrop(g.dx + now.extra, g.dy);
      },
      onPanResponderTerminate: () => {
        stopEdgeScroll();
        latest.current.onCancel();
      },
    }),
  ).current;

  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityLabel={label}
      style={[
        styles.piece,
        { left: box.left + (offset?.dx ?? 0), top: box.top + (offset?.dy ?? 0), width: box.width, height: box.height },
        offset && styles.lifted,
        wobble && styles.wobble,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
  area: { position: 'absolute', top: 0, bottom: 0 },
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 3,
    borderColor: OUTLINE,
  },
  baseboard: { position: 'absolute', left: 0, right: 0, height: 8, backgroundColor: TRIM },
  divider: {
    position: 'absolute',
    left: -5,
    top: 0,
    width: 10,
    backgroundColor: TRIM,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: OUTLINE,
  },
  rug: {
    position: 'absolute',
    left: '20%',
    width: '50%',
    borderRadius: 999,
    backgroundColor: '#F48FB1',
    borderWidth: 2,
    borderColor: OUTLINE,
    opacity: 0.85,
  },
  doorFrame: {
    position: 'absolute',
    backgroundColor: TRIM,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: 6,
    overflow: 'hidden',
  },
  door: { flex: 1, padding: '12%', gap: 10 },
  doorPanel: { flex: 1, borderWidth: 2, borderColor: OUTLINE, borderRadius: 4, opacity: 0.5 },
  doorOpen: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#8A5636',
    borderRightWidth: 3,
    borderColor: OUTLINE,
  },
  knob: {
    position: 'absolute',
    right: '10%',
    top: '52%',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F2C14E',
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  window: {
    position: 'absolute',
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
  sun: { position: 'absolute', right: '8%', top: '6%', fontSize: 24 },
  tree: { position: 'absolute', left: '8%', bottom: '4%', fontSize: 38, zIndex: 1 },
  leaf: { position: 'absolute', left: '45%', top: '28%', fontSize: 18, zIndex: 1 },
  pumpkin: { position: 'absolute', right: '14%', bottom: '4%', fontSize: 24, zIndex: 1 },
  hill: {
    position: 'absolute',
    left: '-20%',
    right: '-20%',
    bottom: '-60%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#8CCB7A',
  },
  night: { backgroundColor: '#2E3A6E' },
  nightHill: { backgroundColor: '#3E5B4A' },
  moon: { position: 'absolute', left: '12%', top: '10%', fontSize: 28 },
  star: { position: 'absolute', right: '12%', top: '30%', fontSize: 16 },
  mullion: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 5,
    marginLeft: -2,
    backgroundColor: TRIM,
  },
  curtain: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#EF9A9A',
    borderWidth: 2,
    borderColor: OUTLINE,
    opacity: 0.95,
  },
  rod: { position: 'absolute', left: -10, right: -10, top: -8, height: 8, borderRadius: 4, backgroundColor: OUTLINE },
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
  wallShelf: { position: 'absolute', backgroundColor: TRIM, borderWidth: 2, borderColor: OUTLINE },
  counter: { position: 'absolute', backgroundColor: TRIM, borderWidth: 3, borderColor: OUTLINE },
  counterTop: { height: 12, backgroundColor: '#8FA3B0', borderBottomWidth: 2, borderColor: OUTLINE },
  tap: {
    position: 'absolute',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: '#8FA3B0',
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  fridge: {
    position: 'absolute',
    backgroundColor: '#F4F7F9',
    borderWidth: 3,
    borderColor: OUTLINE,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cupboard: {
    position: 'absolute',
    backgroundColor: TRIM,
    borderWidth: 3,
    borderColor: OUTLINE,
    borderRadius: 4,
  },
  coldBox: { backgroundColor: '#F4F7F9', borderRadius: 10 },
  wardrobe: { borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  doors: { flex: 1, flexDirection: 'row', gap: 4, padding: 4 },
  cupboardDoor: {
    flex: 1,
    borderWidth: 2,
    borderColor: OUTLINE,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coldDoor: { borderWidth: 0 },
  handle: { position: 'absolute', top: '42%', width: 6, height: '16%', minHeight: 10, borderRadius: 3, backgroundColor: OUTLINE },
  handleLeft: { left: '12%' },
  handleRight: { right: '12%' },
  coldHandle: { left: '10%', backgroundColor: '#8FA3B0', height: '30%', top: '30%' },
  ovenWindow: { width: '70%', height: '45%', borderRadius: 3, backgroundColor: '#2B2F33' },
  inside: { position: 'absolute', borderWidth: 2, borderColor: OUTLINE },
  board: { position: 'absolute', left: 0, right: 0, height: 5, backgroundColor: TRIM },
  wire: { backgroundColor: '#B0BEC5', height: 3 },
  rack: { backgroundColor: '#90A4AE', height: 3 },
  rail: { position: 'absolute', left: '8%', right: '8%', top: 6, height: 4, borderRadius: 2, backgroundColor: '#BDBDBD' },
  ovenGlow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '35%', backgroundColor: '#FF8A65', opacity: 0.45 },
  fridgeLight: {
    position: 'absolute',
    alignSelf: 'center',
    top: 4,
    width: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF59D',
  },
  openDoor: { position: 'absolute', top: -2, bottom: -2, borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
  piece: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
  lifted: { transform: [{ scale: 1.08 }], zIndex: 10 },
  wobble: { transform: [{ rotate: '-6deg' }], opacity: 0.85 },
  glow: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255, 214, 102, 0.45)' },
  zzz: { position: 'absolute', right: -8, top: -12 },
  pop: { position: 'absolute', zIndex: 20 },
});
