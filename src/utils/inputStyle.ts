import type { Difficulty, Grade, InputStyle } from '@/types';

/** "Auto" means multiple choice on Easy (and always in kindergarten) and the number pad above it. */
export function resolveInputStyle(style: InputStyle | undefined, difficulty: Difficulty, grade?: Grade): InputStyle {
  if (style === 'choices' || style === 'numpad') return style;
  return difficulty === 'easy' || grade === 0 ? 'choices' : 'numpad';
}
