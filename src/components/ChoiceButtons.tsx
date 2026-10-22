import { StyleSheet, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { colors, spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/useAccessibility';

interface Props {
  choices: number[];
  /** The choice the player tapped, once they have answered. */
  selected: number | null;
  answer: number;
  onSelect: (choice: number) => void;
}

/**
 * 2x2 grid of multiple-choice answers. After answering, the right one gets a ✓
 * and a wrong pick an ✗, so the result never depends on color alone.
 */
export function ChoiceButtons({ choices, selected, answer, onSelect }: Props) {
  const palette = usePalette();
  const answered = selected !== null;
  return (
    <View style={styles.grid}>
      {choices.map((choice) => {
        let color: string = colors.primary;
        let label = String(choice);
        if (answered && choice === answer) {
          color = palette.correct;
          label = `✓ ${choice}`;
        } else if (answered && choice === selected) {
          color = palette.wrong;
          label = `✗ ${choice}`;
        } else if (answered) color = colors.disabled;
        return (
          <BigButton
            key={choice}
            label={label}
            color={color}
            onPress={() => !answered && onSelect(choice)}
            style={styles.choice}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  choice: { flexBasis: '45%', flexGrow: 1, minHeight: 96 },
});
