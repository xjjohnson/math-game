import { useCallback, useMemo, useState } from 'react';

import type { Problem } from '@/types';
import {
  columnLayout,
  entryValue,
  pressKey,
  selectBox,
  startEntry,
  type ColumnEntry,
  type ColumnRow,
} from '@/utils/columnEntry';
import { placeName, startTeach, teachDone, teachKey, teachSteps, type TeachState } from '@/utils/columnTeach';

type Work = { kind: 'free'; entry: ColumnEntry } | { kind: 'teach'; state: TeachState };

export interface TeachHint {
  place: string;
  question: string;
  typed: string;
  tip: string | null;
  missed: boolean;
  done: boolean;
}

/**
 * The answer boxes for a column problem. Free mode lets the player tap any
 * box; "show my work" mode walks the columns from the ones, carrying for them.
 * Resets by itself when the problem changes.
 */
export function useColumnAnswer(problem: Problem, { allowNegative = false, teach = false } = {}) {
  const layout = useMemo(() => columnLayout(problem), [problem]);
  const steps = useMemo(() => (teach ? teachSteps(problem) : null), [problem, teach]);
  const fresh = useCallback(
    (): Work => (steps ? { kind: 'teach', state: startTeach(problem, steps) } : { kind: 'free', entry: startEntry(layout.width) }),
    [problem, steps, layout],
  );
  const [saved, setSaved] = useState<{ problem: Problem; work: Work }>(() => ({ problem, work: fresh() }));
  const work = saved.problem === problem ? saved.work : fresh();
  const update = useCallback(
    (change: (w: Work) => Work) =>
      setSaved((s) => ({ problem, work: change(s.problem === problem ? s.work : fresh()) })),
    [problem, fresh],
  );

  const press = useCallback(
    (key: string) =>
      update((w) =>
        w.kind === 'teach' && steps
          ? { kind: 'teach', state: teachKey(w.state, steps, key) }
          : w.kind === 'free'
            ? { kind: 'free', entry: pressKey(w.entry, key, allowNegative) }
            : w,
      ),
    [update, steps, allowNegative],
  );
  const select = useCallback(
    (row: ColumnRow, col: number) =>
      update((w) => (w.kind === 'free' ? { kind: 'free', entry: selectBox(w.entry, row, col) } : w)),
    [update],
  );

  const entry = work.kind === 'teach' ? work.state.entry : work.entry;
  let hint: TeachHint | null = null;
  if (work.kind === 'teach' && steps) {
    const done = teachDone(work.state, steps);
    const step = steps[Math.min(work.state.step, steps.length - 1)];
    hint = {
      place: placeName(layout.width - 1 - step.col),
      question: step.question,
      typed: work.state.typed,
      tip: step.tip,
      missed: work.state.missed,
      done,
    };
  }

  return {
    layout,
    entry,
    teaching: work.kind === 'teach',
    hint,
    value: entryValue(entry),
    press,
    select,
  };
}
