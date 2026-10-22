import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { useMotion } from '@/hooks/useAccessibility';

interface Props {
  children: ReactNode;
  /** Wait this many milliseconds before popping in. */
  delay?: number;
  /** Lower is bouncier. */
  damping?: number;
  style?: StyleProp<ViewStyle>;
  accessible?: boolean;
  accessibilityLabel?: string;
}

/**
 * Springs its content in from small when it first appears, and shows it still
 * when motion is reduced. Re-renders don't replay it; remount with a new `key` to.
 */
export function PopIn({ children, delay = 0, damping = 14, style, ...a11y }: Props) {
  const { animate, reduceMotion } = useMotion();
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate) progress.value = withDelay(delay, withSpring(1, { damping, reduceMotion }));
    // Only on mount: the pop is for arriving, not for every update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pop = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 2),
    transform: [{ scale: 0.5 + progress.value * 0.5 }],
  }));

  return (
    <Animated.View style={[style, pop]} {...a11y}>
      {children}
    </Animated.View>
  );
}
