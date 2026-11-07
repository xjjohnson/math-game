import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import type { Grade } from '@/types';
import { changeHint, handedBack } from '@/utils/town';

interface Props {
  /** The thing being bought, as an emoji. */
  item: string;
  price: number;
  paid: number;
  grade: Grade;
  /** Coins and bills on offer. */
  coins: number[];
  /** Called once: with true if the first try was right, false after the answer was shown. */
  onDone: (rightFirstTry: boolean) => void;
}

const BILL_FROM = 10;
const COIN_SIZE: Record<number, number> = { 1: 46, 2: 54, 5: 62 };
const BILL_WIDTH: Record<number, number> = { 10: 84, 20: 92, 50: 100, 100: 108 };

/** One coin or bill, drawn bigger for bigger values. */
function Money({ value, small = false }: { value: number; small?: boolean }) {
  const bill = value >= BILL_FROM;
  const k = small ? 0.8 : 1;
  const size = (COIN_SIZE[value] ?? 54) * k;
  return (
    <View
      style={[
        bill ? styles.bill : styles.coin,
        bill ? { width: (BILL_WIDTH[value] ?? 90) * k, height: 52 * k } : { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.value, bill && styles.billValue, { fontSize: 22 * k }]}>{value}</Text>
    </View>
  );
}

/**
 * Give change at the counter. The customer pays; you tap coins and bills from the
 * drawer onto the counter until the pile is the right amount, then say you're done.
 * A wrong answer gets a hint and a second try before the answer is shown.
 */
export function ChangeGiving({ item, price, paid, grade, coins, onDone }: Props) {
  const answer = paid - price;
  const [pile, setPile] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [finished, setFinished] = useState<'right' | 'shown' | null>(null);
  const total = handedBack(pile);
  const tooMuch = total > answer;

  const finish = (how: 'right' | 'shown') => {
    setFinished(how);
    onDone(how === 'right' && tries === 0);
  };

  const check = () => {
    if (total === answer) {
      finish('right');
    } else if (tries >= 1) {
      setTries(tries + 1);
      finish('shown');
    } else {
      setTries(tries + 1);
      setHint(changeHint(price, paid, total, grade));
    }
  };

  return (
    <View style={styles.box}>
      <View style={styles.customer} accessibilityLabel={`The customer buys ${item} for ${price} and pays ${paid}`}>
        <View style={styles.who}>
          <Text style={styles.face}>🧒</Text>
          <Text style={styles.small}>Customer</Text>
        </View>
        <View style={styles.bubble}>
          <Text style={styles.say}>
            I'll take this {item}!{'\n'}It costs <Text style={styles.strong}>{price}</Text>.
          </Text>
          <View style={styles.payRow}>
            <Text style={styles.say}>Here is </Text>
            <Money value={paid} />
          </View>
        </View>
      </View>

      <Text style={styles.owed} accessibilityLiveRegion="polite">
        Give back: {finished ? answer : '?'}
      </Text>

      <View style={styles.counter}>
        <Text style={styles.small}>On the counter: {total}</Text>
        <View style={styles.pile}>
          {pile.length ? (
            pile.map((c, i) => (
              <Pressable
                key={i}
                disabled={finished !== null}
                onPress={() => {
                  setPile((p) => p.filter((_, n) => n !== i));
                  setHint(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Take back ${c}`}
              >
                <Money value={c} small />
              </Pressable>
            ))
          ) : (
            <Text style={styles.empty}>Tap coins below to put them here</Text>
          )}
        </View>
        {tooMuch && finished === null ? <Text style={styles.nudge}>That is a lot! Tap a coin here to take it back.</Text> : null}
      </View>

      {finished === null ? (
        <>
          <View style={styles.drawer}>
            {coins.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  setPile((p) => [...p, c]);
                  setHint(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Add ${c}`}
                style={({ pressed }) => pressed && { transform: [{ scale: 0.92 }] }}
              >
                <Money value={c} />
              </Pressable>
            ))}
          </View>
          {hint ? <Text style={styles.hint} accessibilityLiveRegion="polite">{hint}</Text> : null}
          <View style={styles.buttons}>
            <BigButton label="Start over" outline color={colors.textMuted} onPress={() => { setPile([]); setHint(null); }} style={{ flex: 1, paddingHorizontal: 8 }} />
            <BigButton label="That's the change" color={colors.correct} disabled={!pile.length} onPress={check} style={{ flex: 2, paddingHorizontal: 8 }} />
          </View>
        </>
      ) : (
        <Text style={[styles.result, finished === 'right' ? styles.right : styles.wrong]} accessibilityLiveRegion="polite">
          {finished === 'right'
            ? tries === 0
              ? `✓ Yes! ${answer} is the change.`
              : `✓ You got it! ${answer} is the change.`
            : `The change is ${answer}. ${paid} − ${price} = ${answer}. You will get the next one!`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  customer: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  who: { alignItems: 'center' },
  face: { fontSize: 54 },
  small: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  bubble: { flex: 1, gap: 6, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.border },
  say: { fontSize: 18, fontWeight: '700', color: colors.text },
  strong: { fontWeight: '900', color: colors.primary },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  owed: { fontSize: fontSizes.button + 4, fontWeight: '900', color: colors.text, textAlign: 'center' },
  counter: { gap: 4, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: '#FFF3D6', borderWidth: 3, borderStyle: 'dashed', borderColor: '#C68B5E' },
  pile: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 56, alignItems: 'center' },
  empty: { fontSize: 16, color: colors.textMuted },
  nudge: { fontSize: 15, fontWeight: '700', color: colors.wrong },
  drawer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', padding: spacing.sm, borderRadius: radius.lg, backgroundColor: '#E8E2D5' },
  hint: { fontSize: 18, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  coin: { backgroundColor: '#FFCA28', borderWidth: 4, borderColor: '#F9A825', alignItems: 'center', justifyContent: 'center' },
  bill: { borderRadius: 8, backgroundColor: '#A5D6A7', borderWidth: 4, borderColor: '#2E7D32', alignItems: 'center', justifyContent: 'center' },
  value: { fontWeight: '900', color: '#5D4037' },
  billValue: { color: '#1B5E20' },
  result: { fontSize: fontSizes.button, fontWeight: '900', textAlign: 'center' },
  right: { color: colors.correct },
  wrong: { color: colors.text },
});
