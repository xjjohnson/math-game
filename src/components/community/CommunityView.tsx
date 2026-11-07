import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { CommunityRoom } from '@/components/community/CommunityRoom';
import { VisitPanel } from '@/components/VisitPanel';
import { colors, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { usePlace } from '@/hooks/usePlace';
import { useTownState } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';
import type { TownPlace } from '@/utils/multiplayer/protocol';
import type { BuildingId } from '@/utils/town';

interface Props {
  place: TownPlace;
  /** Buttons along the bottom edge. */
  actions: ReactNode;
}

export const goInside = (id: BuildingId) => router.push({ pathname: '/place', params: { building: id } });

/** The full-screen community: the room fills the screen, with the coin count, a Visit button and action buttons floating on it. */
export function CommunityView({ place, actions }: Props) {
  const profile = useActiveProfile();
  const { status, people } = useTownState();
  const [open, setOpen] = useState(false);
  usePlace(place);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <CommunityRoom place={place} onDoor={goInside} onExit={() => router.back()} />
      <View style={styles.top} pointerEvents="box-none">
        <Text style={styles.pill}>🪙 {profile?.coins ?? 0}</Text>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityLabel="Visit with friends"
          style={({ pressed }) => [styles.pill, styles.visit, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.visitText}>{status === 'off' ? '👫 Visit' : `👫 ${people.length} here`}</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={styles.panel}>
          <VisitPanel />
          <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={styles.close}>
            <Text style={styles.visitText}>Close</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.bottom} pointerEvents="box-none">{actions}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#9BD4F5' },
  top: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' },
  pill: { fontSize: 20, fontWeight: '900', color: colors.text, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.lg, overflow: 'hidden' },
  visit: { minHeight: TAP_TARGET * 0.8 },
  visitText: { fontSize: 18, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  panel: { position: 'absolute', top: 64, left: spacing.md, right: spacing.md, padding: spacing.md, gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: radius.lg, borderWidth: 3, borderColor: colors.border },
  close: { alignSelf: 'center', padding: spacing.sm },
  bottom: { position: 'absolute', bottom: spacing.sm, left: spacing.sm, right: spacing.sm, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
});
