import { View, type StyleProp, type ViewStyle } from 'react-native';

import { SHADOW } from '@/constants/artStyle';

interface Props {
  /** Width of the shadow; it is a flat oval a quarter as tall. */
  width: number;
  /** Hidden while someone is lifted off the floor. */
  hidden?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The soft oval shadow on the floor under a person, buddy or standing thing. */
export function GroundShadow({ width, hidden = false, style }: Props) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        {
          position: 'absolute',
          width,
          height: width * 0.24,
          borderRadius: width,
          backgroundColor: SHADOW,
          opacity: hidden ? 0 : 1,
        },
        style,
      ]}
    />
  );
}
