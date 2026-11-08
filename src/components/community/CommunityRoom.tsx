import { useEffect, useRef, useState, type ReactNode } from 'react';
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
import { Figure } from '@/components/Figure';
import { BookReader } from '@/components/community/BookReader';
import { Easel } from '@/components/community/Easel';
import { FLOOR, Interior } from '@/components/community/Interiors';
import { Bob, Busy, Glide, Lively, Swing, Wallow, useTimesOn } from '@/components/Motion';
import { ACCESSORIES, GLASSES } from '@/components/VisitPanel';
import { townSession, useTownState, WAVE_MS } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';
import { useSettings } from '@/store/settings';
import { speakText } from '@/utils/feedback';
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
  BAKERY,
  byMixer,
  grabsMixer,
  MIXER_HANG,
  onMixerHang,
  EGG_BASKET,
  EGG_BASKET_MAX,
  EGG_BASKET_SWITCH,
  eggsToUnit,
  inFarmPond,
  inMud,
  MIXER_MIDDLE,
  onAnimal,
  onBasket,
  unitToEggs,
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
import { bookAt } from '@/utils/libraryBooks';
import { carryInPark, offGround, parkLanding, rideAt, slidePath, SWING_PIVOT, type Ride } from '@/utils/park';
import { SKIN_TONES } from '@/constants/wardrobe';
import { figureFor, type FigureLook } from '@/utils/figures';
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
/** Like onFloor, but someone on a swing, the slide or a branch in the park stays up there. */
const keepSpot = (park: boolean, s: Spot): Spot => (park && offGround(s) ? s : onFloor(s));
/** How long each step down the slide takes. */
const SLIDE_STEP_MS = 60;
/** Keeps a prop inside the room while it's carried. */
const inRoom = (s: Spot): Spot => ({ x: clamp(s.x, 0.01, 0.99), y: clamp(s.y, 0.08, 0.95) });

/** How many screens wide each place is; the street and the buildings are long, so they scroll. */
export const ROOM_SCREENS: Record<TownPlace, number> = { street: 4, ...INSIDE_SCREENS };

/**
 * The widest one screen's worth of room gets, compared with its height: about a phone held
 * upright. A wide tablet then shows more of the place at once instead of stretching it sideways.
 */
const SCREEN_ASPECT = 0.6;

/** The room's width in pixels: ROOM_SCREENS phone-shaped screens, and never narrower than the view. */
export function roomWidth(viewW: number, viewH: number, place: TownPlace): number {
  const screen = Math.min(viewW, viewH * SCREEN_ASPECT);
  return Math.max(Math.round(viewW), Math.round(screen * ROOM_SCREENS[place]));
}

/** How long something sits in the hot oven before it's baked. */
const BAKE_MS = 3000;
/** How long the mixer whirrs before the bowl is mixed. */
const MIX_MS = 1500;
/** How long a buddy at the mixer waits, once the bowl is set on the mixer (or more goes in), before it starts mixing. */
const HELPER_WAIT_MS = 1500;
/** How long an animal's "Moo!" stays over its head. */
const SAY_MS = 1800;

/** On joining a friend, things this phone moved this recently are put back the way this phone had them. */
const KEEP_MY_CHANGES_MS = 10 * 60 * 1000;

/**
 * Where things were put while playing alone, kept while the app is open so a
 * tidy classroom is still tidy after doing the job. On a visit the host keeps them instead.
 */
const soloMemory: Record<string, Spot> = {};
/** When each remembered thing last changed, by this phone or a friend. */
const memoryTime: Record<string, number> = {};
function remember(id: string, spot: Spot) {
  soloMemory[id] = { x: spot.x, y: spot.y };
  memoryTime[id] = Date.now();
}

/** Where someone stands until they are moved: along the floor near the door, in order. */
function standSpot(saved: Spot | undefined, index: number, inside: boolean, count: number, park = false): Spot {
  if (saved) return keepSpot(park, saved);
  if (inside) return { x: 0.1 + index * 0.05, y: index % 2 === 0 ? 0.72 : 0.82 };
  return { x: (index + 1) / (count + 1), y: index % 2 === 0 ? 0.68 : 0.78 };
}

interface Props {
  place: TownPlace;
  onDoor: (id: BuildingId) => void;
  onExit: () => void;
}

type Piece =
  | { key: string; kind: 'person'; person: TownPerson; spot: Spot; figure: FigureLook }
  | { key: string; kind: 'pal'; person: TownPerson; spot: Spot; figure: FigureLook; size: number }
  | { key: string; kind: 'prop'; prop: PropDef; spot: Spot; baked: boolean; shown: string; badge?: string; caption?: string; batter?: boolean };

/** How big a room thing is drawn, compared with the usual size. */
const scaleOf = (prop: PropDef): number => prop.scale ?? (prop.big ? 1.4 : 1);

/**
 * A full-screen, side-view place. Everyone who is here stands in it as their
 * character; you can move yourself, your buddies, and the things in the room
 * (pencils on the school desks, books in the library). With a visit running,
 * every phone follows live. Without one it's just you, in the same room.
 */
export function CommunityRoom({ place, onDoor, onExit }: Props) {
  const profile = useActiveProfile();
  const { people, spots, myId, waves, status, look } = useTownState();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [soloSpots, setSoloSpots] = useState<Record<string, Spot>>(() => ({ ...soloMemory }));
  const [soloWave, setSoloWave] = useState(0);
  // School: while fingers are drawing on the chalkboard, the room holds still.
  const [drawing, setDrawing] = useState(false);
  /** The library book open on this phone (only this phone: friends read their own). */
  const [reading, setReading] = useState<{ book: number; cover: string } | null>(null);
  const [painting, setPainting] = useState(false);
  /** Farm: what an animal just said ("Moo!", "Yum!") and when, shown over its head on this phone. */
  const [said, setSaid] = useState<Record<string, { text: string; at: number }>>({});
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
  const roomW = roomWidth(w, h, place);
  const token = Math.max(96, Math.min(160, Math.round(h * 0.3)));

  // Someone sliding down the slide: the steps still to go, stopped if they're picked up again.
  const rides = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const stopRide = (id: string) => {
    if (rides.current[id]) clearInterval(rides.current[id]);
    delete rides.current[id];
  };
  useEffect(() => () => Object.values(rides.current).forEach(clearInterval), []);

  const move = (id: string, x: number, y: number) => {
    stopRide(id);
    put(id, x, y);
  };
  const put = (id: string, x: number, y: number) => {
    // People and buddies start fresh each time; things in the rooms stay where they were put,
    // even when the visit restarts (a phone left alone keeps looking again and again).
    if (id.startsWith('~')) remember(id, { x, y });
    if (visiting) townSession().moveTo(id, x, y);
    else {
      setSoloSpots((s) => ({ ...s, [id]: { x, y } }));
    }
  };
  const putNow = useRef(put);
  putNow.current = put;
  /** Climb the ladder and slide down, one step at a time, so friends watch it happen too. */
  const slideDown = (id: string) => {
    stopRide(id);
    const path = slidePath();
    let step = 0;
    rides.current[id] = setInterval(() => {
      const s = path[step++];
      putNow.current(id, s.x, s.y);
      if (step >= path.length) stopRide(id);
    }, SLIDE_STEP_MS);
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
  const park = place === 'park';
  const mine = standSpot(spotsNow[self], Math.max(0, here.findIndex((p) => p.id === self)), inside, here.length, park);
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
  // The farm's egg basket: how many eggs are in it, kept as a switch too.
  const farm = place === 'farm';
  const basketSwitch = switchPieceId('farm', EGG_BASKET_SWITCH);
  const eggCount = farm ? unitToEggs(spotsNow[basketSwitch]?.x ?? 0) : 0;
  const basketSpot: Spot = spotsNow[propPieceId('farm', EGG_BASKET.id)] ?? { x: EGG_BASKET.x, y: EGG_BASKET.y };
  const animalSpots: { key: string; spot: Spot; prop: PropDef }[] = farm
    ? PLACE_PROPS.farm.filter((p) => p.says).map((p) => ({ key: propPieceId('farm', p.id), prop: p, spot: spotsNow[propPieceId('farm', p.id)] ?? { x: p.x, y: p.y } }))
    : [];
  const latest = useRef({ spotsNow, bowlSpot, bowlMask, bowlMixed, eggCount, basketSpot, animalSpots });
  latest.current = { spotsNow, bowlSpot, bowlMask, bowlMixed, eggCount, basketSpot, animalSpots };

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
        if (prop.eggBasket && eggCount) piece.badge = `🥚 ${eggCount}`;
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
  /** An animal says something over its head for a moment, out loud too when sounds are on. */
  const say = (key: string, text: string) => {
    const at = Date.now();
    setSaid((m) => ({ ...m, [key]: { text, at } }));
    setTimeout(() => setSaid((m) => (m[key]?.at === at ? Object.fromEntries(Object.entries(m).filter(([k]) => k !== key)) : m)), SAY_MS);
    if (useSettings.getState().sound) speakText(text.replace(/[^\p{L}\p{N}!?.,' -]/gu, '').trim(), true);
  };
  /** An egg let go over the basket goes in it (and a new egg is back in the nest). */
  const intoBasket = (prop: PropDef, s: Spot): boolean => !!prop.egg && onBasket(s, latest.current.basketSpot);
  /** The animal some food was let go on, if any. */
  const fedAnimal = (prop: PropDef, s: Spot) => (prop.food ? latest.current.animalSpots.find((a) => onAnimal(s, a.spot, a.prop.scale)) : undefined);
  const dropFarm = (prop: PropDef, s: Spot) => {
    if (intoBasket(prop, s)) {
      move(basketSwitch, eggsToUnit(Math.min(EGG_BASKET_MAX, latest.current.eggCount + 1)), 0);
      return;
    }
    const fed = fedAnimal(prop, s);
    if (fed) say(fed.key, 'Yum! ❤️');
  };

  /** Tap the bowl to tip it out (on the mixer, tapping it starts the mixer); tap a finished treat to eat it. */
  const tapProp = (prop: PropDef): (() => void) | undefined => {
    if (prop.says) return () => say(propPieceId(place as InsidePlace, prop.id), prop.says as string);
    if (prop.eggBasket)
      return () => {
        const n = latest.current.eggCount;
        say(propPieceId('farm', prop.id), n ? `${n} ${n === 1 ? 'egg' : 'eggs'}!` : 'Put eggs in me!');
        if (n) move(basketSwitch, 0, 0);
      };
    if (prop.bowl) return () => (onMixer(latest.current.bowlSpot) ? flip('mixer') : move(bowlSwitch, 0, 0));
    if (prop.made !== undefined) return () => move(switchPieceId('bakery', madeSwitch(prop.made as number)), 0, 0);
    if (prop.book !== undefined) return () => setReading({ book: prop.book as number, cover: prop.emoji });
    return undefined;
  };

  const palSize = token * 0.5;
  /** A person buddy stands as tall as a person (their own height); an animal buddy is half as big. */
  const sizeOf = (figure: FigureLook) => (figure.kind === 'person' ? token : palSize);
  const propSize = Math.round(token * 0.3);
  /** Everything in the room: things, people, and the buddies they brought, sorted so nearer things draw on top. */
  const pieces: Piece[] = [
    ...props,
    ...here.flatMap((p, i) => {
      const spot = standSpot(spotsNow[p.id], i, inside, here.length, park);
      // Your own buddies look just like they do at home (clothes, hair); a friend's in their own colors.
      const owner = p.id === self ? profile : null;
      const c = colorIndex(p.id);
      const list: Piece[] = [{ key: p.id, kind: 'person', person: p, spot, figure: figureFor(p.avatar, owner, { fur: FURS[c], belly: BELLIES[c] }) }];
      (p.buddies ?? []).forEach((b, n) => {
        const id = buddyPieceId(p.id, n);
        // Until a buddy is moved it stands next to its owner.
        const beside = onFloor({ x: spot.x + ((n + 1) * token * 0.55) / roomW, y: spot.y });
        const figure = figureFor(b, owner);
        list.push({ key: id, kind: 'pal', person: p, figure, size: sizeOf(figure), spot: spotsNow[id] ? (bakery && onMixerHang(spotsNow[id]) ? MIXER_HANG : keepSpot(park, spotsNow[id])) : beside });
      });
      return list;
    }),
  ];
  // A buddy hanging off the mixer draws in front of the bowl under it.
  const depth = (p: Piece) => (bakery && p.kind === 'pal' && onMixerHang(p.spot) ? BAKERY.counter.top + 0.01 : p.spot.y);
  pieces.sort((a, b) => depth(a) - depth(b));

  // A hidden surprise (no hint says so; only a library book shows it): a buddy standing by or
  // hanging off the bakery mixer runs it for you: once you have put the bowl on the mixer
  // yourself and nobody has added more for a few seconds, it switches the mixer on. It never
  // moves the bowl, so you decide when it's ready. Only the
  // buddy's own phone does this, so friends' phones don't all do it at once.
  const mixerOn = bakery && isOn('mixer');
  const atMixer = (piece: Piece) => bakery && piece.kind === 'pal' && (byMixer(piece.spot) || onMixerHang(piece.spot));
  const myHelper = pieces.some((p) => atMixer(p) && p.kind === 'pal' && p.person.id === self);
  const helperStarts = myHelper && bowlMask !== 0 && !bowlMixed && !mixerOn && onMixer(bowlSpot);
  const heldNow = useRef<Record<string, Spot>>({});
  useEffect(() => {
    if (!helperStarts) return;
    const timer = setTimeout(() => {
      const bowlKey = propPieceId('bakery', BOWL.id);
      const at = latest.current.bowlSpot;
      if (heldNow.current[bowlKey] || !onMixer(at)) return;
      move(switchPieceId('bakery', 'mixer'), 1, 0);
    }, HELPER_WAIT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [helperStarts, bowlMask, bowlSpot.x, bowlSpot.y]);

  // The park's playground: who is on which swing, and where someone dropped there ends up.
  const rideOf = (piece: Piece): Ride | null => (park && piece.kind !== 'prop' ? rideAt(piece.spot) : null);
  const seats = pieces.map((p) => ({ key: p.key, ride: rideOf(p) }));
  const riding = seats.flatMap(({ ride }) => (ride?.kind === 'swing' ? [ride.seat] : []));
  /** For a person or buddy: how it is carried and where it lands in the park (on the floor anywhere else). */
  const playground = (key: string) =>
    park
      ? {
          fit: carryInPark,
          land: (s: Spot) => parkLanding(s, seats.flatMap(({ key: k, ride }) => (k !== key && ride?.kind === 'swing' ? [ride.seat] : []))).spot,
          onDrop: (s: Spot) => {
            // After the drop has put them at the foot of the ladder, up they go.
            if (parkLanding(s).slide) setTimeout(() => slideDown(key), 0);
          },
        }
      : {};

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
          ...playground(piece.key),
        };
      }
      if (piece.kind === 'pal') {
        return {
          key: piece.key,
          enabled: piece.person.id === self,
          spot: piece.spot,
          // Hanging off the mixer, it is drawn under its hands instead of above its feet.
          box: onMixerHang(piece.spot)
            ? { left: x - piece.size / 2, top: y - 6, width: piece.size, height: piece.size + 12 }
            : { left: x - piece.size / 2, top: y - piece.size - 6, width: piece.size, height: piece.size + 6 },
          fit: onFloor,
          // In the bakery a buddy can be lifted up onto the mixer, where it hangs off the arm.
          ...(bakery ? { fit: inRoom, land: (s: Spot) => (grabsMixer(s) ? MIXER_HANG : onFloor(s)) } : {}),
          ...playground(piece.key),
        };
      }
      const size = propSize * scaleOf(piece.prop);
      const box = size * 1.25;
      const prop = piece.prop;
      return {
        key: piece.key,
        enabled: true,
        spot: piece.spot,
        box: { left: x - box / 2, top: y - box + size * 0.1, width: box, height: box },
        fit: inRoom,
        land: (s) => {
          if (intoBowl(prop, s) || intoBasket(prop, s) || fedAnimal(prop, s)) return { x: prop.x, y: prop.y };
          const at = settle(place as InsidePlace, prop, s.x, s.y);
          return prop.bowl && onMixer(at) ? { ...at, x: MIXER_MIDDLE } : at;
        },
        onDrop: prop.ingredient !== undefined ? (s) => dropIngredient(prop, s) : prop.egg || prop.food ? (s) => dropFarm(prop, s) : undefined,
        onTap: tapProp(prop),
      };
    })
    .reverse();
  const touch = useMultiTouch({ grabs, roomW, h, viewW: w, scroller, move });
  heldNow.current = touch.dragAt;

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
          scrollEnabled={!touch.holding && !drawing}
          onScroll={touch.onScroll}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: roomW, height: h }}
        >
          <Interior place={place} width={roomW} viewWidth={w} height={h} switches={switches} onSwitch={flip} riding={riding} onDoor={onDoor} onExit={onExit} onDrawing={setDrawing} onEasel={() => setPainting(true)} />
          <View style={[styles.layer, { width: roomW, height: h }]} pointerEvents="box-none" {...touch.handlers}>
            {pieces.map((piece) => {
              const held = touch.dragAt[piece.key];
              const spot = held ?? piece.spot;
              return piece.kind === 'person' ? (
                <Person
                  key={piece.key}
                  person={piece.person}
                  figure={piece.figure}
                  isMe={piece.person.id === self}
                  waving={visiting ? Date.now() - (waves[piece.person.id] ?? 0) < WAVE_MS : piece.person.id === self && soloWave > 0}
                  spot={spot}
                  lifted={!!held}
                  ride={held ? null : rideOf(piece)}
                  w={roomW}
                  h={h}
                  token={token}
                />
              ) : piece.kind === 'pal' ? (
                <Pal
                  key={piece.key}
                  figure={piece.figure}
                  seed={piece.key}
                  mine={piece.person.id === self}
                  spot={spot}
                  lifted={!!held}
                  ride={held ? null : rideOf(piece)}
                  hanging={!held && bakery && onMixerHang(piece.spot)}
                  job={!held && atMixer(piece) ? (mixerOn ? 'mixing' : bowlMixed && onMixer(bowlSpot) ? 'done' : 'ready') : undefined}
                  w={roomW}
                  h={h}
                  size={piece.size}
                />
              ) : (
                <Prop
                  key={piece.key}
                  prop={piece.prop}
                  shown={piece.shown}
                  badge={piece.badge}
                  batter={piece.batter}
                  caption={piece.caption}
                  said={said[piece.key]}
                  splash={!held && farm && piece.prop.says ? (inMud(spot) ? 'mud' : inFarmPond(spot) ? 'swim' : undefined) : undefined}
                  spot={spot}
                  lifted={!!held}
                  w={roomW}
                  h={h}
                  size={propSize * scaleOf(piece.prop)}
                />
              );
            })}
          </View>
        </ScrollView>
      ) : null}
      <Easel visible={painting} onClose={() => setPainting(false)} />
      <BookReader book={reading ? bookAt(reading.book) : null} cover={reading?.cover} onClose={() => setReading(null)} />
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
  figure: FigureLook;
  isMe: boolean;
  waving: boolean;
  spot: Spot;
  lifted: boolean;
  /** What they are doing in the park right now (on a swing, down the slide...). */
  ride: Ride | null;
  w: number;
  h: number;
  token: number;
}

/**
 * Brings a person or buddy to life like at home: breathing in place, a hop and an arm wave
 * when they wave, and a little squash when they're put down.
 */
function Alive({ figure, size, seed, waving, lifted, busy = false }: { figure: FigureLook; size: number; seed: string; waving: boolean; lifted: boolean; busy?: boolean }) {
  const waves = useTimesOn(waving);
  const landings = useTimesOn(!lifted);
  // Whichever happened last plays: a wave hops, a landing squashes.
  const last = useRef<{ waves: number; landings: number; kind: 'hop' | 'land' }>({ waves, landings, kind: 'land' });
  if (waves !== last.current.waves) last.current = { waves, landings, kind: 'hop' };
  else if (landings !== last.current.landings) last.current = { waves, landings, kind: 'land' };
  return (
    <Lively height={size} seed={seed} breathe={!lifted && !busy} bounce={waves + landings} bounceKind={last.current.kind}>
      <Busy active={busy}>
        <Figure figure={figure} size={size} wave={waves || undefined} />
      </Busy>
    </Lively>
  );
}

function Person({ person, figure, isMe, waving, spot: at, lifted, ride, w, h, token }: PersonProps) {
  const acc = person.acc && (ACCESSORIES as readonly string[]).includes(person.acc) ? person.acc : undefined;
  const sliding = ride?.kind === 'slide';
  // Where the head is: a drawn person's head is smaller and lower than a buddy's big face.
  const personHead = figure.kind === 'person' ? figure.look.height : 0;
  const glasses = acc && GLASSES.includes(acc);
  const accStyle = personHead
    ? glasses
      ? { top: token * (1 - personHead) + token * personHead * 0.17, fontSize: token * personHead * 0.22 }
      : { top: token * (1 - personHead) - token * personHead * 0.12, fontSize: token * personHead * 0.28 }
    : glasses
      ? { top: token * 0.2, fontSize: token * 0.34 }
      : { top: -token * 0.12, fontSize: token * 0.36 };
  return (
    <Riding
      ride={ride}
      at={at}
      w={w}
      h={h}
      size={token}
      above={30}
      touchable={isMe}
      lifted={lifted}
      label={isMe ? 'You. Drag to move, or onto the swings, slide, tree or pond to play.' : person.name}
      top={<Text style={[styles.wave, sliding && styles.wheee]}>{sliding ? 'Wheee!' : waving ? '👋' : ' '}</Text>}
      bottom={
        <Text style={[styles.name, isMe && styles.me]} numberOfLines={1}>
          {isMe ? 'You' : person.name}
        </Text>
      }
    >
      <View>
        <Alive figure={figure} size={token} seed={person.id} waving={waving} lifted={lifted} />
        {acc ? <Text style={[styles.acc, accStyle]}>{acc}</Text> : null}
      </View>
    </Riding>
  );
}

interface PalProps {
  figure: FigureLook;
  /** Steady for this buddy, so it keeps its own breathing rhythm. */
  seed: string;
  mine: boolean;
  spot: Spot;
  lifted: boolean;
  ride: Ride | null;
  /** Bakery: hanging off the end of the mixer's arm. */
  hanging?: boolean;
  /** Bakery: standing by the mixer, ready to run it, running it now, or just finished. */
  job?: 'ready' | 'mixing' | 'done';
  w: number;
  h: number;
  size: number;
}

/** One of a player's buddies; only its owner can move it. */
function Pal({ figure, seed, mine, spot: at, lifted, ride, hanging, job, w, h, size }: PalProps) {
  const bubble = job ? (
    <Text style={[styles.helper, job === 'mixing' && styles.helperBusy]}>{job === 'mixing' ? 'Mixing! 🥄' : job === 'done' ? 'All mixed! 👍' : "I'll mix!"}</Text>
  ) : null;
  if (hanging) {
    return (
      <Hanging at={at} w={w} h={h} size={size} color={figure.kind === 'animal' ? figure.fur : (SKIN_TONES[figure.look.skin] ?? SKIN_TONES[0])} swinging={job === 'mixing'} touchable={mine} bubble={bubble} label={job === 'mixing' ? 'A buddy riding the mixer while it mixes' : 'A buddy hanging off the mixer'}>
        <Alive figure={figure} size={size} seed={seed} waving={false} lifted={false} />
      </Hanging>
    );
  }
  return (
    <Riding
      ride={ride}
      at={at}
      w={w}
      h={h}
      size={size}
      above={0}
      touchable={mine}
      lifted={lifted}
      label={
        job === 'mixing'
          ? 'A buddy running the mixer'
          : job
            ? 'A buddy by the mixer'
            : mine
              ? 'Your buddy. Drag to move.'
              : 'A buddy'
      }
      top={
        bubble ? (
          <View pointerEvents="none" style={[styles.helperSpot, { bottom: size + 2 }]}>
            {bubble}
          </View>
        ) : undefined
      }
    >
      <Alive figure={figure} size={size} seed={seed} waving={false} lifted={lifted} busy={job === 'mixing'} />
    </Riding>
  );
}

interface HangingProps {
  /** Where its hands hold on. */
  at: Spot;
  w: number;
  h: number;
  size: number;
  /** Fur or skin, for the arms reaching up. */
  color: string;
  /** Swings to and fro (while the mixer runs); otherwise sways gently. */
  swinging: boolean;
  touchable: boolean;
  bubble: ReactNode;
  label: string;
  children: ReactNode;
}

/** A buddy hanging by its arms from the mixer's arm, swinging while the mixer whirrs. */
function Hanging({ at, w, h, size, color, swinging, touchable, bubble, label, children }: HangingProps) {
  const x = at.x * w;
  const y = at.y * h;
  const arm = Math.max(3, size * 0.05);
  const reach = size * 0.3;
  return (
    <View
      pointerEvents={touchable ? 'auto' : 'none'}
      accessibilityLabel={label}
      style={[styles.person, { width: size, left: x - size / 2, top: y - arm, height: size + reach }]}
    >
      {bubble ? (
        <View pointerEvents="none" style={[styles.helperSpot, { bottom: size + reach + 6 }]}>
          {bubble}
        </View>
      ) : null}
      <Swing active sway={swinging ? 0.6 : 0.15} style={StyleSheet.absoluteFill}>
        {/* Arms reaching up to the mixer, hands holding on. */}
        {[-1, 1].map((side) => (
          <View key={side} style={[styles.hangArm, { backgroundColor: color, width: arm * 1.6, height: reach + arm, left: size / 2 + side * size * 0.1 - arm * 0.8, borderRadius: arm }]} />
        ))}
        {[-1, 1].map((side) => (
          <View key={`h${side}`} style={[styles.hand, { backgroundColor: color, width: arm * 2.6, height: arm * 2.6, left: size / 2 + side * size * 0.1 - arm * 1.3, top: -arm * 0.6, borderRadius: arm * 2 }]} />
        ))}
        <View style={{ position: 'absolute', top: reach, left: 0, width: size, height: size }}>{children}</View>
      </Swing>
    </View>
  );
}

interface RidingProps {
  ride: Ride | null;
  at: Spot;
  w: number;
  h: number;
  /** The figure's size. */
  size: number;
  /** How tall the bit drawn over the figure (the wave) is. */
  above: number;
  touchable: boolean;
  lifted: boolean;
  label: string;
  top?: ReactNode;
  bottom?: ReactNode;
  children: ReactNode;
}

/**
 * Draws a person or buddy standing at their spot, or playing in the park: sitting on a swing
 * (drawn with its ropes and seat, swinging together), splashing in the pond up to their middle,
 * or anywhere else as they are (up the ladder, down the slide, on a branch). Standing about,
 * they walk to wherever they're put (or a friend puts them) instead of jumping there.
 */
function Riding({ ride, at, w, h, size, above, touchable, lifted, label, top, bottom, children }: RidingProps) {
  const x = at.x * w;
  const y = at.y * h;
  const common = { pointerEvents: touchable ? ('auto' as const) : ('none' as const), accessibilityLabel: label };
  if (ride?.kind === 'swing') {
    const pivot = SWING_PIVOT * h;
    const seatW = Math.max(56, size * 0.62);
    const ropeLeft = size / 2 - seatW / 2 + 6;
    return (
      <View {...common} style={[styles.person, { width: size, left: x - size / 2, top: pivot, height: y - pivot + 40 }]}>
        <Swing active style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: y - pivot - size * 0.78 - above, alignItems: 'center' }}>
            {top}
            {children}
          </View>
          <View style={[styles.rope, { left: ropeLeft, height: y - pivot }]} />
          <View style={[styles.rope, { left: ropeLeft + seatW - 15, height: y - pivot }]} />
          <View style={[styles.seat, { top: y - pivot, left: size / 2 - seatW / 2, width: seatW }]} />
          <View style={{ position: 'absolute', left: -size * 0.3, right: -size * 0.3, top: y - pivot + 18, alignItems: 'center' }}>{bottom}</View>
        </Swing>
      </View>
    );
  }
  if (ride?.kind === 'swim') {
    // In up to their middle: the bottom is hidden under the water, and they bob.
    const show = size * 0.6;
    return (
      <View {...common} style={[styles.person, { width: size, left: x - size / 2, top: y - show - above }]}>
        {top}
        <View style={{ width: size * 1.4, height: show, overflow: 'hidden', alignItems: 'center' }}>
          <Bob seed={label} rise={size * 0.04} active={false} style={{ width: size, height: size }}>
            {children}
          </Bob>
        </View>
        <View style={[styles.ripple, { width: size * 1.1, height: Math.max(10, size * 0.12), marginTop: -size * 0.06 }]} />
        {bottom}
      </View>
    );
  }
  return (
    <Glide
      {...common}
      left={x - size / 2}
      top={y - size - above + (above ? 16 : -6)}
      instant={lifted}
      walk={!ride}
      grow={lifted ? 1.12 : 1}
      bounce={size * 0.05}
      style={[styles.standing, { width: size }, lifted && styles.raised]}
    >
      {top}
      {children}
      {bottom}
    </Glide>
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
  /** Farm: what this animal just said, shown in a bubble over it (and it hops). */
  said?: { text: string; at: number };
  /** Farm: an animal rolling in the mud, or floating in the pond. */
  splash?: 'mud' | 'swim';
  spot: Spot;
  lifted: boolean;
  w: number;
  h: number;
  size: number;
}

/** A thing in the room anyone can pick up: it drops onto the shelf or counter under it when let go. */
function Prop({ prop, shown, badge, caption, batter, said, splash, spot: at, lifted, w, h, size }: PropProps) {
  const box = size * 1.25;
  const label = prop.says
    ? `${shown}. Tap to hear it, drag to move${splash === 'mud' ? '. It is rolling in the mud' : ''}.`
    : prop.eggBasket
      ? 'Egg basket. Drop eggs in it, tap to count them.'
      : prop.egg
        ? 'Egg. Drop it in the egg basket.'
        : prop.food
          ? `${shown}. Drop it on an animal to feed it.`
          : prop.bowl
    ? 'Mixing bowl. Drop food on it, then put it in the oven. Tap to tip it out.'
    : caption
      ? `${caption}. Tap to eat.`
      : prop.book !== undefined
        ? `${bookAt(prop.book).title}. Tap to read, or drag to move.`
        : `${shown}. Drag to move.`;
  return (
    <Glide
      accessibilityLabel={label}
      left={at.x * w - box / 2}
      top={at.y * h - box + size * 0.1}
      instant={lifted}
      walk={false}
      grow={lifted ? 1.12 : 1}
      style={[styles.prop, { width: box, height: box }, lifted && styles.raised]}
    >
      {prop.says ? (
        <Lively height={box} seed={prop.id} breathe bounce={said?.at} bounceKind="hop">
          {splash === 'swim' ? (
            <Bob seed={prop.id} rise={size * 0.05} active={false}>
              <Text style={{ fontSize: size, lineHeight: box }}>{shown}</Text>
            </Bob>
          ) : (
            <Wallow active={splash === 'mud'}>
              <Text style={{ fontSize: size, lineHeight: box }}>{shown}</Text>
            </Wallow>
          )}
        </Lively>
      ) : (
        <Text style={{ fontSize: size, lineHeight: box }}>{shown}</Text>
      )}
      {said || (prop.eggBasket && badge) ? (
        // A speech bubble over an animal ("Moo!"), or the egg count over the basket.
        <View pointerEvents="none" style={[styles.bubbleSpot, { bottom: box * 0.92, left: box / 2 - 90 }]}>
          <Text numberOfLines={1} style={styles.speech}>
            {said ? said.text : badge}
          </Text>
        </View>
      ) : null}
      {batter ? <View pointerEvents="none" style={[styles.batter, { top: box * 0.42, left: box * 0.16, right: box * 0.16, height: box * 0.16 }]} /> : null}
      {badge && !prop.eggBasket ? (
        <Text pointerEvents="none" numberOfLines={2} style={[styles.tag, { bottom: box * 0.7, left: -box * 0.1, right: -box * 0.1, fontSize: 14, lineHeight: 17 }]}>
          {badge}
        </Text>
      ) : null}
      {caption ? (
        <Text pointerEvents="none" numberOfLines={2} style={[styles.tag, styles.caption, { top: box * 0.95, left: -box * 0.4, right: -box * 0.4, fontSize: 11 }]}>
          {caption}
        </Text>
      ) : null}
    </Glide>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  layer: { position: 'absolute', left: 0, top: 0 },
  person: { position: 'absolute', alignItems: 'center' },
  prop: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
  tag: { position: 'absolute', textAlign: 'center', fontWeight: '800', color: '#3B2B25' },
  caption: { fontWeight: '900', color: '#3B2B25' },
  bubbleSpot: { position: 'absolute', width: 180, alignItems: 'center', zIndex: 60 },
  speech: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    color: '#3B2B25',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B2B25',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  batter: { position: 'absolute', backgroundColor: '#E9C27D', borderRadius: 999, borderWidth: 2, borderColor: '#B98A45' },
  lifted: { transform: [{ scale: 1.12 }], zIndex: 50 },
  raised: { zIndex: 50 },
  standing: { alignItems: 'center' },
  hangArm: { position: 'absolute', top: 0, backgroundColor: '#F2D3B3', borderWidth: 2, borderColor: '#3E2C23' },
  hand: { position: 'absolute', backgroundColor: '#F2D3B3', borderWidth: 2, borderColor: '#3E2C23' },
  helperSpot: { position: 'absolute', left: -60, right: -60, alignItems: 'center', zIndex: 60 },
  helper: { fontSize: 13, fontWeight: '900', color: '#3B2B25', backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#3B2B25', borderRadius: 10, paddingHorizontal: 6, overflow: 'hidden', height: 26 },
  helperBusy: { backgroundColor: '#FFE0EC', color: '#C2185B' },
  wave: { fontSize: 24, height: 30 },
  wheee: { fontSize: 18, fontWeight: '900', color: '#E53935' },
  rope: { position: 'absolute', top: 0, width: 3, backgroundColor: '#5D4037' },
  seat: { position: 'absolute', height: 16, borderRadius: 4, backgroundColor: '#FFCA28', borderWidth: 3, borderColor: '#5B3A24' },
  ripple: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 2, borderColor: '#29B6F6' },
  acc: { position: 'absolute', alignSelf: 'center', textAlign: 'center', left: 0, right: 0 },
  name: { fontSize: 14, fontWeight: '800', color: '#3B2B25', backgroundColor: 'rgba(255,255,255,0.75)', paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden' },
  me: { color: '#3B5BFF' },
});
