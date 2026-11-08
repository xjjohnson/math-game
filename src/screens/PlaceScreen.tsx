import { router, useLocalSearchParams } from 'expo-router';

import { BigButton } from '@/components/BigButton';
import { CommunityView } from '@/components/community/CommunityView';
import { Text } from '@/components/AppText';
import { colors } from '@/constants/theme';
import { useActiveProfile } from '@/store/profiles';
import { dateKey } from '@/utils/dates';
import { BUILDINGS, shiftDone } from '@/utils/town';

/** Inside one community building, full screen, with its job a tap away. */
export function PlaceScreen() {
  const { building: param } = useLocalSearchParams<{ building: string }>();
  const building = BUILDINGS.find((b) => b.id === param);
  const profile = useActiveProfile();
  if (!building || !profile) return <Text>Nothing here.</Text>;
  const done = shiftDone(profile, building.id, dateKey());
  const school = building.id === 'school';
  return (
    <CommunityView
      place={building.id}
      actions={
        <>
          <BigButton
            style={school ? { flex: 1, paddingHorizontal: 8 } : undefined}
            label={`${building.emoji} ${done ? 'Practice' : 'Do the job'}: ${building.reward === 'coins' ? 'earn coins' : 'earn hearts'}`}
            color={done ? colors.accent : colors.correct}
            onPress={() => router.push({ pathname: '/shift', params: { building: building.id } })}
          />
          {school ? (
            <BigButton style={{ flex: 1, paddingHorizontal: 8 }} label="📖 Learn how" color={colors.primary} onPress={() => router.push('/learn')} />
          ) : null}
        </>
      }
    />
  );
}
