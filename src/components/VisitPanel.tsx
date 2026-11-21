import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { colors, fontSizes, spacing } from '@/constants/theme';
import { joinableVisits, townSession, useTownState } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';

/** What a player can wear in the community. Hats sit on the head, glasses on the face. */
export const ACCESSORIES = ['🎩', '👑', '🎀', '🧢', '🎓', '🕶️', '👓'] as const;
export const GLASSES: readonly string[] = ['🕶️', '👓'];

/** Who is here and how to leave. */
export function VisitPanel({ needsPermission = false }: { needsPermission?: boolean }) {
  const profile = useActiveProfile();
  const state = useTownState();
  const { status, notice, people, myId, joining, reconnecting } = state;
  if (!profile) return null;
  const friends = status === 'off' ? [] : people.filter((p) => p.id !== myId);
  const visits = joinableVisits(state);
  const others = people.length - 1;
  const text = joining
    ? `👫 Joining ${joining}…`
    : reconnecting
      ? '📶 Reconnecting…'
      : status === 'joined' || status === 'hosting'
        ? others > 0
          ? `👫 Visiting with ${others} friend${others > 1 ? 's' : ''}.`
          : visits.length
            ? '👫 Friends nearby! Tap one to join their visit.'
            : '👫 Waiting for friends. Open Community on their phones.'
        : '🔍 Getting ready for friends…';

  return (
    <View style={styles.box}>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {needsPermission ? (
        <BigButton label="Allow nearby play" color={colors.primary} onPress={() => router.push('/permissions')} />
      ) : (
        <Text style={styles.text}>{text}</Text>
      )}

      {visits.map((v) => (
        <BigButton key={v.name} label={`Join ${v.shown}'s visit`} color={colors.primary} onPress={() => void townSession().joinVisit(v.name)} />
      ))}

      {friends.length ? <Text style={styles.small}>Visit a friend's buddy home:</Text> : null}
      {friends.map((f) => (
        <Pressable
          key={f.id}
          onPress={() => {
            townSession().askHome(f.id, f.name);
            router.push('/visit-home');
          }}
          accessibilityRole="button"
          accessibilityLabel={`Visit ${f.name}'s buddy home`}
          style={({ pressed }) => [styles.friend, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.friendText} numberOfLines={1}>🏠 {f.name}'s home</Text>
        </Pressable>
      ))}

      {status !== 'off' ? (
        <BigButton label="Leave the visit" outline color={colors.wrong} onPress={() => townSession().stop()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  text: { fontSize: fontSizes.body, color: colors.textMuted, textAlign: 'center' },
  notice: { fontSize: 16, fontWeight: '700', color: colors.wrong, textAlign: 'center' },
  small: { fontSize: 15, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  friend: { paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: 14, borderWidth: 3, borderColor: colors.border, backgroundColor: '#FFF8E1' },
  friendText: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
});
