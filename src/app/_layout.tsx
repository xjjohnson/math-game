import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';
import { useActiveProfile } from '@/store/profiles';
import { backgroundColor } from '@/utils/shop';

export default function RootLayout() {
  const background = backgroundColor(useActiveProfile());
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="profiles" options={{ title: 'Players' }} />
        <Stack.Screen name="mode" options={{ title: 'New game' }} />
        <Stack.Screen name="play" options={{ title: 'Play' }} />
        <Stack.Screen name="progress" options={{ title: 'My progress' }} />
        <Stack.Screen name="shop" options={{ title: 'Shop' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
