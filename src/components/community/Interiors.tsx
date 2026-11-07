import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/AppText';
import { BUILDINGS, type BuildingId } from '@/utils/town';
import type { TownPlace } from '@/utils/multiplayer/protocol';

/** Where the wall meets the floor, as a share of a room's height (people stand on the floor below it). */
export const FLOOR = 0.6;

const LINE = '#5B3A24';
const edge = { borderWidth: 3, borderColor: LINE } as const;

/** A box placed by shares of the room's width and height. */
function Box({ w, h, x, y, children, style }: { w: number; h: number; x: number; y: number; children?: ReactNode; style?: ViewStyle }) {
  return <View style={[{ position: 'absolute', left: x * w, top: y * h }, style]}>{children}</View>;
}

interface Props {
  place: TownPlace;
  /** The whole room, which scrolls. */
  width: number;
  /** One screen's width: furniture is sized by this and placed in the middle of the room. */
  viewWidth: number;
  height: number;
  /** Tap a building's door on the street. */
  onDoor: (id: BuildingId) => void;
  /** Tap the way out, inside a building. */
  onExit: () => void;
}

/**
 * The drawn side-view backdrop for one place, in the buddy home's flat style:
 * wall, floor, and a few built-in things. People are drawn on top by the room.
 */
export function Interior({ place, width: roomW, viewWidth, height: h, onDoor, onExit }: Props) {
  const w = place === 'street' ? roomW : viewWidth;
  const offset = place === 'street' ? 0 : (roomW - viewWidth) / 2;
  const floorY = h * FLOOR;
  const tones: Record<TownPlace, { wall: string; floor: string }> = {
    street: { wall: '#9BD4F5', floor: '#B0BEC5' },
    shop: { wall: '#FFCDD2', floor: '#BCAAA4' },
    bakery: { wall: '#FFE9B8', floor: '#E8C9A0' },
    library: { wall: '#D7C8F0', floor: '#A1887F' },
    park: { wall: '#A5E3F7', floor: '#7CC36B' },
  };
  const t = tones[place];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.wall }]} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: floorY, bottom: 0, backgroundColor: t.floor }} />
      {place !== 'street' && place !== 'park' ? (
        <View style={{ position: 'absolute', left: 0, right: 0, top: floorY - 8, height: 10, backgroundColor: '#A86B45' }} />
      ) : null}

      {place === 'street' ? <Street w={w} h={h} floorY={floorY} screenW={viewWidth} onDoor={onDoor} /> : null}
      {place !== 'street' ? (
        <View style={{ position: 'absolute', left: offset, top: 0, width: viewWidth, height: h }} pointerEvents="box-none">
          {place === 'bakery' ? <Bakery w={w} h={h} floorY={floorY} /> : null}
          {place === 'shop' ? <Shop w={w} h={h} floorY={floorY} /> : null}
          {place === 'library' ? <Library w={w} h={h} floorY={floorY} /> : null}
          {place === 'park' ? <Park w={w} h={h} floorY={floorY} /> : null}
        </View>
      ) : null}
      {place !== 'street' ? (
        <>
          <Text style={[styles.plant, { left: offset * 0.4, top: floorY - 56 }]}>🪴</Text>
          <Text style={[styles.plant, { right: offset * 0.4, top: floorY - 56 }]}>🪴</Text>
        </>
      ) : null}

      {place !== 'street' ? (
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel="Go back out to the street"
          style={[edge, styles.exit, { left: 10, top: floorY - h * 0.3, width: w * 0.16, height: h * 0.3 }]}
        >
          <Text style={styles.exitText}>🚪 Street</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface Part {
  w: number;
  h: number;
  floorY: number;
}

function Street({ w, h, floorY, screenW, onDoor }: Part & { screenW: number; onDoor: (id: BuildingId) => void }) {
  const gap = w / (BUILDINGS.length + 0.5);
  return (
    <>
      {[0.04, 0.3, 0.55, 0.8].map((x, i) => (
        <Box key={x} w={w} h={h} x={x} y={0.06 + (i % 2) * 0.05}><Text style={i === 0 ? styles.sun : styles.cloud}>{i === 0 ? '☀️' : '☁️'}</Text></Box>
      ))}
      {Array.from({ length: BUILDINGS.length + 1 }, (_, i) => (
        <Text key={i} style={[styles.tree, { left: i * gap + gap * 0.02, top: floorY - h * 0.1 }]}>{i % 2 ? '🌳' : '🌷'}</Text>
      ))}
      {BUILDINGS.map((b, i) => {
        const bw = Math.min(gap * 0.7, screenW * 0.5);
        const bh = h * 0.42;
        return (
          <View key={b.id} style={{ position: 'absolute', left: (i + 0.5) * gap + gap * 0.15, top: floorY - bh, width: bw, height: bh }}>
            <View style={[edge, { flex: 1, backgroundColor: b.color, borderRadius: 8, alignItems: 'center' }]}>
              <View style={[styles.awning, { backgroundColor: '#fff' }]} />
              <Text style={styles.streetEmoji}>{b.emoji}</Text>
              <Text style={styles.streetName} numberOfLines={2}>{b.name}</Text>
              <View style={[edge, styles.window, { width: bw * 0.5, height: bh * 0.22 }]} />
            </View>
            <Pressable
              onPress={() => onDoor(b.id)}
              accessibilityRole="button"
              accessibilityLabel={`Go into the ${b.name}`}
              style={({ pressed }) => [edge, styles.door, { width: bw * 0.34, height: bh * 0.4, left: bw * 0.33 }, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.knob} />
            </Pressable>
          </View>
        );
      })}
      <View style={{ position: 'absolute', left: 0, right: 0, top: floorY, height: h * 0.04, backgroundColor: '#CFD8DC' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.14, backgroundColor: '#78909C' }} />
      {[0.08, 0.3, 0.52, 0.74].map((x) => (
        <View key={x} style={{ position: 'absolute', left: x * w, bottom: h * 0.06, width: w * 0.1, height: 6, backgroundColor: '#ECEFF1' }} />
      ))}
    </>
  );
}

function Bakery({ w, h, floorY }: Part) {
  return (
    <>
      {/* Sign and window */}
      <Box w={w} h={h} x={0.3} y={0.11}>
        <View style={[edge, styles.sign]}><Text style={styles.signText}>🥐 Bakery</Text></View>
      </Box>
      <View style={[edge, styles.bigWindow, { left: w * 0.62, top: h * 0.12, width: w * 0.3, height: h * 0.26 }]}><Text style={styles.sun}>☀️</Text></View>
      {/* Display case with pastries */}
      <View style={[edge, styles.glass, { left: w * 0.24, top: floorY - h * 0.22, width: w * 0.3, height: h * 0.22 }]}>
        <Text style={styles.pastry}>🥐 🍪 🧁 🍩</Text>
      </View>
      <View style={[edge, styles.counter, { left: w * 0.22, top: floorY - h * 0.02, width: w * 0.34, height: h * 0.08 }]} />
      {/* Oven */}
      <View style={[edge, styles.oven, { left: w * 0.72, top: floorY - h * 0.3, width: w * 0.22, height: h * 0.3 }]}>
        <View style={styles.ovenWindow}><Text style={styles.pastry}>🥖</Text></View>
        <View style={styles.dials}><View style={styles.dial} /><View style={styles.dial} /></View>
      </View>
      {/* Bread shelf */}
      <View style={[edge, styles.shelf, { left: w * 0.24, top: h * 0.2, width: w * 0.3 }]} />
      <Text style={[styles.pastry, { position: 'absolute', left: w * 0.27, top: h * 0.13 }]}>🍞 🥖 🥐</Text>
    </>
  );
}

function Shop({ w, h, floorY }: Part) {
  const colorsOf = ['#EF5350', '#FFCA28', '#66BB6A', '#42A5F5', '#AB47BC'];
  return (
    <>
      <Box w={w} h={h} x={0.3} y={0.11}>
        <View style={[edge, styles.sign]}><Text style={styles.signText}>🏪 Corner shop</Text></View>
      </Box>
      {[0.2, 0.34].map((top, row) => (
        <View key={row} style={[edge, styles.shelf, { left: w * 0.24, top: floorY - h * (0.34 - row * 0.15), width: w * 0.36 }]}>
          <View style={styles.goods}>
            {colorsOf.map((c, i) => (
              <View key={i} style={{ width: w * 0.05, height: h * 0.07, backgroundColor: colorsOf[(i + row * 2) % 5], borderWidth: 2, borderColor: LINE, borderRadius: 4 }} />
            ))}
          </View>
        </View>
      ))}
      <View style={[edge, styles.oven, { left: w * 0.68, top: floorY - h * 0.34, width: w * 0.12, height: h * 0.34, backgroundColor: '#E3F2FD' }]}>
        <Text style={styles.pastry}>🥛🧃</Text>
      </View>
      <View style={[edge, styles.counter, { left: w * 0.8, top: floorY - h * 0.12, width: w * 0.18, height: h * 0.12 }]}>
        <Text style={styles.pastry}>🧾</Text>
      </View>
    </>
  );
}

function Library({ w, h, floorY }: Part) {
  const spines = ['#EF5350', '#42A5F5', '#FFCA28', '#66BB6A', '#AB47BC', '#FF7043', '#26C6DA', '#EC407A'];
  const shelf = (x: number) => (
    <View style={[edge, { position: 'absolute', left: w * x, top: floorY - h * 0.5, width: w * 0.22, height: h * 0.5, backgroundColor: '#8D6E63', padding: 4, justifyContent: 'space-around' }]}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, borderBottomWidth: 4, borderBottomColor: LINE }}>
          {spines.map((c, i) => (
            <View key={i} style={{ flex: 1, height: h * (0.08 + ((i + row) % 3) * 0.015), backgroundColor: spines[(i + row * 3) % 8] }} />
          ))}
        </View>
      ))}
    </View>
  );
  return (
    <>
      <Box w={w} h={h} x={0.3} y={0.11}>
        <View style={[edge, styles.sign]}><Text style={styles.signText}>📚 Library</Text></View>
      </Box>
      {shelf(0.24)}
      {shelf(0.5)}
      <View style={[edge, styles.rug, { left: w * 0.3, top: floorY + h * 0.13, width: w * 0.4, height: h * 0.1 }]} />
      <View style={[edge, styles.counter, { left: w * 0.76, top: floorY - h * 0.12, width: w * 0.2, height: h * 0.12 }]}><Text style={styles.pastry}>🪔</Text></View>
    </>
  );
}

function Park({ w, h, floorY }: Part) {
  return (
    <>
      <Box w={w} h={h} x={0.08} y={0.06}><Text style={styles.sun}>☀️</Text></Box>
      <Box w={w} h={h} x={0.55} y={0.08}><Text style={styles.cloud}>☁️</Text></Box>
      <View style={{ position: 'absolute', left: -w * 0.1, top: floorY - h * 0.16, width: w * 0.7, height: h * 0.4, borderRadius: w, backgroundColor: '#8BD17C' }} />
      {/* Tree */}
      <View style={[edge, { position: 'absolute', left: w * 0.74, top: floorY - h * 0.2, width: w * 0.04, height: h * 0.22, backgroundColor: '#8D6E63' }]} />
      <View style={[edge, { position: 'absolute', left: w * 0.66, top: floorY - h * 0.46, width: w * 0.2, height: h * 0.3, borderRadius: w, backgroundColor: '#43A047' }]} />
      {/* Pond */}
      <View style={[edge, { position: 'absolute', left: w * 0.34, top: floorY + h * 0.12, width: w * 0.3, height: h * 0.1, borderRadius: w, backgroundColor: '#4FC3F7' }]}>
        <Text style={styles.pastry}> 🦆</Text>
      </View>
      {/* Bench */}
      <View style={[edge, styles.shelf, { left: w * 0.24, top: floorY - h * 0.06, width: w * 0.24, height: 12 }]} />
      <View style={[edge, { position: 'absolute', left: w * 0.25, top: floorY - h * 0.02, width: 6, height: h * 0.07, backgroundColor: LINE }]} />
      <View style={[edge, { position: 'absolute', left: w * 0.45, top: floorY - h * 0.02, width: 6, height: h * 0.07, backgroundColor: LINE }]} />
    </>
  );
}

const styles = StyleSheet.create({
  sun: { fontSize: 44 },
  plant: { position: 'absolute', fontSize: 44 },
  tree: { position: 'absolute', fontSize: 40 },
  cloud: { fontSize: 44, opacity: 0.9 },
  exit: { position: 'absolute', backgroundColor: '#C68B5E', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exitText: { fontSize: 15, fontWeight: '800', color: '#fff', textAlign: 'center' },
  awning: { alignSelf: 'stretch', height: 10, opacity: 0.8, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  streetEmoji: { fontSize: 30, marginTop: 2 },
  streetName: { fontSize: 13, fontWeight: '900', color: '#fff', textAlign: 'center', paddingHorizontal: 2 },
  signText: { fontSize: 20, fontWeight: '900', color: '#3B2B25', textAlign: 'center' },
  sign: { backgroundColor: '#FFF3D6', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12 },
  window: { backgroundColor: '#BBDEFB', marginTop: 6, borderRadius: 6 },
  door: { position: 'absolute', bottom: 0, backgroundColor: '#8D6E63', borderTopLeftRadius: 10, borderTopRightRadius: 10, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 },
  knob: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFCA28' },
  bigWindow: { position: 'absolute', backgroundColor: '#BBDEFB', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  glass: { position: 'absolute', backgroundColor: 'rgba(200,235,255,0.7)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pastry: { fontSize: 24 },
  counter: { position: 'absolute', backgroundColor: '#A86B45', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  oven: { position: 'absolute', backgroundColor: '#37474F', borderRadius: 10, padding: 8, gap: 8, alignItems: 'center', justifyContent: 'center' },
  ovenWindow: { flex: 1, alignSelf: 'stretch', backgroundColor: '#FF9800', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dials: { flexDirection: 'row', gap: 10 },
  dial: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ECEFF1' },
  shelf: { position: 'absolute', height: 14, backgroundColor: '#A86B45', borderRadius: 4 },
  goods: { position: 'absolute', bottom: 12, left: 6, right: 6, flexDirection: 'row', justifyContent: 'space-around' },
  rug: { position: 'absolute', backgroundColor: '#E57373', borderRadius: 40 },
});
