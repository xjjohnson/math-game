import { StyleSheet, View } from 'react-native';

import { Flicker } from '@/components/Motion';

const OUTLINE = '#5B3A24';

interface Props {
  width: number;
  height: number;
  wax: string;
  lit: boolean;
  /** Keeps each candle's flame on its own rhythm. */
  seed: string;
}

/** A pillar candle on a little dish: wax with a drip, a wick, and a swaying flame while lit. */
export function Candle({ width, height, wax, lit, seed }: Props) {
  const waxW = Math.min(width * 0.5, height * 0.42);
  const waxH = height * 0.52;
  const dishH = height * 0.08;
  const wickH = height * 0.07;
  const flameW = waxW * 0.42;
  const flameH = height * 0.3;
  const waxTop = height - dishH - waxH;
  return (
    <View style={{ width, height }} pointerEvents="none">
      {lit ? (
        <Flicker
          seed={seed}
          sway={18}
          style={[styles.part, { left: (width - flameW) / 2, top: waxTop - wickH - flameH * 0.85, width: flameW, height: flameH, transformOrigin: 'bottom' }]}
        >
          {/* A square with one sharp corner, turned to point up and stretched tall: a teardrop. */}
          <View
            style={[
              styles.flame,
              {
                top: (flameH - flameW) / 2,
                width: flameW,
                height: flameW,
                borderRadius: flameW / 2,
                borderTopRightRadius: flameW * 0.08,
                transform: [{ scaleY: flameH / (flameW * 1.45) }, { rotate: '-45deg' }],
              },
            ]}
          >
            <View style={[styles.core, { borderRadius: flameW }]} />
          </View>
        </Flicker>
      ) : null}
      <View style={[styles.part, styles.wick, { left: width / 2 - 1.5, top: waxTop - wickH, height: wickH + 2 }]} />
      <View style={[styles.part, styles.wax, { left: (width - waxW) / 2, top: waxTop, width: waxW, height: waxH, backgroundColor: wax }]}>
        {/* A drip down the front and a little shine. */}
        <View style={[styles.drip, { left: waxW * 0.18, width: waxW * 0.18, height: waxH * 0.38, backgroundColor: wax }]} />
        <View style={[styles.shine, { left: waxW * 0.62, width: waxW * 0.12, height: waxH * 0.6 }]} />
      </View>
      <View style={[styles.part, styles.dish, { left: (width - waxW * 1.7) / 2, top: height - dishH, width: waxW * 1.7, height: dishH, borderRadius: dishH }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  part: { position: 'absolute' },
  flame: {
    position: 'absolute',
    left: 0,
    backgroundColor: '#FFB300',
    borderWidth: 1.5,
    borderColor: '#E65100',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  core: { width: '50%', height: '50%', marginLeft: '18%', marginBottom: '18%', backgroundColor: '#FFF59D' },
  wick: { width: 3, backgroundColor: '#3E2723' },
  wax: { borderWidth: 2, borderColor: OUTLINE, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, overflow: 'visible' },
  drip: { position: 'absolute', top: -2, borderWidth: 2, borderTopWidth: 0, borderColor: OUTLINE, borderBottomLeftRadius: 99, borderBottomRightRadius: 99 },
  shine: { position: 'absolute', top: '15%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dish: { backgroundColor: '#B0BEC5', borderWidth: 2, borderColor: OUTLINE },
});
