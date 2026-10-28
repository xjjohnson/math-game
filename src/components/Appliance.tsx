import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Bob, Flicker } from '@/components/Motion';
import type { Appliance } from '@/constants/room';

const OUTLINE = '#5B3A24';
const TRIM = '#A86B45';
const PORCELAIN = '#FAFAFA';
const WATER = '#81D4FA';

interface Props {
  appliance: Appliance;
  /** Its box in the home, in pixels. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Switched on (lit, playing, running, lid up, bouncing). */
  on: boolean;
  /** Which chalk drawing shows, for a chalkboard. */
  step: number;
  label: string;
  onPress: () => void;
}

/** A built-in appliance drawn with flat shapes: tap to switch it on and off. */
export function ApplianceView({ appliance: a, left, top, width: w, height: h, on, step, label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      style={{ position: 'absolute', left, top, width: w, height: h }}
    >
      {a.kind === 'fireplace' ? <Fireplace w={w} h={h} on={on} /> : null}
      {a.kind === 'tv' ? <Tv w={w} h={h} on={on} /> : null}
      {a.kind === 'tub' ? <Tub w={w} h={h} on={on} /> : null}
      {a.kind === 'toilet' ? <Toilet w={w} h={h} on={on} /> : null}
      {a.kind === 'ballPit' ? <BallPit w={w} h={h} on={on} /> : null}
      {a.kind === 'chalkboard' ? <Chalkboard w={w} h={h} step={step} /> : null}
    </Pressable>
  );
}

interface Drawn {
  w: number;
  h: number;
  on: boolean;
}

function at(left: number, top: number, width: number, height: number): ViewStyle {
  return { position: 'absolute', left, top, width, height };
}

/** A brick fireplace with a mantel; a fire burns inside while it is lit. */
function Fireplace({ w, h, on }: Drawn) {
  const mantel = h * 0.1;
  const open = { left: w * 0.27, top: h * 0.35, width: w * 0.46, height: h * 0.65 };
  // Each flame sways and flickers on its own, from its base.
  const flame = (x: number, fw: number, fh: number, color: string, seed: string) => (
    <Flicker
      key={seed}
      seed={seed}
      sway={14}
      style={[at(open.left + open.width * x - fw / 2, h - fh - h * 0.04, fw, fh), { transformOrigin: 'bottom' }]}
    >
      <View style={[styles.flame, { backgroundColor: color, borderTopLeftRadius: fw, borderTopRightRadius: fw * 0.2, borderBottomLeftRadius: fw * 0.5, borderBottomRightRadius: fw * 0.5 }]} />
    </Flicker>
  );
  return (
    <>
      {on ? <View style={[styles.glow, at(-w * 0.1, h * 0.1, w * 1.2, h * 1.1)]} /> : null}
      <View style={[styles.brick, at(w * 0.08, mantel, w * 0.84, h - mantel)]} />
      <View style={[styles.mantel, at(0, 0, w, mantel)]} />
      <View style={[styles.hearth, { ...open, position: 'absolute', borderTopLeftRadius: open.width / 2, borderTopRightRadius: open.width / 2 }]} />
      {/* Logs */}
      <View style={[styles.log, at(open.left + open.width * 0.15, h * 0.88, open.width * 0.7, h * 0.07)]} />
      {on ? (
        <>
          {flame(0.35, open.width * 0.32, h * 0.38, '#FF7043', 'fire-left')}
          {flame(0.62, open.width * 0.3, h * 0.32, '#FF7043', 'fire-right')}
          {flame(0.48, open.width * 0.22, h * 0.26, '#FFD54F', 'fire-middle')}
        </>
      ) : null}
    </>
  );
}

/** A flat TV; switched on, it shows a sunny hill. */
function Tv({ w, h, on }: Drawn) {
  const pad = Math.max(4, w * 0.05);
  return (
    <>
      <View style={[styles.tvFrame, at(0, 0, w, h * 0.88)]}>
        <View style={[styles.screen, on && styles.screenOn, { margin: pad }]}>
          {on ? (
            <>
              <View style={[styles.sun, at(w * 0.62, h * 0.08, h * 0.22, h * 0.22), { borderRadius: h }]} />
              <View style={[styles.hill, at(-w * 0.2, h * 0.38, w * 0.9, h * 0.6), { borderRadius: w }]} />
              <View style={[styles.hill2, at(w * 0.35, h * 0.45, w * 0.8, h * 0.6), { borderRadius: w }]} />
            </>
          ) : (
            <View style={[styles.shine, at(w * 0.08, h * 0.08, w * 0.12, h * 0.4)]} />
          )}
        </View>
      </View>
      <View style={[styles.tvStand, at(w * 0.42, h * 0.86, w * 0.16, h * 0.14)]} />
    </>
  );
}

/** A bathtub with a shower; switched on, water sprays and bubbles fill the tub. */
function Tub({ w, h, on }: Drawn) {
  const tubTop = h * 0.62;
  const tubH = h * 0.32;
  const pipeX = w * 0.86;
  const head = { left: pipeX - w * 0.2, top: h * 0.06, width: w * 0.22, height: h * 0.05 };
  return (
    <>
      {/* Shower pipe and head */}
      <View style={[styles.pipe, at(pipeX, h * 0.06, w * 0.025, tubTop - h * 0.06)]} />
      <View style={[styles.pipe, { ...head, position: 'absolute', borderRadius: 6 }]} />
      {on
        ? [0.15, 0.35, 0.55, 0.75].map((x) => (
            <View key={x} style={[styles.spray, at(head.left + head.width * x, head.top + head.height + 4, 3, tubTop - head.top - head.height - 8)]} />
          ))
        : null}
      {/* Water in the tub, under the rim */}
      {on ? <View style={[styles.water, at(w * 0.06, tubTop - h * 0.02, w * 0.88, h * 0.06)]} /> : null}
      {on
        ? [0.12, 0.25, 0.4, 0.55, 0.7, 0.82].map((x, i) => (
            <View key={x} style={[styles.bubble, at(w * x, tubTop - h * (0.05 + (i % 2) * 0.03), h * 0.07, h * 0.07), { borderRadius: h }]} />
          ))
        : null}
      <View style={[styles.tub, at(w * 0.02, tubTop, w * 0.96, tubH), { borderBottomLeftRadius: tubH * 0.6, borderBottomRightRadius: tubH * 0.6 }]} />
      <View style={[styles.foot, at(w * 0.12, h * 0.93, w * 0.06, h * 0.07)]} />
      <View style={[styles.foot, at(w * 0.82, h * 0.93, w * 0.06, h * 0.07)]} />
    </>
  );
}

/** A toilet: tap to lift the lid, tap again to put it down (and flush). */
function Toilet({ w, h, on }: Drawn) {
  const tank = { left: w * 0.18, top: 0, width: w * 0.64, height: h * 0.4 };
  const seatTop = h * 0.46;
  const seatH = h * 0.1;
  return (
    <>
      <View style={[styles.porcelain, { ...tank, position: 'absolute', borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }]} />
      <View style={[styles.flush, at(w * 0.6, h * 0.07, w * 0.16, h * 0.045)]} />
      {/* The pipe from the tank down to the bowl. */}
      <View style={[styles.porcelain, at(w * 0.42, tank.height - 3, w * 0.16, seatTop - tank.height + 6), { borderWidth: 2.5 }]} />
      {on ? (
        // The lid stands up against the tank.
        <View style={[styles.lid, at(w * 0.14, h * 0.06, w * 0.72, seatTop - h * 0.04), { borderRadius: w * 0.36 }]} />
      ) : null}
      {/* The bowl, round at the bottom, on a narrow foot. */}
      <View style={[styles.porcelain, at(w * 0.35, h * 0.78, w * 0.3, h * 0.22), { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }]} />
      <View style={[styles.porcelain, at(w * 0.1, seatTop + seatH * 0.5, w * 0.8, h * 0.36), { borderBottomLeftRadius: w * 0.4, borderBottomRightRadius: w * 0.4 }]} />
      <View style={[on ? styles.seatUp : styles.seat, at(w * 0.02, seatTop, w * 0.96, seatH), { borderRadius: w }]}>
        {on ? <View style={[styles.waterDark, { margin: 3, borderRadius: w }]} /> : null}
      </View>
    </>
  );
}

const BALL_COLORS = ['#EF5350', '#42A5F5', '#FFCA28', '#66BB6A', '#AB47BC', '#FF7043', '#26C6DA'];

/** A ball pit heaped with balls that jiggle; switched on, they bounce high. */
function BallPit({ w, h, on }: Drawn) {
  const ball = h * 0.32;
  const wallTop = h * 0.42;
  // Three rows, back to front, each a little lower and shifted half a ball.
  const rows = [h * 0.04, h * 0.14, h * 0.24];
  const across = Math.max(4, Math.floor((w - ball * 0.4) / (ball * 0.92)));
  const step = (w - ball) / (across - 1);
  return (
    <>
      {rows.map((y, row) =>
        Array.from({ length: across - (row % 2) }, (_, i) => {
          const n = row * across + i;
          const color = BALL_COLORS[(n * 3 + row) % BALL_COLORS.length];
          return (
            <Bob
              key={n}
              seed={`ball-${n}`}
              rise={h * (0.8 + ((n * 7) % 5) * 0.2)}
              active={on}
              style={at(i * step + (row % 2) * step * 0.5, y, ball, ball)}
            >
              <View style={[styles.ball, { flex: 1, backgroundColor: color, borderRadius: ball }]}>
                <View style={[styles.ballShine, { width: ball * 0.28, height: ball * 0.28, borderRadius: ball }]} />
              </View>
            </Bob>
          );
        }),
      )}
      {/* A padded wall around the front, with a soft rim on top. */}
      <View style={[styles.pit, at(0, wallTop, w, h - wallTop)]}>
        {Array.from({ length: Math.max(3, Math.round(w / (h * 0.9))) }, (_, i) => (
          <View key={i} style={[styles.pad, i % 2 ? styles.padAlt : null]} />
        ))}
      </View>
      <View style={[styles.rim, at(-3, wallTop - h * 0.04, w + 6, h * 0.14), { borderRadius: h }]} />
    </>
  );
}

/** A chalkboard on legs; each tap draws the next picture, then wipes it clean. */
function Chalkboard({ w, h, step }: { w: number; h: number; step: number }) {
  const board = { left: w * 0.04, top: 0, width: w * 0.92, height: h * 0.72 };
  const cx = board.width / 2;
  const cy = board.height / 2;
  const r = board.height * 0.28;
  const chalk = { borderColor: '#FAFAFA', borderWidth: 3 };
  return (
    <>
      <View style={[styles.leg, at(w * 0.14, h * 0.6, w * 0.05, h * 0.4)]} />
      <View style={[styles.leg, at(w * 0.81, h * 0.6, w * 0.05, h * 0.4)]} />
      <View style={[styles.board, { ...board, position: 'absolute' }]}>
        {step === 1 ? (
          <>
            <View style={[at(cx - r * 0.6, cy - r * 0.6, r * 1.2, r * 1.2), chalk, { borderColor: '#FFF59D', borderRadius: r }]} />
            {[0, 45, 90, 135].map((d) => (
              <View key={d} style={[at(cx - r * 1.1, cy - 1.5, r * 2.2, 3), { backgroundColor: '#FFF59D', transform: [{ rotate: `${d}deg` }] }]} />
            ))}
          </>
        ) : null}
        {step === 2 ? (
          <>
            <View style={[at(cx - r * 0.75, cy - r * 0.2, r * 1.5, r * 1.1), chalk]} />
            <View style={[at(cx - r * 0.55, cy - r * 0.95, r * 1.1, r * 1.1), chalk, { borderColor: '#F48FB1', transform: [{ rotate: '45deg' }, { scale: 0.75 }] }]} />
            <View style={[at(cx - r * 0.15, cy + r * 0.35, r * 0.3, r * 0.55), chalk, { borderColor: '#90CAF9' }]} />
          </>
        ) : null}
        {step === 3 ? (
          <>
            <View style={[at(cx - r, cy - r, r * 2, r * 2), chalk, { borderRadius: r }]} />
            <View style={[at(cx - r * 0.45, cy - r * 0.4, r * 0.18, r * 0.18), { backgroundColor: '#FAFAFA', borderRadius: r }]} />
            <View style={[at(cx + r * 0.27, cy - r * 0.4, r * 0.18, r * 0.18), { backgroundColor: '#FAFAFA', borderRadius: r }]} />
            <View
              style={[
                at(cx - r * 0.5, cy - r * 0.2, r, r * 0.6),
                { borderColor: '#FAFAFA', borderBottomWidth: 3, borderBottomLeftRadius: r, borderBottomRightRadius: r },
              ]}
            />
          </>
        ) : null}
      </View>
      <View style={[styles.tray, at(0, board.height - 2, w, h * 0.06)]} />
    </>
  );
}

const styles = StyleSheet.create({
  flame: { flex: 1, transform: [{ rotate: '-8deg' }] },
  glow: { borderRadius: 999, backgroundColor: 'rgba(255, 183, 77, 0.35)' },
  brick: { backgroundColor: '#B5523B', borderWidth: 3, borderColor: OUTLINE },
  mantel: { backgroundColor: TRIM, borderWidth: 3, borderColor: OUTLINE, borderRadius: 4 },
  hearth: { backgroundColor: '#3A2A25', borderWidth: 3, borderColor: OUTLINE },
  log: { backgroundColor: '#795548', borderWidth: 2, borderColor: OUTLINE, borderRadius: 6 },
  tvFrame: { backgroundColor: '#37474F', borderWidth: 3, borderColor: OUTLINE, borderRadius: 6 },
  screen: { flex: 1, backgroundColor: '#263238', borderRadius: 3, overflow: 'hidden' },
  screenOn: { backgroundColor: '#81D4FA' },
  shine: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, transform: [{ rotate: '20deg' }] },
  sun: { backgroundColor: '#FFEB3B' },
  hill: { backgroundColor: '#66BB6A' },
  hill2: { backgroundColor: '#43A047' },
  tvStand: { backgroundColor: '#37474F', borderWidth: 2, borderColor: OUTLINE },
  pipe: { backgroundColor: '#B0BEC5', borderWidth: 2, borderColor: OUTLINE },
  spray: { backgroundColor: WATER, borderRadius: 2 },
  water: { backgroundColor: WATER, borderRadius: 6 },
  bubble: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#B3E5FC' },
  tub: { backgroundColor: PORCELAIN, borderWidth: 3, borderColor: OUTLINE, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  foot: { backgroundColor: '#FFCA28', borderWidth: 2, borderColor: OUTLINE, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  porcelain: { backgroundColor: PORCELAIN, borderWidth: 3, borderColor: OUTLINE },
  flush: { backgroundColor: '#B0BEC5', borderWidth: 1.5, borderColor: OUTLINE, borderRadius: 3 },
  waterDark: { flex: 1, backgroundColor: WATER },
  ball: { borderWidth: 1.5, borderColor: OUTLINE },
  ballShine: { position: 'absolute', left: '18%', top: '16%', backgroundColor: 'rgba(255,255,255,0.7)' },
  pit: { flexDirection: 'row', backgroundColor: '#29B6F6', borderWidth: 3, borderColor: OUTLINE, borderRadius: 10, overflow: 'hidden' },
  pad: { flex: 1, backgroundColor: '#29B6F6', borderRightWidth: 2, borderColor: 'rgba(0,0,0,0.15)' },
  padAlt: { backgroundColor: '#4FC3F7' },
  rim: { backgroundColor: '#FFCA28', borderWidth: 3, borderColor: OUTLINE },
  lid: { backgroundColor: PORCELAIN, borderWidth: 3, borderColor: OUTLINE },
  seat: { backgroundColor: PORCELAIN, borderWidth: 3, borderColor: OUTLINE },
  seatUp: { backgroundColor: '#E0E0E0', borderWidth: 3, borderColor: OUTLINE },
  leg: { backgroundColor: TRIM, borderWidth: 2, borderColor: OUTLINE },
  board: { backgroundColor: '#2E5E4E', borderWidth: 6, borderColor: TRIM, borderRadius: 4, overflow: 'hidden' },
  tray: { backgroundColor: TRIM, borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
});
