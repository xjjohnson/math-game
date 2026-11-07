import { router } from 'expo-router';

import { BigButton } from '@/components/BigButton';
import { CommunityView } from '@/components/community/CommunityView';
import { colors } from '@/constants/theme';

/** The community street, full screen: walk into a building through its door, or head to class. */
export function TownScreen() {
  return (
    <CommunityView
      place="street"
      actions={
        <>
          <BigButton style={{ flex: 1, paddingHorizontal: 8 }} label="🏫 School" color={colors.primary} onPress={() => router.push('/learn')} />
          <BigButton style={{ flex: 1, paddingHorizontal: 8 }} label="🐾 Buddy home" color={colors.operations.divide} onPress={() => router.push('/buddy')} />
        </>
      }
    />
  );
}
