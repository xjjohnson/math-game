import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { Sticker } from '@/components/Sticker';

interface Props {
  /** The buddy's emoji or "@key" drawing. */
  value: string;
  size: number;
  /** What the buddy wears from its level, if anything. */
  gift?: string | null;
}

/** A buddy with the gift its level has earned perched on top. */
export function BuddyFace({ value, size, gift }: Props) {
  return (
    <View style={styles.wrap}>
      <Sticker value={value} size={size} />
      {gift ? (
        <Text
          style={[styles.gift, { fontSize: Math.round(size * 0.45), top: -size * 0.2 }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {gift}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  gift: { position: 'absolute', right: -6 },
});
