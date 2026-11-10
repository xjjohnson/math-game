import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { PopIn } from '@/components/PopIn';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import type { Grade } from '@/types';
import { eggHint, eggsIn } from '@/utils/town';
import { INK } from '@/constants/artStyle';

interface Props {
  /** How many eggs the basket should end up holding. */
  answer: number;
  grade: Grade;
  /** The egg sizes on offer: 1, 10, 100, 1000. */
  units: number[];
  /** Called once: with true if the first try was right, false after the answer was shown. */
  onDone: (rightFirstTry: boolean) => void;
}

const NAMES: Record<number, string> = { 1: '1 egg', 10: 'Box of 10', 100: 'Crate of 100', 1000: 'Truck of 1000' };
const SAY: Record<number, string> = { 1: 'one egg', 10: 'a box of 10 eggs', 100: 'a crate of 100 eggs', 1000: 'a truck of 1000 eggs' };

/** A box of ten eggs: two rows of five, like a ten frame. */
function EggBox({ small = false }: { small?: boolean }) {
  const dot = small ? 9 : 13;
  return (
    <View style={[styles.box, small && styles.boxSmall]}>
      {[0, 1].map((r) => (
        <View key={r} style={styles.boxRow}>
          {Array.from({ length: 5 }, (_, i) => (
            <View key={i} style={[styles.dot, { width: dot, height: dot * 1.25, borderRadius: dot }]} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** One egg, a box, a crate or a truck: what you tap to collect, and what sits in the basket. */
function Eggs({ value, small = false }: { value: number; small?: boolean }) {
  if (value === 1) return <Text style={{ fontSize: small ? 30 : 46, lineHeight: small ? 36 : 54 }}>🥚</Text>;
  if (value === 10) return <EggBox small={small} />;
  return (
    <View style={[styles.crate, small && styles.crateSmall, value === 1000 && styles.truck]}>
      <Text style={{ fontSize: small ? 18 : 26 }}>{value === 100 ? '📦' : '🚚'}</Text>
      <Text style={[styles.crateText, small && { fontSize: 14 }]}>{value}</Text>
    </View>
  );
}

/**
 * Collect eggs on the farm. Tap the hen house to put eggs in the basket (one at a
 * time, or a whole box of ten for bigger numbers) until it holds the answer, then
 * say you're done. Ones line up in fives so they are easy to count. A wrong count
 * gets a hint and a second try before the answer is shown.
 */
export function EggCollecting({ answer, grade, units, onDone }: Props) {
  const [basket, setBasket] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [finished, setFinished] = useState<'right' | 'shown' | null>(null);
  // Each thing put in the basket gets its own key, so only the new one pops in.
  const nextKey = useRef(0);
  const [keys, setKeys] = useState<number[]>([]);
  const total = eggsIn(basket);

  const finish = (how: 'right' | 'shown') => {
    setFinished(how);
    onDone(how === 'right' && tries === 0);
  };
  const check = () => {
    if (total === answer) finish('right');
    else if (tries >= 1) {
      setTries(tries + 1);
      finish('shown');
    } else {
      setTries(tries + 1);
      setHint(eggHint(answer, total, grade));
    }
  };
  const add = (v: number) => {
    setBasket((b) => [...b, v]);
    setKeys((k) => [...k, nextKey.current++]);
    setHint(null);
  };
  const remove = (i: number) => {
    setBasket((b) => b.filter((_, n) => n !== i));
    setKeys((k) => k.filter((_, n) => n !== i));
    setHint(null);
  };

  // Bigger things first, then the single eggs in rows of five.
  const order = basket.map((v, i) => ({ v, i, key: keys[i] })).sort((a, b) => b.v - a.v);
  const big = order.filter((e) => e.v > 1);
  const ones = order.filter((e) => e.v === 1);
  const fives = Array.from({ length: Math.ceil(ones.length / 5) }, (_, r) => ones.slice(r * 5, r * 5 + 5));
  const item = (e: { v: number; i: number; key: number }) => (
    <Pressable
      key={e.key}
      disabled={finished !== null}
      onPress={() => remove(e.i)}
      accessibilityRole="button"
      accessibilityLabel={`Put back ${SAY[e.v]}`}
    >
      <PopIn damping={10}>
        <Eggs value={e.v} small />
      </PopIn>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.basket}>
        <Text style={styles.small} accessibilityLiveRegion="polite">
          🧺 In your basket: {total} {total === 1 ? 'egg' : 'eggs'}
        </Text>
        <View style={styles.pile}>
          {basket.length ? (
            <>
              {big.map(item)}
              {fives.map((row, r) => (
                <View key={r} style={styles.five}>
                  {row.map(item)}
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.empty}>Tap the hen house below to collect eggs</Text>
          )}
        </View>
        {total > answer && finished === null && !hint ? <Text style={styles.nudge}>That's a lot of eggs! Tap one in the basket to put it back.</Text> : null}
      </View>

      {finished === null ? (
        <>
          <View style={styles.coop}>
            <Text style={styles.coopTitle}>🐔 Hen house 🐔</Text>
            <View style={styles.nests}>
              {units.map((u) => (
                <Pressable
                  key={u}
                  onPress={() => add(u)}
                  accessibilityRole="button"
                  accessibilityLabel={`Collect ${SAY[u]}`}
                  style={({ pressed }) => [styles.nest, pressed && { transform: [{ scale: 0.92 }] }]}
                >
                  <Eggs value={u} />
                  <Text style={styles.nestText}>{NAMES[u]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {hint ? (
            <Text style={styles.hint} accessibilityLiveRegion="polite">
              {hint}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            <BigButton
              label="Start over"
              outline
              color={colors.textMuted}
              onPress={() => {
                setBasket([]);
                setKeys([]);
                setHint(null);
              }}
              style={{ flex: 1, paddingHorizontal: 8 }}
            />
            <BigButton label="Basket's ready!" color={colors.correct} disabled={!basket.length} onPress={check} style={{ flex: 2, paddingHorizontal: 8 }} />
          </View>
        </>
      ) : (
        <Text style={[styles.result, finished === 'right' ? styles.right : styles.wrong]} accessibilityLiveRegion="polite">
          {finished === 'right'
            ? tries === 0
              ? `✓ Yes! ${answer} eggs. The hens are proud of you!`
              : `✓ You got it! ${answer} eggs.`
            : `The basket needed ${answer} eggs. You will get the next one!`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  basket: { gap: 4, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: '#FFF3D6', borderWidth: 3, borderStyle: 'dashed', borderColor: '#C68B5E' },
  small: { fontSize: 18, fontWeight: '800', color: colors.text },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 60, alignItems: 'center' },
  five: { flexDirection: 'row', gap: 0, paddingHorizontal: 4, borderRadius: 10, backgroundColor: 'rgba(198,139,94,0.18)' },
  empty: { fontSize: 16, color: colors.textMuted },
  nudge: { fontSize: 15, fontWeight: '700', color: colors.wrong },
  coop: { padding: spacing.sm, gap: 6, borderRadius: radius.lg, backgroundColor: '#C62828', borderWidth: 3, borderColor: INK },
  coopTitle: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center' },
  nests: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  nest: {
    minWidth: 100,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#F6D58E',
    borderWidth: 3,
    borderColor: '#A86B45',
  },
  nestText: { fontSize: 14, fontWeight: '900', color: '#3B2B25' },
  box: { padding: 4, gap: 3, borderRadius: 6, backgroundColor: '#A1887F', borderWidth: 2, borderColor: INK },
  boxSmall: { padding: 3, gap: 2 },
  boxRow: { flexDirection: 'row', gap: 3 },
  dot: { backgroundColor: '#FFFDF5', borderWidth: 1, borderColor: '#BCAAA4' },
  crate: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#D7A77A', borderWidth: 3, borderColor: INK },
  crateSmall: { paddingHorizontal: 5, borderWidth: 2 },
  truck: { backgroundColor: '#90CAF9' },
  crateText: { fontSize: 18, fontWeight: '900', color: '#3B2B25' },
  hint: { fontSize: 18, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  result: { fontSize: fontSizes.button, fontWeight: '900', textAlign: 'center' },
  right: { color: colors.correct },
  wrong: { color: colors.text },
});
