import { memo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { Text } from '@/components/AppText';
import { newStrokeId, useChalkStrokes } from '@/services/chalkboard';
import { townSession } from '@/services/townSession';
import { CHALK_COLORS, CHALK_SCALE, MAX_CHALK_POINTS, type ChalkStroke } from '@/utils/multiplayer/protocol';

interface Props {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Says when fingers start and stop drawing, so the room doesn't scroll under them. */
  onDrawing?: (drawing: boolean) => void;
}

/** A new point is added once the finger has moved this far (in board units, 0 to CHALK_SCALE). */
const STEP = 6;
/** How often a growing line is sent to friends. */
const SEND_MS = 90;
const ERASER = 0;

interface Finger {
  stroke: ChalkStroke;
  sentAt: number;
}

/**
 * The school chalkboard: draw or write on it with a finger, or with several
 * fingers at once, each drawing its own line. Pick a chalk color or the eraser
 * on the tray, or wipe it all. On a visit everyone shares the one board.
 */
export function Chalkboard({ left, top, width, height, onDrawing }: Props) {
  const strokes = useChalkStrokes();
  const [color, setColor] = useState(1);
  const fingers = useRef(new Map<number, Finger>());
  const origin = useRef({ x: 0, y: 0 });
  const tray = Math.round(Math.min(58, Math.max(38, height * 0.18)));
  const chalkH = tray - 12;
  // The frame's border takes 8 points at the top and bottom.
  const boardH = height - tray - 16;

  const toBoard = (pageX: number, pageY: number) => ({
    x: Math.round(Math.min(CHALK_SCALE, Math.max(0, ((pageX - origin.current.x) / width) * CHALK_SCALE))),
    y: Math.round(Math.min(CHALK_SCALE, Math.max(0, ((pageY - origin.current.y) / boardH) * CHALK_SCALE))),
  });

  const share = (f: Finger, force = false) => {
    const now = Date.now();
    if (!force && now - f.sentAt < SEND_MS) return;
    f.sentAt = now;
    townSession().drawChalk(f.stroke);
  };

  const begin = (id: number, pageX: number, pageY: number) => {
    if (fingers.current.has(id)) return;
    // Another finger that landed off the board doesn't draw.
    const dx = pageX - origin.current.x;
    const dy = pageY - origin.current.y;
    if (dx < 0 || dx > width || dy < 0 || dy > boardH) return;
    const at = toBoard(pageX, pageY);
    const f: Finger = { stroke: { id: newStrokeId(), c: color, p: [at.x, at.y] }, sentAt: 0 };
    fingers.current.set(id, f);
    share(f, true);
  };

  const drag = (id: number, pageX: number, pageY: number) => {
    const f = fingers.current.get(id);
    if (!f) return;
    const at = toBoard(pageX, pageY);
    const p = f.stroke.p;
    if (Math.hypot(at.x - p[p.length - 2], at.y - p[p.length - 1]) < STEP) return;
    if (p.length >= MAX_CHALK_POINTS * 2) {
      // A long line carries on as a new one, so no single message gets too big.
      share(f, true);
      f.stroke = { id: newStrokeId(), c: f.stroke.c, p: [p[p.length - 2], p[p.length - 1], at.x, at.y] };
      f.sentAt = 0;
    } else {
      f.stroke = { ...f.stroke, p: [...p, at.x, at.y] };
    }
    share(f);
  };

  const finish = (id: number) => {
    const f = fingers.current.get(id);
    if (!f) return;
    fingers.current.delete(id);
    share(f, true);
  };

  const touches = (e: GestureResponderEvent) => (e.nativeEvent.changedTouches?.length ? e.nativeEvent.changedTouches : [e.nativeEvent]);

  const handlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      // The surface is what was touched (the lines let touches through), so this is where the board sits on screen.
      origin.current = { x: e.nativeEvent.pageX - e.nativeEvent.locationX, y: e.nativeEvent.pageY - e.nativeEvent.locationY };
      onDrawing?.(true);
      begin(Number(e.nativeEvent.identifier), e.nativeEvent.pageX, e.nativeEvent.pageY);
      // On Android, keeps the room from scrolling while chalk is on the board.
      return true;
    },
    onResponderStart: (e: GestureResponderEvent) => touches(e).forEach((t) => begin(Number(t.identifier), t.pageX, t.pageY)),
    onResponderMove: (e: GestureResponderEvent) =>
      (e.nativeEvent.touches?.length ? e.nativeEvent.touches : [e.nativeEvent]).forEach((t) => drag(Number(t.identifier), t.pageX, t.pageY)),
    onResponderEnd: (e: GestureResponderEvent) => touches(e).forEach((t) => finish(Number(t.identifier))),
    onResponderRelease: () => {
      [...fingers.current.keys()].forEach(finish);
      onDrawing?.(false);
    },
    onResponderTerminate: () => {
      [...fingers.current.keys()].forEach(finish);
      onDrawing?.(false);
    },
  };

  return (
    <View style={[styles.frame, { left, top, width, height }]}>
      <View style={[styles.surface, { height: boardH }]} {...handlers} accessibilityLabel="Chalkboard. Draw on it with your finger.">
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {strokes.length === 0 ? <Text style={styles.hint}>Draw here with your finger ✍️</Text> : null}
          {strokes.map((s) => (
            <Line key={s.id} stroke={s} w={width} h={boardH} />
          ))}
        </View>
      </View>
      <View style={[styles.tray, { height: tray }]}>
        {CHALK_COLORS.map((c, i) => (
          <Pressable
            key={c}
            onPress={() => setColor(i)}
            accessibilityRole="button"
            accessibilityLabel={i === ERASER ? 'Eraser' : `Chalk color ${i}`}
            accessibilityState={{ selected: color === i }}
            style={[styles.chalk, { height: chalkH }, color === i && styles.chalkOn, i === ERASER ? styles.eraser : { backgroundColor: c }]}
          >
            {i === ERASER ? <Text style={styles.eraserText}>🧽</Text> : null}
          </Pressable>
        ))}
        <Pressable onPress={() => townSession().wipeChalk()} accessibilityRole="button" accessibilityLabel="Wipe the whole board" style={[styles.wipe, { height: chalkH }]}>
          <Text style={styles.wipeText}>Wipe</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** One chalk line, drawn as short rounded bars from point to point. */
const Line = memo(function Line({ stroke, w, h }: { stroke: ChalkStroke; w: number; h: number }) {
  const eraser = stroke.c === ERASER;
  const t = Math.max(4, Math.round(h * (eraser ? 0.09 : 0.022)));
  const color = CHALK_COLORS[stroke.c] ?? CHALK_COLORS[1];
  const p = stroke.p;
  const at = (i: number) => ({ x: (p[i] / CHALK_SCALE) * w, y: (p[i + 1] / CHALK_SCALE) * h });
  const bars = [];
  if (p.length === 2) {
    const a = at(0);
    bars.push(<View key={0} style={{ position: 'absolute', left: a.x - t / 2, top: a.y - t / 2, width: t, height: t, borderRadius: t / 2, backgroundColor: color }} />);
  }
  for (let i = 0; i + 3 < p.length; i += 2) {
    const a = at(i);
    const b = at(i + 2);
    const len = Math.hypot(b.x - a.x, b.y - a.y) + t;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    bars.push(
      <View
        key={i}
        style={{
          position: 'absolute',
          left: (a.x + b.x) / 2 - len / 2,
          top: (a.y + b.y) / 2 - t / 2,
          width: len,
          height: t,
          borderRadius: t / 2,
          backgroundColor: color,
          opacity: eraser ? 1 : 0.92,
          transform: [{ rotate: `${angle}rad` }],
        }}
      />,
    );
  }
  return <>{bars}</>;
});

const styles = StyleSheet.create({
  frame: { position: 'absolute', borderWidth: 8, borderColor: '#8D5A3B', borderRadius: 8, backgroundColor: '#8D5A3B', overflow: 'hidden' },
  surface: { backgroundColor: CHALK_COLORS[ERASER], overflow: 'hidden' },
  hint: { position: 'absolute', top: '40%', left: 0, right: 0, textAlign: 'center', fontSize: 20, fontWeight: '800', color: 'rgba(255,255,255,0.45)' },
  tray: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8, backgroundColor: '#A86B45', paddingHorizontal: 12 },
  chalk: { width: 40, height: 30, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)' },
  chalkOn: { borderWidth: 4, borderColor: '#FFEB3B', transform: [{ scale: 1.12 }] },
  eraser: { backgroundColor: '#FFE0B2', alignItems: 'center', justifyContent: 'center' },
  eraserText: { fontSize: 16 },
  wipe: { marginLeft: 8, paddingHorizontal: 12, height: 32, borderRadius: 10, backgroundColor: '#FFF3D6', justifyContent: 'center' },
  wipeText: { fontSize: 15, fontWeight: '900', color: '#3B2B25' },
});
