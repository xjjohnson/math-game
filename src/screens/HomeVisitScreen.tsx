import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { BuddyRoom } from '@/components/BuddyRoom';
import { seasonOf } from '@/constants/room';
import { colors, radius, spacing } from '@/constants/theme';
import { townSession, useTownState } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';
import type { Profile, Room } from '@/types';
import { areasOf, BUDDY_KEY, moveInRoom } from '@/utils/room';

/**
 * A friend's buddy home, sent over Nearby while visiting in the community.
 * You can look around and move things to play, but it's their home: nothing
 * you do here is saved, on your phone or theirs.
 */
export function HomeVisitScreen() {
  const me = useActiveProfile();
  const { home } = useTownState();
  const insets = useSafeAreaInsets();
  const [room, setRoom] = useState<Room | null>(null);
  const [area, setArea] = useState(0);
  const [line, setLine] = useState('');

  useEffect(() => {
    if (home?.status === 'ready' && home.snap) {
      setRoom(home.snap.room);
      setLine(`Welcome to ${home.name}'s home! Move things around to play. It all goes back when you leave.`);
    }
  }, [home?.status, home?.snap, home?.name]);

  // Leaving this screen closes the visit to the home.
  useEffect(() => () => townSession().closeHome(), []);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/town'));

  if (!me || !home || home.status !== 'ready' || !home.snap || !room) {
    return (
      <View style={[styles.wait, { paddingTop: insets.top + spacing.lg }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.big}>🏠</Text>
        <Text style={styles.waitText}>
          {!home
            ? 'No home to visit.'
            : home.status === 'loading'
              ? `Knocking on ${home.name}'s door…`
              : `${home.name}'s home can't be shown. Their phone may need the newest Math Game.`}
        </Text>
        <BigButton label="Back" color={colors.primary} onPress={back} />
      </View>
    );
  }

  const snap = home.snap;
  // Moves happen on a copy, through the same rules as your own home.
  const pretend = { ...me, room, homeRooms: snap.homeRooms, homeOrder: snap.homeOrder } as Profile;
  const areas = areasOf(snap.homeOrder);
  const owned = (i: number) => {
    const a = areas[i];
    return !!a && (a.price === undefined || snap.homeRooms.includes(a.id));
  };
  const buddies = snap.buddies.map((b) => ({ ...b, spot: room.buddies[b.id] ?? b.spot }));

  return (
    <View style={styles.full}>
      <Stack.Screen options={{ headerShown: false }} />
      <BuddyRoom
        room={room}
        buddies={buddies}
        areas={areas}
        area={area}
        forSale={areas.filter((_, i) => !owned(i)).map((a) => a.id)}
        onAreaChange={setArea}
        season={seasonOf(new Date().getMonth())}
        tidying={false}
        onPlaceThing={(key, place) => setRoom(moveInRoom(pretend, key, place).room)}
        onPlaceBuddy={(id, place) => setRoom(moveInRoom(pretend, BUDDY_KEY + id, place).room)}
        onTapThing={() => undefined}
        onTapBuddy={(id) => {
          const b = snap.buddies.find((x) => x.id === id);
          if (b) setLine(`${b.name} says hi! 👋`);
        }}
      />
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [styles.round, pressed && { opacity: 0.7 }]}>
            <Text style={styles.roundText}>⬅️</Text>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rooms}>
            {areas.map((a, i) => (
              <Pressable
                key={a.id}
                onPress={() => setArea(i)}
                accessibilityRole="button"
                accessibilityLabel={a.name}
                accessibilityState={{ selected: area === i }}
                style={({ pressed }) => [styles.round, area === i && styles.roundOn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.roundText}>{owned(i) ? a.emoji : '🔒'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText} numberOfLines={1}>🏠 {snap.name}'s home</Text>
        </View>
        {line ? (
          <Pressable onPress={() => setLine('')} style={styles.bubble} accessibilityRole="button" accessibilityLabel={line}>
            <Text style={styles.bubbleText}>{line}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: colors.background },
  wait: { flex: 1, alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  big: { fontSize: 72 },
  waitText: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: spacing.sm, gap: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rooms: { gap: 6, paddingRight: spacing.sm },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border },
  roundOn: { borderColor: colors.primary, borderWidth: 3 },
  roundText: { fontSize: 22 },
  tag: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: radius.lg },
  tagText: { fontSize: 18, fontWeight: '900', color: colors.text },
  bubble: { alignSelf: 'center', maxWidth: 360, backgroundColor: '#FFFDE7', padding: spacing.sm, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border },
  bubbleText: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
});
