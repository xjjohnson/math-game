import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/AppText';
import { PersonFigure } from '@/components/PersonFigure';
import { artFor, PERSON_STICKERS } from '@/constants/art';
import { PEOPLE } from '@/constants/wardrobe';
import { clothOf } from '@/utils/wardrobe';

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
  const side = Math.round(size * 1.25);
  const art = artFor(value);
  if (art) {
    return (
      <Image
        source={art.source}
        style={[{ width: side, height: side }, style as StyleProp<ImageStyle>]}
        accessibilityIgnoresInvertColors
      />
    );
  }
  const person = PERSON_STICKERS[value] && PEOPLE[PERSON_STICKERS[value].buddyId];
  if (person) {
    // Head and shoulders: the figure drawn full height, cut off below the chest.
    const figure = side / 0.7;
    const { shirt, legs } = person.outfit;
    return (
      <View style={[{ width: side, height: side, overflow: 'hidden' }, style]}>
        <View style={{ position: 'absolute', top: -figure * 0.03, left: (side - figure) / 2 }}>
          <PersonFigure
            look={{ ...person.look, height: 1 }}
            size={figure}
            dressed={{ top: clothOf(shirt), legs: clothOf(legs) }}
          />
        </View>
      </View>
    );
  }
  return <Text style={[{ fontSize: size }, style]}>{value}</Text>;
}
