import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { CarDrawing } from '@/components/community/CarDrawing';
import { CAR_PAINTS, CARS, PAINT_NAMES, STRIPE_ID, STRIPE_PRICE, type CarKind } from '@/constants/cars';
import { INK } from '@/constants/artStyle';
import { colors } from '@/constants/theme';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import { garageOf, hasCar, type DriveControls } from '@/utils/garage';
import { playSound } from '@/utils/soundEffects';

/**
 * The garage: pick a car, paint it, add the rainbow stripe, and choose how to steer.
 * Cars you don't have yet say how to get them (coins, or stars still to earn).
 */
export function CarMenu({ onClose, onControls }: { onClose: () => void; onControls: (c: DriveControls) => void }) {
  const profile = useActiveProfile();
  const buyCar = useProfiles((s) => s.buyCar);
  const setGarage = useProfiles((s) => s.setGarage);
  if (!profile) return null;
  const g = garageOf(profile);

  const pick = (car: CarKind) => {
    if (hasCar(profile, car)) {
      setGarage(profile.id, { car: car.id, paint: car.paint });
      return;
    }
    if ('coins' in car.cost && profile.coins >= car.cost.coins) {
      if (buyCar(profile.id, car.id).ok) playSound('reward');
    }
  };

  const status = (car: CarKind): string => {
    if (g.car === car.id) return 'Driving';
    if (hasCar(profile, car)) return 'Tap to drive';
    if ('stars' in car.cost) return `⭐ ${car.cost.stars} stars (${Math.max(0, car.cost.stars - profile.stars)} more)`;
    if ('coins' in car.cost) return profile.coins >= car.cost.coins ? `Buy for 🪙 ${car.cost.coins}` : `🪙 ${car.cost.coins} (need ${car.cost.coins - profile.coins} more)`;
    return '';
  };

  const stripeOwned = g.owned.includes(STRIPE_ID);

  return (
    <View style={styles.spot}>
      <View style={styles.panel}>
        <Text style={styles.title}>My car</Text>
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.cars}>
            {CARS.map((car) => {
              const mine = hasCar(profile, car);
              const on = g.car === car.id;
              return (
                <Pressable
                  key={car.id}
                  onPress={() => pick(car)}
                  accessibilityRole="button"
                  accessibilityLabel={`${car.name}. ${car.blurb} ${status(car)}`}
                  style={({ pressed }) => [styles.car, on && styles.carOn, !mine && styles.carLocked, pressed && styles.pressed]}
                >
                  <CarDrawing shape={car.shape} paint={on ? g.paint : car.paint} stripe={on && g.stripe} size={84} />
                  <Text style={styles.carName}>{car.name}</Text>
                  <Text style={[styles.carStatus, on && styles.carStatusOn]}>{status(car)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.heading}>Paint</Text>
          <View style={styles.paints}>
            {CAR_PAINTS.map((c, i) => (
              <Pressable
                key={c}
                onPress={() => setGarage(profile.id, { paint: i })}
                accessibilityRole="button"
                accessibilityLabel={`${PAINT_NAMES[i]} paint`}
                accessibilityState={{ selected: g.paint === i }}
                style={[styles.swatch, { backgroundColor: c }, g.paint === i && styles.swatchOn]}
              />
            ))}
          </View>
          <Pressable
            onPress={() => {
              if (stripeOwned) setGarage(profile.id, { stripe: !g.stripe });
              else if (profile.coins >= STRIPE_PRICE && buyCar(profile.id, STRIPE_ID).ok) playSound('reward');
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          >
            <Text style={styles.optionText}>
              {stripeOwned ? (g.stripe ? '🌈 Rainbow stripe: on' : '🌈 Rainbow stripe: off') : `🌈 Rainbow stripe · 🪙 ${STRIPE_PRICE}`}
            </Text>
          </Pressable>

          <Text style={styles.heading}>How to drive</Text>
          <View style={styles.paints}>
            {(
              [
                ['tap', '👆 Tap where to go'],
                ['wheel', '🎡 Wheel and GO'],
              ] as const
            ).map(([c, label]) => (
              <Pressable
                key={c}
                onPress={() => onControls(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: g.controls === c }}
                style={({ pressed }) => [styles.option, g.controls === c && styles.optionOn, pressed && styles.pressed]}
              >
                <Text style={styles.optionText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Pressable onPress={onClose} accessibilityRole="button" style={styles.close}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spot: { position: 'absolute', top: 70, bottom: 76, left: 12, right: 12, alignItems: 'center' },
  panel: { width: '100%', maxWidth: 640, flexShrink: 1, backgroundColor: '#FFFDF8', borderRadius: 24, borderWidth: 3, borderColor: INK, padding: 14, gap: 6 },
  title: { fontSize: 24, fontWeight: '900', color: INK, textAlign: 'center' },
  list: { gap: 10, paddingBottom: 6 },
  cars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  car: { width: 140, alignItems: 'center', padding: 6, borderRadius: 18, borderWidth: 3, borderColor: '#E2D8C8', backgroundColor: '#FFFFFF' },
  carOn: { borderColor: colors.primary, borderWidth: 4 },
  carLocked: { backgroundColor: '#F3EEE4' },
  carName: { fontSize: 15, fontWeight: '800', color: INK, textAlign: 'center' },
  carStatus: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  carStatusOn: { color: colors.primary },
  heading: { fontSize: 18, fontWeight: '900', color: INK, marginTop: 4 },
  paints: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, borderColor: INK },
  swatchOn: { borderWidth: 6, borderColor: colors.primary },
  option: { paddingHorizontal: 14, minHeight: 48, justifyContent: 'center', borderRadius: 24, borderWidth: 3, borderColor: '#E2D8C8', backgroundColor: '#FFFFFF' },
  optionOn: { borderColor: colors.primary },
  optionText: { fontSize: 16, fontWeight: '800', color: INK },
  pressed: { transform: [{ scale: 0.96 }] },
  close: { alignSelf: 'center', padding: 10 },
  closeText: { fontSize: 18, fontWeight: '800', color: colors.primary },
});
