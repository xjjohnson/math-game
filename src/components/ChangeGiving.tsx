import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { colors, fontSizes, radius, spacing } from '@/constants/theme';
import { handedBack } from '@/utils/town';
import { useState } from 'react';

interface Props {
  price: number;
  paid: number;
  answer: number;
  /** Coins and bills on offer. */
  coins: number[];
  /** The amount handed back once the player gives it, or null while they are still counting it out. */
  given: number | null;
  onGive: (total: number) => void;
}

const BILL_FROM = 10;

/** Count out change: tap coins and bills from the till into your hand, then give it to the customer. */
export function ChangeGiving({ price, paid, answer, coins, given, onGive }: Props) {
  const [hand, setHand] = useState<number[]>([]);
  const total = handedBack(hand);
  const done = given !== null;

  const piece = (value: number, key: string, onPress: () => void, small = false) => {
    const bill = value >= BILL_FROM;
    return (
      <Pressable
        key={key}
        onPress={onPress}
        disabled={done}
        accessibilityRole="button"
        accessibilityLabel={`${value}`}
        style={({ pressed }) => [
          bill ? styles.bill : styles.coin,
          small && styles.small,
          pressed && { transform: [{ scale: 0.93 }] },
        ]}
      >
        <Text style={[styles.value, bill && styles.billValue]}>{value}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.box}>
      <View style={styles.tags}>
        <Text style={styles.tag}>Price {price}</Text>
        <Text style={styles.tag}>Paid {paid}</Text>
      </View>
      <Text style={styles.label}>The till (tap to take)</Text>
      <View style={styles.row}>{coins.map((c) => piece(c, `till-${c}`, () => setHand((h) => [...h, c])))}</View>
      <Text style={styles.label}>Your hand: {total} (tap one to put it back)</Text>
      <View style={[styles.row, styles.hand]}>
        {hand.length ? (
          hand.map((c, i) => piece(c, `hand-${i}`, () => setHand((h) => h.filter((_, n) => n !== i)), true))
        ) : (
          <Text style={styles.empty}>Nothing yet</Text>
        )}
      </View>
      {done ? (
        <Text style={[styles.result, given === answer ? styles.right : styles.wrong]} accessibilityLiveRegion="polite">
          {given === answer ? `✓ ${answer} is the right change!` : `✗ The change was ${answer}. You gave ${given}.`}
        </Text>
      ) : (
        <View style={styles.row}>
          <BigButton label="Clear" outline color={colors.wrong} onPress={() => setHand([])} style={{ flex: 1 }} />
          <BigButton label="Give change" color={colors.correct} disabled={!hand.length} onPress={() => onGive(total)} style={{ flex: 2 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  tags: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  tag: { fontSize: fontSizes.button, fontWeight: '900', color: colors.text, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.lg, overflow: 'hidden' },
  label: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  hand: { minHeight: 64, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.border },
  empty: { fontSize: 16, color: colors.textMuted },
  coin: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFCA28', borderWidth: 4, borderColor: '#F9A825', alignItems: 'center', justifyContent: 'center' },
  bill: { width: 92, height: 56, borderRadius: 8, backgroundColor: '#A5D6A7', borderWidth: 4, borderColor: '#2E7D32', alignItems: 'center', justifyContent: 'center' },
  small: { transform: [{ scale: 0.8 }] },
  value: { fontSize: 24, fontWeight: '900', color: '#5D4037' },
  billValue: { color: '#1B5E20' },
  result: { fontSize: fontSizes.button, fontWeight: '900', textAlign: 'center' },
  right: { color: colors.correct },
  wrong: { color: colors.wrong },
});
