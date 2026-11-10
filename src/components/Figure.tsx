import { BuddyFigure } from '@/components/BuddyFigure';
import { PersonFigure, type Mood } from '@/components/PersonFigure';
import type { FigureLook } from '@/utils/figures';

interface Props {
  figure: FigureLook;
  size: number;
  /** Blinks now and then (people). */
  alive?: boolean;
  /** Change this number to wave once. */
  wave?: number;
  gift?: string | null;
  /** A big grin (people), for being carried. */
  happy?: boolean;
  /** The face a person shows; wins over `happy`. Buddies keep their own face. */
  mood?: Mood;
}

/** A whole-body person or buddy, drawn the same way everywhere: home, Community and visits. */
export function Figure({ figure, size, alive = true, wave, gift, happy, mood }: Props) {
  return figure.kind === 'person' ? (
    <PersonFigure look={figure.look} size={size} dressed={figure.dressed} gift={gift} alive={alive} wave={wave} happy={happy} mood={mood} />
  ) : (
    <BuddyFigure value={figure.emoji} size={size} fur={figure.fur} belly={figure.belly} dressed={figure.dressed} gift={gift} wave={wave} />
  );
}
