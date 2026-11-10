import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { BringPanel } from '@/components/BringPanel';
import { GridPaper, panelFace, pillFace } from '@/components/Chrome';
import { TabBar, type TabId } from '@/components/TabBar';
import { CommunityRoom } from '@/components/community/CommunityRoom';
import { TownMap } from '@/components/community/TownMap';
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
  needsPermission?: boolean;
  /** Shows the bottom tab bar (on the street, which is a main place you reach from the tabs). */
  tab?: TabId;
}

export const goInside = (id: BuildingId) => router.push({ pathname: '/place', params: { building: id } });

/** The full-screen community: the room fills the screen, with the coin count, a Visit button and action buttons floating on it. */
export function CommunityView({ place, actions, needsPermission = false, tab }: Props) {
  const profile = useActiveProfile();
  const { status, people } = useTownState();
  const [open, setOpen] = useState<'friends' | 'bring' | null>(null);
  usePlace(place);

  return (
    <SafeAreaView style={styles.safe} edges={tab ? ['left', 'right'] : ['bottom', 'left', 'right']}>
      <View style={styles.fill}>
        {place === 'street' ? (
          <TownMap onDoor={goInside} />
        ) : (
          <CommunityRoom place={place} onDoor={goInside} onExit={() => router.back()} />
        )}
        <View style={styles.top} pointerEvents="box-none">
          <Text style={styles.pill}>🪙 {profile?.coins ?? 0}</Text>
          <View style={styles.pills}>
            <Pressable
              onPress={() => setOpen((o) => (o === 'bring' ? null : 'bring'))}
              accessibilityRole="button"
              accessibilityLabel="Choose your buddies and what you wear"
              style={({ pressed }) => [styles.pill, styles.visit, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.visitText}>🐾 Bring</Text>
            </Pressable>
            <Pressable
              onPress={() => setOpen((o) => (o === 'friends' ? null : 'friends'))}
              accessibilityRole="button"
              accessibilityLabel="Visit with friends"
              style={({ pressed }) => [styles.pill, styles.visit, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.visitText}>{status === 'off' ? '👫 Friends' : `👫 ${people.length} here`}</Text>
            </Pressable>
          </View>
        </View>
        {open ? (
          <View style={styles.panelSpot} pointerEvents="box-none">
            <View style={styles.panel}>
              <GridPaper />
              {open === 'bring' ? <BringPanel /> : <VisitPanel needsPermission={needsPermission} />}
              <Pressable onPress={() => setOpen(null)} accessibilityRole="button" style={styles.close}>
                <Text style={styles.visitText}>Close</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <View style={styles.bottomSpot} pointerEvents="box-none">
          <View style={styles.bottom} pointerEvents="box-none">{actions}</View>
        </View>
      </View>
      {tab ? <TabBar active={tab} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#9BD4F5' },
  fill: { flex: 1 },
  top: { position: 'absolute', top: spacing.sm, left: spacing.sm, right: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' },
  pill: { fontSize: 20, fontWeight: '900', color: colors.text, ...pillFace, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.lg, overflow: 'hidden' },
  pills: { flexDirection: 'row', gap: spacing.sm },
  visit: { minHeight: TAP_TARGET * 0.8 },
  visitText: { fontSize: 18, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  panelSpot: { position: 'absolute', top: 64, left: spacing.md, right: spacing.md, alignItems: 'center' },
  panel: { width: '100%', maxWidth: 560, padding: spacing.md, gap: spacing.sm, ...panelFace, boxShadow: '0px 4px 0px rgba(78, 51, 36, 0.18)', borderRadius: radius.lg, overflow: 'hidden' },
  close: { alignSelf: 'center', padding: spacing.sm },
  // On a wide tablet the buttons stay a comfortable size in the middle instead of running edge to edge.
  bottomSpot: { position: 'absolute', bottom: spacing.sm, left: spacing.sm, right: spacing.sm, alignItems: 'center' },
  bottom: { width: '100%', maxWidth: 640, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
});
