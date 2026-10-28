import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import type { Dressed } from '@/components/BuddyFigure';
import { BuddyRoom, type HomeBuddy } from '@/components/BuddyRoom';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { Furniture } from '@/components/Furniture';
import { Confetti } from '@/components/Motion';
import { Screen } from '@/components/Screen';
import { Sticker } from '@/components/Sticker';
import {
  findCupboard,
  findRoomItem,
  FLOOR_COLORS,
  HOME_AREAS,
  inSeason,
  MAX_ROOM_THINGS,
  MONTH_NAMES,
  ROOM_ITEM_GROUPS,
  ROOM_ITEMS,
  seasonOf,
  WALL_COLORS,
  type RoomItem,
  type RoomItemGroup,
} from '@/constants/room';
import { itemsIn, type ShopItem } from '@/constants/shop';
import {
  BODY_COLORS,
  DEFAULT_BODY,
  findWearable,
  HAIR_COLOR_NAMES,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  WEAR_SLOTS,
  WEARABLES,
  type PersonLook,
  type WearSlot,
} from '@/constants/wardrobe';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import { useSettings } from '@/store/settings';
import type { Operation, Problem, Profile, RoomThing } from '@/types';
import {
  buddyCompanion,
  buddyHearts,
  buddyLevel,
  careToday,
  DAILY_PETS,
  DAILY_PLAY_HEARTS,
  DAILY_TREATS,
  giftForLevel,
  heartsToNextLevel,
  HEARTS_PER_LEVEL,
  MAX_BUDDY_LEVEL,
  TREAT_PRICE,
  type CareAction,
} from '@/utils/buddy';
import { dateKey } from '@/utils/dates';
import { generate } from '@/utils/mathEngine';
import { BUDDY_KEY, buddiesHome } from '@/utils/room';
import { createRng, pick, randomSeed } from '@/utils/seededRandom';
import { owns } from '@/utils/shop';
import { canWear, clothOf, lookOf, outfitOf } from '@/utils/wardrobe';
import { playSound } from '@/utils/soundEffects';

/** The tabs along the bottom; each opens a drawer over the home. */
type Tab = 'care' | 'dress' | 'shop' | 'toys' | 'buddies' | 'paint';

const TABS: { id: Tab; emoji: string; name: string }[] = [
  { id: 'care', emoji: '❤️', name: 'Care' },
  { id: 'dress', emoji: '👕', name: 'Dress up' },
  { id: 'shop', emoji: '🛒', name: 'Shop' },
  { id: 'toys', emoji: '🧺', name: 'Toys' },
  { id: 'buddies', emoji: '🐾', name: 'Buddies' },
  { id: 'paint', emoji: '🎨', name: 'Paint' },
];

/** Questions in one game of fetch. */
const GAME_LENGTH = 5;
const GAME_OPERATIONS: Operation[] = ['add', 'subtract', 'multiply'];
/** How long the buddy's speech bubble stays up. */
const LINE_MS = 5000;

const FOOD_GROUPS: RoomItemGroup[] = ['kitchen', 'thanksgiving'];

interface Game {
  problem: Problem;
  number: number;
  right: number;
  selected: number | null;
}

/**
 * The buddies' home, filling the screen. Tabs along the bottom open drawers to care for
 * the buddy, buy things, use the toy box, invite buddies over and paint.
 */
export function BuddyScreen() {
  const profile = useActiveProfile();
  const { careForBuddy, equip, buyRoomItem, moveInRoom, setPlaced, paintRoom, setBuddyHome, wear, undress, setLook } =
    useProfiles();
  const insets = useSafeAreaInsets();
  const [line, setLine] = useState<string | null>(
    'Tap doors to open them. Drag small things onto shelves, tables or a buddy to hold!',
  );
  const [tab, setTab] = useState<Tab | null>(profile?.equipped.companion ? null : 'buddies');
  const [area, setArea] = useState(0);
  /** The middle of the screen, as a share of the home's width; new things land there. */
  const viewAt = useRef<number | undefined>(undefined);
  const homeTips = useSettings((s) => s.homeTips);
  const updateSettings = useSettings((s) => s.update);
  const [game, setGame] = useState<Game | null>(null);
  /** Bumped to make the buddy hop and wave, and to throw confetti on a new level. */
  const [cheers, setCheers] = useState(0);
  const [party, setParty] = useState(0);
  const rng = useRef(createRng(randomSeed()));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!line) return;
    const hide = setTimeout(() => setLine(null), LINE_MS);
    return () => clearTimeout(hide);
  }, [line]);

  if (!profile) {
    return (
      <Screen title="My buddy">
        <Text style={styles.line}>Pick a player first.</Text>
      </Screen>
    );
  }

  const owned = itemsIn('companion').filter((item) => owns(profile, item));

  if (owned.length === 0) {
    return (
      <Screen title="My buddy">
        <Text style={styles.big}>🐾</Text>
        <Text style={styles.line}>
          You don't have a buddy yet. Buddies cheer you on while you play, and you can pet them,
          give them treats and play games with them here.
        </Text>
        <BigButton
          label="🛍️ Find a buddy in the Shop"
          color={colors.operations.subtract}
          onPress={() => router.push('/shop')}
        />
      </Screen>
    );
  }

  const buddyId = profile.equipped.companion;
  const companion = buddyCompanion(profile);
  const nameOf = (id: string) => owned.find((item) => item.id === id)?.name ?? 'Buddy';
  const name = buddyId ? nameOf(buddyId) : 'Buddy';
  const hearts = buddyHearts(profile, buddyId);
  const level = buddyLevel(hearts);
  const month = new Date().getMonth();
  const areaName = HOME_AREAS[area]?.name.toLowerCase() ?? 'room';

  const say = (text: string) => setLine(text);
  const home = buddiesHome(profile);
  const homeBuddies: HomeBuddy[] = home.flatMap(({ id, spot }) => {
    const item = owned.find((o) => o.id === id);
    if (!item || item.category !== 'companion') return [];
    const gift = giftForLevel(buddyLevel(buddyHearts(profile, id)));
    const body = BODY_COLORS[id] ?? DEFAULT_BODY;
    return [
      {
        id,
        emoji: item.companion.emoji,
        gift,
        name: item.name,
        spot,
        ...body,
        dressed: dressedOf(profile, id),
        person: personOf(profile, id),
      },
    ];
  });

  /** Makes another buddy the one you're with. The one before stays home where it stood. */
  const switchTo = (id: string) => {
    if (id === buddyId) return;
    const before = home.find((b) => b.id === buddyId);
    if (before) moveInRoom(profile.id, BUDDY_KEY + before.id, before.spot);
    equip(profile.id, id);
    setBuddyHome(profile.id, id, true, area, viewAt.current);
    say(`${nameOf(id)} is with you now!`);
  };

  const doCare = (action: CareAction, happy: string) => {
    const result = careForBuddy(profile.id, action);
    if (result.ok) {
      if (result.levelUp) {
        setCheers((n) => n + 1);
        setParty((n) => n + 1);
        playSound('reward');
        const reached = buddyLevel(result.hearts);
        const gift = giftForLevel(reached);
        say(`🎉 ${name} reached Level ${reached}!${gift ? ` Look, a new ${gift}!` : ''}`);
      } else {
        say(happy);
      }
      return true;
    }
    if (result.reason === 'coins') say(`A treat costs ${TREAT_PRICE} coins. Play a round to earn more!`);
    else if (result.reason === 'tired' && action !== 'play') {
      say(`${name} is happy for today. Come back tomorrow!`);
    }
    return false;
  };

  const newProblem = () =>
    generate(pick(rng.current, GAME_OPERATIONS), profile.lastDifficulty, rng.current);

  const answer = (choice: number) => {
    if (!game || game.selected !== null) return;
    const right = choice === game.problem.answer;
    playSound(right ? 'correct' : 'wrong');
    if (right) {
      setCheers((n) => n + 1);
      const cheer = companion ? companion.cheers[game.number % companion.cheers.length] : 'Yes!';
      if (!doCare('play', `❤️ ${cheer}`)) say(`${cheer} (Hearts from games are full for today.)`);
    } else {
      say(companion ? companion.comforts[game.number % companion.comforts.length] : 'Nice try!');
    }
    const next: Game = { ...game, selected: choice, right: game.right + (right ? 1 : 0) };
    setGame(next);
    timer.current = setTimeout(() => {
      if (next.number + 1 >= GAME_LENGTH) {
        setGame(null);
        say(`Fetch is over! You got ${next.right} out of ${GAME_LENGTH}. Woo-hoo!`);
      } else {
        setGame({ problem: newProblem(), number: next.number + 1, right: next.right, selected: null });
      }
    }, 1100);
  };

  const tapThing = (key: string) => {
    const thing = profile.room.things.find((t) => t.key === key);
    const item = thing && findRoomItem(thing.itemId);
    if (!thing || !item) return;
    const what = item.name.toLowerCase();
    if (tab === 'toys') {
      setPlaced(profile.id, key, false, area);
      say(`The ${what} went in the toy box.`);
      return;
    }
    const holder = thing.on?.startsWith(BUDDY_KEY) ? nameOf(thing.on.slice(BUDDY_KEY.length)) : null;
    if (holder && FOOD_GROUPS.includes(item.group) && !item.says) say(`${holder} takes a bite of the ${what}. Yum! 😋`);
    else if (item.light) say(`Click! ${item.emoji}`);
    else if (item.says) say(`${holder ?? name} ${item.says}! ${item.fx ?? ''}`);
    else if (holder) say(`${holder} holds the ${what} tight.`);
    else say(`${name} likes the ${what}! ${item.emoji}`);
  };

  const tapBuddy = (id: string) => {
    if (id !== buddyId) return switchTo(id);
    if (careToday(profile, dateKey()).pets < DAILY_PETS) doCare('pet', `❤️ ${name} loves that!`);
    else say(`${name} waves at you! 👋`);
  };

  const buy = (itemId: string) => {
    const item = findRoomItem(itemId);
    const result = buyRoomItem(profile.id, itemId, area, viewAt.current);
    if (result.ok) {
      playSound('reward');
      say(`${item?.emoji} New ${item?.name.toLowerCase()} in the ${areaName}! Drag it where you like.`);
    } else if (result.reason === 'coins' && item) {
      say(`You need ${item.price - profile.coins} more coins for the ${item.name.toLowerCase()}.`);
    } else if (result.reason === 'full') {
      say('The house is full! Put something in the toy box first.');
    } else if (result.reason === 'season' && item?.month !== undefined) {
      say(`That one is only in the shop in ${MONTH_NAMES[item.month]}.`);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={styles.full}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.roomWrap}>
        <BuddyRoom
          room={profile.room}
          buddies={homeBuddies}
          area={area}
          onAreaChange={setArea}
          onView={(at) => {
            viewAt.current = at;
          }}
          season={seasonOf(month)}
          tidying={tab === 'toys'}
          onPlaceThing={(key, place) => {
            moveInRoom(profile.id, key, place);
            const item = findRoomItem(profile.room.things.find((t) => t.key === key)?.itemId ?? '');
            const what = item?.name.toLowerCase() ?? 'thing';
            if (place.in) say(`The ${what} is in the ${findCupboard(place.in)?.name ?? 'cupboard'}.`);
            else if (place.on?.startsWith(BUDDY_KEY)) say(`${nameOf(place.on.slice(BUDDY_KEY.length))} is holding the ${what}!`);
          }}
          onPlaceBuddy={(id, place) => {
            moveInRoom(profile.id, BUDDY_KEY + id, place);
            const seat = place.on && findRoomItem(profile.room.things.find((t) => t.key === place.on)?.itemId ?? '');
            if (seat) say(seat.sleep ? `${nameOf(id)} is having a nap. 💤` : `${nameOf(id)} sits on the ${seat.name.toLowerCase()}.`);
          }}
          onTapThing={tapThing}
          onTapBuddy={tapBuddy}
          onToggle={(what, open) => {
            if (!open) return;
            if (what === 'fridge' || what === 'freezer') say(`Brrr, the ${what} is cold! Drag food onto the shelves.`);
            else if (what === 'oven') say('The oven is warm. Bake something in it!');
            else if (what === 'cupboard' || what === 'wardrobe') say(`Drag small things onto the ${what} shelves.`);
            else if (what === 'door') say(`${name} peeks outside. Hello, world!`);
            else if (what !== 'curtains') say(`Drag small things into the ${what}.`);
          }}
          cheer={buddyId ? { buddyId, n: cheers } : undefined}
          onTapGadget={(g, on) => {
            if (g.lightSwitch) say(on ? 'Lights on! 💡' : g.fx ? `Party time! ${g.fx}` : 'Lights off. Night night! 🌙');
            else if (g.glow) say(on ? `${name} turns on the ${g.name}. ✨` : `${name} turns off the ${g.name}.`);
            else if (g.says) say(`${name} ${g.says}! ${g.fx ?? ''}`);
          }}
        />
        <Confetti burst={party} />

        <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          <View style={styles.topRow} pointerEvents="box-none">
            <Pressable
              onPress={back}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={({ pressed }) => [styles.round, pressed && styles.pressed]}
            >
              <Text style={styles.roundText}>⬅️</Text>
            </Pressable>
            <View style={styles.rooms}>
              {HOME_AREAS.map((a, i) => (
                <Pressable
                  key={a.id}
                  onPress={() => setArea(i)}
                  accessibilityRole="button"
                  accessibilityLabel={a.name}
                  accessibilityState={{ selected: area === i }}
                  style={({ pressed }) => [styles.round, styles.roomButton, area === i && styles.roundOn, pressed && styles.pressed]}
                >
                  <Text style={styles.roomText}>{a.emoji}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.coins}>
              <Text style={styles.coinText} numberOfLines={1} accessibilityLabel={`${profile.coins} coins`}>
                {`🪙 ${profile.coins}`}
              </Text>
            </View>
          </View>
          {!homeTips ? (
            <Pressable
              onPress={() => updateSettings({ homeTips: true })}
              accessibilityRole="button"
              accessibilityLabel="Show tips"
              style={({ pressed }) => [styles.round, styles.tipsButton, pressed && styles.pressed]}
            >
              <Text style={styles.roomText}>💬</Text>
            </Pressable>
          ) : null}
          {homeTips ? (
            <View style={styles.tagRow}>
              {buddyId ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    {name} · Lv {level} · ❤️ {hearts}
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => {
                  updateSettings({ homeTips: false });
                  setLine(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Hide tips"
                hitSlop={8}
                style={({ pressed }) => [styles.tag, pressed && styles.pressed]}
              >
                <Text style={styles.tagText}>✕ Hide</Text>
              </Pressable>
            </View>
          ) : null}
          {line && homeTips ? (
            <View style={styles.bubble}>
              <Text style={styles.bubbleText} accessibilityLiveRegion="polite">
                {line}
              </Text>
            </View>
          ) : null}
        </View>

        {game || tab ? (
          <View style={styles.drawer}>
            {game ? (
              <View style={styles.game}>
                <Text style={styles.hint}>
                  Fetch! Question {game.number + 1} of {GAME_LENGTH}
                </Text>
                <Text style={styles.problem}>{game.problem.prompt} = ?</Text>
                <ChoiceButtons
                  choices={game.problem.choices}
                  selected={game.selected}
                  answer={game.problem.answer}
                  onSelect={answer}
                />
              </View>
            ) : null}
            {!game && tab === 'care' ? (
              <CareDrawer
                profile={profile}
                name={name}
                treat={companion?.treat ?? '🍪'}
                hasBuddy={!!companion}
                onPet={() => doCare('pet', `❤️ ${name} loves that!`)}
                onTreat={() => doCare('treat', `❤️❤️ Yum! ${companion?.treat ?? ''} ${name} says thank you!`)}
                onFetch={() => {
                  say(`${name} wants to play! Answer to throw the ball.`);
                  setGame({ problem: newProblem(), number: 0, right: 0, selected: null });
                }}
              />
            ) : null}
            {!game && tab === 'dress' ? (
              <DressDrawer
                profile={profile}
                name={name}
                buddyId={buddyId}
                onWear={(wearableId) => {
                  if (!buddyId) return;
                  const item = findWearable(wearableId);
                  const wasOn = Object.values(outfitOf(profile, buddyId)).includes(wearableId);
                  const result = wear(profile.id, buddyId, wearableId);
                  if (result.ok && item) {
                    if (!profile.wardrobe.includes(wearableId)) playSound('reward');
                    say(wasOn ? `${name} took off the ${item.name.toLowerCase()}.` : `${name} looks great in the ${item.name.toLowerCase()}! ${item.emoji}`);
                  } else if (!result.ok && result.reason === 'coins' && item) {
                    say(`You need ${item.price - profile.coins} more coins for the ${item.name.toLowerCase()}.`);
                  }
                }}
                onLook={(change) => buddyId && setLook(profile.id, buddyId, change)}
                onUndress={() => {
                  if (!buddyId) return;
                  undress(profile.id, buddyId);
                  say(`${name} is back to just fur.`);
                }}
              />
            ) : null}
            {!game && tab === 'shop' ? (
              <ShopDrawer
                coins={profile.coins}
                month={month}
                area={area}
                full={profile.room.things.length >= MAX_ROOM_THINGS}
                onBuy={buy}
              />
            ) : null}
            {!game && tab === 'toys' ? (
              <ToyDrawer
                stored={profile.room.things.filter((t) => !t.placed)}
                areaName={areaName}
                onTakeOut={(key) => setPlaced(profile.id, key, true, area, viewAt.current)}
              />
            ) : null}
            {!game && tab === 'buddies' ? (
              <BuddiesDrawer
                profile={profile}
                buddies={owned}
                isHome={(id) => home.some((b) => b.id === id)}
                using={buddyId}
                onPick={switchTo}
                onHome={(id, atHome) => {
                  setBuddyHome(profile.id, id, atHome, area, viewAt.current);
                  say(atHome ? `${nameOf(id)} came over to play!` : `${nameOf(id)} went off for a nap. 💤`);
                }}
              />
            ) : null}
            {!game && tab === 'paint' ? (
              <PaintDrawer
                paint={profile.room.paint[area] ?? { wall: 0, floor: 0 }}
                areaName={areaName}
                onPaint={(part, color) => paintRoom(profile.id, part, color, area)}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
        {TABS.map((t) => {
          const on = tab === t.id && !game;
          return (
            <Pressable
              key={t.id}
              onPress={() => {
                if (game) return;
                setTab(on ? null : t.id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on, disabled: !!game }}
              style={({ pressed }) => [styles.tab, on && styles.tabOn, pressed && styles.pressed]}
            >
              <Text style={styles.tabEmoji}>{t.emoji}</Text>
              <Text style={[styles.tabName, on && styles.tabNameOn]} numberOfLines={1}>
                {t.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface CareDrawerProps {
  profile: Profile;
  name: string;
  treat: string;
  hasBuddy: boolean;
  onPet: () => void;
  onTreat: () => void;
  onFetch: () => void;
}

function CareDrawer({ profile, name, treat, hasBuddy, onPet, onTreat, onFetch }: CareDrawerProps) {
  if (!hasBuddy) return <Text style={styles.hint}>Pick a buddy in 🐾 Buddies first.</Text>;
  const hearts = buddyHearts(profile, profile.equipped.companion);
  const level = buddyLevel(hearts);
  const toNext = heartsToNextLevel(hearts);
  const nextGift = giftForLevel(level + 1);
  const care = careToday(profile, dateKey());
  const petsLeft = DAILY_PETS - care.pets;
  const treatsLeft = DAILY_TREATS - care.treats;
  const playHeartsLeft = DAILY_PLAY_HEARTS - care.playHearts;
  return (
    <>
      <View
        style={styles.bar}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={toNext === null ? 'Top level' : `${toNext} hearts to Level ${level + 1}`}
      >
        <View
          style={[
            styles.fill,
            { width: `${toNext === null ? 100 : (100 * (HEARTS_PER_LEVEL - toNext)) / HEARTS_PER_LEVEL}%` },
          ]}
        />
      </View>
      <Text style={styles.hint}>
        {toNext === null
          ? `Level ${MAX_BUDDY_LEVEL}: best friends forever!`
          : `${toNext} more ${toNext === 1 ? 'heart' : 'hearts'} to Level ${level + 1}` +
            (nextGift ? ` (gets a ${nextGift})` : '')}
      </Text>
      <View style={styles.row}>
        <DrawerButton
          emoji="🤚"
          label={`Pet (${Math.max(0, petsLeft)})`}
          disabled={petsLeft <= 0}
          onPress={onPet}
          hint={`Pet ${name}`}
        />
        <DrawerButton
          emoji={treat}
          label={`Treat 🪙${TREAT_PRICE}`}
          disabled={treatsLeft <= 0}
          onPress={onTreat}
          hint={`Costs ${TREAT_PRICE} coins. You have ${profile.coins}. ${treatsLeft} left today.`}
        />
        <DrawerButton
          emoji="🎾"
          label="Fetch"
          onPress={onFetch}
          hint={
            playHeartsLeft > 0
              ? `${GAME_LENGTH} quick questions. Each right answer gives ${name} a heart.`
              : `${GAME_LENGTH} quick questions, just for fun. Hearts from games are full for today.`
          }
        />
      </View>
    </>
  );
}

/** A buddy's outfit as things to draw. */
function dressedOf(profile: Profile, buddyId: string): Dressed {
  const outfit = outfitOf(profile, buddyId);
  const emoji = (id?: string) => (id ? findWearable(id)?.emoji : undefined);
  return {
    hat: emoji(outfit.hat),
    face: emoji(outfit.face),
    neck: emoji(outfit.neck),
    feet: emoji(outfit.feet),
    shirt: outfit.shirt ? findWearable(outfit.shirt)?.color : undefined,
  };
}

/** A person buddy's looks and clothes, ready to draw; null for animals. */
function personOf(profile: Profile, buddyId: string): HomeBuddy['person'] {
  const look = lookOf(profile, buddyId);
  if (!look) return undefined;
  const outfit = outfitOf(profile, buddyId);
  const { hat, face, neck, feet } = dressedOf(profile, buddyId);
  return { look, dressed: { hat, face, neck, feet, top: clothOf(outfit.shirt), legs: clothOf(outfit.legs) } };
}

/** Dress up tabs: clothes spots, plus hair, beard and skin for people. */
type DressTab = WearSlot | 'hair' | 'hairColor' | 'beard' | 'skin';

const LOOK_TABS: { id: DressTab; name: string }[] = [
  { id: 'hair', name: '💇 Hair' },
  { id: 'hairColor', name: '🎨 Hair color' },
  { id: 'beard', name: '🧔 Beard' },
  { id: 'skin', name: '✋ Skin' },
];

interface DressDrawerProps {
  profile: Profile;
  name: string;
  buddyId: string | null;
  onWear: (wearableId: string) => void;
  onUndress: () => void;
  onLook: (change: Partial<PersonLook>) => void;
}

/**
 * Clothes and accessories for the buddy you're with: tap to buy and put on, tap again to
 * take off. People also get free hair, beard and skin choices.
 */
function DressDrawer({ profile, name, buddyId, onWear, onUndress, onLook }: DressDrawerProps) {
  const [picked, setTab] = useState<DressTab>('shirt');
  if (!buddyId) return <Text style={styles.hint}>Pick a buddy in 🐾 Buddies first.</Text>;
  const outfit = outfitOf(profile, buddyId);
  const look = lookOf(profile, buddyId);
  const tabs = [
    ...WEAR_SLOTS.filter((w) => look || !w.peopleOnly),
    ...(look ? LOOK_TABS : []),
  ];
  const tab = tabs.some((t) => t.id === picked) ? picked : 'shirt';
  const swatch = (key: string, label: string, selected: boolean, onPress: () => void, child: ReactNode) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.thing, selected && styles.using, pressed && styles.pressed]}
    >
      {child}
    </Pressable>
  );
  let row: ReactNode;
  if (look && tab === 'hair') {
    row = HAIR_STYLES.map((h) =>
      swatch(h.id, h.name, look.hair === h.id, () => onLook({ hair: h.id }), <Text style={styles.small}>{h.name}</Text>),
    );
  } else if (look && tab === 'hairColor') {
    row = HAIR_COLORS.map((c, i) =>
      swatch(c, HAIR_COLOR_NAMES[i] ?? 'Color', look.hairColor === i, () => onLook({ hairColor: i }), (
        <View style={[styles.colorDot, { backgroundColor: c }]} />
      )),
    );
  } else if (look && tab === 'beard') {
    row = [
      swatch('none', 'No beard', look.beard === null, () => onLook({ beard: null }), <Text style={styles.small}>None</Text>),
      ...HAIR_COLORS.map((c, i) =>
        swatch(c, `${HAIR_COLOR_NAMES[i] ?? ''} beard`, look.beard === i, () => onLook({ beard: i }), (
          <View style={[styles.colorDot, { backgroundColor: c }]} />
        )),
      ),
    ];
  } else if (look && tab === 'skin') {
    row = SKIN_TONES.map((c, i) =>
      swatch(c, `Skin tone ${i + 1}`, look.skin === i, () => onLook({ skin: i }), (
        <View style={[styles.colorDot, { backgroundColor: c }]} />
      )),
    );
  } else {
    row = [
      ...WEARABLES.filter((w) => w.slot === tab).map((w) => {
        const free = canWear(profile, buddyId, w.id);
        const on = outfit[w.slot] === w.id;
        return (
          <Pressable
            key={w.id}
            onPress={() => onWear(w.id)}
            accessibilityRole="button"
            accessibilityLabel={`${w.name}${free ? '' : `, ${w.price} coins`}${on ? ', wearing' : ''}`}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [
              styles.thing,
              on && styles.using,
              !free && profile.coins < w.price && styles.locked,
              pressed && styles.pressed,
            ]}
          >
            {w.color ? (
              <View style={[styles.shirtSwatch, { backgroundColor: w.color }]}>
                <Text style={styles.swatchEmoji}>{w.emoji}</Text>
              </View>
            ) : (
              <Text style={styles.thingEmoji}>{w.emoji}</Text>
            )}
            <Text style={styles.thingPrice}>{on ? '✓ On' : free ? 'Yours' : `🪙 ${w.price}`}</Text>
          </Pressable>
        );
      }),
      <Pressable
        key="alloff"
        onPress={onUndress}
        accessibilityRole="button"
        accessibilityLabel={`Take everything off ${name}`}
        style={({ pressed }) => [styles.thing, pressed && styles.pressed]}
      >
        <Text style={styles.thingEmoji}>🧺</Text>
        <Text style={styles.thingPrice}>All off</Text>
      </Pressable>,
    ];
  }
  const lookTab = LOOK_TABS.some((t) => t.id === tab);
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {tabs.map((t) => (
          <Chip key={t.id} label={t.name} on={tab === t.id} onPress={() => setTab(t.id)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {row}
      </ScrollView>
      <Text style={styles.hint}>
        {lookTab
          ? `Free! Make ${name} look just right.`
          : 'Buy once, then any buddy can wear it. Tap again to take it off.'}
      </Text>
    </>
  );
}

interface ShopDrawerProps {
  coins: number;
  /** This month, 0 = January; holiday things only show in their month. */
  month: number;
  area: number;
  full: boolean;
  onBuy: (itemId: string) => void;
}

function ShopDrawer({ coins, month, area, full, onBuy }: ShopDrawerProps) {
  // Shop shelves with something on sale this month; the shelf starts on the room in view.
  const groups = ROOM_ITEM_GROUPS.filter((g) => ROOM_ITEMS.some((i) => i.group === g.id && inSeason(i, month)));
  const [picked, setShelf] = useState<RoomItemGroup | null>(null);
  const holiday = groups.find((g) => ROOM_ITEMS.some((i) => i.group === g.id && i.month === month));
  const here = HOME_AREAS[area]?.id ?? 'living';
  const shelf = picked ?? holiday?.id ?? (here === 'playroom' ? 'toys' : here);
  const areaName = HOME_AREAS[area]?.name.toLowerCase() ?? 'room';
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {groups.map((g) => (
          <Chip key={g.id} label={g.name} on={shelf === g.id} onPress={() => setShelf(g.id)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {ROOM_ITEMS.filter((item) => item.group === shelf && inSeason(item, month)).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onBuy(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.price} coins`}
            accessibilityState={{ disabled: full || coins < item.price }}
            style={({ pressed }) => [
              styles.thing,
              item.month !== undefined && styles.seasonal,
              (full || coins < item.price) && styles.locked,
              pressed && styles.pressed,
            ]}
          >
            <ItemPicture item={item} />
            <Text style={styles.thingPrice}>🪙 {item.price}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.hint}>New things go in the {areaName}.</Text>
    </>
  );
}

/** An emoji, or a small drawing for furniture without one. */
function ItemPicture({ item }: { item: RoomItem }) {
  if (!item.draw) return <Text style={styles.thingEmoji}>{item.emoji}</Text>;
  const height = 30;
  const width = Math.min(52, height * (item.wide ?? 1));
  return <Furniture shape={item.draw} width={width} height={Math.min(height, width / (item.wide ?? 1))} />;
}

function ToyDrawer({ stored, areaName, onTakeOut }: { stored: RoomThing[]; areaName: string; onTakeOut: (key: string) => void }) {
  return (
    <>
      <Text style={styles.hint}>Tap things in the house to put them away. Tap one here to set it out in the {areaName}.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {stored.length === 0 ? <Text style={styles.hint}>The toy box is empty.</Text> : null}
        {stored.map((thing) => {
          const item = findRoomItem(thing.itemId);
          if (!item) return null;
          return (
            <Pressable
              key={thing.key}
              onPress={() => onTakeOut(thing.key)}
              accessibilityRole="button"
              accessibilityLabel={`Take out the ${item.name}`}
              style={({ pressed }) => [styles.thing, pressed && styles.pressed]}
            >
              <ItemPicture item={item} />
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

interface BuddiesDrawerProps {
  profile: Profile;
  buddies: ShopItem[];
  isHome: (id: string) => boolean;
  using: string | null;
  onPick: (id: string) => void;
  onHome: (id: string, home: boolean) => void;
}

function BuddiesDrawer({ profile, buddies, isHome, using, onPick, onHome }: BuddiesDrawerProps) {
  return (
    <>
      <Text style={styles.hint}>Tap a buddy to be with it. Invite others over, or send them for a nap.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {buddies.map((item) => {
          if (item.category !== 'companion') return null;
          const withYou = item.id === using;
          const here = isHome(item.id);
          const level = buddyLevel(buddyHearts(profile, item.id));
          return (
            <View key={item.id} style={styles.buddyCol}>
              <Pressable
                onPress={() => onPick(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, Level ${level}${withYou ? ', with you' : ''}`}
                accessibilityState={{ selected: withYou }}
                style={({ pressed }) => [styles.choice, withYou && styles.using, pressed && styles.pressed]}
              >
                <Sticker value={item.companion.emoji} size={34} />
                <Text style={styles.small}>Lv {level}</Text>
              </Pressable>
              {withYou ? (
                <Text style={styles.small}>⭐ With you</Text>
              ) : (
                <Pressable
                  onPress={() => onHome(item.id, !here)}
                  accessibilityRole="button"
                  accessibilityLabel={here ? `Send ${item.name} for a nap` : `Invite ${item.name} over`}
                  style={({ pressed }) => [styles.mini, pressed && styles.pressed]}
                >
                  <Text style={styles.small}>{here ? '💤 Nap' : '🏠 Invite'}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}

interface PaintDrawerProps {
  paint: { wall: number; floor: number };
  areaName: string;
  onPaint: (part: 'wall' | 'floor', color: number) => void;
}

function PaintDrawer({ paint, areaName, onPaint }: PaintDrawerProps) {
  const swatches = (part: 'wall' | 'floor', list: string[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <Text style={styles.paintLabel}>{part === 'wall' ? '🎨 Walls' : '🟫 Floor'}</Text>
      {list.map((color, i) => (
        <Pressable
          key={color}
          onPress={() => onPaint(part, i)}
          accessibilityRole="button"
          accessibilityLabel={`${part === 'wall' ? 'Wall' : 'Floor'} color ${i + 1}`}
          accessibilityState={{ selected: paint[part] === i }}
          style={({ pressed }) => [
            styles.swatch,
            { backgroundColor: color },
            paint[part] === i && styles.swatchOn,
            pressed && styles.pressed,
          ]}
        />
      ))}
    </ScrollView>
  );
  return (
    <>
      <Text style={styles.hint}>Free paint for the {areaName}.</Text>
      {swatches('wall', WALL_COLORS)}
      {swatches('floor', FLOOR_COLORS)}
    </>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

interface DrawerButtonProps {
  emoji: string;
  label: string;
  disabled?: boolean;
  hint?: string;
  onPress: () => void;
}

function DrawerButton({ emoji, label, disabled = false, hint, onPress }: DrawerButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.action, disabled && styles.locked, pressed && styles.pressed]}
    >
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: colors.background },
  roomWrap: { flex: 1 },
  big: { fontSize: 72, textAlign: 'center' },
  line: { fontSize: fontSizes.body, fontWeight: '700', color: colors.text, textAlign: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: spacing.sm, gap: spacing.xs, alignItems: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  rooms: { flexDirection: 'row', gap: spacing.xs },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundOn: { backgroundColor: '#FFE082' },
  roundText: { fontSize: 22 },
  roomButton: { width: 40, height: 40, borderRadius: 20 },
  roomText: { fontSize: 19 },
  tipsButton: { width: 40, height: 40, borderRadius: 20, alignSelf: 'flex-end' },
  tagRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  coins: {
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  coinText: { fontSize: 18, fontWeight: '900', color: colors.text },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: { fontSize: 16, fontWeight: '900', color: colors.text },
  bubble: {
    alignSelf: 'center',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bubbleText: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  drawer: {
    maxHeight: '60%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 3,
    borderColor: colors.border,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  tab: { flex: 1, minHeight: 60, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.primary },
  tabEmoji: { fontSize: 24 },
  tabName: { fontSize: 13, fontWeight: '800', color: colors.text },
  tabNameOn: { color: colors.primaryText },
  bar: {
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#F06292' },
  hint: { fontSize: 15, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  game: { gap: spacing.sm },
  problem: { fontSize: 40, fontWeight: '900', color: colors.text, textAlign: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.xs, alignItems: 'center' },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 16, fontWeight: '800', color: colors.text },
  chipTextOn: { color: colors.primaryText },
  thing: {
    width: 68,
    height: 76,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  thingEmoji: { fontSize: 32 },
  thingPrice: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  locked: { opacity: 0.45 },
  seasonal: { backgroundColor: '#FFE0B2', borderColor: '#F57C00' },
  pressed: { transform: [{ scale: 0.96 }] },
  buddyCol: { alignItems: 'center', gap: 4 },
  choice: {
    width: 72,
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  using: { borderColor: colors.correct, borderWidth: 5 },
  small: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  mini: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  paintLabel: { fontSize: 16, fontWeight: '900', color: colors.text, width: 76 },
  shirtSwatch: {
    width: 40,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchEmoji: { fontSize: 18 },
  colorDot: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.border },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.border },
  swatchOn: { borderWidth: 5, borderColor: colors.primary },
  action: {
    flex: 1,
    maxWidth: 160,
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: { fontSize: 28 },
  actionText: { fontSize: 15, fontWeight: '800', color: colors.text },
});
