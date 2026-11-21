import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Clock, COIN } from '@/components/QuestionPicture';
import { colors, radius, spacing } from '@/constants/theme';
import type { Money } from '@/types';

/**
 * Answers you make with your hands: drag the clock hands to a time, or put
 * coins in a purse. Both hand back a number (minutes after 12:00, or cents)
 * when the child taps Check, so they plug into a round like any answer.
 */

const CLOCK_SIZE = 250;

const toHM = (total: number) => ({ hour: Math.floor(total / 60) % 12 || 12, minute: total % 60 });

/**
 * A clock to set. Drag the long hand and the short hand moves along with it,
 * like a real clock; drag near the middle to move the short hand an hour at a
 * time. The buttons underneath do the same for anyone who can't drag.
 */
export function ClockSetter({ step, from = 0, onCheck }: { step: number; from?: number; onCheck: (minutes: number) => void }) {
  const [total, setTotal] = useState(from % 720);
  const totalRef = useRef(total);
  totalRef.current = total;
  const grab = useRef<'minute' | 'hour'>('minute');
  const set = (t: number) => setTotal(((t % 720) + 720) % 720);

  const pan = useMemo(() => {
    const angleAt = (x: number, y: number) => {
      const dx = x - CLOCK_SIZE / 2;
      const dy = y - CLOCK_SIZE / 2;
      return { deg: ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360, dist: Math.hypot(dx, dy) };
    };
    const move = (x: number, y: number) => {
      const { deg } = angleAt(x, y);
      const now = totalRef.current;
      if (grab.current === 'hour') {
        const hour = Math.round(deg / 30) % 12;
        set(hour * 60 + (now % 60));
        return;
      }
      const minute = (Math.round(deg / 6 / step) * step) % 60;
      let delta = minute - (now % 60);
      // Going past the 12 moves the hour on (or back), like a real clock.
      if (delta < -30) delta += 60;
      if (delta > 30) delta -= 60;
      set(now + delta);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        grab.current = angleAt(locationX, locationY).dist < CLOCK_SIZE * 0.22 ? 'hour' : 'minute';
        move(locationX, locationY);
      },
      onPanResponderMove: (e) => move(e.nativeEvent.locationX, e.nativeEvent.locationY),
    });
  }, [step]);

  const { hour, minute } = toHM(total);
  return (
    <View style={styles.wrap}>
      <View style={{ width: CLOCK_SIZE, height: CLOCK_SIZE }} accessible accessibilityLabel="Clock to set. Use the buttons below to move the hands.">
        <Clock hour={hour} minute={minute} width={CLOCK_SIZE} size={CLOCK_SIZE} />
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
      </View>
      <Text style={styles.tip}>Drag the long red hand. Drag near the middle for the short blue hand.</Text>
      <View style={styles.row}>
        <Nudge label="◀ hour" onPress={() => set(total - 60)} />
        <Nudge label={`◀ ${step} min`} onPress={() => set(total - step)} />
        <Nudge label={`${step} min ▶`} onPress={() => set(total + step)} />
        <Nudge label="hour ▶" onPress={() => set(total + 60)} />
      </View>
      <BigButton label="✓ Check" color={colors.correct} onPress={() => onCheck(total)} />
    </View>
  );
}

function Nudge({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label.replace(/[◀▶]/g, '').trim()} style={styles.nudge} hitSlop={4}>
      <Text style={styles.nudgeText}>{label}</Text>
    </Pressable>
  );
}

/** The value of a coin or bill as a short label. */
const moneyLabel = (m: Money) => (m >= 100 ? `$${m / 100}` : `${m}¢`);

function Coin({ value, scale = 1.4 }: { value: Money; scale?: number }) {
  const c = COIN[value];
  if (!c) {
    return (
      <View style={styles.bill}>
        <Text style={styles.billText}>{moneyLabel(value)}</Text>
      </View>
    );
  }
  const d = c.r * 2 * scale;
  return (
    <View style={[styles.coin, { width: d, height: d, borderRadius: d / 2, backgroundColor: c.fill }]}>
      <Text style={[styles.coinText, { fontSize: Math.max(13, d * 0.3) }]}>{c.text}</Text>
    </View>
  );
}

/**
 * A purse to fill. Tap a coin in the tray to drop it in; tap one in the purse to
 * take it back out. The total stays hidden (counting it is the job) unless the
 * question counts up from a price, where the running count is the method.
 */
export function CoinPurse({ coins, from, onCheck }: { coins: Money[]; from?: number; onCheck: (cents: number) => void }) {
  const [inPurse, setInPurse] = useState<Money[]>([]);
  const sum = inPurse.reduce((s, c) => s + c, 0);
  const sorted = [...inPurse].map((c, i) => ({ c, i })).sort((x, y) => y.c - x.c);
  return (
    <View style={styles.wrap}>
      <View style={styles.purse} accessibilityLabel={`Purse with ${inPurse.length} coins`}>
        <Text style={styles.purseTitle}>👛 Purse</Text>
        {from !== undefined ? (
          <Text style={styles.countUp} accessibilityLiveRegion="polite">
            {[from, ...sorted.map((_, k) => from + sorted.slice(0, k + 1).reduce((s, x) => s + x.c, 0))].map((v) => `${v}¢`).join(' → ')}
          </Text>
        ) : null}
        <View style={styles.coins}>
          {sorted.length === 0 ? <Text style={styles.empty}>Tap coins below to put them in.</Text> : null}
          {sorted.map(({ c, i }) => (
            <Pressable
              key={i}
              onPress={() => setInPurse(inPurse.filter((_, k) => k !== i))}
              accessibilityRole="button"
              accessibilityLabel={`Take out ${moneyLabel(c)}`}
            >
              <Coin value={c} scale={1.1} />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.tray}>
        {coins.map((c) => (
          <Pressable
            key={c}
            onPress={() => setInPurse([...inPurse, c])}
            accessibilityRole="button"
            accessibilityLabel={`Put in ${moneyLabel(c)}`}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Coin value={c} />
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <BigButton label="Empty it" outline small disabled={inPurse.length === 0} onPress={() => setInPurse([])} style={styles.flex} />
        <BigButton label="✓ Check" color={colors.correct} small disabled={inPurse.length === 0} onPress={() => onCheck(sum)} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  tip: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  row: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'center', alignSelf: 'stretch' },
  flex: { flex: 1 },
  nudge: {
    minHeight: 44,
    minWidth: 68,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  purse: {
    alignSelf: 'stretch',
    minHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: '#8D6E63',
    backgroundColor: '#FFF3E0',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  purseTitle: { fontSize: 16, fontWeight: '800', color: '#5D4037' },
  countUp: { fontSize: 17, fontWeight: '800', color: colors.primary },
  coins: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  empty: { fontSize: 15, color: colors.textMuted },
  tray: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  pressed: { transform: [{ scale: 0.92 }] },
  coin: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,0,0,0.3)' },
  coinText: { fontWeight: '900', color: '#3E2723' },
  bill: {
    width: 80,
    height: 42,
    borderRadius: 4,
    borderWidth: 2.5,
    borderColor: '#2E7D32',
    backgroundColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billText: { fontSize: 18, fontWeight: '900', color: '#1B5E20' },
});
