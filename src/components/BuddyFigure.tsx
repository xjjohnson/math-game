import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/AppText';
import { useArmWave } from '@/components/Motion';
import { BARE_SHOES, shoeLook } from '@/components/PersonAccessories';
import { Sticker } from '@/components/Sticker';
import { INK } from '@/constants/artStyle';

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
}

const LINE = INK;
const SOCK_STRIPE = '#E57373';

/** A buddy with a body: its face as the head, a round body, arms, feet and its clothes. */
export function BuddyFigure({ value, size, fur, belly, dressed, gift, wave }: Props) {
  const shirt = dressed.shirt;
  const s = size;
  const line = Math.max(2, Math.round(s * 0.015));
  const edge = { borderWidth: line, borderColor: LINE };
  const head = Math.round(s * 0.66);
  const bodyW = s * 0.5;
  const bodyH = s * 0.42;
  const bodyBottom = s * 0.06;
  const footW = s * 0.17;
  const footH = s * 0.08;
  const armW = s * 0.12;
  const armH = s * 0.24;
  const armTop = s - bodyBottom - bodyH + s * 0.06;
  const waving = useArmWave(wave, -20, armH, -1);
  const shoes = shoeLook(dressed.feet);
  const shod = shoes !== BARE_SHOES;
  // Boots come a little higher up the leg; everything else sits where the bare foot was.
  const shoeH = footH * (1 + shoes.tall * 5);
  return (
    <View style={{ width: s, height: s }} accessibilityElementsHidden importantForAccessibility="no">
      {/* Arms behind the body. */}
      <View
        style={[
          styles.part,
          edge,
          { backgroundColor: shirt ?? fur, width: armW, height: armH, top: armTop, left: s / 2 - bodyW / 2 - armW * 0.55, borderRadius: armW, transform: [{ rotate: '20deg' }] },
        ]}
      />
      <Animated.View
        style={[
          styles.part,
          edge,
          { backgroundColor: shirt ?? fur, width: armW, height: armH, top: armTop, left: s / 2 + bodyW / 2 - armW * 0.45, borderRadius: armW },
          waving,
        ]}
      />
      {/* Feet: bare fur, or shoes and socks drawn in their place so nothing pokes out. */}
      {[-1, 1].map((side) => (
        <View
          key={side}
          style={[
            styles.part,
            edge,
            styles.clip,
            {
              backgroundColor: shod ? shoes.color : fur,
              width: footW,
              height: shod ? shoeH : footH,
              bottom: 0,
              left: s / 2 + side * s * 0.12 - footW / 2,
              borderRadius: footH,
              justifyContent: 'flex-end',
            },
          ]}
        >
          {shoes.sock ? <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: footH * 0.3, backgroundColor: SOCK_STRIPE }} /> : null}
          {shod && !shoes.sock ? <View style={{ height: Math.max(line, footH * 0.28), backgroundColor: shoes.sole }} /> : null}
        </View>
      ))}
      {/* Body, with a belly or a shirt. */}
      <View
        style={[
          styles.part,
          edge,
          styles.body,
          { backgroundColor: fur, width: bodyW, height: bodyH, bottom: bodyBottom, left: s / 2 - bodyW / 2, borderRadius: bodyW / 2 },
        ]}
      >
        {shirt ? (
          <View style={[styles.shirt, { backgroundColor: shirt, height: '72%' }]}>
            <View style={[styles.collar, { width: bodyW * 0.3, height: bodyH * 0.14, borderBottomLeftRadius: bodyW, borderBottomRightRadius: bodyW }]} />
          </View>
        ) : (
          <View style={[styles.belly, { backgroundColor: belly, width: bodyW * 0.6, height: bodyH * 0.65, borderRadius: bodyW }]} />
        )}
      </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  part: { position: 'absolute' },
  center: { left: 0, textAlign: 'center' },
  head: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  clip: { overflow: 'hidden' },
  body: { overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
  belly: { marginBottom: '10%' },
  shirt: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  collar: { backgroundColor: 'rgba(255,255,255,0.55)' },
});
