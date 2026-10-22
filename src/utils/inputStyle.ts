import type { Difficulty, InputStyle } from '@/types';

/** "Auto" means multiple choice on Easy and the number pad above it. */
export function resolveInputStyle(style: InputStyle | undefined, difficulty: Difficulty): InputStyle {
  if (style === 'choices' || style === 'numpad') return style;
  return difficulty === 'easy' ? 'choices' : 'numpad';
}
