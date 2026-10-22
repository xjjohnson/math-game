import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { useActiveProfile } from '@/store/profiles';
import { allGranted, checkPermissions, devicePermissions } from '@/utils/nearbyPermissions';
import { Nearby } from '../../modules/math-nearby';

type Role = 'idle' | 'hosting' | 'finding';

interface Peer {
  endpointId: string;
  name: string;
}

const MAX_LOG = 30;

/**
 * Phase 7 prototype: two phones find each other, connect and swap messages.
 * No game logic yet; this proves the Bluetooth and permission setup first.
 */
export function NearbyTestScreen() {
  const profile = useActiveProfile();
  const myName = profile ? `${profile.avatar} ${profile.name}` : 'Player';
  const [role, setRole] = useState<Role>('idle');
  const [found, setFound] = useState<Peer[]>([]);
  const [connected, setConnected] = useState<Peer[]>([]);
  const [digits, setDigits] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const note = (line: string) => setLog((l) => [line, ...l].slice(0, MAX_LOG));

  useEffect(() => {
    if (!Nearby) return;
    const names = new Map<string, string>();
    const nameOf = (id: string) => names.get(id) ?? id;
    const subs = [
      Nearby.addListener('onEndpointFound', ({ endpointId, name }) => {
        names.set(endpointId, name);
        setFound((f) => [...f.filter((p) => p.endpointId !== endpointId), { endpointId, name }]);
        note(`Found ${name}`);
      }),
      Nearby.addListener('onEndpointLost', ({ endpointId }) => {
        setFound((f) => f.filter((p) => p.endpointId !== endpointId));
      }),
      Nearby.addListener('onConnectionRequest', ({ endpointId, name, authDigits }) => {
        names.set(endpointId, name);
        setDigits(authDigits);
        note(`Connecting to ${name}… code ${authDigits}`);
      }),
      Nearby.addListener('onConnected', ({ endpointId }) => {
        setConnected((c) => [...c.filter((p) => p.endpointId !== endpointId), { endpointId, name: nameOf(endpointId) }]);
        note(`✓ Connected to ${nameOf(endpointId)}`);
      }),
      Nearby.addListener('onConnectionFailed', ({ endpointId, status }) => {
        note(`✗ Couldn't connect to ${nameOf(endpointId)} (code ${status})`);
      }),
      Nearby.addListener('onDisconnected', ({ endpointId }) => {
        setConnected((c) => c.filter((p) => p.endpointId !== endpointId));
        note(`${nameOf(endpointId)} left`);
      }),
      Nearby.addListener('onMessage', ({ endpointId, text }) => {
        note(`💬 ${nameOf(endpointId)}: ${text}`);
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      Nearby?.stop();
    };
  }, []);

  if (!Nearby) {
    return (
      <Screen title="Nearby test">
        <Text style={styles.body}>This test needs the Math Game app on an Android phone.</Text>
      </Screen>
    );
  }
  const nearby = Nearby;

  const run = async (next: Role, action: () => Promise<void>) => {
    const list = devicePermissions();
    if (!allGranted(await checkPermissions(list), list)) {
      router.push('/permissions');
      return;
    }
    nearby.stop();
    setFound([]);
    setConnected([]);
    setDigits(null);
    try {
      await action();
      setRole(next);
      note(next === 'hosting' ? 'Waiting for a friend to join…' : 'Looking for phones…');
    } catch (e) {
      setRole('idle');
      note(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const connect = async (peer: Peer) => {
    try {
      await nearby.connect(myName, peer.endpointId);
    } catch (e) {
      note(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const sayHello = async () => {
    const text = `Hello from ${myName}! ${new Date().toLocaleTimeString()}`;
    try {
      await nearby.send(null, text);
      note(`➜ ${text}`);
    } catch (e) {
      note(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Screen title="Nearby test">
      <Text style={styles.body}>
        On one phone tap Host. On the other tap Find, then tap the first phone's name.
      </Text>
      {/* Full width: side by side, "Host" wrapped and Android clipped the second line. */}
      <BigButton
        label="📣 Host"
        color={colors.primary}
        outline={role !== 'hosting'}
        onPress={() => run('hosting', () => nearby.startHosting(myName))}
      />
      <BigButton
        label="🔍 Find"
        color={colors.accent}
        outline={role !== 'finding'}
        onPress={() => run('finding', () => nearby.startFinding())}
      />

      {role === 'finding' && connected.length === 0 ? (
        <View style={styles.section}>
          <Text style={styles.heading}>{found.length ? 'Tap a phone to join' : 'Looking…'}</Text>
          {found.map((peer) => (
            <Pressable
              key={peer.endpointId}
              onPress={() => connect(peer)}
              accessibilityRole="button"
              accessibilityLabel={`Join ${peer.name}`}
              style={({ pressed }) => [styles.peer, pressed && styles.pressed]}
            >
              <Text style={styles.peerName}>{peer.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {connected.length ? (
        <View style={styles.section}>
          <Text style={styles.heading}>
            Connected to {connected.map((p) => p.name).join(', ')}
            {digits ? ` · code ${digits}` : ''}
          </Text>
          <BigButton label="👋 Send hello" color={colors.correct} onPress={sayHello} />
        </View>
      ) : null}

      {role !== 'idle' ? (
        <BigButton
          label="Stop"
          outline
          color={colors.wrong}
          onPress={() => {
            nearby.stop();
            setRole('idle');
            setFound([]);
            setConnected([]);
            note('Stopped');
          }}
        />
      ) : null}

      <View style={styles.log} accessibilityLiveRegion="polite">
        {log.length ? (
          log.map((line, i) => (
            <Text key={`${i}-${line}`} style={styles.logLine}>
              {line}
            </Text>
          ))
        ) : (
          <Text style={styles.logLine}>Nothing yet.</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: fontSizes.body, color: colors.text },
  section: { gap: spacing.sm },
  heading: { fontSize: fontSizes.body, fontWeight: '800', color: colors.text },
  peer: {
    minHeight: TAP_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  peerName: { fontSize: fontSizes.button, fontWeight: '800', color: colors.text },
  log: {
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
  },
  logLine: { fontSize: 16, color: colors.text },
});
