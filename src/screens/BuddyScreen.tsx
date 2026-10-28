import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { BuddyRoom } from '@/components/BuddyRoom';
import { ChoiceButtons } from '@/components/ChoiceButtons';
import { Screen } from '@/components/Screen';
import { Sticker } from '@/components/Sticker';
import { findRoomItem, MAX_ROOM_THINGS, ROOM_ITEMS } from '@/constants/room';
import { itemsIn } from '@/constants/shop';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import type { Operation, Problem, RoomThing } from '@/types';
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
import { createRng, pick, randomSeed } from '@/utils/seededRandom';
import { owns } from '@/utils/shop';
import { playSound } from '@/utils/soundEffects';

/** Questions in one game of fetch. */
const GAME_LENGTH = 5;
const GAME_OPERATIONS: Operation[] = ['add', 'subtract', 'multiply'];

interface Game {
  problem: Problem;
  number: number;
  right: number;
  selected: number | null;
}

/** The buddy's home: pet it, give it treats and play a quick game to earn hearts and level up. */
export function BuddyScreen() {
  const profile = useActiveProfile();
  const { careForBuddy, equip, buyRoomItem, moveInRoom, setPlaced, paintRoom } = useProfiles();
  const [line, setLine] = useState<string | null>(null);
  const [panel, setPanel] = useState<'none' | 'shop' | 'tidy'>('none');
  const [game, setGame] = useState<Game | null>(null);
  const rng = useRef(createRng(randomSeed()));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!profile) {
    return (
      <Screen title="My buddy">
        <Text style={styles.line}>Pick a player first.</Text>
      </Screen>
    );
  }

  const owned = itemsIn('companion').filter((item) => owns(profile, item));
  const buddyId = profile.equipped.companion;
  const companion = buddyCompanion(profile);
  const name = owned.find((item) => item.id === buddyId)?.name ?? 'Buddy';

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

  const hearts = buddyHearts(profile, buddyId);
  const level = buddyLevel(hearts);
  const toNext = heartsToNextLevel(hearts);
  const nextGift = giftForLevel(level + 1);
  const care = careToday(profile, dateKey());
  const petsLeft = DAILY_PETS - care.pets;
  const treatsLeft = DAILY_TREATS - care.treats;
  const playHeartsLeft = DAILY_PLAY_HEARTS - care.playHearts;

  const say = (text: string) => setLine(text);

  const doCare = (action: CareAction, happy: string) => {
    const result = careForBuddy(profile.id, action);
    if (result.ok) {
      if (result.levelUp) {
        playSound('reward');
        const gift = giftForLevel(buddyLevel(result.hearts));
        const reached = buddyLevel(result.hearts);
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

  return (
    <Screen title="My buddy">
      {companion ? (
        <>
          <BuddyRoom
            room={profile.room}
            buddy={{ emoji: companion.emoji, gift: giftForLevel(level), name }}
            tidying={panel === 'tidy'}
            onMove={(key, spot) => moveInRoom(profile.id, key, spot)}
            onTapBuddy={() =>
              petsLeft > 0 ? doCare('pet', `❤️ ${name} loves that!`) : say(`${name} waves at you! 👋`)
            }
            onTapThing={(key) => {
              const thing = profile.room.things.find((t) => t.key === key);
              const item = thing && findRoomItem(thing.itemId);
              if (panel === 'tidy') {
                setPlaced(profile.id, key, false);
                say(`${item?.name ?? 'That'} went in the toy box.`);
              } else if (item) {
                say(`${name} likes the ${item.name.toLowerCase()}! ${item.emoji}`);
              }
            }}
          />
          {!game ? (
            <RoomTools
              panel={panel}
              setPanel={setPanel}
              coins={profile.coins}
              stored={profile.room.things.filter((t) => !t.placed)}
              full={profile.room.things.length >= MAX_ROOM_THINGS}
              onBuy={(itemId) => {
                const item = findRoomItem(itemId);
                const result = buyRoomItem(profile.id, itemId);
                if (result.ok) {
                  playSound('reward');
                  say(`${item?.emoji} New ${item?.name.toLowerCase()}! Drag it where you like.`);
                } else if (result.reason === 'coins' && item) {
                  const short = item.price - profile.coins;
                  say(`You need ${short} more coins for the ${item.name.toLowerCase()}.`);
                } else if (result.reason === 'full') {
                  say('The room is full! Put something in the toy box first.');
                }
              }}
              onTakeOut={(key) => setPlaced(profile.id, key, true)}
              onPaint={(part) => paintRoom(profile.id, part)}
            />
          ) : null}
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.level}>
            Level {level} · ❤️ {hearts}
          </Text>
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
          {line ? (
            <View style={styles.bubble} accessibilityLiveRegion="polite">
              <Text style={styles.bubbleText}>{line}</Text>
            </View>
          ) : null}

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
          ) : (
            <>
              <BigButton
                label={`🤚 Pet ${name}${petsLeft > 0 ? ` (${petsLeft} left today)` : ''}`}
                color={colors.operations.add}
                disabled={petsLeft <= 0}
                onPress={() => doCare('pet', `❤️ ${name} loves that!`)}
              />
              <BigButton
                label={
                  `${companion.treat} Give a treat · 🪙 ${TREAT_PRICE}` +
                  (treatsLeft > 0 ? ` (${treatsLeft} left)` : '')
                }
                color={colors.accent}
                disabled={treatsLeft <= 0}
                accessibilityHint={`Costs ${TREAT_PRICE} coins. You have ${profile.coins}.`}
                onPress={() => doCare('treat', `❤️❤️ Yum! ${companion.treat} ${name} says thank you!`)}
              />
              <BigButton
                label="🎾 Play fetch"
                color={colors.operations.multiply}
                accessibilityHint={
                  playHeartsLeft > 0
                    ? `${GAME_LENGTH} quick questions. Each right answer gives ${name} a heart.`
                    : `${GAME_LENGTH} quick questions, just for fun. Hearts from games are full for today.`
                }
                onPress={() => {
                  say(`${name} wants to play! Answer to throw the ball.`);
                  setGame({ problem: newProblem(), number: 0, right: 0, selected: null });
                }}
              />
              <Text style={styles.hint}>Finishing a round with {name} along also gives a heart.</Text>
            </>
          )}
        </>
      ) : (
        <Text style={styles.line}>Your buddies are napping. Pick one to wake up!</Text>
      )}

      {!game ? (
        <>
          <Text style={styles.heading}>{owned.length > 1 ? 'Switch buddy' : 'Your buddy'}</Text>
          <View style={styles.row}>
            {owned.map((item) => {
              if (item.category !== 'companion') return null;
              const using = item.id === buddyId;
              const itemLevel = buddyLevel(buddyHearts(profile, item.id));
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (using) return;
                    equip(profile.id, item.id);
                    setLine(`${item.name} is here!`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, Level ${itemLevel}${using ? ', with you' : ''}`}
                  accessibilityState={{ selected: using }}
                  style={({ pressed }) => [
                    styles.choice,
                    using && styles.using,
                    pressed && styles.pressed,
                  ]}
                >
                  <Sticker value={item.companion.emoji} size={36} />
                  <Text style={styles.choiceLevel}>Lv {itemLevel}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 72, textAlign: 'center' },
  line: { fontSize: fontSizes.body, fontWeight: '700', color: colors.text, textAlign: 'center' },
  name: { fontSize: fontSizes.button, fontWeight: '900', color: colors.text, textAlign: 'center' },
  level: { fontSize: fontSizes.body, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  bar: {
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#F06292' },
  hint: { fontSize: 16, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  bubble: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleText: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text, textAlign: 'center' },
  game: { gap: spacing.sm },
  problem: { fontSize: 48, fontWeight: '900', color: colors.text, textAlign: 'center' },
  heading: { fontSize: fontSizes.body, fontWeight: '900', color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  choice: {
    width: TAP_TARGET + 16,
    height: TAP_TARGET + 24,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  using: { borderColor: colors.correct, borderWidth: 5 },
  pressed: { transform: [{ scale: 0.97 }] },
  tools: { gap: spacing.sm },
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  tool: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
  },
  toolActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toolText: { fontSize: 18, fontWeight: '800', color: colors.text },
  toolTextActive: { color: colors.primaryText },
  thing: {
    width: TAP_TARGET,
    height: TAP_TARGET + 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thingEmoji: { fontSize: 32 },
  thingPrice: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  locked: { opacity: 0.5 },
  choiceLevel: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
});

interface RoomToolsProps {
  panel: 'none' | 'shop' | 'tidy';
  setPanel: (panel: 'none' | 'shop' | 'tidy') => void;
  coins: number;
  stored: RoomThing[];
  full: boolean;
  onBuy: (itemId: string) => void;
  onTakeOut: (key: string) => void;
  onPaint: (part: 'wall' | 'floor') => void;
}

/** Buttons under the room: add things, put things away, and paint. */
function RoomTools(props: RoomToolsProps) {
  const { panel, setPanel, coins, stored, full, onBuy, onTakeOut, onPaint } = props;
  const toggle = (next: 'shop' | 'tidy') => setPanel(panel === next ? 'none' : next);
  return (
    <View style={styles.tools}>
      <Text style={styles.hint}>Drag things to move them. Tap your buddy to say hi.</Text>
      <View style={styles.toolRow}>
        <ToolButton label="🛒 Add things" active={panel === 'shop'} onPress={() => toggle('shop')} />
        <ToolButton
          label={`🧺 Toy box${stored.length ? ` (${stored.length})` : ''}`}
          active={panel === 'tidy'}
          onPress={() => toggle('tidy')}
        />
        <ToolButton label="🎨 Wall" onPress={() => onPaint('wall')} />
        <ToolButton label="🟫 Floor" onPress={() => onPaint('floor')} />
      </View>
      {panel === 'shop' ? (
        <View style={styles.row}>
          {ROOM_ITEMS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onBuy(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.price} coins`}
              accessibilityState={{ disabled: full || coins < item.price }}
              style={({ pressed }) => [
                styles.thing,
                (full || coins < item.price) && styles.locked,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.thingEmoji}>{item.emoji}</Text>
              <Text style={styles.thingPrice}>🪙 {item.price}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {panel === 'tidy' ? (
        <>
          <Text style={styles.hint}>
            Tap a thing in the room to put it away. Tap one here to set it back out.
          </Text>
          <View style={styles.row}>
            {stored.length === 0 ? <Text style={styles.hint}>The toy box is empty.</Text> : null}
            {stored.map((thing) => {
              const item = findRoomItem(thing.itemId);
              return (
                <Pressable
                  key={thing.key}
                  onPress={() => onTakeOut(thing.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Take out the ${item?.name ?? 'thing'}`}
                  style={({ pressed }) => [styles.thing, pressed && styles.pressed]}
                >
                  <Text style={styles.thingEmoji}>{item?.emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

interface ToolButtonProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

function ToolButton({ label, active = false, onPress }: ToolButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.tool, active && styles.toolActive, pressed && styles.pressed]}
    >
      <Text style={[styles.toolText, active && styles.toolTextActive]}>{label}</Text>
    </Pressable>
  );
}
