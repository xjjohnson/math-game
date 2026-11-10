import { useWindowDimensions } from 'react-native';

/** A tablet or a big PC window: the short side is at least 600 px. Play screens draw bigger there. */
export function useBigScreen(): boolean {
  const { width, height } = useWindowDimensions();
  return Math.min(width, height) >= 600;
}
