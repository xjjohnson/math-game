import { useEffect } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '@/hooks/useAccessibility';

/** Handwriting font for anything the player "writes", like pencil on paper. */
export const PENCIL_FONT = 'PatrickHand_400Regular';

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Start this far away (e.g. down in the ones box) and glide into place, like a carried 1. */
  from?: { x: number; y: number };
}

/**
 * A digit that looks written in pencil: it wipes on left to right with a small
 * wobble. Give it a new `key` for each new value so it writes again.
 */
export function PencilDigit({ text, style, from }: Props) {
  const { animate } = useMotion();
  const write = useSharedValue(animate ? 0 : 1);
  const fly = useSharedValue(animate && from ? 0 : 1);
  const tilt = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    if (from) {
      write.value = 1;
      fly.value = withTiming(1, { duration: 550, easing: Easing.inOut(Easing.cubic) });
    } else {
      write.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
      tilt.value = withSequence(withTiming(-6, { duration: 90 }), withTiming(0, { duration: 170 }));
    }
    // Only on mount; a new value remounts with a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const look = useAnimatedStyle(() => {
    const t = fly.value;
    // An arc: up and over, ending a little bigger than it started for a "pop".
    const x = from ? from.x * (1 - t) : 0;
    const y = from ? from.y * (1 - t) - Math.sin(t * Math.PI) * 24 : 0;
    return {
      opacity: write.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scaleX: 0.3 + write.value * 0.7 },
        { scale: from ? 1 + Math.sin(t * Math.PI) * 0.3 : 1 },
        { rotate: `${tilt.value}deg` },
      ],
    };
  });

  return (
    <Animated.View style={look}>
      <Text style={[{ fontFamily: PENCIL_FONT }, style]}>{text}</Text>
    </Animated.View>
  );
}
