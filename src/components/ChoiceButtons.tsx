import { StyleSheet, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { colors, spacing } from '@/constants/theme';

interface Props {
  choices: number[];
  /** The choice the player tapped, once they have answered. */
  selected: number | null;
  answer: number;
  onSelect: (choice: number) => void;
}

/** 2x2 grid of multiple-choice answers that turns green/red after answering. */
export function ChoiceButtons({ choices, selected, answer, onSelect }: Props) {
  const answered = selected !== null;
  return (
    <View style={styles.grid}>
      {choices.map((choice) => {
        let color: string = colors.primary;
        if (answered && choice === answer) color = colors.correct;
        else if (answered && choice === selected) color = colors.wrong;
        else if (answered) color = colors.disabled;
        return (
          <BigButton
            key={choice}
            label={String(choice)}
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
