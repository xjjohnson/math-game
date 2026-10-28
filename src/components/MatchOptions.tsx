import { OptionGroup } from '@/components/OptionGroup';
import { OPERATIONS } from '@/constants/difficulty';
import { colors } from '@/constants/theme';
import type { Operation } from '@/types';

interface Props {
  operation: Operation;
  onChange: (operation: Operation) => void;
}

/**
 * The operation picker shared by the multiplayer setups. Grade and difficulty
 * are picked per player, so everyone plays at their own level.
 */
export function MatchOptions({ operation, onChange }: Props) {
  return (
    <OptionGroup
      label="Practice"
      value={operation}
      onChange={onChange}
      options={OPERATIONS.map((o) => ({
        value: o.value,
        label: `${o.symbol}  ${o.label}`,
        color: colors.operations[o.value],
      }))}
    />
  );
}
