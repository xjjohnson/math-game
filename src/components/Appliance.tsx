import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { PlayScape, SwingSet, Trampoline, TreeWithHouse } from '@/components/Backyard';
import { Bob, Flicker, Rumble, Spin } from '@/components/Motion';
import type { Appliance } from '@/constants/room';
import { INK } from '@/constants/artStyle';

const OUTLINE = INK;
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
      {a.kind === 'microwave' ? <Microwave w={w} h={h} on={on} /> : null}
      {a.kind === 'dishwasher' ? <Dishwasher w={w} h={h} on={on} /> : null}
      {a.kind === 'aquarium' ? <Aquarium w={w} h={h} on={on} /> : null}
      {a.kind === 'fan' ? <Fan w={w} h={h} on={on} /> : null}
      {a.kind === 'treeHouse' ? <TreeWithHouse w={w} h={h} on={on} /> : null}
      {a.kind === 'swingSet' ? <SwingSet w={w} h={h} on={on} /> : null}
      {a.kind === 'playScape' ? <PlayScape w={w} h={h} on={on} /> : null}
      {a.kind === 'trampoline' ? <Trampoline w={w} h={h} on={on} /> : null}
      {a.kind === 'computer' ? <Computer w={w} h={h} on={on} /> : null}
      {a.kind === 'globe' ? <Globe w={w} h={h} on={on} /> : null}
      {a.kind === 'garageDoor' ? <GarageDoor w={w} h={h} on={on} /> : null}
      {a.kind === 'car' ? <Car w={w} h={h} on={on} /> : null}
      {a.kind === 'bed' ? <Bed w={w} h={h} on={on} /> : null}
      {a.kind === 'bunkBed' ? <BunkBed w={w} h={h} on={on} /> : null}
      {a.kind === 'starLamp' ? <StarLamp w={w} h={h} on={on} /> : null}
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

/** A microwave: switched on, the light comes on and the snack goes round. */
function Microwave({ w, h, on }: Drawn) {
  const win = { left: w * 0.07, top: h * 0.14, width: w * 0.62, height: h * 0.66 };
  const plate = win.width * 0.5;
  return (
    <>
      <View style={[styles.microBody, at(0, 0, w, h * 0.92)]} />
      <View style={[styles.microWindow, on && styles.microLit, { ...win, position: 'absolute' }]}>
        <Spin active={on} style={at(win.width / 2 - plate / 2 - 3, win.height / 2 - plate / 2 - 3, plate, plate)}>
          <View style={[styles.snack, { borderRadius: plate }]}>
            <View style={styles.snackDot} />
          </View>
        </Spin>
      </View>
      {[0.2, 0.45, 0.7].map((y) => (
        <View key={y} style={[styles.microButton, at(w * 0.77, h * y, w * 0.16, h * 0.12)]} />
      ))}
      <View style={[styles.foot, at(w * 0.1, h * 0.92, w * 0.1, h * 0.08)]} />
      <View style={[styles.foot, at(w * 0.8, h * 0.92, w * 0.1, h * 0.08)]} />
    </>
  );
}

/** A dishwasher with a porthole; switched on, bubbles slosh about and water drips down. */
function Dishwasher({ w, h, on }: Drawn) {
  const win = { left: w * 0.12, top: h * 0.2, width: w * 0.76, height: h * 0.36 };
  return (
    <>
      <View style={[styles.dishBody, at(0, 0, w, h)]} />
      <View style={[styles.dishHandle, at(w * 0.15, h * 0.07, w * 0.7, h * 0.06)]} />
      <View style={[styles.dishWindow, on && styles.dishWet, { ...win, position: 'absolute' }]}>
        {[0.15, 0.4, 0.62].map((x, i) => (
          <Bob key={x} seed={`dish-${i}`} rise={win.height * 0.4} active={on} style={at(win.width * x, win.height * 0.45, win.height * 0.28, win.height * 0.28)}>
            <View style={[styles.bubble, { flex: 1, borderRadius: h }, !on && { opacity: 0.35 }]} />
          </Bob>
        ))}
      </View>
      {on
        ? [0.25, 0.5, 0.75].map((x) => <View key={x} style={[styles.spray, at(w * x, h * 0.6, 3, h * 0.16)]} />)
        : null}
      <View style={[styles.dishLight, on && styles.dishLightOn, at(w * 0.42, h * 0.84, w * 0.16, h * 0.06)]} />
    </>
  );
}

const FISH_COLORS = ['#FF7043', '#FFCA28', '#EC407A', '#7E57C2'];

/** A fish tank on a stand: fish drift about, and when it is on, the light shines and bubbles rise. */
function Aquarium({ w, h, on }: Drawn) {
  const tank = { left: 0, top: 0, width: w, height: h * 0.78 };
  const fish = h * 0.12;
  return (
    <>
      <View style={[styles.tankStand, at(w * 0.04, h * 0.78, w * 0.92, h * 0.22)]} />
      <View style={[styles.tank, on && styles.tankLit, { ...tank, position: 'absolute' }]}>
        <View style={[styles.sand, at(0, tank.height * 0.8, w, tank.height * 0.2)]} />
        <View style={[styles.weed, at(w * 0.12, tank.height * 0.35, w * 0.05, tank.height * 0.5)]} />
        <View style={[styles.weed, at(w * 0.8, tank.height * 0.45, w * 0.05, tank.height * 0.4)]} />
        {FISH_COLORS.map((color, i) => (
          <Bob key={color} seed={`fish-${i}`} rise={h * (on ? 0.18 : 0.06)} active={on} style={at(w * (0.18 + i * 0.17), tank.height * (0.18 + (i % 2) * 0.25), fish * 1.6, fish)}>
            <View style={{ flex: 1, flexDirection: i % 2 ? 'row-reverse' : 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, height: '100%', backgroundColor: color, borderRadius: fish, borderWidth: 1.5, borderColor: OUTLINE }} />
              <View style={{ width: fish * 0.5, height: fish * 0.7, backgroundColor: color, borderRadius: 4, borderWidth: 1.5, borderColor: OUTLINE }} />
            </View>
          </Bob>
        ))}
        {on
          ? [0.3, 0.55, 0.78].map((x, i) => (
              <Bob key={x} seed={`air-${i}`} rise={tank.height * 0.6} active style={at(w * x, tank.height * 0.7, fish * 0.45, fish * 0.45)}>
                <View style={[styles.bubble, { flex: 1, borderRadius: h }]} />
              </Bob>
            ))
          : null}
      </View>
    </>
  );
}

/** A standing fan; switched on, the blades whirl. */
function Fan({ w, h, on }: Drawn) {
  const head = w * 0.96;
  return (
    <>
      <View style={[styles.fanPole, at(w * 0.46, head * 0.8, w * 0.08, h - head * 0.8 - h * 0.05)]} />
      <View style={[styles.fanBase, at(w * 0.12, h * 0.94, w * 0.76, h * 0.06)]} />
      <View style={[styles.fanCage, at(w * 0.02, 0, head, head), { borderRadius: head }]}>
        <Spin active={on} style={styles.fanBlades}>
          {[0, 60, 120].map((d) => (
            <View key={d} style={[at(head * 0.5 - head * 0.1, head * 0.08, head * 0.2, head * 0.8), styles.blade, { transform: [{ rotate: `${d}deg` }] }]} />
          ))}
        </Spin>
        <View style={[styles.fanHub, at(head * 0.44, head * 0.44, head * 0.12, head * 0.12), { borderRadius: head }]} />
      </View>
    </>
  );
}

/** A computer on the desk; switched on, it shows a sum and its answer. */
function Computer({ w, h, on }: Drawn) {
  const screenH = h * 0.72;
  return (
    <>
      <View style={[styles.monitor, at(0, 0, w, screenH)]}>
        <View style={[styles.pcScreen, on && styles.pcOn]}>
          {on ? (
            <View style={styles.pcSum}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[
                    { width: w * 0.1, height: screenH * 0.14, borderRadius: 3, marginHorizontal: 1 },
                    { backgroundColor: i % 2 ? '#FFFFFF' : ['#FFCA28', '#66BB6A', '#EF5350'][i / 2] },
                  ]}
                />
              ))}
            </View>
          ) : (
            <View style={[styles.shine, at(w * 0.08, screenH * 0.1, w * 0.1, screenH * 0.4)]} />
          )}
        </View>
      </View>
      <View style={[styles.tvStand, at(w * 0.42, screenH - 2, w * 0.16, h * 0.14)]} />
      <View style={[styles.keyboard, at(w * 0.1, h * 0.86, w * 0.8, h * 0.12)]} />
    </>
  );
}

/** A globe on a stand; switched on, it spins round. */
function Globe({ w, h, on }: Drawn) {
  const ball = Math.min(w * 0.9, h * 0.7);
  const left = (w - ball) / 2;
  return (
    <>
      <View style={[styles.globeStand, at(w * 0.46, ball * 0.9, w * 0.08, h - ball * 0.9 - h * 0.06)]} />
      <View style={[styles.globeBase, at(w * 0.2, h * 0.93, w * 0.6, h * 0.07)]} />
      <View style={[styles.globeSea, at(left, 0, ball, ball), { borderRadius: ball }]}>
        <Spin active={on} style={{ flex: 1 }}>
          <View style={[styles.land, at(ball * 0.18, ball * 0.15, ball * 0.32, ball * 0.36), { borderRadius: ball * 0.2 }]} />
          <View style={[styles.land, at(ball * 0.55, ball * 0.45, ball * 0.26, ball * 0.32), { borderRadius: ball * 0.16 }]} />
          <View style={[styles.land, at(ball * 0.3, ball * 0.66, ball * 0.18, ball * 0.14), { borderRadius: ball * 0.1 }]} />
        </Spin>
      </View>
      <View style={[styles.meridian, at(left - 4, -4, ball + 8, ball + 8), { borderRadius: ball }]} />
    </>
  );
}

/** A garage door that rolls up (switched on) to show the driveway and the sky outside. */
function GarageDoor({ w, h, on }: Drawn) {
  const slats = 6;
  return (
    <>
      <View style={[styles.garageFrame, at(0, 0, w, h)]}>
        <View style={styles.outside}>
          <View style={[styles.sunDot, at(w * 0.7, h * 0.12, h * 0.16, h * 0.16), { borderRadius: h }]} />
          <View style={[styles.hill, at(-w * 0.1, h * 0.55, w * 0.7, h * 0.6), { borderRadius: w }]} />
          <View style={[styles.hill2, at(w * 0.4, h * 0.62, w * 0.8, h * 0.6), { borderRadius: w }]} />
          <View style={[styles.driveway, at(w * 0.2, h * 0.82, w * 0.6, h * 0.18)]} />
        </View>
        {/* Rolled up, only the bottom slat shows at the top. */}
        <View style={[styles.slats, { height: on ? h * 0.12 : '100%' }]}>
          {Array.from({ length: on ? 1 : slats }, (_, i) => (
            <View key={i} style={styles.slat} />
          ))}
          <View style={styles.handle} />
        </View>
      </View>
    </>
  );
}

/** A little open-top car; switched on, the headlights shine and it rumbles. Buddies sit in the driver's seat. */
function Car({ w, h, on }: Drawn) {
  const wheel = h * 0.42;
  return (
    <Rumble active={on} style={StyleSheet.absoluteFill}>
      {on ? <View style={[styles.beam, at(w * 0.92, h * 0.22, w * 0.3, h * 0.36), { borderTopRightRadius: h, borderBottomRightRadius: h }]} /> : null}
      {/* Seat back and steering wheel stick up out of the car. */}
      <View style={[styles.carSeat, at(w * 0.16, h * 0.02, w * 0.1, h * 0.4)]} />
      <View style={[styles.windshield, at(w * 0.56, -h * 0.02, w * 0.05, h * 0.34), { transform: [{ rotate: '18deg' }] }]} />
      <View style={[styles.wheelRing, at(w * 0.42, h * 0.04, h * 0.24, h * 0.24), { borderRadius: h, transform: [{ rotate: '-20deg' }] }]} />
      <View style={[styles.column, at(w * 0.44 + h * 0.1, h * 0.2, w * 0.02, h * 0.12), { transform: [{ rotate: '30deg' }] }]} />
      <View style={[styles.carBody, at(0, h * 0.28, w, h * 0.46), { borderTopLeftRadius: h * 0.35, borderTopRightRadius: h * 0.2 }]}>
        <View style={[styles.carStripe, { top: '40%' }]} />
      </View>
      <View style={[styles.lightBulb, on && styles.lightOn, at(w * 0.93, h * 0.38, w * 0.05, h * 0.12)]} />
      <View style={[styles.tail, at(w * 0.005, h * 0.38, w * 0.04, h * 0.1)]} />
      {[0.12, 0.7].map((x) => (
        <Spin key={x} active={on} style={at(w * x, h - wheel, wheel, wheel)}>
          <View style={[styles.tyre, { flex: 1, borderRadius: wheel }]}>
            <View style={[styles.hub, { width: wheel * 0.4, height: wheel * 0.4, borderRadius: wheel }]} />
            <View style={[styles.spoke, { width: wheel * 0.8 }]} />
          </View>
        </Spin>
      ))}
    </Rumble>
  );
}

/** A bed with a headboard and a fluffy blanket; tapped on, the blanket bounces (someone's jumping on it). */
function Bed({ w, h, on }: Drawn) {
  const mattress = h * (1 - 0.15 / 0.3);
  return (
    <>
      <View style={[styles.headboard, at(0, 0, w * 0.1, h), { borderTopLeftRadius: w * 0.05, borderTopRightRadius: w * 0.05 }]} />
      <View style={[styles.headboard, at(w * 0.93, h * 0.42, w * 0.07, h * 0.58)]} />
      <View style={[styles.bedFrame, at(w * 0.04, h * 0.72, w * 0.92, h * 0.2)]} />
      <View style={[styles.pillow, at(w * 0.11, mattress - h * 0.18, w * 0.18, h * 0.16), { borderRadius: h }]} />
      <Bob seed="bed2" rise={h * 0.12} active={on} style={at(w * 0.08, mattress, w * 0.86, h * 0.3)}>
        <View style={[styles.blanket, { flex: 1, borderRadius: h * 0.1 }]}>
          {[0.2, 0.5, 0.8].map((x) => (
            <View key={x} style={[styles.blanketDot, { left: `${x * 100}%` }]} />
          ))}
        </View>
      </Bob>
      <View style={[styles.foot, at(w * 0.06, h * 0.9, w * 0.05, h * 0.1)]} />
      <View style={[styles.foot, at(w * 0.88, h * 0.9, w * 0.05, h * 0.1)]} />
    </>
  );
}

/** Bunk beds with a ladder; tapped on, both blankets bounce. */
function BunkBed({ w, h, on }: Drawn) {
  // Mattress tops: the bottom bunk at 0.09 and the top at 0.38 of 0.6 up.
  const bottomTop = h * (1 - 0.09 / 0.6);
  const topTop = h * (1 - 0.38 / 0.6);
  const blanketH = h * 0.08;
  const bunk = (y: number, color: string, seed: string) => (
    <>
      <View style={[styles.bedFrame, at(w * 0.04, y + blanketH * 0.6, w * 0.92, h * 0.05)]} />
      <View style={[styles.pillow, at(w * 0.08, y - h * 0.07, w * 0.18, h * 0.07), { borderRadius: h }]} />
      <Bob seed={seed} rise={h * 0.05} active={on} style={at(w * 0.06, y, w * 0.88, blanketH)}>
        <View style={[styles.blanket, { flex: 1, borderRadius: 6, backgroundColor: color }]} />
      </Bob>
    </>
  );
  return (
    <>
      <View style={[styles.bunkPost, at(0, 0, w * 0.05, h)]} />
      <View style={[styles.bunkPost, at(w * 0.95, 0, w * 0.05, h)]} />
      <View style={[styles.bunkRail, at(w * 0.04, topTop - h * 0.12, w * 0.6, h * 0.03)]} />
      {bunk(topTop, '#7E57C2', 'bunk-top')}
      {bunk(bottomTop, '#26A69A', 'bunk-bottom')}
      {/* The ladder up the side. */}
      <View style={[styles.ladderSide, at(w * 0.74, topTop, w * 0.03, bottomTop - topTop)]} />
      <View style={[styles.ladderSide, at(w * 0.88, topTop, w * 0.03, bottomTop - topTop)]} />
      {[0.2, 0.45, 0.7].map((t) => (
        <View key={t} style={[styles.ladderRung, at(w * 0.74, topTop + (bottomTop - topTop) * t, w * 0.17, h * 0.02)]} />
      ))}
    </>
  );
}

/** A star night light; switched on, it glows (and stars shine on the bedroom walls). */
function StarLamp({ w, h, on }: Drawn) {
  return (
    <>
      {on ? <View style={[styles.glow, at(-w * 0.4, -h * 0.5, w * 1.8, h * 1.6)]} /> : null}
      <View style={[styles.lampBase, at(w * 0.15, h * 0.7, w * 0.7, h * 0.3)]} />
      <View style={[styles.starDome, on && styles.starDomeOn, at(w * 0.05, 0, w * 0.9, h * 0.76), { borderTopLeftRadius: w, borderTopRightRadius: w }]}>
        {[
          [0.25, 0.35],
          [0.6, 0.25],
          [0.45, 0.6],
        ].map(([x, y]) => (
          <View key={`${x}-${y}`} style={[styles.domeStar, at(w * 0.9 * x - 3, h * 0.76 * y - 3, 6, 6)]} />
        ))}
      </View>
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
  microBody: { backgroundColor: '#ECEFF1', borderWidth: 3, borderColor: OUTLINE, borderRadius: 8 },
  microWindow: { backgroundColor: '#37474F', borderWidth: 3, borderColor: OUTLINE, borderRadius: 4, overflow: 'hidden' },
  microLit: { backgroundColor: '#FFF59D' },
  snack: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: OUTLINE, alignItems: 'center', justifyContent: 'flex-start' },
  snackDot: { width: '28%', height: '28%', marginTop: '8%', borderRadius: 99, backgroundColor: '#EF5350' },
  microButton: { backgroundColor: '#90A4AE', borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
  dishBody: { backgroundColor: '#CFD8DC', borderWidth: 3, borderColor: OUTLINE, borderRadius: 6 },
  dishHandle: { backgroundColor: '#78909C', borderWidth: 2, borderColor: OUTLINE, borderRadius: 4 },
  dishWindow: { backgroundColor: '#455A64', borderWidth: 3, borderColor: OUTLINE, borderRadius: 6, overflow: 'hidden' },
  dishWet: { backgroundColor: '#4FC3F7' },
  dishLight: { backgroundColor: '#90A4AE', borderRadius: 3, borderWidth: 1.5, borderColor: OUTLINE },
  dishLightOn: { backgroundColor: '#66BB6A' },
  tankStand: { backgroundColor: TRIM, borderWidth: 3, borderColor: OUTLINE, borderRadius: 4 },
  tank: { backgroundColor: 'rgba(129, 212, 250, 0.55)', borderWidth: 4, borderColor: OUTLINE, borderRadius: 8, overflow: 'hidden' },
  tankLit: { backgroundColor: 'rgba(79, 195, 247, 0.85)' },
  sand: { backgroundColor: '#FFE082' },
  weed: { backgroundColor: '#43A047', borderRadius: 6 },
  fanPole: { backgroundColor: '#B0BEC5', borderWidth: 2, borderColor: OUTLINE },
  fanBase: { backgroundColor: '#78909C', borderWidth: 2, borderColor: OUTLINE, borderRadius: 6 },
  fanCage: { backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 3, borderColor: OUTLINE, overflow: 'hidden' },
  fanBlades: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  blade: { backgroundColor: '#42A5F5', borderRadius: 99, borderWidth: 1.5, borderColor: OUTLINE },
  fanHub: { backgroundColor: '#FFCA28', borderWidth: 2, borderColor: OUTLINE },
  tray: { backgroundColor: TRIM, borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
  monitor: { backgroundColor: '#37474F', borderWidth: 3, borderColor: OUTLINE, borderRadius: 6, padding: 4 },
  pcScreen: { flex: 1, backgroundColor: '#263238', borderRadius: 3, overflow: 'hidden', justifyContent: 'center' },
  pcOn: { backgroundColor: '#3949AB' },
  pcSum: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  keyboard: { backgroundColor: '#ECEFF1', borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
  globeStand: { backgroundColor: '#B0BEC5', borderWidth: 2, borderColor: OUTLINE },
  globeBase: { backgroundColor: TRIM, borderWidth: 2, borderColor: OUTLINE, borderRadius: 6 },
  globeSea: { backgroundColor: '#42A5F5', borderWidth: 3, borderColor: OUTLINE, overflow: 'hidden' },
  land: { backgroundColor: '#66BB6A', borderWidth: 1.5, borderColor: '#2E7D32' },
  meridian: { borderWidth: 3, borderColor: '#B0BEC5', borderLeftColor: 'transparent', borderBottomColor: 'transparent' },
  garageFrame: { backgroundColor: '#90A4AE', borderWidth: 4, borderColor: OUTLINE, borderRadius: 4, overflow: 'hidden' },
  outside: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: '#9ED8F5' },
  sunDot: { backgroundColor: '#FFEB3B' },
  driveway: { backgroundColor: '#B0BEC5' },
  slats: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: '#ECEFF1' },
  slat: { flex: 1, borderBottomWidth: 2, borderColor: '#B0BEC5' },
  handle: { position: 'absolute', bottom: 6, left: '44%', width: '12%', height: 6, borderRadius: 3, backgroundColor: '#546E7A' },
  beam: { backgroundColor: 'rgba(255, 241, 118, 0.55)' },
  carSeat: { backgroundColor: '#5D4037', borderWidth: 2, borderColor: OUTLINE, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  wheelRing: { borderWidth: 4, borderColor: '#37474F' },
  windshield: { backgroundColor: 'rgba(179, 229, 252, 0.8)', borderWidth: 2, borderColor: OUTLINE, borderRadius: 4 },
  column: { backgroundColor: '#37474F' },
  carBody: { backgroundColor: '#E53935', borderWidth: 3, borderColor: OUTLINE, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, overflow: 'hidden' },
  carStripe: { position: 'absolute', left: 0, right: 0, height: '18%', backgroundColor: '#FFFFFF' },
  lightBulb: { backgroundColor: '#FFF9C4', borderWidth: 1.5, borderColor: OUTLINE, borderRadius: 4 },
  lightOn: { backgroundColor: '#FFEE58' },
  tail: { backgroundColor: '#B71C1C', borderRadius: 3 },
  tyre: { backgroundColor: '#263238', borderWidth: 2, borderColor: OUTLINE, alignItems: 'center', justifyContent: 'center' },
  hub: { backgroundColor: '#B0BEC5' },
  spoke: { position: 'absolute', height: 3, backgroundColor: '#B0BEC5' },
  headboard: { backgroundColor: TRIM, borderWidth: 3, borderColor: OUTLINE },
  bedFrame: { backgroundColor: TRIM, borderWidth: 3, borderColor: OUTLINE, borderRadius: 4 },
  pillow: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: OUTLINE },
  blanket: { backgroundColor: '#EC407A', borderWidth: 3, borderColor: OUTLINE, overflow: 'hidden' },
  blanketDot: { position: 'absolute', top: '30%', width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  bunkPost: { backgroundColor: TRIM, borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
  bunkRail: { backgroundColor: TRIM, borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
  ladderSide: { backgroundColor: TRIM, borderWidth: 1.5, borderColor: OUTLINE },
  ladderRung: { backgroundColor: TRIM, borderWidth: 1.5, borderColor: OUTLINE, borderRadius: 2 },
  lampBase: { backgroundColor: '#7E57C2', borderWidth: 2, borderColor: OUTLINE, borderRadius: 6 },
  starDome: { backgroundColor: '#B39DDB', borderWidth: 2, borderColor: OUTLINE, overflow: 'hidden' },
  starDomeOn: { backgroundColor: '#FFF59D' },
  domeStar: { backgroundColor: '#FFFFFF', borderRadius: 3 },
});
