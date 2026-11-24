import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { CommunityView } from '@/components/community/CommunityView';
import { townSession } from '@/services/townSession';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import { homeSnapshot } from '@/utils/homeVisit';
import { allGranted, checkPermissions, devicePermissions } from '@/utils/nearbyPermissions';
import { Nearby } from '../../modules/math-nearby';

/**
 * The community street, full screen. Opening it offers a visit for friends to
 * join and shows friends' visits nearby, which join with one tap.
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
    void session.open({ name: profile.name, avatar: profile.avatar });
  }, [profile]);

  useEffect(() => {
    void connect();
    // Friends can ask to see this player's buddy home while the visit is on.
    townSession().setHomeSource(() => {
      const s = useProfiles.getState();
      const me = s.profiles.find((p) => p.id === s.activeProfileId);
      return me ? homeSnapshot(me) : null;
    });
    return () => {
      townSession().setHomeSource(null);
      townSession().stop();
    };
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
      tab="town"
      needsPermission={needsPermission}
      actions={null}
    />
  );
}
