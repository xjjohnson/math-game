import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { Sticker } from '@/components/Sticker';
import { ACCESSORIES } from '@/components/VisitPanel';
import { SHOP_ITEMS } from '@/constants/shop';
import { colors, radius, spacing } from '@/constants/theme';
import { townSession, useTownState } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';
import { MAX_BUDDIES } from '@/utils/multiplayer/protocol';
import { owns } from '@/utils/shop';

/** Choose who comes along: any of your buddies (up to three) and one thing to wear. Nobody comes until you pick them. */
export function BringPanel() {
  const profile = useActiveProfile();
  const { look } = useTownState();
  if (!profile) return null;

  const mine = SHOP_ITEMS.flatMap((i) => (i.category === 'companion' && owns(profile, i) ? [{ id: i.id, name: i.name, value: i.companion.emoji }] : []));
  const chosen = look.buddies;
  const toggle = (value: string) => {
    if (chosen.includes(value)) townSession().setLook(chosen.filter((b) => b !== value), look.acc);
    else if (chosen.length < MAX_BUDDIES) townSession().setLook([...chosen, value], look.acc);
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Who is coming with you?</Text>
      <Text style={styles.hint}>
        {mine.length
          ? `Tap your buddies to bring them. ${chosen.length} of ${MAX_BUDDIES} picked.`
          : 'You have no buddies yet. Buy one in the Shop!'}
      </Text>
      <View style={styles.tiles}>
        {mine.map((b) => {
          const on = chosen.includes(b.value);
          const full = !on && chosen.length >= MAX_BUDDIES;
          return (
            <Pressable
              key={b.id}
              onPress={() => toggle(b.value)}
              accessibilityRole="button"
              accessibilityLabel={`${on ? 'Leave behind' : 'Bring'} ${b.name}`}
              accessibilityState={{ selected: on, disabled: full }}
              style={[styles.tile, on && styles.tileOn, full && { opacity: 0.4 }]}
            >
              <Sticker value={b.value} size={48} />
              <Text style={styles.tileName} numberOfLines={1}>{b.name}</Text>
              {on ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.title}>What are you wearing?</Text>
      <View style={styles.tiles}>
        {ACCESSORIES.map((a) => (
          <Pressable
            key={a}
            onPress={() => townSession().setLook(chosen, look.acc === a ? undefined : a)}
            accessibilityRole="button"
            accessibilityLabel={`Wear ${a}`}
            accessibilityState={{ selected: look.acc === a }}
            style={[styles.acc, look.acc === a && styles.tileOn]}
          >
            <Text style={styles.accText}>{a}</Text>
            {look.acc === a ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  hint: { fontSize: 16, color: colors.textMuted },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: 92, paddingVertical: spacing.sm, alignItems: 'center', gap: 2, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 4, borderColor: colors.border },
  tileOn: { borderColor: colors.correct, backgroundColor: '#E6F7EE' },
  tileName: { fontSize: 14, fontWeight: '800', color: colors.text, paddingHorizontal: 4 },
  check: { position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13, textAlign: 'center', lineHeight: 26, fontSize: 16, fontWeight: '900', color: '#fff', backgroundColor: colors.correct, overflow: 'hidden' },
  acc: { width: 58, height: 58, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 4, borderColor: colors.border },
  accText: { fontSize: 30 },
});
