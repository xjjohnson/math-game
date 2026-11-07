import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { BigButton } from '@/components/BigButton';
import { CommunityView } from '@/components/community/CommunityView';
import { colors } from '@/constants/theme';
import { townSession } from '@/services/townSession';
import { useActiveProfile } from '@/store/profiles';
import { allGranted, checkPermissions, devicePermissions } from '@/utils/nearbyPermissions';
import { companionFor } from '@/utils/shop';
import { Nearby } from '../../modules/math-nearby';

/**
 * The community street, full screen. Opening it connects to friends nearby by
 * itself: it joins a visit someone is already hosting, or hosts one.
 */
export function TownScreen() {
  const profile = useActiveProfile();
  const [needsPermission, setNeedsPermission] = useState(false);

  const connect = useCallback(async () => {
    if (!Nearby || !profile) return;
    const list = devicePermissions();
    const ok = allGranted(await checkPermissions(list), list);
    setNeedsPermission(!ok);
    if (!ok || townSession().active) return;
    const session = townSession();
    // First time here: bring the buddy that is out with you.
    if (!session.getState().look.chosen) {
      const buddy = companionFor(profile)?.emoji;
      session.setLook(buddy ? [buddy] : []);
    }
    void session.auto({ name: profile.name, avatar: profile.avatar });
  }, [profile]);

  useEffect(() => {
    void connect();
    return () => townSession().stop();
    // Only when the player changes; coming back from the permission screen is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Back from the permission screen: try again.
  useFocusEffect(
    useCallback(() => {
      if (needsPermission) void connect();
    }, [needsPermission, connect]),
  );

  return (
    <CommunityView
      place="street"
      needsPermission={needsPermission}
      actions={
        <>
          <BigButton style={{ flex: 1, paddingHorizontal: 8 }} label="🏫 School" color={colors.primary} onPress={() => router.push('/learn')} />
          <BigButton style={{ flex: 1, paddingHorizontal: 8 }} label="🐾 Buddy home" color={colors.operations.divide} onPress={() => router.push('/buddy')} />
        </>
      }
    />
  );
}
