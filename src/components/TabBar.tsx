import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { colors } from '@/constants/theme';

export type TabId = 'home' | 'buddy' | 'town' | 'shop' | 'me';

const TABS: { id: TabId; emoji: string; label: string; path: string }[] = [
  { id: 'home', emoji: '🏠', label: 'Home', path: '/' },
  { id: 'buddy', emoji: '🐾', label: 'Buddy', path: '/buddy' },
  { id: 'town', emoji: '🏘️', label: 'Town', path: '/town' },
  { id: 'shop', emoji: '🛍️', label: 'Shop', path: '/shop' },
  { id: 'me', emoji: '👤', label: 'Me', path: '/progress' },
];

/** Bottom bar for the main places. Tabs replace the screen so Back never piles up. */
export function TabBar({ active }: { active: TabId }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (!on) router.replace(tab.path as never);
            }}
            style={[styles.tab, on && styles.on]}
          >
            <Text style={styles.emoji}>{tab.emoji}</Text>
            <Text style={[styles.label, on && styles.labelOn]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: '#E0DCCB',
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', minHeight: 56, justifyContent: 'center', borderRadius: 14, marginHorizontal: 2 },
  on: { backgroundColor: '#E8ECFF' },
  emoji: { fontSize: 24 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  labelOn: { color: colors.primary },
});
