import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { stickerText } from '@/constants/art';
import { findBadge } from '@/constants/badges';
import { OPERATIONS } from '@/constants/difficulty';
import { GRADES } from '@/constants/grades';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { useProfiles } from '@/store/profiles';
import { useSettings, type CoinPayout } from '@/store/settings';
import type { Profile } from '@/types';
import { dateKey, dayStreak } from '@/utils/dates';
import { accuracy } from '@/utils/progress';
import { trickiest } from '@/utils/weakSpots';

const PIN_LENGTH = 4;

/** What the PIN pad is asking for. */
type Step = 'enter' | 'create' | 'confirm' | 'open';

export function ParentScreen() {
  const { parentPin, update } = useSettings();
  const [step, setStep] = useState<Step>(parentPin ? 'enter' : 'create');
  const [firstTry, setFirstTry] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const submit = (pin: string) => {
    if (step === 'enter') {
      if (pin === parentPin) {
        setMessage(null);
        setStep('open');
      } else {
        setMessage('That PIN is not right. Try again.');
      }
    } else if (step === 'create') {
      setFirstTry(pin);
      setMessage(null);
      setStep('confirm');
    } else if (step === 'confirm') {
      if (pin === firstTry) {
        update({ parentPin: pin });
        setMessage('PIN saved.');
        setStep('open');
      } else {
        setMessage("Those didn't match. Start again.");
        setStep('create');
      }
    }
  };

  if (step !== 'open') {
    const title =
      step === 'enter'
        ? 'Enter the parent PIN'
        : step === 'create'
          ? 'Choose a 4-digit parent PIN'
          : 'Type the same PIN again';
    return (
      <Screen title="Parent area">
        <PinPad key={step} title={title} message={message} onComplete={submit} />
      </Screen>
    );
  }

  return (
    <Screen title="Parent area">
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <PayoutSettings />
      <ParentReport />
      <View style={styles.actions}>
        <BigButton
          label="Change PIN"
          outline
          onPress={() => {
            setMessage(null);
            setStep('create');
          }}
        />
        <BigButton
          label="🔒 Lock"
          color={colors.text}
          onPress={() => {
            setMessage(null);
            setStep('enter');
          }}
        />
      </View>
    </Screen>
  );
}

function PinPad({
  title,
  message,
  onComplete,
}: {
  title: string;
  message: string | null;
  onComplete: (pin: string) => void;
}) {
  const [pin, setPin] = useState('');

  const press = (key: string) => {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = (pin + key).slice(0, PIN_LENGTH);
    if (next.length === PIN_LENGTH) {
      setPin('');
      onComplete(next);
    } else {
      setPin(next);
    }
  };

  return (
    <View style={styles.pinWrap}>
      <Text style={styles.pinTitle}>{title}</Text>
      <View
        style={styles.dots}
        accessibilityLabel={`${pin.length} of ${PIN_LENGTH} digits entered`}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
        ))}
      </View>
      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
      <View style={styles.keys}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) =>
          key ? (
            <Pressable
              key={key}
              onPress={() => press(key)}
              accessibilityRole="button"
              accessibilityLabel={key === '⌫' ? 'Delete' : key}
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          ) : (
            <View key={`gap-${i}`} style={styles.keyGap} />
          ),
        )}
      </View>
      <Text style={styles.note}>
        The PIN keeps this report for grown-ups. Resetting settings does not clear it.
      </Text>
    </View>
  );
}

const PAYOUTS: { value: CoinPayout; label: string }[] = [
  { value: 0.5, label: 'Half' },
  { value: 1, label: 'Normal' },
  { value: 2, label: 'Double' },
];

function PayoutSettings() {
  const { coinPayout, update } = useSettings();
  return (
    <View style={styles.card}>
      <Text style={styles.player}>🪙 Coins and stars</Text>
      <Text style={styles.line}>
        Each right answer pays coins by how hard it is: + pays 1, − pays 2, × pays 3 and ÷ pays 4. Medium adds 1,
        Hard adds 2, and every two grades add 1 more (2nd-3rd +1, 4th-5th +2, 6th+ +3). Every 5 in a row pays 5
        bonus coins.
      </Text>
      <Text style={styles.line}>
        A round earns up to 3 stars for accuracy. On Medium each star counts twice, and on Hard three times.
      </Text>
      <OptionGroup<CoinPayout>
        label="Coins per right answer"
        value={coinPayout}
        onChange={(value) => update({ coinPayout: value })}
        options={PAYOUTS}
      />
    </View>
  );
}

function ParentReport() {
  const profiles = useProfiles((s) => s.profiles);
  if (profiles.length === 0) {
    return <Text style={styles.note}>No players yet. Make one from the home screen.</Text>;
  }
  return (
    <>
      {profiles.map((p) => (
        <PlayerReport key={p.id} profile={p} />
      ))}
    </>
  );
}

function Adjust({ label, steps, onPress }: { label: string; steps: number[]; onPress: (by: number) => void }) {
  return (
    <View style={styles.adjustRow}>
      <Text style={styles.adjustLabel}>{label}</Text>
      {steps.map((by) => (
        <Pressable
          key={by}
          onPress={() => onPress(by)}
          accessibilityRole="button"
          accessibilityLabel={`${by > 0 ? 'Add' : 'Take away'} ${Math.abs(by)} ${label.toLowerCase()}`}
          style={({ pressed }) => [styles.adjustKey, pressed && styles.keyPressed]}
        >
          <Text style={styles.adjustText}>{by > 0 ? `+${by}` : `−${-by}`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PlayerReport({ profile }: { profile: Profile }) {
  const adjustBalance = useProfiles((s) => s.adjustBalance);
  const today = dateKey();
  const tricky = trickiest(profile.missed, 5);
  const badges = profile.badges.map(findBadge).filter((b) => b !== undefined);
  const days = profile.playDates.length;

  return (
    <View style={styles.card}>
      <Text style={styles.player}>
        {stickerText(profile.avatar)} {profile.name}
      </Text>
      <Text style={styles.line}>
        Played on {days} {days === 1 ? 'day' : 'days'}
        {profile.playDates.length ? `, last on ${profile.playDates[profile.playDates.length - 1]}` : ''}
        . Current day streak: {dayStreak(profile.playDates, today)}.
      </Text>
      <Text style={styles.line}>
        Best answer streak: {profile.bestStreak} · {GRADES[profile.grade].name}
      </Text>

      <Text style={styles.heading}>
        🪙 {profile.coins} coins · ⭐ {profile.stars} stars
      </Text>
      <Adjust label="Coins" steps={[-50, -10, 10, 50]} onPress={(by) => adjustBalance(profile.id, { coins: by })} />
      <Adjust label="Stars" steps={[-5, -1, 1, 5]} onPress={(by) => adjustBalance(profile.id, { stars: by })} />

      <Text style={styles.heading}>Accuracy</Text>
      {OPERATIONS.map((op) => {
        const stats = profile.stats[op.value];
        const pct = accuracy(stats);
        return (
          <Text key={op.value} style={styles.line}>
            {op.symbol} {op.label}:{' '}
            {pct === null ? 'not tried yet' : `${pct}% (${stats.correct} of ${stats.attempted})`}
          </Text>
        );
      })}

      <Text style={styles.heading}>Tricky facts</Text>
      <Text style={styles.line}>
        {tricky.length
          ? tricky.map((f) => `${f.prompt} = ${f.answer} (missed ${f.misses}×)`).join('\n')
          : 'Nothing to review right now.'}
      </Text>

      <Text style={styles.heading}>Badges</Text>
      <Text style={styles.line}>
        {badges.length ? badges.map((b) => `${b.emoji} ${b.name}`).join('  ') : 'None yet.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pinWrap: { alignItems: 'center', gap: spacing.md },
  pinTitle: { fontSize: fontSizes.button, fontWeight: '800', color: colors.text, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: spacing.md },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: colors.text },
  dotFilled: { backgroundColor: colors.text },
  keys: { flexDirection: 'row', flexWrap: 'wrap', width: TAP_TARGET * 3 + spacing.sm * 2, gap: spacing.sm },
  key: {
    width: TAP_TARGET,
    height: TAP_TARGET,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { transform: [{ scale: 0.95 }] },
  keyGap: { width: TAP_TARGET, height: TAP_TARGET },
  keyText: { fontSize: fontSizes.button, fontWeight: '800', color: colors.text },
  message: { fontSize: fontSizes.body, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  note: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  actions: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  player: { fontSize: fontSizes.button, fontWeight: '900', color: colors.text },
  heading: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  line: { fontSize: 16, color: colors.text },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  adjustLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  adjustKey: {
    minWidth: 56,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustText: { fontSize: 18, fontWeight: '800', color: colors.text },
});
