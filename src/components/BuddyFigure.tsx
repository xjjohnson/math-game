import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Rect } from 'react-native-svg';

import { Text } from '@/components/AppText';
import { useArmWave } from '@/components/Motion';
import { BARE_SHOES, shoeLook } from '@/components/PersonAccessories';
import type { Mood } from '@/components/PersonFigure';
import { PopIn } from '@/components/PopIn';
import { Sticker } from '@/components/Sticker';
import { MOOD_EMOJI } from '@/utils/wardrobe';
import { INK, inkWidth, shade } from '@/constants/artStyle';

/** What a buddy has on, ready to draw. */
export interface Dressed {
  hat?: string;
  face?: string;
  neck?: string;
  /** Shirt color. */
  shirt?: string;
  /** Shoe or sock wearable id, drawn in place of the bare feet. */
  feet?: string;
}

interface Props {
  /** The buddy's emoji or "@key" drawing, used as its head. */
  value: string;
  /** Height (and width) of the whole buddy. */
  size: number;
  fur: string;
  belly: string;
  dressed: Dressed;
  /** What the buddy wears for its level, perched by its head. */
  gift?: string | null;
  /** Change this number to wave once. */
  wave?: number;
  /** How it feels: anything but the everyday smile shows as a little face in a bubble by its head. */
  mood?: Mood;
}

const SOCK_STRIPE = '#E57373';

/** A buddy with a body: its face as the head, a round body with a soft belly, paw arms, feet and its clothes. */
export function BuddyFigure({ value, size, fur, belly, dressed, gift, wave, mood = 'smile' }: Props) {
  const shirt = dressed.shirt;
  const s = size;
  const line = inkWidth(s);
  const head = Math.round(s * 0.66);
  const bodyW = s * 0.5;
  const bodyH = s * 0.42;
  const bodyBottom = s * 0.06;
  const bodyTop = s - bodyBottom - bodyH;
  const footW = s * 0.17;
  const footH = s * 0.08;
  const armW = s * 0.12;
  const armH = s * 0.24;
  const armTop = bodyTop + s * 0.06;
  const paw = armW * 1.25;
  const armBoxW = paw + line * 2;
  const armBoxH = armH + paw * 0.3;
  const waving = useArmWave(wave, -20, armBoxH, -1);
  const shoes = shoeLook(dressed.feet);
  const shod = shoes !== BARE_SHOES;
  // Boots come a little higher up the leg; everything else sits where the bare foot was.
  const shoeH = footH * (1 + shoes.tall * 5);
  const sleeve = shirt ?? fur;
  const clipId = `bf${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const arm = (side: number) => {
    const mid = armBoxW / 2;
    const left = side < 0 ? s / 2 - bodyW / 2 + armW * 0.3 - armBoxW / 2 : s / 2 + bodyW / 2 - armW * 0.3 - armBoxW / 2;
    const handY = armH - paw * 0.25;
    return (
      <Animated.View
        key={side}
        style={[styles.part, { left, top: armTop, width: armBoxW, height: armBoxH }, side < 0 ? styles.backArm : waving]}
      >
        <Svg width={armBoxW} height={armBoxH}>
          <Rect x={mid - armW / 2} y={line / 2} width={armW} height={handY} rx={armW / 2} fill={sleeve} stroke={INK} strokeWidth={line} />
          {/* A round paw at the end; fur shows past a sleeve. */}
          <Circle cx={mid} cy={handY} r={paw / 2 - line / 2} fill={fur} stroke={INK} strokeWidth={line} />
          <Ellipse cx={mid} cy={handY + paw * 0.12} rx={paw * 0.2} ry={paw * 0.12} fill={shade(fur, 0.12)} />
        </Svg>
      </Animated.View>
    );
  };

  const bx = s / 2 - bodyW / 2;
  return (
    <View style={{ width: s, height: s }} accessibilityElementsHidden importantForAccessibility="no">
      {/* Arms behind the body; the right one waves. */}
      {[-1, 1].map(arm)}
      <Svg width={s} height={s} style={StyleSheet.absoluteFill}>
        <Defs>
          <ClipPath id={clipId}>
            <Ellipse cx={s / 2} cy={bodyTop + bodyH / 2} rx={bodyW / 2} ry={bodyH / 2} />
          </ClipPath>
        </Defs>
        {/* Feet: bare fur, or shoes and socks drawn in their place so nothing pokes out. */}
        {[-1, 1].map((side) => {
          const fx = s / 2 + side * s * 0.12 - footW / 2;
          const h = shod ? shoeH : footH;
          const fy = s - h - line / 2;
          return (
            <G key={side}>
              <Rect x={fx} y={fy} width={footW} height={h} rx={footH / 2} fill={shod ? shoes.color : fur} stroke={INK} strokeWidth={line} />
              {shoes.sock ? <Rect x={fx + line / 2} y={fy + line / 2} width={footW - line} height={footH * 0.3} fill={SOCK_STRIPE} /> : null}
              {shod && !shoes.sock ? (
                <Rect x={fx + line} y={fy + h - Math.max(line, footH * 0.28) - line / 2} width={footW - line * 2} height={Math.max(line, footH * 0.28)} fill={shoes.sole} />
              ) : null}
            </G>
          );
        })}
        {/* Body, with a belly or a shirt, and the head's soft shadow at the top. */}
        <Ellipse cx={s / 2} cy={bodyTop + bodyH / 2} rx={bodyW / 2} ry={bodyH / 2} fill={fur} />
        <G clipPath={`url(#${clipId})`}>
          {shirt ? (
            <G>
              <Rect x={bx} y={bodyTop} width={bodyW} height={bodyH * 0.72} fill={shirt} />
              <Ellipse cx={s / 2} cy={bodyTop + bodyH * 0.72} rx={bodyW} ry={line / 2} fill={INK} />
              <Ellipse cx={s / 2} cy={bodyTop} rx={bodyW * 0.15} ry={bodyH * 0.14} fill="rgba(255,255,255,0.55)" />
            </G>
          ) : (
            <Ellipse cx={s / 2} cy={bodyTop + bodyH * 0.58} rx={bodyW * 0.3} ry={bodyH * 0.33} fill={belly} />
          )}
          <Ellipse cx={s / 2} cy={bodyTop} rx={bodyW * 0.42} ry={bodyH * 0.16} fill={shade(shirt ?? fur)} />
        </G>
        <Ellipse cx={s / 2} cy={bodyTop + bodyH / 2} rx={bodyW / 2} ry={bodyH / 2} fill="none" stroke={INK} strokeWidth={line} />
      </Svg>
      {/* Head on top. */}
      {/* An emoji draws about 1.25 times its font size, so this fills the head's box without being cut off. */}
      <View style={[styles.part, styles.head, { top: 0, left: (s - head) / 2, width: head, height: head }]}>
        <Sticker value={value} size={Math.round(head * 0.8)} />
      </View>
      {dressed.neck ? (
        <Text style={[styles.part, styles.center, { fontSize: Math.round(s * 0.17), top: head * 0.86, width: s }]}>
          {dressed.neck}
        </Text>
      ) : null}
      {dressed.face ? (
        <Text style={[styles.part, styles.center, { fontSize: Math.round(s * 0.27), top: head * 0.24, width: s }]}>
          {dressed.face}
        </Text>
      ) : null}
      {dressed.hat ? (
        <Text style={[styles.part, styles.center, { fontSize: Math.round(s * 0.3), top: -s * 0.15, width: s }]}>
          {dressed.hat}
        </Text>
      ) : null}
      {gift ? (
        <Text style={[styles.part, { fontSize: Math.round(s * 0.22), top: -s * 0.08, right: s * 0.02 }]}>{gift}</Text>
      ) : null}
      {mood !== 'smile' ? (
        <PopIn key={mood} damping={9} style={[styles.part, styles.feeling, { top: -s * 0.04, left: s * 0.02, width: s * 0.26, height: s * 0.26, borderRadius: s, borderWidth: line }]}>
          <Text style={{ fontSize: Math.round(s * 0.17), lineHeight: Math.round(s * 0.22) }}>{MOOD_EMOJI[mood]}</Text>
        </PopIn>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  part: { position: 'absolute' },
  feeling: { backgroundColor: '#FFFFFF', borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  backArm: { transformOrigin: 'top', transform: [{ rotate: '20deg' }] },
  center: { left: 0, textAlign: 'center' },
  head: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
});
