import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { findBadge } from '@/constants/badges';
import { itemsIn, SHOP_CATEGORIES, type ShopCategory, type ShopItem } from '@/constants/shop';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import { isEquipped, owns } from '@/utils/shop';
import { playSound } from '@/utils/soundEffects';

export function ShopScreen() {
  const profile = useActiveProfile();
  const { buy, equip } = useProfiles();
  const [category, setCategory] = useState<ShopCategory>('avatar');
  const [message, setMessage] = useState<string | null>(null);

  if (!profile) {
    return (
      <Screen title="Shop">
        <Text style={styles.message}>Pick a player first.</Text>
      </Screen>
    );
  }

  const choose = (item: ShopItem) => {
    if (owns(profile, item)) {
      equip(profile.id, item.id);
      setMessage(
        item.category === 'companion' && isEquipped(profile, item)
          ? `${item.name} is taking a nap.`
          : `Now using ${item.name}.`,
      );
      return;
    }
    const result = buy(profile.id, item.id);
    if (result.ok) {
      playSound('reward');
      const badge = result.newBadges.map(findBadge)[0];
      setMessage(
        `You got ${item.name}!${badge ? ` New badge: ${badge.emoji} ${badge.name}` : ''}`,
      );
    } else if (result.reason === 'coins') {
      setMessage(`You need ${item.price - profile.coins} more coins for ${item.name}. Keep playing!`);
    }
  };

  return (
    <Screen title="Shop">
      <Text style={styles.balance}>🪙 {profile.coins} coins</Text>
      <OptionGroup label="Shop for" value={category} onChange={setCategory} options={SHOP_CATEGORIES} />
      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
      <View style={styles.grid}>
        {itemsIn(category).map((item) => {
          const owned = owns(profile, item);
          const using = isEquipped(profile, item);
          const affordable = profile.coins >= item.price;
          const status = using
            ? item.category === 'companion'
              ? 'With you · tap to rest'
              : 'Using'
            : owned
              ? 'Tap to use'
              : `🪙 ${item.price}`;
          return (
            <Pressable
              key={item.id}
              onPress={() => choose(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${status}`}
              accessibilityState={{ selected: using, disabled: !owned && !affordable }}
              style={({ pressed }) => [
                styles.item,
                using && styles.using,
                !owned && !affordable && styles.locked,
                pressed && styles.pressed,
              ]}
            >
              <Preview item={item} />
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[styles.status, using && styles.statusUsing]}>{status}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

function Preview({ item }: { item: ShopItem }) {
  switch (item.category) {
    case 'avatar':
      return <Text style={styles.emoji}>{item.emoji}</Text>;
    case 'companion':
      return <Text style={styles.emoji}>{item.companion.emoji}</Text>;
    case 'background':
      return <View style={[styles.swatch, { backgroundColor: item.color }]} />;
    case 'cardStyle':
      return (
        <View
          style={[
            styles.swatch,
            styles.miniCard,
            {
              backgroundColor: item.style.background,
              borderColor: item.style.border ?? colors.primary,
              borderStyle: item.style.borderStyle,
            },
          ]}
        >
          <Text style={[styles.miniText, { color: item.style.text }]}>7×8</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  balance: { fontSize: fontSizes.button, fontWeight: '900', color: colors.text, textAlign: 'center' },
  message: { fontSize: fontSizes.body, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    flexBasis: '45%',
    flexGrow: 1,
    minHeight: TAP_TARGET * 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
  using: { borderColor: colors.correct, borderWidth: 5 },
  locked: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.97 }] },
  emoji: { fontSize: 48 },
  swatch: {
    width: 72,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  miniCard: { borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  miniText: { fontWeight: '900', fontSize: 18 },
  name: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  status: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  statusUsing: { color: colors.correct },
});
