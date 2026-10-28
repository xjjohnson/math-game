import { StyleSheet, View } from 'react-native';

const OUTLINE = '#5B3A24';
const LINE = 3;

interface Props {
  width: number;
  height: number;
  lit: boolean;
  /** A bendy desk lamp; a table lamp with a shade when left out. */
  desk?: boolean;
}

/** A lamp drawn with flat shapes; its shade glows and its bulb shines while it is on. */
export function Lamp({ width: w, height: h, lit, desk = false }: Props) {
  return (
    <View style={{ width: w, height: h }} pointerEvents="none">
      {desk ? <DeskLamp w={w} h={h} lit={lit} /> : <TableLamp w={w} h={h} lit={lit} />}
    </View>
  );
}

/** A trapezoid `height` tall, `top` wide at the top and `bottom` wide at the bottom, centered on `x`. */
function Trap({ x, y, top, bottom, height, color }: { x: number; y: number; top: number; bottom: number; height: number; color: string }) {
  const lean = (bottom - top) / 2;
  return (
    <View
      style={[
        styles.part,
        {
          left: x - Math.max(top, bottom) / 2,
          top: y,
          // The width takes in the side borders, which slope the edges.
          width: Math.max(top, bottom),
          height: 0,
          borderBottomWidth: lean >= 0 ? height : 0,
          borderTopWidth: lean < 0 ? height : 0,
          borderLeftWidth: Math.abs(lean),
          borderRightWidth: Math.abs(lean),
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          borderTopColor: color,
        },
      ]}
    />
  );
}

function TableLamp({ w, h, lit }: { w: number; h: number; lit: boolean }) {
  const cx = w / 2;
  const shadeH = h * 0.42;
  const shadeBottom = Math.min(w * 0.95, h * 0.78);
  const shadeTop = shadeBottom * 0.55;
  const baseW = shadeBottom * 0.6;
  const baseH = h * 0.12;
  return (
    <>
      {lit ? <View style={[styles.part, styles.bulb, { left: cx - h * 0.09, top: shadeH - h * 0.06, width: h * 0.18, height: h * 0.18, borderRadius: h }]} /> : null}
      <View style={[styles.part, styles.stem, { left: cx - h * 0.03, top: shadeH - 2, width: h * 0.06, height: h - shadeH - baseH + 4 }]} />
      <View style={[styles.part, styles.base, { left: cx - baseW / 2, top: h - baseH, width: baseW, height: baseH, borderTopLeftRadius: baseW / 2, borderTopRightRadius: baseW / 2 }]} />
      {/* The shade: an outline, then the cloth just inside it. */}
      <Trap x={cx} y={0} top={shadeTop} bottom={shadeBottom} height={shadeH} color={OUTLINE} />
      <Trap
        x={cx}
        y={LINE}
        top={shadeTop - LINE * 2.2}
        bottom={shadeBottom - LINE * 2.6}
        height={shadeH - LINE * 2}
        color={lit ? '#FFE082' : '#F8BBD0'}
      />
    </>
  );
}

function DeskLamp({ w, h, lit }: { w: number; h: number; lit: boolean }) {
  const stemX = w * 0.28;
  const armY = h * 0.18;
  const armEnd = w * 0.72;
  const shadeH = h * 0.26;
  const shadeBottom = w * 0.42;
  const baseW = w * 0.5;
  const baseH = h * 0.1;
  const bar = Math.max(4, h * 0.06);
  return (
    <>
      {lit ? (
        // A soft beam down onto the desk.
        <Trap x={armEnd} y={armY + shadeH} top={shadeBottom * 0.9} bottom={w * 0.95} height={h - armY - shadeH - baseH * 0.2} color="rgba(255, 236, 140, 0.45)" />
      ) : null}
      <View style={[styles.part, styles.base, { left: stemX - baseW / 2, top: h - baseH, width: baseW, height: baseH, borderTopLeftRadius: baseH, borderTopRightRadius: baseH }]} />
      <View style={[styles.part, styles.arm, { left: stemX - bar / 2, top: armY, width: bar, height: h - armY - baseH + 2 }]} />
      <View style={[styles.part, styles.arm, { left: stemX - bar / 2, top: armY, width: armEnd - stemX + bar / 2, height: bar }]} />
      <View style={[styles.part, styles.joint, { left: stemX - bar, top: armY - bar / 2, width: bar * 2, height: bar * 2, borderRadius: bar }]} />
      <Trap x={armEnd} y={armY} top={shadeBottom * 0.4} bottom={shadeBottom} height={shadeH} color={OUTLINE} />
      <Trap x={armEnd} y={armY + LINE} top={shadeBottom * 0.4 - LINE * 2} bottom={shadeBottom - LINE * 2.6} height={shadeH - LINE * 2} color="#4FC3F7" />
      <View
        style={[
          styles.part,
          lit ? styles.bulb : styles.bulbOff,
          { left: armEnd - shadeBottom * 0.22, top: armY + shadeH - h * 0.06, width: shadeBottom * 0.44, height: h * 0.1, borderRadius: h },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  part: { position: 'absolute' },
  stem: { backgroundColor: '#BCAAA4', borderWidth: 2, borderColor: OUTLINE },
  base: { backgroundColor: '#8D6E63', borderWidth: 2, borderColor: OUTLINE, borderRadius: 4 },
  bulb: { backgroundColor: '#FFF59D', borderWidth: 1.5, borderColor: '#FFCA28' },
  bulbOff: { backgroundColor: '#ECEFF1', borderWidth: 1.5, borderColor: OUTLINE },
  arm: { backgroundColor: '#4FC3F7', borderWidth: 2, borderColor: OUTLINE, borderRadius: 3 },
  joint: { backgroundColor: '#0288D1', borderWidth: 2, borderColor: OUTLINE },
});
