import { useWindowDimensions } from 'react-native';

/**
 * A wide, landscape window (a tablet held sideways, or a PC): the play screen
 * puts the question on the left and the answer pad on the right so nothing scrolls.
 * Phones and portrait tablets keep the single column.
 */
export function useLandscapePlay(): boolean {
  const { width, height } = useWindowDimensions();
  return width >= 720 && height >= 480 && width > height * 1.1;
}
