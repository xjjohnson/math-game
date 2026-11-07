import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Sticker } from '@/components/Sticker';
import { SHOP_ITEMS } from '@/constants/shop';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { townSession, useTownState } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';
import { MAX_BUDDIES } from '@/utils/multiplayer/protocol';
import { owns } from '@/utils/shop';

/** What a player can wear in the community. Hats sit on the head, glasses on the face. */
export const ACCESSORIES = ['🎩', '👑', '🎀', '🧢', '🎓', '🕶️', '👓'] as const;
export const GLASSES: readonly string[] = ['🕶️', '👓'];

/** Who is here, how to leave, and what this player brings: owned buddies and one accessory. */
export function VisitPanel({ needsPermission = false }: { needsPermission?: boolean }) {
  const profile = useActiveProfile();
  const { status, notice, people, look } = useTownState();
  if (!profile) return null;

  const mine = SHOP_ITEMS.filter((i) => i.category === 'companion' && owns(profile, i));
  const chosen = look.buddies;
  const toggleBuddy = (value: string) => {
    const next = chosen.includes(value) ? chosen.filter((b) => b !== value) : [...chosen, value].slice(-MAX_BUDDIES);
    townSession().setLook(next, look.acc);
  };

  return (
    <View style={styles.box}>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {needsPermission ? (
        <BigButton label="Allow nearby play" color={colors.primary} onPress={() => router.push('/permissions')} />
      ) : (
        <Text style={styles.text}>
          {status === 'joined' || status === 'hosting'
            ? people.length > 1
              ? `👫 Visiting with ${people.length - 1} friend${people.length > 2 ? 's' : ''}.`
              : '👫 Waiting for friends. Open Community on their phones.'
            : '🔍 Looking for friends nearby…'}
        </Text>
      )}

      <Text style={styles.label}>Wear something</Text>
      <View style={styles.row}>
        {ACCESSORIES.map((a) => (
          <Pressable
            key={a}
            onPress={() => townSession().setLook(chosen, look.acc === a ? undefined : a)}
            accessibilityRole="button"
            accessibilityLabel={`Wear ${a}`}
            accessibilityState={{ selected: look.acc === a }}
            style={[styles.chip, look.acc === a && styles.chipOn]}
          >
            <Text style={styles.chipText}>{a}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Bring your buddies (up to {MAX_BUDDIES})</Text>
      {mine.length ? null : <Text style={styles.text}>Buy a buddy in the Shop and it can come along.</Text>}
      <View style={styles.row}>
        {mine.map((i) => {
          const value = i.category === 'companion' ? i.companion.emoji : '';
          const on = chosen.includes(value);
          return (
            <Pressable
              key={i.id}
              onPress={() => toggleBuddy(value)}
              accessibilityRole="button"
              accessibilityLabel={`Bring ${i.name}`}
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Sticker value={value} size={34} />
            </Pressable>
          );
        })}
      </View>

      {status !== 'off' ? (
        <BigButton label="Leave the visit" outline color={colors.wrong} onPress={() => townSession().stop()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  text: { fontSize: fontSizes.body, color: colors.textMuted, textAlign: 'center' },
  label: { fontSize: 16, fontWeight: '800', color: colors.text },
  notice: { fontSize: 16, fontWeight: '700', color: colors.wrong, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.border },
  chipOn: { borderColor: colors.primary, backgroundColor: '#E3EAFF' },
  chipText: { fontSize: 26 },
});
