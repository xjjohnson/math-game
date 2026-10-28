import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';

interface Props {
  decor: string[];
}

const COLUMNS = 4;
const ROWS = 9;
const TILT = [-14, 8, -4, 12, -10, 4];

/**
 * Faint pictures scattered behind a screen for the themed backgrounds. Fixed
 * spots (no randomness) so the pattern doesn't jump between screens.
 */
export function BackgroundDecor({ decor }: Props) {
  if (decor.length === 0) return null;
  const spots = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const i = row * COLUMNS + col;
      spots.push(
        <Text
          key={i}
          style={[
            styles.item,
            {
              left: `${col * (100 / COLUMNS) + (row % 2) * (50 / COLUMNS) + 2}%`,
              top: `${row * (100 / ROWS) + 1}%`,
              fontSize: i % 3 === 0 ? 40 : 30,
              transform: [{ rotate: `${TILT[i % TILT.length]}deg` }],
            },
          ]}
        >
          {decor[(i + row) % decor.length]}
        </Text>,
      );
    }
  }
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {spots}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute', opacity: 0.2 },
});
