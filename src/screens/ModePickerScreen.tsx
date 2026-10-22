import { router } from 'expo-router';
import { useState } from 'react';

import { BigButton } from '@/components/BigButton';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { DIFFICULTIES, OPERATIONS, TIMER_OPTIONS } from '@/constants/difficulty';
import { colors } from '@/constants/theme';
import type { Difficulty, Operation, TimerSetting } from '@/types';

export function ModePickerScreen() {
  const [operation, setOperation] = useState<Operation>('add');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [timer, setTimer] = useState<TimerSetting>(null);

  return (
    <Screen title="Choose a game">
      <OptionGroup
        label="Operation"
        value={operation}
        onChange={setOperation}
        options={OPERATIONS.map((o) => ({
          value: o.value,
          label: `${o.symbol}  ${o.label}`,
          color: colors.operations[o.value],
        }))}
      />
      <OptionGroup
        label="Difficulty"
        value={difficulty}
        onChange={setDifficulty}
        options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => ({
          value: d,
          label: DIFFICULTIES[d].label,
        }))}
      />
      <OptionGroup label="Timer" value={timer} onChange={setTimer} options={TIMER_OPTIONS} />
      <BigButton
        label="Start"
        color={colors.correct}
        onPress={() =>
          router.push({
            pathname: '/play',
            params: { operation, difficulty, timer: timer === null ? 'none' : String(timer) },
          })
        }
      />
    </Screen>
  );
}
