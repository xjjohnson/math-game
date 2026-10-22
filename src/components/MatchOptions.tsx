import { OptionGroup } from '@/components/OptionGroup';
import { DIFFICULTIES, OPERATIONS } from '@/constants/difficulty';
import { colors } from '@/constants/theme';
import type { Difficulty, Operation } from '@/types';

interface Props {
  operation: Operation;
  difficulty: Difficulty;
  onChange: (changes: { operation?: Operation; difficulty?: Difficulty }) => void;
}

/** Operation and difficulty pickers shared by the two-player setups. */
export function MatchOptions({ operation, difficulty, onChange }: Props) {
  return (
    <>
      <OptionGroup
        label="Practice"
        value={operation}
        onChange={(value) => onChange({ operation: value })}
        options={OPERATIONS.map((o) => ({
          value: o.value,
          label: `${o.symbol}  ${o.label}`,
          color: colors.operations[o.value],
        }))}
      />
      <OptionGroup
        label="Difficulty"
        value={difficulty}
        onChange={(value) => onChange({ difficulty: value })}
        options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => ({
          value: d,
          label: `${DIFFICULTIES[d].label}\n${DIFFICULTIES[d].description}`,
        }))}
      />
    </>
  );
}
