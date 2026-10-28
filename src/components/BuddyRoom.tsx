import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type GestureResponderEvent,
  type HostInstance,
  type ScrollViewInstance,
} from 'react-native';

import { Text } from '@/components/AppText';
import { BuddyFigure, type Dressed } from '@/components/BuddyFigure';
import { PersonFigure, type PersonDressed } from '@/components/PersonFigure';
import { Furniture } from '@/components/Furniture';
import { Drifting, FloatUp, Lively, type BounceKind } from '@/components/Motion';
import { PopIn } from '@/components/PopIn';
import { ApplianceView } from '@/components/Appliance';
import {
  APPLIANCES,
  CHALK_DRAWINGS,
  CUPBOARDS,
  FLOOR_COLORS,
  GADGETS,
  HOME_AREAS,
  WALL_COLORS,
  type Appliance,
  type AreaId,
  type Cupboard,
  type FixtureSpot,
  type Gadget,
  type Season,
} from '@/constants/room';
import type { PersonLook } from '@/constants/wardrobe';
import type { BuddySpot, Room } from '@/types';
import {
  dropBuddy,
  dropThing,
  fixtureBox,
  gadgetBox,
  homeSize,
  layoutHome,
  OPEN_DOOR,
  pieceAt,
  ridersOf,
  shelvesOf,
  type Box,
  type HomeSize,
  type Piece,
} from '@/utils/home';
import { AREA_COUNT, BUDDY_KEY, paintOf, type Placement } from '@/utils/room';

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
  /** The middle of the screen, as a share of the home's width, as the home scrolls. */
  onView?: (at: number) => void;
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
  /** A built-in thing was tapped; `on` is whether it is now switched on. */
  onTapGadget?: (gadget: Gadget, on: boolean) => void;
  /** An appliance was tapped: whether it is now on, and a chalkboard's drawing. */
  onTapAppliance?: (appliance: Appliance, on: boolean, step: number) => void;
  /** Change `n` to have that buddy hop and wave, as when it levels up. */
  cheer?: { buddyId: string; n: number };
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
/** More windows, in the wider parts of each room; the bedroom's and bathroom's look out at night and day. */
const MORE_WINDOWS: { id: string; spot: FixtureSpot; night?: boolean }[] = [
  { id: 'livingCurtains2', spot: { area: 'living', left: 1.7, width: 0.42, bottom: 0.27, height: 0.34 } },
  { id: 'kitchenCurtains', spot: { area: 'kitchen', left: 1.25, width: 0.4, bottom: 0.36, height: 0.28 } },
  { id: 'bedCurtains2', spot: { area: 'bedroom', left: 1.28, width: 0.4, bottom: 0.38, height: 0.26 }, night: true },
  { id: 'bathCurtains', spot: { area: 'bathroom', left: 0.95, width: 0.36, bottom: 0.4, height: 0.22 } },
  { id: 'playCurtains', spot: { area: 'playroom', left: 0.12, width: 0.36, bottom: 0.33, height: 0.3 } },
];
/** Built-in tables, under the dining table and desk ledges. */
const TABLES: FixtureSpot[] = [
  { area: 'kitchen', left: 1.2, width: 0.5, bottom: 0, height: 0.2 },
  { area: 'bedroom', left: 1.25, width: 0.45, bottom: 0, height: 0.2 },
];
const PLAY_SHELF: FixtureSpot = { area: 'playroom', left: 1.1, width: 0.4, bottom: 0.395, height: 0.025 };
const DARK = 'rgba(16, 18, 52, 0.55)';

/** A finger dragging a piece, and what rides along with it. */
interface Track {
  piece: Piece;
  keys: Set<string>;
  /** Where the finger went down, across the whole home. */
  startX: number;
  startY: number;
  pageX: number;
  pageY: number;
  moved: boolean;
}

interface Pop {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

/**
 * The buddies' home, filling the space it is given: rooms several screens wide side by
 * side that scroll left and right, drawn with flat shapes. Buddies and things can be
 * dragged anywhere, two at once with two fingers; small things can go in cupboards, on
 * tables and seats, or into a buddy's hands, and buddies can sit on seats. Doors and
 * curtains open on a tap, and built-in things do something when tapped.
 */
export function BuddyRoom(props: Props) {
  const { room, buddies, area, onAreaChange, onView, tidying, season, onPlaceThing, onPlaceBuddy } = props;
  const { onTapThing, onTapBuddy, onToggle, onTapGadget, onTapAppliance, cheer } = props;
  const [view, setView] = useState({ width: 0, height: 0 });
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [lit, setLit] = useState<ReadonlySet<string>>(new Set());
  const [dark, setDark] = useState<ReadonlySet<AreaId>>(new Set());
  const [looks, setLooks] = useState<Record<string, number>>({});
  /** Appliances switched on, and each chalkboard's drawing. */
  const [running, setRunning] = useState<ReadonlySet<string>>(new Set());
  const [steps, setSteps] = useState<Record<string, number>>({});
  /** How far each piece being dragged (or riding along) has moved, by piece key. */
  const [moving, setMoving] = useState<Record<string, { dx: number; dy: number }>>({});
  const [pops, setPops] = useState<Pop[]>([]);
  /** The last one-off animation for each piece, replayed when `n` changes. */
  const [bumps, setBumps] = useState<Record<string, { n: number; kind: BounceKind }>>({});
  /** Set once the home has drawn, so only things added after that pop in. */
  const drawn = useRef(false);
  const popId = useRef(0);
  const popTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scroll = useRef<ScrollViewInstance>(null);
  const frameRef = useRef<HostInstance>(null);
  /** The home's top left corner on the page, for working out what a finger is on. */
  const frame = useRef({ x: 0, y: 0 });
  const tracks = useRef(new Map<number, Track>());
  const latestPieces = useRef<Piece[]>([]);
  const edgeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollX = useRef(0);
  const reported = useRef(area);
  const size: HomeSize | null = view.width > 0 && view.height > 0 ? homeSize(view.width, view.height) : null;

  useEffect(
    () => () => {
      popTimers.current.forEach(clearTimeout);
      if (edgeTimer.current) clearInterval(edgeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (size) drawn.current = true;
  });

  const bump = (key: string, kind: BounceKind) =>
    setBumps((b) => ({ ...b, [key]: { n: (b[key]?.n ?? 0) + 1, kind } }));

  useEffect(() => {
    if (cheer?.n) bump(BUDDY_KEY + cheer.buddyId, 'hop');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheer?.n]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setView({ width: Math.round(width), height: Math.round(height) });
    frameRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      frame.current = { x: pageX ?? 0, y: pageY ?? 0 };
    });
  };

  /** Scroll position that shows an area from its left wall, where its built-ins start. */
  const areaScroll = (i: number) => (size ? Math.min(size.width - view.width, Math.max(0, i * size.areaWidth)) : 0);
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
    if (size) onView?.((scrollX.current + view.width / 2) / size.width);
    const now = areaInView(scrollX.current);
    if (now !== reported.current) {
      reported.current = now;
      onAreaChange(now);
    }
  };

  const scrollBy = (dx: number) => {
    if (!size) return;
    const to = Math.min(size.width - view.width, Math.max(0, scrollX.current + dx));
    if (to !== scrollX.current) {
      scrollX.current = to;
      scroll.current?.scrollTo({ x: to, animated: false });
    }
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
    return <View ref={frameRef} style={styles.frame} onLayout={onLayout} />;
  }

  const pieces = layoutHome(
    room,
    buddies.map((b) => ({ id: b.id, spot: b.spot })),
    size,
    open,
  );
  latestPieces.current = pieces;
  const byKey = new Map(pieces.map((p) => [p.key, p]));
  const buddyById = new Map(buddies.map((b) => [b.id, b]));

  const tapPiece = (piece: Piece) => {
    if (piece.buddyId) {
      bump(piece.key, 'hop');
      return onTapBuddy(piece.buddyId);
    }
    const item = piece.item;
    if (!tidying && item) {
      if (!item.light) bump(piece.key, 'wiggle');
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
    bump(piece.key, 'land');
    if (piece.buddyId) onPlaceBuddy(piece.buddyId, dropBuddy(pieces, piece, dx, dy, size));
    else onPlaceThing(piece.key, dropThing(pieces, piece, dx, dy, size, open));
  };

  const tapGadget = (g: Gadget) => {
    const box = gadgetBox(g, size);
    let on = true;
    if (g.lightSwitch) {
      on = dark.has(g.area);
      setDark((set) => {
        const next = new Set(set);
        if (on) next.delete(g.area);
        else next.add(g.area);
        return next;
      });
    } else if (g.glow) {
      on = !lit.has(g.id);
      setLit((set) => {
        const next = new Set(set);
        if (on) next.add(g.id);
        else next.delete(g.id);
        return next;
      });
    }
    if (g.looks.length > 1) setLooks((l) => ({ ...l, [g.id]: ((l[g.id] ?? 0) + 1) % g.looks.length }));
    // A switch's picture (a disco ball's dance) shows when the lights go off.
    if (g.fx && (g.lightSwitch ? !on : on)) pop(box.left + box.width / 2, box.top, g.fx);
    onTapGadget?.(g, on);
  };

  const tapAppliance = (a: Appliance) => {
    if (a.kind === 'chalkboard') {
      const step = ((steps[a.id] ?? 0) + 1) % CHALK_DRAWINGS.length;
      setSteps((all) => ({ ...all, [a.id]: step }));
      onTapAppliance?.(a, step > 0, step);
      return;
    }
    const on = !running.has(a.id);
    setRunning((set) => {
      const next = new Set(set);
      if (on) next.add(a.id);
      else next.delete(a.id);
      return next;
    });
    onTapAppliance?.(a, on, 0);
  };

  // Dragging: one responder takes every finger that lands on a piece, so two can be moved at once.
  /** A finger's spot across the whole home. */
  const toHome = (pageX: number, pageY: number) => ({
    x: pageX - frame.current.x + scrollX.current,
    y: pageY - frame.current.y,
  });

  const showMoving = () => {
    const next: Record<string, { dx: number; dy: number }> = {};
    for (const t of tracks.current.values()) {
      if (!t.moved) continue;
      const at = toHome(t.pageX, t.pageY);
      for (const key of t.keys) next[key] = { dx: at.x - t.startX, dy: at.y - t.startY };
    }
    setMoving(next);
  };

  /** The piece under a finger, unless it is already being carried by another. */
  const pieceUnder = (pageX: number, pageY: number): Piece | null => {
    const at = toHome(pageX, pageY);
    const piece = pieceAt(latestPieces.current, at.x, at.y);
    if (!piece) return null;
    const keys = ridersOf(latestPieces.current, piece.key);
    const taken = [...tracks.current.values()].some((t) => [...keys].some((k) => t.keys.has(k)));
    return taken ? null : piece;
  };

  const startTouch = (id: number, pageX: number, pageY: number) => {
    if (tracks.current.has(id)) return;
    const piece = pieceUnder(pageX, pageY);
    if (!piece) return;
    const at = toHome(pageX, pageY);
    tracks.current.set(id, {
      piece,
      keys: ridersOf(latestPieces.current, piece.key),
      startX: at.x,
      startY: at.y,
      pageX,
      pageY,
      moved: false,
    });
  };

  const stopEdge = () => {
    if (edgeTimer.current) clearInterval(edgeTimer.current);
    edgeTimer.current = null;
  };

  /** Which way to scroll while a dragged piece is held at the side of the screen. */
  const edgeDir = () => {
    for (const t of tracks.current.values()) {
      if (!t.moved) continue;
      const x = t.pageX - frame.current.x;
      if (x < EDGE) return -1;
      if (x > view.width - EDGE) return 1;
    }
    return 0;
  };

  const moveTouches = (touches: readonly { identifier: number | string; pageX: number; pageY: number }[]) => {
    let changed = false;
    for (const touch of touches) {
      const t = tracks.current.get(Number(touch.identifier));
      if (!t) continue;
      t.pageX = touch.pageX;
      t.pageY = touch.pageY;
      if (!t.moved) {
        const at = toHome(touch.pageX, touch.pageY);
        if (Math.abs(at.x - t.startX) < TAP_SLOP && Math.abs(at.y - t.startY) < TAP_SLOP) continue;
        t.moved = true;
      }
      changed = true;
    }
    if (!changed) return;
    showMoving();
    if (!edgeTimer.current && edgeDir() !== 0) {
      edgeTimer.current = setInterval(() => {
        const dir = edgeDir();
        if (dir === 0 || tracks.current.size === 0) return stopEdge();
        scrollBy(dir * EDGE_STEP);
        showMoving();
      }, 16);
    }
  };

  const endTouch = (id: number) => {
    const t = tracks.current.get(id);
    if (!t) return;
    tracks.current.delete(id);
    if (tracks.current.size === 0) stopEdge();
    showMoving();
    if (!t.moved) return tapPiece(t.piece);
    const at = toHome(t.pageX, t.pageY);
    dropPiece(t.piece, at.x - t.startX, at.y - t.startY);
  };

  const touchesOf = (e: GestureResponderEvent) =>
    e.nativeEvent.changedTouches?.length ? e.nativeEvent.changedTouches : [e.nativeEvent];

  const dragging = Object.keys(moving).length > 0;

  return (
    <View ref={frameRef} style={styles.frame} onLayout={onLayout} accessibilityLabel="The buddies' home">
      <ScrollView
        ref={scroll}
        horizontal
        scrollEnabled={!dragging}
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
            wall={WALL_COLORS[paintOf(room, i).wall] ?? WALL_COLORS[0]}
            floor={FLOOR_COLORS[paintOf(room, i).floor] ?? FLOOR_COLORS[0]}
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
        {MORE_WINDOWS.map((w) => (
          <Window
            key={w.id}
            box={fixtureBox(w.spot, size)}
            shut={open.has(w.id)}
            night={w.night}
            season={season}
            onPress={() => toggle(w.id, 'curtains')}
          />
        ))}
        {TABLES.map((t) => (
          <TableFixture key={t.area} box={fixtureBox(t, size)} />
        ))}
        <View style={[styles.wallShelf, boxStyle(fixtureBox(PLAY_SHELF, size))]} />
        {GADGETS.map((g) => (
          <GadgetView
            key={g.id}
            gadget={g}
            box={gadgetBox(g, size)}
            look={g.looks[looks[g.id] ?? 0]}
            on={g.lightSwitch ? !dark.has(g.area) : lit.has(g.id)}
            onPress={() => tapGadget(g)}
          />
        ))}
        {CUPBOARDS.map((c) => (
          <CupboardView
            key={c.id}
            cupboard={c}
            size={size}
            open={open.has(c.id)}
            onPress={() => toggle(c.id, c.name)}
          />
        ))}
        {APPLIANCES.map((a) => {
          const box = fixtureBox(a, size);
          const on = running.has(a.id);
          const step = steps[a.id] ?? 0;
          return (
            <ApplianceView
              key={a.id}
              appliance={a}
              {...box}
              on={on}
              step={step}
              label={a.kind === 'chalkboard' ? `Draw on the ${a.name}` : `${on ? 'Turn off' : 'Turn on'} the ${a.name}`}
              onPress={() => tapAppliance(a)}
            />
          );
        })}

        <View
          style={styles.layer}
          pointerEvents="box-none"
          onStartShouldSetResponder={(e) => pieceUnder(e.nativeEvent.pageX, e.nativeEvent.pageY) !== null}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            startTouch(Number(e.nativeEvent.identifier), e.nativeEvent.pageX, e.nativeEvent.pageY);
            // Keeps the home from scrolling under the finger.
            return true;
          }}
          onResponderStart={(e) => touchesOf(e).forEach((t) => startTouch(Number(t.identifier), t.pageX, t.pageY))}
          onResponderMove={(e) => moveTouches(e.nativeEvent.touches?.length ? e.nativeEvent.touches : [e.nativeEvent])}
          onResponderEnd={(e) => touchesOf(e).forEach((t) => endTouch(Number(t.identifier)))}
          onResponderRelease={() => [...tracks.current.keys()].forEach(endTouch)}
          onResponderTerminate={() => {
            tracks.current.clear();
            stopEdge();
            setMoving({});
          }}
        >
          {pieces.map((piece) => {
            const offset = moving[piece.key];
            const buddy = piece.buddyId ? buddyById.get(piece.buddyId) : undefined;
            const parent = piece.parent ? byKey.get(piece.parent) : undefined;
            const asleep = !!parent?.item?.sleep;
            const tall = Math.round(piece.height);
            const b = bumps[piece.key];
            return (
              <PieceView
                key={piece.key}
                box={{ left: piece.x - piece.width / 2, top: piece.y - piece.height, width: piece.width, height: piece.height }}
                offset={offset ?? null}
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
                <PopIn skip={!drawn.current} damping={9} style={styles.fill}>
                  <Lively
                    height={tall}
                    seed={piece.key}
                    breathe={!!buddy && !offset}
                    asleep={asleep}
                    bounce={b?.n}
                    bounceKind={b?.kind}
                    style={styles.fill}
                  >
                    {buddy ? (
                      buddy.person ? (
                        <PersonFigure
                          look={buddy.person.look}
                          size={tall}
                          dressed={buddy.person.dressed}
                          gift={buddy.gift}
                          alive
                          asleep={asleep}
                          wave={b?.kind === 'hop' ? b.n : undefined}
                        />
                      ) : (
                        <BuddyFigure
                          value={buddy.emoji}
                          size={tall}
                          fur={buddy.fur}
                          belly={buddy.belly}
                          dressed={buddy.dressed}
                          gift={buddy.gift}
                          wave={b?.kind === 'hop' ? b.n : undefined}
                        />
                      )
                    ) : piece.item?.draw ? (
                      <Furniture shape={piece.item.draw} width={piece.width} height={piece.height} />
                    ) : (
                      <Text style={{ fontSize: Math.round(piece.height * 0.85), lineHeight: tall }}>
                        {piece.item?.emoji}
                      </Text>
                    )}
                  </Lively>
                </PopIn>
                {buddy && asleep ? (
                  <Drifting rise={piece.height * 0.25} style={styles.zzz}>
                    <Text style={{ fontSize: Math.round(piece.height * 0.3) }}>💤</Text>
                  </Drifting>
                ) : null}
              </PieceView>
            );
          })}
        </View>

        {HOME_AREAS.map((a, i) =>
          dark.has(a.id) ? (
            <View
              key={a.id}
              pointerEvents="none"
              style={[styles.dark, { left: i * size.areaWidth, width: size.areaWidth }]}
            />
          ) : null,
        )}

        {pops.map((p) => (
          <FloatUp
            key={p.id}
            rise={size.unit * 0.12}
            duration={POP_MS}
            style={[styles.pop, { left: p.x - size.unit * 0.06, top: p.y - size.unit * 0.13 }]}
          >
            <Text style={{ fontSize: Math.round(size.unit * 0.09) }}>{p.emoji}</Text>
          </FloatUp>
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
      {id === 'bedroom' || id === 'bathroom' || id === 'playroom' ? (
        <View
          style={[
            id === 'bedroom' ? styles.rug : id === 'bathroom' ? styles.bathMat : styles.playMat,
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
  drawers: '#7A4E30',
  washer: '#CFD8DC',
};

/** A built-in with a door: tap to open it onto its shelves, tap again to shut it. */
function CupboardView({ cupboard: c, size, open, onPress }: { cupboard: Cupboard; size: HomeSize; open: boolean; onPress: () => void }) {
  const box = fixtureBox(c, size);
  const { inner, band } = shelvesOf(c, size);
  const cold = c.kind === 'fridge' || c.kind === 'freezer' || c.kind === 'washer';
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
      ) : c.kind === 'drawers' ? (
        <View style={styles.drawers}>
          {Array.from({ length: c.shelves }, (_, i) => (
            <View key={i} style={[styles.cupboardDoor, { backgroundColor: doorColor }]}>
              <View style={styles.drawerKnob} />
            </View>
          ))}
        </View>
      ) : c.kind === 'washer' ? (
        <View style={styles.washer}>
          <View style={styles.washerPanel}>
            <View style={styles.dial} />
            <View style={styles.dial} />
          </View>
          <View style={[styles.washerDoor, { width: box.height * 0.5, height: box.height * 0.5, borderRadius: box.height }]} />
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

interface PieceViewProps {
  /** Where it is drawn, in pixels across the home. */
  box: Box;
  /** How far it has been carried, while it or what it rests on is being dragged. */
  offset: { dx: number; dy: number } | null;
  wobble: boolean;
  label: string;
  children: ReactNode;
}

/** A buddy or thing in the home. Dragging is handled by the layer it sits in. */
function PieceView({ box, offset, wobble, label, children }: PieceViewProps) {
  return (
    <View
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

interface GadgetViewProps {
  gadget: Gadget;
  box: Box;
  look: string | undefined;
  on: boolean;
  onPress: () => void;
}

/** A built-in thing to tap: its emoji, or a light switch plate. */
function GadgetView({ gadget: g, box, look, on, onPress }: GadgetViewProps) {
  // A disco ball glows with the lights off; a lamp glows while on.
  const glowing = g.lightSwitch ? !on && !!look : g.glow && on;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={g.lightSwitch ? `${g.name}, lights ${on ? 'on' : 'off'}` : g.name}
      style={[styles.gadget, boxStyle(box)]}
    >
      {glowing ? (
        <View
          style={[
            styles.glow,
            { width: box.height * 2.4, height: box.height * 2.4, left: -box.height * 0.7, top: -box.height * 0.7 },
          ]}
        />
      ) : null}
      {look ? (
        <Text style={{ fontSize: Math.round(box.height * 0.8), lineHeight: Math.round(box.height) }}>{look}</Text>
      ) : (
        <View style={styles.switchPlate}>
          <View style={[styles.switchToggle, on ? styles.switchUp : styles.switchDown]} />
        </View>
      )}
    </Pressable>
  );
}

/** A built-in table under a ledge: a top and two legs. */
function TableFixture({ box }: { box: Box }) {
  return (
    <View style={[styles.tableFixture, boxStyle(box)]} pointerEvents="none">
      <View style={styles.tableTop} />
      <View style={[styles.tableLeg, { left: '8%' }]} />
      <View style={[styles.tableLeg, { right: '8%' }]} />
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
  drawers: { flex: 1, gap: 4, padding: 4 },
  drawerKnob: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F2C14E', borderWidth: 2, borderColor: OUTLINE },
  washer: { flex: 1, alignItems: 'center', justifyContent: 'space-around' },
  washerPanel: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderBottomWidth: 2, borderColor: OUTLINE },
  dial: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#90A4AE', borderWidth: 1.5, borderColor: OUTLINE },
  washerDoor: { backgroundColor: '#B3E5FC', borderWidth: 4, borderColor: '#90A4AE' },
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
  fill: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  layer: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  dark: { position: 'absolute', top: 0, bottom: 0, backgroundColor: DARK },
  gadget: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
  switchPlate: {
    width: '70%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: OUTLINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchToggle: { width: '40%', height: '40%', borderRadius: 2, backgroundColor: '#B0BEC5', borderWidth: 1, borderColor: OUTLINE },
  switchUp: { marginBottom: '30%' },
  switchDown: { marginTop: '30%' },
  tableFixture: { position: 'absolute' },
  tableTop: { height: '16%', backgroundColor: TRIM, borderWidth: 3, borderColor: OUTLINE, borderRadius: 4 },
  tableLeg: { position: 'absolute', top: '14%', bottom: 0, width: '7%', backgroundColor: TRIM, borderWidth: 2, borderColor: OUTLINE },
  bathMat: {
    position: 'absolute',
    left: '8%',
    width: '18%',
    borderRadius: 10,
    backgroundColor: '#80CBC4',
    borderWidth: 2,
    borderColor: OUTLINE,
  },
  playMat: {
    position: 'absolute',
    left: '30%',
    width: '40%',
    borderRadius: 999,
    backgroundColor: '#FFCC80',
    borderWidth: 2,
    borderColor: OUTLINE,
    opacity: 0.9,
  },
  lifted: { transform: [{ scale: 1.08 }], zIndex: 10 },
  wobble: { transform: [{ rotate: '-6deg' }], opacity: 0.85 },
  glow: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255, 214, 102, 0.45)' },
  zzz: { position: 'absolute', right: -8, top: -12 },
  pop: { position: 'absolute', zIndex: 20 },
});
