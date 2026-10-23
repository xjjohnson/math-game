import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { colors, fontSizes } from '@/constants/theme';
import type { TeachHint } from '@/hooks/useColumnAnswer';

/** Show-my-work coaching: which column we're on and what to work out there. */
export function ColumnHint({ hint }: { hint: TeachHint }) {
  if (hint.done) {
    return (
      <View style={styles.wrap} accessibilityLiveRegion="polite">
        <Text style={styles.question}>All done! Tap ✓ to check.</Text>
      </View>
    );
  }
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text style={styles.question}>
        <Text style={styles.place}>{capitalize(hint.place)}: </Text>
        {hint.question} = <Text style={styles.typed}>{hint.typed || '?'}</Text>
      </Text>
      {hint.missed ? (
        <Text style={[styles.tip, styles.missed]}>Not quite. Work out {hint.question} again.</Text>
      ) : hint.tip ? (
        <Text style={styles.tip}>{hint.tip}</Text>
      ) : null}
    </View>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  question: { fontSize: fontSizes.button, fontWeight: '800', color: colors.text, textAlign: 'center' },
  place: { color: colors.textMuted },
  typed: { color: colors.primary },
  tip: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  missed: { color: colors.wrong, fontWeight: '700' },
});
