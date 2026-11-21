import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { panelFace } from '@/components/Chrome';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { joinableVisits, townSession, useTownState } from '@/services/townSession';

/**
 * Floats at the top of the community when a friend nearby has Community open:
 * "Maya is here. Join the visit?" Joining is always one tap and never happens by itself.
 * While joining or getting back into a visit, it says so instead.
 */
export function JoinBubble() {
  const state = useTownState();
  if (state.joining) return <Status text={`👫 Joining ${state.joining}…`} />;
  if (state.reconnecting) return <Status text="📶 Reconnecting…" />;
  const visit = joinableVisits(state).find((v) => !state.skipped.includes(v.name));
  if (!visit) return null;
  return (
    <View style={styles.bubble} accessibilityLiveRegion="polite">
      <Text style={styles.text} numberOfLines={2}>
        👫 {visit.shown} is here. Join the visit?
      </Text>
      <View style={styles.row}>
        <BigButton small style={styles.button} label="Join" color={colors.primary} onPress={() => void townSession().joinVisit(visit.name)} />
        <BigButton small outline style={styles.button} label="Not now" color={colors.text} onPress={() => townSession().skip(visit.name)} />
      </View>
    </View>
  );
}

function Status({ text }: { text: string }) {
  return (
    <View style={styles.bubble} accessibilityLiveRegion="polite">
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { width: '100%', maxWidth: 480, padding: spacing.sm, gap: spacing.sm, ...panelFace, borderRadius: radius.lg, overflow: 'hidden', boxShadow: '0px 4px 0px rgba(78, 51, 36, 0.18)' },
  text: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text, textAlign: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  button: { flex: 1 },
});
