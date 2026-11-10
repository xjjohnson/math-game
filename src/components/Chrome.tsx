import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { BRIGHT, INK, SOFT } from '@/constants/artStyle';

/**
 * The game's buttons and panels in the picture-book style (docs/art-style.md, G5):
 * round buttons with a white ring and a soft drop shadow, red dots on things that are new
 * or waiting, and white panels on faint grid paper.
 */

/** A round button face: white ring inside a thin outline, with a shadow under it. */
export const roundFace: ViewStyle = {
  backgroundColor: SOFT.white,
  borderWidth: 3,
  borderColor: '#FFFFFF',
  boxShadow: `0px 0px 0px 2px ${INK}, 0px 4px 0px 2px rgba(78, 51, 36, 0.22)`,
};

/** A pill (coins, tags) in the same style. */
export const pillFace: ViewStyle = roundFace;

/** A white panel edge: outline and a soft shadow above it (drawers that come up from the bottom). */
export const panelFace: ViewStyle = {
  backgroundColor: SOFT.white,
  borderWidth: 2,
  borderColor: INK,
  boxShadow: '0px -4px 0px rgba(78, 51, 36, 0.12)',
};

/** Soft colours for groups of tabs, so each kind of thing has its own colour. */
export const TAB_TINTS = {
  red: '#FAD4D8',
  purple: '#E2D6F7',
  yellow: '#FBE8A6',
  green: '#CDEBD6',
  orange: '#FDDCC0',
  blue: '#CFE6F7',
} as const;

/** A red dot with a white ring, for something new or waiting. Put it inside a box that doesn't clip. */
export function NewDot({ size = 14, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size, borderWidth: Math.max(2, size * 0.18), top: -size * 0.2, right: -size * 0.2 },
        style,
      ]}
    />
  );
}

/** Faint grid-paper lines behind a panel's contents. */
export function GridPaper({ cell = 22, color = '#E9EEF5' }: { cell?: number; color?: string }) {
  const id = `grid${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse">
            <Path d={`M${cell},0 L0,0 L0,${cell}`} fill="none" stroke={color} strokeWidth={1.5} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** A panel on grid paper; children sit on top. */
export function GridPanel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[panelFace, style]}>
      <GridPaper />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', backgroundColor: BRIGHT.red, borderColor: '#FFFFFF' },
});
