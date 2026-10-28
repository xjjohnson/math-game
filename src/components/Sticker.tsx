import { Image, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/AppText';
import { artFor } from '@/constants/art';

interface Props {
  /** An emoji, or an "@key" drawing from constants/art. */
  value: string;
  /** Font size for emoji; drawings are sized to match. */
  size: number;
  /** Layout only (margins, transforms), so it suits both kinds. */
  style?: StyleProp<ViewStyle>;
}

/** Shows an avatar or buddy, whether it is an emoji or a drawn picture. */
export function Sticker({ value, size, style }: Props) {
  const art = artFor(value);
  if (art) {
    const side = Math.round(size * 1.25);
    return (
      <Image
        source={art.source}
        style={[{ width: side, height: side }, style as StyleProp<ImageStyle>]}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return <Text style={[{ fontSize: size }, style]}>{value}</Text>;
}
