import { BuddyFigure } from '@/components/BuddyFigure';
import { PersonFigure } from '@/components/PersonFigure';
import type { FigureLook } from '@/utils/figures';

interface Props {
  figure: FigureLook;
  size: number;
  /** Blinks now and then (people). */
  alive?: boolean;
  /** Change this number to wave once. */
  wave?: number;
  gift?: string | null;
}

/** A whole-body person or buddy, drawn the same way everywhere: home, Community and visits. */
export function Figure({ figure, size, alive = true, wave, gift }: Props) {
  return figure.kind === 'person' ? (
    <PersonFigure look={figure.look} size={size} dressed={figure.dressed} gift={gift} alive={alive} wave={wave} />
  ) : (
    <BuddyFigure value={figure.emoji} size={size} fur={figure.fur} belly={figure.belly} dressed={figure.dressed} gift={gift} wave={wave} />
  );
}
