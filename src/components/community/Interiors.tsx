import { Fragment, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/AppText';
import { Rumble, Spin, Swing } from '@/components/Motion';
import { Chalkboard } from '@/components/community/Chalkboard';
import { PaintingView } from '@/components/PaintingView';
import { useEaselPicture } from '@/services/easel';
import { BAKERY, FARM, FLOOR, LIBRARY, MIXER_TALL, nestX, PARK, SCHOOL, SHOP, type Shelves } from '@/utils/multiplayer/placeProps';
import { SWING_COUNT, SWING_PIVOT, SWING_SEAT_Y, swingName, swingX } from '@/utils/park';
import type { TownPlace } from '@/utils/multiplayer/protocol';
import { BUILDINGS, type BuildingId } from '@/utils/town';

export { FLOOR };

const LINE = '#5B3A24';
const WOOD = '#A86B45';
const edge = { borderWidth: 3, borderColor: LINE } as const;

/** A box placed by shares of the room's width and height. */
function Box({ w, h, x, y, children, style }: { w: number; h: number; x: number; y: number; children?: ReactNode; style?: ViewStyle }) {
  return <View style={[{ position: 'absolute', left: x * w, top: y * h }, style]}>{children}</View>;
}

interface Props {
  place: TownPlace;
  /** The whole room, which scrolls. */
  width: number;
  /** One screen's width. */
  viewWidth: number;
  height: number;
  /** Things switched on in this place (an oven, a swing), shared with friends on a visit. */
  switches: Record<string, boolean>;
  /** Tap something that turns on and off. */
  onSwitch: (name: string) => void;
  /** Park: the swings someone is sitting on (the room draws those, with the rider on them). */
  riding?: number[];
  /** Tap a building's door on the street. */
  onDoor: (id: BuildingId) => void;
  /** Tap the way out, inside a building. */
  onExit: () => void;
  /** School: fingers started or stopped drawing on the chalkboard. */
  onDrawing?: (drawing: boolean) => void;
  /** School: the easel was tapped, to paint on it. */
  onEasel?: () => void;
}

/**
 * The drawn side-view backdrop for one place, in the buddy home's flat style:
 * wall, floor, furniture and things to tap. The things you can pick up, and
 * the people, are drawn on top by the room.
 */
export function Interior({ place, width: w, viewWidth, height: h, switches, onSwitch, riding = [], onDoor, onExit, onDrawing, onEasel }: Props) {
  const floorY = h * FLOOR;
  const tones: Record<TownPlace, { wall: string; floor: string }> = {
    street: { wall: '#9BD4F5', floor: '#B0BEC5' },
    school: { wall: '#FFF1C9', floor: '#C8A27E' },
    shop: { wall: '#FFCDD2', floor: '#BCAAA4' },
    bakery: { wall: '#FFE9B8', floor: '#E8C9A0' },
    library: { wall: '#D7C8F0', floor: '#A1887F' },
    park: { wall: '#A5E3F7', floor: '#7CC36B' },
    farm: { wall: '#B3E5FC', floor: '#9CCC65' },
  };
  const t = tones[place];
  const part = { w, h, floorY, on: switches, tap: onSwitch };
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.wall }]} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: floorY, bottom: 0, backgroundColor: t.floor }} />
      {place !== 'street' && place !== 'park' && place !== 'farm' ? (
        <>
          {/* Floor boards and a skirting board, so the room reads as a room. */}
          {Array.from({ length: 5 }, (_, i) => (
            <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: floorY + (i + 1) * h * 0.075, height: 2, backgroundColor: 'rgba(0,0,0,0.07)' }} />
          ))}
          <View style={{ position: 'absolute', left: 0, right: 0, top: floorY - 8, height: 10, backgroundColor: WOOD }} />
        </>
      ) : null}

      {place === 'street' ? <Street w={w} h={h} floorY={floorY} screenW={viewWidth} onDoor={onDoor} /> : null}
      {place === 'school' ? <School {...part} onDrawing={onDrawing} onEasel={onEasel} /> : null}
      {place === 'shop' ? <Shop {...part} /> : null}
      {place === 'bakery' ? <Bakery {...part} /> : null}
      {place === 'library' ? <Library {...part} /> : null}
      {place === 'park' ? <Park {...part} riding={riding} /> : null}
      {place === 'farm' ? <Farm {...part} /> : null}

      {place !== 'street' ? (
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel="Go back out to the street"
          style={[edge, styles.exit, { left: 10, top: floorY - h * 0.3, width: Math.min(90, viewWidth * 0.16), height: h * 0.3 }]}
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
  on: Record<string, boolean>;
  tap: (name: string) => void;
}

/** A rectangle from shares of the room: x0 to x1 across, top to bottom down. */
const rect = (w: number, h: number, x0: number, x1: number, top: number, bottom: number): ViewStyle => ({
  position: 'absolute',
  left: x0 * w,
  width: (x1 - x0) * w,
  top: top * h,
  height: (bottom - top) * h,
});

function Sign({ w, h, x, y, text }: { w: number; h: number; x: number; y: number; text: string }) {
  return (
    <Box w={w} h={h} x={x} y={y}>
      <View style={[edge, styles.sign]}><Text style={styles.signText}>{text}</Text></View>
    </Box>
  );
}

/** A plank to put things on, its top at height y. */
function Plank({ w, h, x0, x1, y }: { w: number; h: number; x0: number; x1: number; y: number }) {
  return <View style={[edge, styles.plank, { left: x0 * w, width: (x1 - x0) * w, top: y * h }]} />;
}

/** A wooden cabinet with shelves in it. */
function Cabinet({ w, h, s, color = '#D7A77A' }: { w: number; h: number; s: Shelves; color?: string }) {
  return (
    <>
      <View style={[edge, rect(w, h, s.x0, s.x1, s.top, FLOOR), { backgroundColor: color, borderRadius: 6 }]} />
      <Plank w={w} h={h} x0={s.x0 - 0.004} x1={s.x1 + 0.004} y={s.top} />
      {s.rows.map((y) => (
        <Plank key={y} w={w} h={h} x0={s.x0} x1={s.x1} y={y} />
      ))}
    </>
  );
}

function Street({ w, h, floorY, screenW, onDoor }: { w: number; h: number; floorY: number; screenW: number; onDoor: (id: BuildingId) => void }) {
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

function School({ w, h, on, tap, onDrawing, onEasel }: Part & { onDrawing?: (drawing: boolean) => void; onEasel?: () => void }) {
  const b = SCHOOL.board;
  const t = SCHOOL.teacher;
  const c = SCHOOL.color;
  const bell = !!on.bell;
  const picture = useEaselPicture();
  const easelX0 = c.x0 + 0.005;
  const easelX1 = c.x0 + 0.06;
  return (
    <>
      <Sign w={w} h={h} x={0.45} y={0.06} text="🏫 School" />
      {/* Number line along the top of the wall */}
      <View style={[rect(w, h, 0.45, 0.8, 0.16, 0.22), styles.numberLine]}>
        {Array.from({ length: 11 }, (_, i) => (
          <Text key={i} style={styles.numberLineText}>{i}</Text>
        ))}
      </View>
      <Text style={[styles.clock, { left: 0.69 * w, top: 0.25 * h }]}>🕒</Text>

      {/* The chalkboard: draw on it with your fingers */}
      <Chalkboard left={b.x0 * w} top={b.top * h} width={(b.x1 - b.x0) * w} height={(b.bottom - b.top) * h} onDrawing={onDrawing} />

      {/* Teacher's desk, with a bell to ring */}
      <View style={[edge, rect(w, h, t.x0, t.x1, t.top, FLOOR), { backgroundColor: WOOD, borderRadius: 6 }]}>
        <View style={styles.drawerFront} />
      </View>
      <Pressable
        onPress={() => tap('bell')}
        accessibilityRole="button"
        accessibilityLabel="Ring the school bell"
        style={[styles.bellButton, rect(w, h, t.x1 - 0.03, t.x1, t.top + 0.02, t.top + 0.1)]}
      >
        <Text style={styles.bellText}>{bell ? '🔔 Ding!' : '🔔 Ring'}</Text>
      </Pressable>

      {/* Pupils' desks, each with a chair */}
      {SCHOOL.desks.map(([x0, x1]) => (
        <Fragment key={x0}>
          <View style={[edge, rect(w, h, x0, x1, SCHOOL.deskTop, SCHOOL.deskTop + 0.025), { backgroundColor: '#E0A96D', borderRadius: 4 }]} />
          {[x0 + 0.004, x1 - 0.01].map((x) => (
            <View key={x} style={[rect(w, h, x, x + 0.006, SCHOOL.deskTop + 0.025, FLOOR + 0.03), { backgroundColor: '#78909C' }]} />
          ))}
          <View style={[edge, rect(w, h, x1 + 0.002, x1 + 0.006, SCHOOL.deskTop - 0.02, FLOOR + 0.03), { backgroundColor: '#42A5F5', borderWidth: 2 }]} />
          <View style={[edge, rect(w, h, x1 - 0.012, x1 + 0.006, SCHOOL.deskTop + 0.04, SCHOOL.deskTop + 0.055), { backgroundColor: '#42A5F5', borderWidth: 2 }]} />
        </Fragment>
      ))}

      {/* Color corner: the easel and a crayon table */}
      <View style={[styles.colorRug, rect(w, h, c.x0 + 0.01, c.x1 - 0.01, 0.7, 0.82)]} />
      <Sign w={w} h={h} x={c.x0 + 0.005} y={0.08} text="🎨 Color corner" />
      <View style={[rect(w, h, c.x0 + 0.01, c.x1 - 0.01, 0.2, 0.3), styles.artWall]}>
        {['🌈', '🦋', '🏠', '🌻'].map((e) => (
          <View key={e} style={[edge, styles.artPaper]}>
            <Text style={styles.artText}>{e}</Text>
          </View>
        ))}
      </View>
      {/* Easel: tap it to paint (it shows what is on it now) */}
      <Pressable
        onPress={onEasel}
        accessibilityRole="button"
        accessibilityLabel="Easel. Tap to paint and color."
        style={rect(w, h, easelX0, easelX1, 0.32, FLOOR + 0.04)}
      >
        <View style={[styles.easelLeg, { left: '15%', transform: [{ rotate: '8deg' }] }]} />
        <View style={[styles.easelLeg, { right: '15%', transform: [{ rotate: '-8deg' }] }]} />
        <View style={[edge, styles.easelPaper]}>
          {picture.actions.length || picture.page !== 'blank' ? (
            <PaintingView picture={picture} width={Math.max(8, Math.min((easelX1 - easelX0) * w - 14, ((FLOOR + 0.04 - 0.32) * h * 0.55 - 14) * 0.75))} />
          ) : (
            <Text style={styles.easelText}>🎨 Tap to paint!</Text>
          )}
        </View>
      </Pressable>
      <View style={[edge, rect(w, h, SCHOOL.crayonTable.x0, SCHOOL.crayonTable.x1, SCHOOL.crayonTable.top, SCHOOL.crayonTable.top + 0.025), { backgroundColor: '#EC407A', borderRadius: 4 }]} />
      {[SCHOOL.crayonTable.x0 + 0.006, SCHOOL.crayonTable.x1 - 0.012].map((x) => (
        <View key={x} style={[rect(w, h, x, x + 0.006, SCHOOL.crayonTable.top + 0.025, FLOOR + 0.03), { backgroundColor: '#AD1457' }]} />
      ))}
    </>
  );
}

function Shop({ w, h, on, tap }: Part) {
  const f = SHOP.fridge;
  const fridgeOpen = !!on.fridge;
  const till = !!on.till;
  return (
    <>
      <Sign w={w} h={h} x={0.49} y={0.09} text="🏪 Corner shop" />
      <Cabinet w={w} h={h} s={SHOP.shelvesA} />

      {/* Fridge: tap to open the door */}
      <Pressable
        onPress={() => tap('fridge')}
        accessibilityRole="button"
        accessibilityLabel={fridgeOpen ? 'Close the fridge' : 'Open the fridge'}
        style={[edge, rect(w, h, f.x0, f.x1, f.top, FLOOR), styles.fridge]}
      />
      {f.rows.map((y) => (
        <View key={y} pointerEvents="none" style={[rect(w, h, f.x0 + 0.004, f.x1 - 0.004, y, y + 0.01), { backgroundColor: '#90A4AE' }]} />
      ))}
      <View
        pointerEvents="none"
        style={[
          edge,
          fridgeOpen ? rect(w, h, f.x1, f.x1 + 0.025, f.top, FLOOR) : rect(w, h, f.x0, f.x1, f.top, FLOOR),
          { backgroundColor: fridgeOpen ? '#CFE8F7' : 'rgba(207,232,247,0.35)', borderRadius: 8 },
        ]}
      >
        <View style={[styles.handle, fridgeOpen ? { right: 4 } : { left: 6 }]} />
      </View>
      {fridgeOpen ? <Text pointerEvents="none" style={[styles.puff, { left: (f.x0 + 0.02) * w, top: f.top * h - 30 }]}>❄️ ❄️</Text> : null}

      {SHOP.shelvesB.rows.map((y) => (
        <Plank key={y} w={w} h={h} x0={SHOP.shelvesB.x0} x1={SHOP.shelvesB.x1} y={y} />
      ))}

      {/* Fruit stand */}
      <View style={[edge, rect(w, h, SHOP.stand.x0, SHOP.stand.x1, SHOP.stand.top, FLOOR), { backgroundColor: '#C68B5E', borderRadius: 4 }]}>
        {[0, 1, 2].map((i) => <View key={i} style={styles.slat} />)}
      </View>
      <Text style={[styles.label, { left: SHOP.stand.x0 * w, top: (SHOP.stand.top + 0.03) * h }]}>Fresh fruit</Text>

      {/* Counter and till: tap the till to open it */}
      <View style={[edge, rect(w, h, SHOP.counter.x0, SHOP.counter.x1, SHOP.counter.top, FLOOR), { backgroundColor: WOOD, borderRadius: 6 }]} />
      <Pressable
        onPress={() => tap('till')}
        accessibilityRole="button"
        accessibilityLabel="Ring the till"
        style={[edge, styles.till, rect(w, h, 0.9, 0.96, SHOP.counter.top - 0.08, SHOP.counter.top)]}
      >
        <Text style={styles.tillText}>{till ? '💵 Ka-ching!' : '🧾'}</Text>
      </Pressable>
      {till ? <View pointerEvents="none" style={[edge, styles.drawer, rect(w, h, 0.9, 0.97, SHOP.counter.top + 0.005, SHOP.counter.top + 0.04)]} /> : null}
    </>
  );
}

function Bakery({ w, h, on, tap }: Part) {
  const o = BAKERY.oven;
  const hot = !!on.oven;
  const mixing = !!on.mixer;
  const m = BAKERY.mixer;
  const mid = (m.x0 + m.x1) / 2;
  return (
    <>
      <Sign w={w} h={h} x={0.22} y={0.1} text="🥐 Bakery" />
      <View style={[edge, styles.bigWindow, rect(w, h, 0.63, 0.77, 0.1, 0.21)]}><Text style={styles.sun}>☀️</Text></View>

      {/* Back counter with tiles above */}
      <View style={[rect(w, h, BAKERY.counter.x0, BAKERY.counter.x1, BAKERY.counter.top - 0.12, BAKERY.counter.top), styles.tiles]} />
      <View style={[edge, rect(w, h, BAKERY.counter.x0, BAKERY.counter.x1, BAKERY.counter.top, FLOOR), { backgroundColor: WOOD, borderRadius: 6, flexDirection: 'row' }]}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={styles.cupboard} />)}
      </View>
      <Plank w={w} h={h} x0={BAKERY.wallShelf.x0} x1={BAKERY.wallShelf.x1} y={BAKERY.wallShelf.y} />

      {/* Stand mixer: tap to mix */}
      <Pressable
        onPress={() => tap('mixer')}
        accessibilityRole="button"
        accessibilityLabel={mixing ? 'Stop the mixer' : 'Start the mixer'}
        style={rect(w, h, m.x0, m.x1, BAKERY.counter.top - MIXER_TALL, BAKERY.counter.top)}
      >
        <Rumble active={mixing} style={StyleSheet.absoluteFill}>
          <View style={[edge, styles.mixerBase, { left: '10%', right: '10%', bottom: 0, height: '12%' }]} />
          <View style={[edge, styles.mixerBase, { left: '10%', width: '18%', bottom: '10%', height: '70%' }]} />
          <View style={[edge, styles.mixerBase, { left: '10%', right: '6%', top: '6%', height: '22%', borderRadius: 14 }]} />
          <View style={[edge, styles.bowl, { left: '32%', right: '14%', bottom: '10%', height: '30%' }]} />
          <Spin active={mixing} style={[styles.whisk, { left: '44%', top: '30%' }]}>
            <Text style={styles.whiskText}>✳️</Text>
          </Spin>
        </Rumble>
      </Pressable>
      <Text pointerEvents="none" style={[styles.label, { left: (mid - 0.03) * w, top: (BAKERY.counter.top + 0.02) * h, color: '#fff' }]}>
        {mixing ? 'Whirr!' : 'Mixer'}
      </Text>

      {/* Oven: tap to turn on; things inside bake */}
      <Pressable
        onPress={() => tap('oven')}
        accessibilityRole="button"
        accessibilityLabel={hot ? 'Turn the oven off' : 'Turn the oven on'}
        style={[edge, rect(w, h, o.x0, o.x1, o.top, FLOOR), styles.oven]}
      >
        <View style={[styles.ovenWindow, { backgroundColor: hot ? '#FF9800' : '#455A64' }]} />
        <View style={styles.dials}>
          <View style={[styles.dial, hot && { backgroundColor: '#FF5722' }]} />
          <View style={[styles.dial, hot && { backgroundColor: '#FF5722' }]} />
          <Text style={styles.ovenText}>{hot ? '🔥 Baking' : 'Tap to bake'}</Text>
        </View>
      </Pressable>
      <View pointerEvents="none" style={[rect(w, h, o.x0 + 0.012, o.x1 - 0.012, o.rack, o.rack + 0.008), { backgroundColor: '#B0BEC5' }]} />

      {/* Glass display case */}
      <View style={[edge, styles.glass, rect(w, h, BAKERY.caseBox.x0, BAKERY.caseBox.x1, BAKERY.caseBox.top, FLOOR)]} />
      <Plank w={w} h={h} x0={BAKERY.caseBox.x0 - 0.004} x1={BAKERY.caseBox.x1 + 0.004} y={BAKERY.caseBox.top} />
      {BAKERY.caseBox.rows.map((y) => (
        <View key={y} style={[rect(w, h, BAKERY.caseBox.x0 + 0.003, BAKERY.caseBox.x1 - 0.003, y, y + 0.008), { backgroundColor: '#90CAF9' }]} />
      ))}

      {/* Bread rack */}
      <Cabinet w={w} h={h} s={BAKERY.rack} color="#C69C6D" />
    </>
  );
}

const QUIZ_OPS = ['+', '−', '×'] as const;

/** A library computer: tap for a quick question, tap again for the answer. */
function Computer({ w, h, x, seed }: { w: number; h: number; x: number; seed: number }) {
  const [n, setN] = useState(seed);
  const [shown, setShown] = useState(false);
  const a = 2 + ((n * 7) % 9);
  const b = 1 + ((n * 5) % 8);
  const op = QUIZ_OPS[n % 3];
  const answer = op === '+' ? a + b : op === '−' ? a - Math.min(a, b) : a * b;
  const second = op === '−' ? Math.min(a, b) : b;
  const top = LIBRARY.desk.top;
  return (
    <>
      <Pressable
        onPress={() => {
          if (shown) {
            setN((v) => v + 1);
            setShown(false);
          } else setShown(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={shown ? `${a} ${op} ${second} is ${answer}. Tap for another.` : `Computer: what is ${a} ${op} ${second}? Tap to see.`}
        style={[edge, styles.monitor, rect(w, h, x - 0.04, x + 0.04, top - 0.15, top - 0.03)]}
      >
        <Text style={styles.screenText} numberOfLines={2}>
          {`${a} ${op} ${second}\n= ${shown ? answer : '?'}`}
        </Text>
      </Pressable>
      <View style={[rect(w, h, x - 0.006, x + 0.006, top - 0.03, top), { backgroundColor: '#455A64' }]} />
      <View style={[edge, rect(w, h, x - 0.03, x + 0.03, top - 0.012, top), { backgroundColor: '#CFD8DC', borderRadius: 3, borderWidth: 2 }]} />
      {/* Chair */}
      <View style={[edge, rect(w, h, x - 0.025, x + 0.025, top + 0.12, top + 0.15), { backgroundColor: '#5C6BC0', borderRadius: 6 }]} />
      <View style={[rect(w, h, x - 0.003, x + 0.003, top + 0.15, top + 0.22), { backgroundColor: LINE }]} />
    </>
  );
}

function Library({ w, h, on, tap }: Part) {
  const lamp = !!on.lamp;
  const n = LIBRARY.nook;
  return (
    <>
      <Sign w={w} h={h} x={0.585} y={0.13} text="📚 Library" />
      {LIBRARY.cases.map((c) => (
        <Cabinet key={c.x0} w={w} h={h} s={c} color="#8D6E63" />
      ))}

      {/* Reading corner: rug, armchair and a lamp to tap */}
      <View style={[edge, styles.rug, rect(w, h, n.x0, n.x1, 0.74, 0.88)]} />
      <View style={[edge, rect(w, h, n.x0 + 0.01, n.x0 + 0.07, 0.5, 0.66), { backgroundColor: '#E57373', borderRadius: 16 }]} />
      <View style={[edge, rect(w, h, n.x0, n.x0 + 0.08, 0.6, 0.7), { backgroundColor: '#EF5350', borderRadius: 10 }]} />
      {lamp ? <View pointerEvents="none" style={[styles.glow, rect(w, h, n.x1 - 0.06, n.x1 + 0.02, 0.24, 0.48)]} /> : null}
      <Pressable
        onPress={() => tap('lamp')}
        accessibilityRole="button"
        accessibilityLabel={lamp ? 'Turn the lamp off' : 'Turn the lamp on'}
        style={rect(w, h, n.x1 - 0.04, n.x1, 0.3, FLOOR + 0.02)}
      >
        <View style={[edge, styles.shade, { backgroundColor: lamp ? '#FFF59D' : '#FFE0B2' }]} />
        <View style={styles.pole} />
        <View style={[edge, styles.lampFoot]} />
      </Pressable>

      {/* Computer corner */}
      <Sign w={w} h={h} x={0.79} y={0.12} text="💻 Computers" />
      <View style={[edge, rect(w, h, LIBRARY.desk.x0, LIBRARY.desk.x1, LIBRARY.desk.top, LIBRARY.desk.top + 0.03), { backgroundColor: WOOD, borderRadius: 4 }]} />
      {[LIBRARY.desk.x0 + 0.01, LIBRARY.desk.x1 - 0.015].map((x) => (
        <View key={x} style={[rect(w, h, x, x + 0.006, LIBRARY.desk.top + 0.03, FLOOR + 0.06), { backgroundColor: LINE }]} />
      ))}
      {LIBRARY.computers.map((x, i) => (
        <Computer key={x} w={w} h={h} x={x} seed={i * 4 + 1} />
      ))}
    </>
  );
}

function Park({ w, h, floorY, on, tap, riding }: Part & { riding: number[] }) {
  const s = PARK.swings;
  const sl = PARK.slide;
  const swingLen = (SWING_SEAT_Y - SWING_PIVOT) * h;
  // The slide runs from the top of its ladder down to the grass.
  const run = (sl.x1 - sl.x0 - 0.05) * w;
  const drop = (FLOOR - sl.top) * h;
  const len = Math.hypot(run, drop);
  const angle = (Math.atan2(drop, run) * 180) / Math.PI;
  return (
    <>
      <Box w={w} h={h} x={0.02} y={0.07}><Text style={styles.sun}>☀️</Text></Box>
      {[0.25, 0.47, 0.7, 0.9].map((x, i) => (
        <Box key={x} w={w} h={h} x={x} y={0.08 + (i % 2) * 0.06}><Text style={styles.cloud}>☁️</Text></Box>
      ))}
      <View style={{ position: 'absolute', left: -w * 0.05, top: floorY - h * 0.14, width: w * 0.4, height: h * 0.4, borderRadius: w, backgroundColor: '#8BD17C' }} />
      <View style={{ position: 'absolute', left: w * 0.5, top: floorY - h * 0.1, width: w * 0.45, height: h * 0.4, borderRadius: w, backgroundColor: '#8BD17C' }} />
      <Sign w={w} h={h} x={0.36} y={0.1} text="🌳 Park" />

      {/* Swings: tap a seat to push it, or put someone on it to swing */}
      <View style={[edge, rect(w, h, s.x0, s.x1, s.top, s.top + 0.015), { backgroundColor: '#E53935' }]} />
      {[s.x0, s.x1 - 0.008].map((x) => (
        <View key={x} style={[edge, rect(w, h, x, x + 0.008, s.top, FLOOR + 0.03), { backgroundColor: '#E53935' }]} />
      ))}
      {Array.from({ length: SWING_COUNT }, (_, i) => {
        if (riding.includes(i)) return null;
        const x = swingX(i);
        const name = swingName(i);
        return (
          <Swing key={i} active={!!on[name]} style={{ position: 'absolute', left: x * w - 30, top: SWING_PIVOT * h, width: 60, height: swingLen + 16 }}>
            <Pressable onPress={() => tap(name)} accessibilityRole="button" accessibilityLabel={on[name] ? 'Stop the swing' : 'Push the swing'} style={styles.swingHit}>
              <View style={[styles.rope, { left: 8, height: swingLen }]} />
              <View style={[styles.rope, { right: 8, height: swingLen }]} />
              <View style={[edge, styles.seat]} />
            </Pressable>
          </Swing>
        );
      })}

      {/* Slide */}
      <View style={[edge, rect(w, h, sl.x0, sl.x0 + 0.05, sl.top, sl.top + 0.02), { backgroundColor: '#1E88E5' }]} />
      {[sl.x0, sl.x0 + 0.045].map((x) => (
        <View key={x} style={[rect(w, h, x, x + 0.006, sl.top, FLOOR + 0.04), { backgroundColor: '#90A4AE' }]} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <View key={i} style={[rect(w, h, sl.x0, sl.x0 + 0.05, sl.top + 0.04 + i * 0.05, sl.top + 0.047 + i * 0.05), { backgroundColor: '#90A4AE' }]} />
      ))}
      <View
        style={[
          edge,
          styles.slide,
          {
            width: len,
            left: (sl.x0 + 0.05) * w + run / 2 - len / 2,
            top: sl.top * h + drop / 2 - 9,
            transform: [{ rotate: `${angle}deg` }],
          },
        ]}
      />

      {/* Sandbox, pond, tree and picnic blanket */}
      <View style={[edge, rect(w, h, PARK.sandbox.x0, PARK.sandbox.x1, PARK.sandbox.y0, PARK.sandbox.y1), { backgroundColor: '#F6D58E', borderColor: WOOD, borderWidth: 6 }]} />
      <View style={[edge, rect(w, h, PARK.pond.x0, PARK.pond.x1, PARK.pond.y0, PARK.pond.y1), { backgroundColor: '#4FC3F7', borderRadius: w }]} />
      <View style={[rect(w, h, PARK.pond.x0 + 0.1, PARK.pond.x0 + 0.13, PARK.pond.y0 + 0.03, PARK.pond.y0 + 0.06), { backgroundColor: '#66BB6A', borderRadius: 40 }]} />
      <View style={[edge, rect(w, h, PARK.tree.x - 0.012, PARK.tree.x + 0.012, PARK.tree.branches[1], FLOOR + 0.04), { backgroundColor: '#8D6E63' }]} />
      <View style={[edge, rect(w, h, PARK.tree.x - 0.07, PARK.tree.x + 0.07, PARK.tree.top, PARK.tree.branches[1] + 0.06), { backgroundColor: '#43A047', borderRadius: w }]} />
      {PARK.tree.branches.map((y, i) => (
        <View key={y} style={[rect(w, h, PARK.tree.x - 0.055 + i * 0.01, PARK.tree.x + 0.055 - i * 0.01, y, y + 0.012), { backgroundColor: '#6D4C41', borderRadius: 6 }]} />
      ))}
      <View style={[edge, rect(w, h, PARK.blanket.x0, PARK.blanket.x1, PARK.blanket.y0, PARK.blanket.y1), styles.blanket]}>
        {Array.from({ length: 6 }, (_, i) => <View key={i} style={styles.check} />)}
      </View>
    </>
  );
}

/** A triangle roof from x0 to x1, its peak at `top` and its eaves at `bottom`. */
function Roof({ w, h, x0, x1, top, bottom, color }: { w: number; h: number; x0: number; x1: number; top: number; bottom: number; color: string }) {
  const half = ((x1 - x0) * w) / 2;
  return (
    <View
      style={{
        position: 'absolute',
        left: x0 * w,
        top: top * h,
        width: 0,
        height: 0,
        borderLeftWidth: half,
        borderRightWidth: half,
        borderBottomWidth: (bottom - top) * h,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }}
    />
  );
}

function Farm({ w, h, floorY, on, tap }: Part) {
  const b = FARM.barn;
  const c = FARM.coop;
  const eaves = b.top + 0.1;
  const mill = { x: 0.865, top: 0.22 };
  return (
    <>
      <Box w={w} h={h} x={0.015} y={0.06}><Text style={styles.sun}>☀️</Text></Box>
      {[0.27, 0.5, 0.68, 0.95].map((x, i) => (
        <Box key={x} w={w} h={h} x={x} y={0.07 + (i % 2) * 0.06}><Text style={styles.cloud}>☁️</Text></Box>
      ))}
      {/* Rolling hills behind the farm */}
      <View style={{ position: 'absolute', left: w * 0.2, top: floorY - h * 0.16, width: w * 0.45, height: h * 0.4, borderRadius: w, backgroundColor: '#AED581' }} />
      <View style={{ position: 'absolute', left: w * 0.58, top: floorY - h * 0.12, width: w * 0.42, height: h * 0.4, borderRadius: w, backgroundColor: '#AED581' }} />
      <Sign w={w} h={h} x={0.455} y={0.1} text="🐄 Farm" />

      {/* The red barn, open at the front so you can see the hay loft and the stalls */}
      <Roof w={w} h={h} x0={b.x0 - 0.01} x1={b.x1 + 0.01} top={b.top} bottom={eaves} color="#8E1B1B" />
      <View style={[edge, rect(w, h, b.x0, b.x1, eaves, FLOOR + 0.01), { backgroundColor: '#C62828' }]} />
      <View style={[rect(w, h, b.x0 + 0.015, b.x1 - 0.015, b.loft - 0.1, FLOOR + 0.01), { backgroundColor: '#5D4037', borderTopLeftRadius: 10, borderTopRightRadius: 10 }]} />
      <View style={[rect(w, h, b.x0 + 0.015, b.x1 - 0.015, b.loft + 0.012, FLOOR + 0.01), { backgroundColor: '#795548' }]} />
      <Plank w={w} h={h} x0={b.x0 + 0.015} x1={b.x1 - 0.015} y={b.loft} />
      {/* Its doors swung open, white X and all */}
      {[b.x0 - 0.028, b.x1 + 0.003].map((x) => (
        <View key={x} style={[edge, rect(w, h, x, x + 0.025, b.loft + 0.03, FLOOR + 0.01), styles.barnDoor]}>
          <View style={[styles.cross, { transform: [{ rotate: '35deg' }] }]} />
          <View style={[styles.cross, { transform: [{ rotate: '-35deg' }] }]} />
        </View>
      ))}
      {/* The silo */}
      <View style={[edge, rect(w, h, FARM.silo.x0, FARM.silo.x1, FARM.silo.top, FLOOR + 0.01), { backgroundColor: '#B0BEC5', borderTopLeftRadius: 40, borderTopRightRadius: 40 }]} />
      {[0.25, 0.35, 0.45].map((y) => (
        <View key={y} style={[rect(w, h, FARM.silo.x0, FARM.silo.x1, y, y + 0.006), { backgroundColor: '#78909C' }]} />
      ))}

      {/* The hen house, with straw in every nest box */}
      <Roof w={w} h={h} x0={c.x0 - 0.008} x1={c.x1 + 0.008} top={c.top - 0.07} bottom={c.top + 0.005} color="#6D4C41" />
      <Cabinet w={w} h={h} s={c} color="#F4E1C1" />
      {c.rows.flatMap((y) =>
        [0, 1, 2].map((i) => (
          <View key={`${y}-${i}`} style={[rect(w, h, nestX(i) - 0.018, nestX(i) + 0.018, y - 0.022, y + 0.004), styles.straw]} />
        )),
      )}
      <View style={[edge, rect(w, h, c.x1 - 0.004, c.x1 + 0.03, c.rows[1] + 0.01, FLOOR + 0.01), styles.ramp]} />

      {/* The animal pen: a fence along the back, and the mud puddle */}
      {Array.from({ length: 8 }, (_, i) => {
        const x = FARM.pen.x0 + (i * (FARM.pen.x1 - FARM.pen.x0)) / 7;
        return <View key={i} style={[edge, rect(w, h, x - 0.003, x + 0.003, FLOOR - 0.09, FLOOR + 0.03), styles.fence]} />;
      })}
      {[FLOOR - 0.07, FLOOR - 0.02].map((y) => (
        <View key={y} style={[edge, rect(w, h, FARM.pen.x0 - 0.004, FARM.pen.x1 + 0.004, y, y + 0.016), styles.fence]} />
      ))}
      <View style={[rect(w, h, FARM.mud.x0, FARM.mud.x1, FARM.mud.y0, FARM.mud.y1), styles.mud]} />
      <View style={[rect(w, h, FARM.mud.x0 + 0.02, FARM.mud.x0 + 0.05, FARM.mud.y0 + 0.03, FARM.mud.y0 + 0.06), styles.mudSpot]} />
      <View style={[rect(w, h, FARM.mud.x1 - 0.05, FARM.mud.x1 - 0.025, FARM.mud.y1 - 0.06, FARM.mud.y1 - 0.035), styles.mudSpot]} />

      {/* The duck pond */}
      <View style={[edge, rect(w, h, FARM.pond.x0, FARM.pond.x1, FARM.pond.y0, FARM.pond.y1), { backgroundColor: '#4FC3F7', borderRadius: w, borderColor: '#0277BD' }]} />
      <View style={[rect(w, h, FARM.pond.x1 - 0.03, FARM.pond.x1 - 0.012, FARM.pond.y0 + 0.02, FARM.pond.y0 + 0.045), { backgroundColor: '#66BB6A', borderRadius: 40 }]} />

      {/* The windmill: tap it to spin */}
      <View style={[edge, rect(w, h, mill.x - 0.008, mill.x + 0.008, mill.top, FLOOR + 0.01), { backgroundColor: '#ECEFF1' }]} />
      <Pressable
        onPress={() => tap('windmill')}
        accessibilityRole="button"
        accessibilityLabel={on.windmill ? 'Stop the windmill' : 'Spin the windmill'}
        style={{ position: 'absolute', left: mill.x * w - 50, top: mill.top * h - 50, width: 100, height: 100 }}
      >
        <Spin active={!!on.windmill} style={{ width: 100, height: 100 }}>
          {[45, 135].map((deg) => (
            <View key={deg} style={[styles.blade, { transform: [{ rotate: `${deg}deg` }] }]} />
          ))}
          <View style={styles.hub} />
        </Spin>
      </Pressable>

      {/* The vegetable patch */}
      <View style={[edge, rect(w, h, FARM.garden.x0, FARM.garden.x1, FARM.garden.y0, FARM.garden.y1), styles.soil]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.furrow} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sun: { fontSize: 44 },
  tree: { position: 'absolute', fontSize: 40 },
  cloud: { fontSize: 44, opacity: 0.9 },
  exit: { position: 'absolute', backgroundColor: '#C68B5E', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exitText: { fontSize: 15, fontWeight: '800', color: '#fff', textAlign: 'center' },
  awning: { alignSelf: 'stretch', height: 10, opacity: 0.8, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  streetEmoji: { fontSize: 30, marginTop: 2 },
  streetName: { fontSize: 13, fontWeight: '900', color: '#fff', textAlign: 'center', paddingHorizontal: 2 },
  signText: { fontSize: 20, fontWeight: '900', color: '#3B2B25', textAlign: 'center' },
  sign: { backgroundColor: '#FFF3D6', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12 },
  label: { position: 'absolute', fontSize: 13, fontWeight: '900', color: '#3B2B25' },
  window: { backgroundColor: '#BBDEFB', marginTop: 6, borderRadius: 6 },
  door: { position: 'absolute', bottom: 0, backgroundColor: '#8D6E63', borderTopLeftRadius: 10, borderTopRightRadius: 10, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 },
  knob: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFCA28' },
  plank: { position: 'absolute', height: 12, backgroundColor: WOOD, borderRadius: 3, borderWidth: 2 },
  bigWindow: { backgroundColor: '#BBDEFB', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tiles: { backgroundColor: '#FFFFFF', opacity: 0.55, borderRadius: 4 },
  cupboard: { flex: 1, margin: 6, borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)', borderRadius: 4 },
  mixerBase: { position: 'absolute', backgroundColor: '#EC407A', borderRadius: 8 },
  bowl: { position: 'absolute', backgroundColor: '#CFD8DC', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  whisk: { position: 'absolute' },
  whiskText: { fontSize: 22 },
  oven: { backgroundColor: '#37474F', borderRadius: 10, padding: 8, gap: 6 },
  ovenWindow: { flex: 1, borderRadius: 8, borderWidth: 3, borderColor: '#263238' },
  ovenText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  dials: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dial: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#ECEFF1' },
  glass: { backgroundColor: 'rgba(200,235,255,0.55)', borderRadius: 10 },
  rug: { backgroundColor: '#7E57C2', borderRadius: 60 },
  glow: { backgroundColor: 'rgba(255,241,118,0.45)', borderRadius: 200 },
  shade: { height: 34, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderRadius: 4 },
  pole: { alignSelf: 'center', flex: 1, width: 5, backgroundColor: LINE },
  lampFoot: { height: 10, borderRadius: 5, backgroundColor: '#6D4C41' },
  monitor: { backgroundColor: '#263238', borderRadius: 6, alignItems: 'center', justifyContent: 'center', padding: 2 },
  screenText: { fontSize: 15, fontWeight: '900', color: '#A5D6A7', textAlign: 'center' },
  swingHit: { flex: 1 },
  rope: { position: 'absolute', top: 0, width: 3, backgroundColor: '#5D4037' },
  seat: { position: 'absolute', bottom: 0, left: 2, right: 2, height: 16, borderRadius: 4, backgroundColor: '#FFCA28' },
  slide: { position: 'absolute', height: 18, borderRadius: 9, backgroundColor: '#FFB300' },
  blanket: { backgroundColor: '#EF5350', borderRadius: 6, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  check: { width: '33.3%', height: '50%', backgroundColor: 'rgba(255,255,255,0.35)', opacity: 0.6 },
  fridge: { backgroundColor: '#E3F2FD', borderRadius: 8 },
  handle: { position: 'absolute', top: '40%', width: 6, height: 40, borderRadius: 3, backgroundColor: '#78909C' },
  puff: { position: 'absolute', fontSize: 22 },
  slat: { height: 3, backgroundColor: 'rgba(0,0,0,0.18)', marginTop: 14 },
  till: { backgroundColor: '#90A4AE', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  tillText: { fontSize: 14, fontWeight: '900', color: '#fff', textAlign: 'center' },
  drawer: { backgroundColor: '#B0BEC5', borderRadius: 4 },
  numberLine: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 2, borderColor: LINE },
  numberLineText: { fontSize: 16, fontWeight: '900', color: '#1E88E5' },
  clock: { position: 'absolute', fontSize: 34 },
  drawerFront: { margin: 8, height: 18, borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)', borderRadius: 4 },
  bellButton: { backgroundColor: '#FFF3D6', borderRadius: 10, borderWidth: 2, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  bellText: { fontSize: 12, fontWeight: '900', color: '#3B2B25', textAlign: 'center' },
  colorRug: { backgroundColor: '#FFCC80', borderRadius: 60, borderWidth: 3, borderColor: '#FB8C00' },
  artWall: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  artPaper: { backgroundColor: '#FFFFFF', borderRadius: 4, borderWidth: 2, paddingHorizontal: 4, paddingVertical: 2 },
  artText: { fontSize: 22 },
  easelLeg: { position: 'absolute', top: '10%', bottom: 0, width: 6, backgroundColor: WOOD },
  easelPaper: { position: 'absolute', left: 0, right: 0, top: 0, height: '55%', backgroundColor: '#FFFFFF', borderRadius: 4, alignItems: 'center', justifyContent: 'center', padding: 4 },
  easelText: { fontSize: 13, fontWeight: '900', color: '#3B2B25', textAlign: 'center' },
  barnDoor: { backgroundColor: '#C62828', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cross: { position: 'absolute', width: 6, height: '140%', backgroundColor: '#FFFFFF' },
  straw: { backgroundColor: '#FBC02D', borderRadius: 30, borderWidth: 2, borderColor: '#C49000' },
  ramp: { backgroundColor: '#A86B45', transform: [{ skewY: '30deg' }] },
  fence: { backgroundColor: '#FFFDF5', borderWidth: 2, borderRadius: 3 },
  mud: { backgroundColor: '#795548', borderRadius: 400, borderWidth: 3, borderColor: '#4E342E' },
  mudSpot: { backgroundColor: '#5D4037', borderRadius: 40 },
  blade: { position: 'absolute', left: 41, top: 0, width: 18, height: 100, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: LINE },
  hub: { position: 'absolute', left: 40, top: 40, width: 20, height: 20, borderRadius: 10, backgroundColor: '#E53935', borderWidth: 2, borderColor: LINE },
  soil: { backgroundColor: '#8D6E63', borderRadius: 10, justifyContent: 'space-evenly', paddingHorizontal: 6 },
  furrow: { height: 4, borderRadius: 2, backgroundColor: '#5D4037' },
});
