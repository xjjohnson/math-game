import { StyleSheet, View } from 'react-native';

import type { FurnitureShape } from '@/constants/room';
import { INK } from '@/constants/artStyle';

interface Props {
  shape: FurnitureShape;
  width: number;
  height: number;
}

const WOOD = '#B07A4F';
const DARK = INK;
const BOOK_COLORS = ['#EF5350', '#42A5F5', '#FFCA28', '#66BB6A', '#AB47BC', '#FF7043', '#26C6DA', '#EC407A'];

/** Furniture with no good emoji, drawn in the home's flat style. */
export function Furniture({ shape, width, height }: Props) {
  const line = Math.max(2, Math.round(height * 0.035));
  const leg = Math.max(6, Math.round(width * 0.07));
  const edge = { borderWidth: line, borderColor: DARK };
  const legs = (top: number, inset: number) => (
    <>
      <View style={[styles.leg, edge, { top, bottom: 0, left: inset, width: leg }]} />
      <View style={[styles.leg, edge, { top, bottom: 0, right: inset, width: leg }]} />
    </>
  );
  return (
    <View style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no">
      {shape === 'table' ? (
        <>
          {legs(height * 0.12, width * 0.08)}
          <View style={[styles.slab, edge, { top: 0, height: height * 0.16 }]} />
        </>
      ) : null}
      {shape === 'coffeeTable' ? (
        <>
          {legs(height * 0.2, width * 0.1)}
          <View style={[styles.slab, edge, { top: 0, height: height * 0.3 }]} />
        </>
      ) : null}
      {shape === 'nightstand' ? (
        <View style={[styles.slab, edge, styles.box, { top: 0, bottom: 0 }]}>
          <View style={[styles.drawer, { borderWidth: line }]}>
            <View style={styles.knob} />
          </View>
          <View style={[styles.drawer, { borderWidth: line }]}>
            <View style={styles.knob} />
          </View>
        </View>
      ) : null}
      {shape === 'stool' ? (
        <>
          {legs(height * 0.1, width * 0.12)}
          <View style={[styles.slab, edge, styles.cushion, { top: 0, height: height * 0.2 }]} />
        </>
      ) : null}
      {shape === 'bench' ? (
        <>
          {legs(height * 0.3, width * 0.06)}
          <View style={[styles.slab, edge, { top: height * 0.22, height: height * 0.2 }]} />
        </>
      ) : null}
      {shape === 'beanbag' ? (
        <View
          style={[
            styles.bag,
            edge,
            { borderTopLeftRadius: width * 0.5, borderTopRightRadius: width * 0.45, borderRadius: height * 0.35 },
          ]}
        >
          <View style={[styles.dent, { borderRadius: width * 0.3 }]} />
        </View>
      ) : null}
      {shape === 'armchair' ? (
        <>
          <View style={[styles.slab, edge, styles.chairBack, { top: 0, height: height * 0.8 }]} />
          <View style={[styles.arm, edge, { left: 0, top: height * 0.38, width: width * 0.2, height: height * 0.48 }]} />
          <View style={[styles.arm, edge, { right: 0, top: height * 0.38, width: width * 0.2, height: height * 0.48 }]} />
          <View style={[styles.slab, edge, styles.chairBack, { left: width * 0.16, right: width * 0.16, top: height * 0.5, height: height * 0.36 }]} />
          <View style={[styles.legPeg, edge, { left: width * 0.08, bottom: 0, height: height * 0.16 }]} />
          <View style={[styles.legPeg, edge, { right: width * 0.08, bottom: 0, height: height * 0.16 }]} />
        </>
      ) : null}
      {shape === 'ottoman' ? (
        <>
          <View style={[styles.slab, edge, styles.chairBack, { top: 0, height: height * 0.82, borderRadius: 14 }]} />
          <View style={[styles.legPeg, edge, { left: width * 0.1, bottom: 0, height: height * 0.22 }]} />
          <View style={[styles.legPeg, edge, { right: width * 0.1, bottom: 0, height: height * 0.22 }]} />
        </>
      ) : null}
      {shape === 'sideTable' ? (
        <>
          {legs(height * 0.1, width * 0.12)}
          <View style={[styles.slab, edge, { top: 0, height: height * 0.14 }]} />
          <View style={[styles.slab, edge, { left: width * 0.14, right: width * 0.14, top: height * 0.62, height: height * 0.08 }]} />
        </>
      ) : null}
      {shape === 'desk' ? (
        <>
          <View style={[styles.slab, edge, { top: 0, height: height * 0.16 }]} />
          <View style={[styles.leg, edge, { top: height * 0.12, bottom: 0, left: width * 0.05, width: leg }]} />
          <View style={[styles.slab, edge, styles.box, { top: height * 0.12, bottom: 0, left: width * 0.62, right: width * 0.04, borderRadius: 4 }]}>
            <View style={[styles.drawer, { borderWidth: line }]}>
              <View style={styles.knob} />
            </View>
            <View style={[styles.drawer, { borderWidth: line }]}>
              <View style={styles.knob} />
            </View>
          </View>
        </>
      ) : null}
      {shape === 'bookshelf' ? (
        <View style={[styles.slab, edge, styles.shelfBox, { top: 0, bottom: 0 }]}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={[styles.shelfRow, { borderBottomWidth: line }]}>
              {BOOK_COLORS.slice(row * 2, row * 2 + 4).map((color, i) => (
                <View key={i} style={[styles.book, { backgroundColor: color, height: `${62 + ((i + row) % 3) * 12}%` }]} />
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slab: { position: 'absolute', left: 0, right: 0, backgroundColor: WOOD, borderRadius: 6 },
  leg: { position: 'absolute', backgroundColor: WOOD, borderRadius: 3 },
  box: { padding: '10%', gap: 6, justifyContent: 'center' },
  drawer: {
    flex: 1,
    borderColor: DARK,
    borderRadius: 4,
    backgroundColor: '#C68B5E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F2C14E', borderWidth: 1, borderColor: DARK },
  chairBack: { backgroundColor: '#8E6BBF' },
  arm: { position: 'absolute', backgroundColor: '#7B58AE', borderRadius: 10 },
  legPeg: { position: 'absolute', width: 8, backgroundColor: WOOD, borderRadius: 3 },
  shelfBox: { padding: '6%', justifyContent: 'space-between' },
  shelfRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3, borderColor: DARK },
  book: { width: '16%', borderRadius: 2, borderWidth: 1, borderColor: DARK },
  cushion: { backgroundColor: '#E57373', borderRadius: 999 },
  bag: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#7E57C2' },
  dent: {
    position: 'absolute',
    left: '22%',
    right: '22%',
    top: '18%',
    height: '30%',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
