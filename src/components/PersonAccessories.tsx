import { StyleSheet, View, type ViewStyle } from 'react-native';

/** Shared measurements a person's accessories are drawn from. */
export interface Fit {
  /** The person's height in pixels. */
  u: number;
  /** Middle of the person, left to right. */
  cx: number;
  headD: number;
  headTop: number;
  /** Height of the eyes. */
  eyeY: number;
  line: number;
  edge: ViewStyle;
}

const box = (left: number, top: number, width: number, height: number, extra?: ViewStyle): ViewStyle => ({
  position: 'absolute',
  left,
  top,
  width,
  height,
  ...extra,
});

/** Hats, drawn to sit on the head. `id` is the wearable's id. */
export function Hat({ id, f }: { id: string; f: Fit }) {
  const { u, cx, headD, headTop, edge } = f;
  const brimY = headTop + headD * 0.2;
  switch (id) {
    case 'cap':
      return (
        <>
          <View
            style={[
              box(cx - headD * 0.5, headTop - u * 0.03, headD, headD * 0.3, {
                backgroundColor: '#1E88E5',
                borderTopLeftRadius: headD / 2,
                borderTopRightRadius: headD / 2,
              }),
              edge,
            ]}
          />
          <View
            style={[
              box(cx - headD * 0.42, brimY - u * 0.005, headD * 0.84, u * 0.04, {
                backgroundColor: '#1565C0',
                borderRadius: u * 0.03,
              }),
              edge,
            ]}
          />
        </>
      );
    case 'sunhat':
      return (
        <>
          <View
            style={[
              box(cx - headD * 0.46, headTop - u * 0.05, headD * 0.92, headD * 0.34, {
                backgroundColor: '#F6D77A',
                borderTopLeftRadius: headD / 2,
                borderTopRightRadius: headD / 2,
              }),
              edge,
            ]}
          />
          <View style={box(cx - headD * 0.46, brimY - u * 0.05, headD * 0.92, u * 0.025, { backgroundColor: '#E5533D' })} />
          <View
            style={[
              box(cx - headD * 0.78, brimY - u * 0.025, headD * 1.56, u * 0.05, {
                backgroundColor: '#F6D77A',
                borderRadius: u * 0.03,
              }),
              edge,
            ]}
          />
        </>
      );
    case 'tophat':
      return (
        <>
          <View
            style={[
              box(cx - headD * 0.28, headTop - u * 0.15, headD * 0.56, headD * 0.5, {
                backgroundColor: '#2B2B30',
                borderRadius: u * 0.02,
              }),
              edge,
            ]}
          />
          <View style={box(cx - headD * 0.28, headTop + headD * 0.12, headD * 0.56, u * 0.025, { backgroundColor: '#C62828' })} />
          <View
            style={[
              box(cx - headD * 0.5, headTop + headD * 0.3, headD, u * 0.045, {
                backgroundColor: '#2B2B30',
                borderRadius: u * 0.03,
              }),
              edge,
            ]}
          />
        </>
      );
    case 'gradcap':
      return (
        <>
          <View
            style={[
              box(cx - headD * 0.4, headTop + headD * 0.04, headD * 0.8, headD * 0.22, {
                backgroundColor: '#2B2B30',
                borderBottomLeftRadius: headD * 0.3,
                borderBottomRightRadius: headD * 0.3,
              }),
              edge,
            ]}
          />
          <View
            style={[
              box(cx - headD * 0.62, headTop - u * 0.05, headD * 1.24, u * 0.055, {
                backgroundColor: '#3A3A42',
                borderRadius: u * 0.01,
                transform: [{ rotate: '-6deg' }],
              }),
              edge,
            ]}
          />
          <View style={box(cx + headD * 0.5, headTop - u * 0.03, u * 0.012, headD * 0.4, { backgroundColor: '#F5C542' })} />
          <View style={box(cx + headD * 0.5 - u * 0.012, headTop + headD * 0.36, u * 0.036, u * 0.04, { backgroundColor: '#F5C542', borderRadius: u })} />
        </>
      );
    case 'crown':
      return (
        <View style={box(cx - headD * 0.38, headTop - u * 0.09, headD * 0.76, headD * 0.34)}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: '70%' }}>
            {[0.7, 1, 0.7].map((k, i) => (
              <View
                key={i}
                style={[
                  { width: '30%', height: `${k * 100}%`, backgroundColor: '#FFC107', borderTopLeftRadius: u * 0.04, borderTopRightRadius: u * 0.04 },
                  edge,
                ]}
              />
            ))}
          </View>
          <View style={[{ height: '40%', backgroundColor: '#FFC107', borderRadius: u * 0.015, marginTop: -1 }, edge]} />
        </View>
      );
    default:
      return null;
  }
}

/** Glasses over the eyes. */
export function Glasses({ id, f }: { id: string; f: Fit }) {
  const { u, cx, headD, eyeY, line } = f;
  const lens = u * 0.105;
  const gap = headD * 0.17;
  const sun = id === 'sunglasses';
  const goggles = id === 'goggles';
  const d = goggles ? lens * 1.15 : lens;
  const fill = sun ? 'rgba(25,25,30,0.92)' : goggles ? 'rgba(120,200,235,0.8)' : 'rgba(190,225,245,0.35)';
  const frame = sun ? '#1A1A1F' : goggles ? '#EF6C00' : '#2B2B30';
  return (
    <>
      {goggles ? (
        <View style={box(cx - headD * 0.5, eyeY - u * 0.012, headD, u * 0.026, { backgroundColor: '#EF6C00' })} />
      ) : null}
      <View style={box(cx - gap, eyeY - u * 0.004, gap * 2, line * 1.5, { backgroundColor: frame })} />
      {[-1, 1].map((side) => (
        <View
          key={side}
          style={box(cx + side * gap - d / 2, eyeY - d / 2, d, d, {
            backgroundColor: fill,
            borderWidth: Math.max(line * 1.6, 2),
            borderColor: frame,
            borderRadius: goggles ? d * 0.4 : d,
          })}
        />
      ))}
    </>
  );
}

/** Things worn around the neck, drawn on the chest just under the chin. */
export function Neckwear({ id, f }: { id: string; f: Fit }) {
  const { u, cx, headD, headTop, edge } = f;
  const y = headTop + headD - u * 0.015;
  switch (id) {
    case 'bow':
      return (
        <>
          {[-1, 1].map((side) => (
            <View
              key={side}
              style={[
                box(cx + (side < 0 ? -u * 0.115 : u * 0.0), y - u * 0.005, u * 0.115, u * 0.075, {
                  backgroundColor: '#F06292',
                  borderRadius: u * 0.035,
                  transform: [{ rotate: `${side * -14}deg` }],
                }),
                edge,
              ]}
            />
          ))}
          <View style={[box(cx - u * 0.025, y + u * 0.012, u * 0.05, u * 0.05, { backgroundColor: '#D81B60', borderRadius: u }), edge]} />
        </>
      );
    case 'scarf':
      return (
        <>
          <View
            style={[
              box(cx - u * 0.17, y - u * 0.005, u * 0.34, u * 0.065, { backgroundColor: '#E53935', borderRadius: u * 0.03 }),
              edge,
            ]}
          />
          <View style={box(cx - u * 0.17, y + u * 0.018, u * 0.34, u * 0.012, { backgroundColor: '#FFFFFF' })} />
          <View
            style={[
              box(cx + u * 0.05, y + u * 0.04, u * 0.075, u * 0.14, { backgroundColor: '#E53935', borderRadius: u * 0.015 }),
              edge,
            ]}
          />
        </>
      );
    case 'beads':
      return (
        <View style={[box(cx - u * 0.13, y - u * 0.04, u * 0.26, u * 0.15), styles.chain, { borderColor: '#EC407A', borderWidth: Math.max(u * 0.014, 2) }]} />
      );
    case 'medal':
      return (
        <>
          <View
            style={[
              box(cx - u * 0.02, y - u * 0.01, u * 0.04, u * 0.1, { backgroundColor: '#1E88E5' }),
              edge,
            ]}
          />
          <View
            style={[
              box(cx - u * 0.04, y + u * 0.075, u * 0.08, u * 0.08, { backgroundColor: '#FFC107', borderRadius: u }),
              edge,
            ]}
          />
        </>
      );
    default:
      return null;
  }
}

/** How a pair of shoes looks: the main color, the sole, and how far up the leg it comes. */
export interface ShoeLook {
  color: string;
  sole: string;
  /** Share of the leg's height, on top of the usual shoe. */
  tall: number;
  /** Socks drawn over the lower leg. */
  sock?: string;
}

export const BARE_SHOES: ShoeLook = { color: '#4E342E', sole: '#4E342E', tall: 0 };

export function shoeLook(id?: string): ShoeLook {
  switch (id) {
    case 'sneakers':
      return { color: '#FAFAFA', sole: '#1E88E5', tall: 0 };
    case 'boots':
      return { color: '#8D5A32', sole: '#4E2E17', tall: 0.1 };
    case 'ballet':
      return { color: '#F8BBD0', sole: '#F48FB1', tall: 0 };
    case 'socks':
      return { color: '#4E342E', sole: '#4E342E', tall: 0, sock: '#FFFFFF' };
    default:
      return BARE_SHOES;
  }
}

const styles = StyleSheet.create({
  chain: {
    borderTopWidth: 0,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
});
