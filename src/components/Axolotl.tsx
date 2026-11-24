import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import { useBlink } from '@/components/Motion';
import { BRIGHT, INK, inkWidth, shade, SHINE, SOFT, tint } from '@/constants/artStyle';
import { useMotion } from '@/hooks/useAccessibility';
import { AXOLOTL_COLORS, type AxolotlColor, type HidePose } from '@/utils/axolotl';

/**
 * Lolo, the hidden axolotl: our own simple drawing in the game's outlined style (a round
 * head, three frilly gills each side, a wide smile and shiny eyes). Fills a `size` square
 * standing on its bottom edge. While `alive` it blinks and its gills wiggle.
 */

export type AxolotlPose = HidePose | 'whole';
export type AxolotlMood = 'smile' | 'happy' | 'sad';

interface Props {
  size: number;
  pose?: AxolotlPose;
  mood?: AxolotlMood;
  color?: AxolotlColor;
  crown?: boolean;
  /** Faces left. */
  flip?: boolean;
  /** Blinks and wiggles its gills. */
  alive?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Where the head sits in the 100 x 100 box, by pose: a peek shows the head over an edge at the bottom. */
const HEAD_Y: Record<AxolotlPose, number> = { whole: 44, peek: 62, water: 62, tail: 62 };

export function Axolotl({ size, pose = 'whole', mood = 'smile', color = AXOLOTL_COLORS[0], crown = false, flip = false, alive = true, style }: Props) {
  const { animate } = useMotion();
  const wiggle = useSharedValue(0);
  const blink = useBlink(alive && pose !== 'tail', false, 'lolo');

  useEffect(() => {
    if (!animate || !alive) {
      cancelAnimation(wiggle);
      wiggle.value = 0;
      return;
    }
    wiggle.value = withRepeat(
      withSequence(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) })),
      -1,
    );
    return () => cancelAnimation(wiggle);
  }, [animate, alive, wiggle]);

  const sw = (inkWidth(size) * 100) / size;
  const o = { stroke: INK, strokeWidth: sw, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const body = color.body;
  const dark = shade(body);
  const gill = color.gills;
  const hy = HEAD_Y[pose];

  const gills = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + wiggle.value * 0.06 }, { rotate: `${(wiggle.value - 0.5) * 4}deg` }] }));
  const tail = useAnimatedStyle(() => ({ transform: [{ rotate: `${(wiggle.value - 0.5) * 14}deg` }] }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));

  const box = { position: 'absolute' as const, left: 0, top: 0, width: size, height: size };
  const turn = flip ? { transform: [{ scaleX: -1 }] } : null;

  if (pose === 'tail') {
    // Just the tail, curling out from behind something, with its soft fin along the top.
    return (
      <View pointerEvents="none" style={[{ width: size, height: size }, turn, style]}>
        <Animated.View style={[box, { transformOrigin: '0% 85%' } as ViewStyle, tail]}>
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Path d="M4 96 C 30 96 48 92 62 80 C 72 71 80 72 86 78 C 80 74 72 76 66 84 C 54 96 30 99 4 99 Z" fill={tint(body, 0.25)} {...o} />
            <Path d="M4 90 C 30 90 46 86 58 74 C 70 62 84 62 92 72 C 96 78 92 84 86 82 C 80 74 70 74 62 84 C 50 96 28 98 4 98 Z" fill={body} {...o} />
            <Path d="M14 95 C 30 95 44 92 54 84" fill="none" stroke={dark} strokeWidth={sw} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </View>
    );
  }

  const clip = pose === 'whole' ? undefined : 'url(#lolo-edge)';
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, turn, style]}>
      {/* Gills, behind the head, wiggling. */}
      <Animated.View style={[box, { transformOrigin: `50% ${hy}%` } as ViewStyle, gills]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {[-1, 1].map((side) => (
            <G key={side}>
              {[-14, -2, 10].map((dy, i) => {
                const x0 = 50 + side * 24;
                const y0 = hy + dy * 0.6;
                const x1 = 50 + side * (40 + (i === 1 ? 4 : 0));
                const y1 = hy + dy * 1.25 - 4;
                return (
                  <G key={dy}>
                    <Path d={`M${x0} ${y0} Q ${(x0 + x1) / 2} ${y1 - 7} ${x1} ${y1}`} fill="none" stroke={INK} strokeWidth={sw + 7} strokeLinecap="round" />
                    <Path d={`M${x0} ${y0} Q ${(x0 + x1) / 2} ${y1 - 7} ${x1} ${y1}`} fill="none" stroke={gill} strokeWidth={7} strokeLinecap="round" />
                    <Circle cx={x1} cy={y1} r={2} fill={tint(gill, 0.4)} />
                  </G>
                );
              })}
            </G>
          ))}
        </Svg>
      </Animated.View>

      <View style={box}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <ClipPath id="lolo-edge">
              <Rect x={0} y={0} width={100} height={pose === 'water' ? 90 : 96} />
            </ClipPath>
          </Defs>
          <G clipPath={clip}>
            {pose === 'whole' ? (
              <G>
                {/* Tail curling behind, body, little legs. */}
                <Path d="M62 78 C 80 80 90 70 94 58 C 96 70 92 86 74 92 Z" fill={body} {...o} />
                <Ellipse cx={50} cy={78} rx={20} ry={15} fill={body} {...o} />
                <Ellipse cx={50} cy={82} rx={11} ry={8} fill={tint(body, 0.35)} />
                <Ellipse cx={34} cy={92} rx={7} ry={4.5} fill={body} {...o} />
                <Ellipse cx={66} cy={92} rx={7} ry={4.5} fill={body} {...o} />
              </G>
            ) : null}
            {/* The head. */}
            <Ellipse cx={50} cy={hy} rx={27} ry={21} fill={body} {...o} />
            <Path d={`M27 ${hy + 6} Q 50 ${hy + 24} 73 ${hy + 6}`} fill="none" stroke={dark} strokeWidth={sw * 0.9} strokeLinecap="round" />
            <Ellipse cx={42} cy={hy - 9} rx={9} ry={4} fill={tint(body, 0.4)} />
            {/* Cheeks. */}
            <Ellipse cx={30} cy={hy + 6} rx={5} ry={3} fill={BRIGHT.pink} opacity={0.35} />
            <Ellipse cx={70} cy={hy + 6} rx={5} ry={3} fill={BRIGHT.pink} opacity={0.35} />
            {/* Mouth. */}
            {mood === 'happy' ? (
              <Path d={`M38 ${hy + 5} Q 50 ${hy + 18} 62 ${hy + 5} Z`} fill={shade(BRIGHT.red, 0.3)} {...o} />
            ) : mood === 'sad' ? (
              <Path d={`M40 ${hy + 12} Q 50 ${hy + 5} 60 ${hy + 12}`} fill="none" {...o} />
            ) : (
              <Path d={`M34 ${hy + 5} Q 50 ${hy + 15} 66 ${hy + 5}`} fill="none" {...o} />
            )}
            {pose === 'peek' ? (
              <G>
                {/* Little hands holding the edge. */}
                <Ellipse cx={32} cy={hy + 22} rx={7} ry={5} fill={body} {...o} />
                <Ellipse cx={68} cy={hy + 22} rx={7} ry={5} fill={body} {...o} />
              </G>
            ) : null}
            {pose === 'water' ? (
              <G>
                <Ellipse cx={50} cy={hy + 20} rx={42} ry={7} fill={SOFT.sky} opacity={0.85} {...o} />
                <Path d={`M16 ${hy + 19} Q 24 ${hy + 15} 32 ${hy + 19}`} fill="none" stroke={SHINE} strokeWidth={sw} strokeLinecap="round" />
                <Path d={`M66 ${hy + 21} Q 74 ${hy + 17} 82 ${hy + 21}`} fill="none" stroke={SHINE} strokeWidth={sw} strokeLinecap="round" />
              </G>
            ) : null}
          </G>
          {crown ? (
            <Path
              d={`M40 ${hy - 18} L 42 ${hy - 30} L 46 ${hy - 23} L 50 ${hy - 33} L 54 ${hy - 23} L 58 ${hy - 30} L 60 ${hy - 18} Z`}
              fill={BRIGHT.yellow}
              {...o}
            />
          ) : null}
        </Svg>
      </View>

      {/* Eyes, wide apart like an axolotl's, blinking. */}
      <Animated.View style={[box, { transformOrigin: `50% ${hy - 2}%` } as ViewStyle, eyes]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {mood === 'happy' ? (
            <G>
              <Path d={`M30 ${hy} Q 35 ${hy - 6} 40 ${hy}`} fill="none" {...o} />
              <Path d={`M60 ${hy} Q 65 ${hy - 6} 70 ${hy}`} fill="none" {...o} />
            </G>
          ) : (
            <G>
              <Circle cx={35} cy={hy - 2} r={4.2} fill={INK} />
              <Circle cx={36.5} cy={hy - 3.5} r={1.5} fill={SHINE} />
              <Circle cx={65} cy={hy - 2} r={4.2} fill={INK} />
              <Circle cx={66.5} cy={hy - 3.5} r={1.5} fill={SHINE} />
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}
