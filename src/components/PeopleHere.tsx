import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { Sticker } from '@/components/Sticker';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { townSession, useTownState, WAVE_MS } from '@/services/townSession';
import type { TownPlace } from '@/utils/multiplayer/protocol';

/** Friends who are in `place` right now. Shows nothing when you're not visiting with anyone. */
export function PeopleHere({ place, wave = false }: { place: TownPlace; wave?: boolean }) {
  const { people, myId, waves, status } = useTownState();
  if (status === 'off') return null;
  const here = people.filter((p) => p.place === place);
  const others = here.filter((p) => p.id !== myId);
  const now = Date.now();

  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <Text style={styles.heading}>
        {others.length ? `Here with you: ${others.map((p) => p.name).join(', ')}` : 'No friends here right now.'}
      </Text>
      <View style={styles.row}>
        {here.map((p) => (
          <View key={p.id} style={styles.person} accessibilityLabel={p.id === myId ? `${p.name} (you)` : p.name}>
            {now - (waves[p.id] ?? 0) < WAVE_MS ? <Text style={styles.wave}>👋</Text> : <Text style={styles.wave}> </Text>}
            <Sticker value={p.avatar} size={44} />
            <Text style={styles.name} numberOfLines={1}>
              {p.id === myId ? 'You' : p.name}
            </Text>
          </View>
        ))}
      </View>
      {wave && others.length ? (
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
  box: { gap: spacing.xs, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center' },
  heading: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  person: { alignItems: 'center', width: 64 },
  wave: { fontSize: 20, height: 26 },
  name: { fontSize: 14, color: colors.textMuted },
  waveButton: { minHeight: TAP_TARGET, paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.primary },
  waveText: { fontSize: fontSizes.body, fontWeight: '800', color: '#fff' },
  pressed: { transform: [{ scale: 0.97 }] },
  badges: { flexDirection: 'row', gap: 2, alignItems: 'center' },
});
