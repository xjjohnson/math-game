import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { Nearby } from '../../modules/math-nearby';
import { townSession, useTownState } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';
import { allGranted, checkPermissions, devicePermissions } from '@/utils/nearbyPermissions';

/** Host or join a group of phones so friends can see each other in the community. Android only. */
export function VisitPanel() {
  const profile = useActiveProfile();
  const { status, found, notice, people } = useTownState();
  if (!Nearby || !profile) return null;
  const me = { name: profile.name, avatar: profile.avatar };

  const go = async (asHost: boolean) => {
    const list = devicePermissions();
    if (!allGranted(await checkPermissions(list), list)) {
      router.push('/permissions');
      return;
    }
    if (asHost) await townSession().host(me);
    else await townSession().discover(me);
  };

  return (
    <View style={styles.box}>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {status === 'off' ? (
        <>
          <Text style={styles.text}>👫 Visit with friends nearby and see each other in the community.</Text>
          <BigButton label="📣 Host a visit" color={colors.primary} onPress={() => go(true)} />
          <BigButton label="🔍 Join a visit" color={colors.accent} onPress={() => go(false)} />
        </>
      ) : null}
      {status === 'finding' ? (
        <>
          <Text style={styles.text}>{found.length ? 'Tap a visit to join' : 'Looking for visits nearby…'}</Text>
          {found.map((peer) => (
            <Pressable
              key={peer.id}
              onPress={() => townSession().join(peer.id)}
              accessibilityRole="button"
              accessibilityLabel={`Join ${peer.name}`}
              style={({ pressed }) => [styles.peer, pressed && styles.pressed]}
            >
              <Text style={styles.peerName}>{peer.name}</Text>
            </Pressable>
          ))}
        </>
      ) : null}
      {status === 'hosting' || status === 'joined' ? (
        <Text style={styles.text}>
          {status === 'hosting' ? 'Hosting a visit. Friends tap “Join a visit”. ' : 'Visiting. '}
          {people.length > 1 ? `${people.length} of you are out here.` : ''}
        </Text>
      ) : null}
      {status !== 'off' ? (
        <BigButton label="Leave the visit" outline color={colors.wrong} onPress={() => townSession().leave()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  text: { fontSize: fontSizes.body, color: colors.textMuted, textAlign: 'center' },
  notice: { fontSize: 16, fontWeight: '700', color: colors.wrong, textAlign: 'center' },
  peer: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center' },
  peerName: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  pressed: { transform: [{ scale: 0.97 }] },
});
