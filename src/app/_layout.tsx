import { Lexend_400Regular } from '@expo-google-fonts/lexend/400Regular';
import { Lexend_700Bold } from '@expo-google-fonts/lexend/700Bold';
import { Lexend_900Black } from '@expo-google-fonts/lexend/900Black';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand/400Regular';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';
import { useActiveProfile } from '@/store/profiles';
import { backgroundColor } from '@/utils/shop';

export default function RootLayout() {
  // Loads in the background; text falls back to the system font until it's ready.
  useFonts({ Lexend_400Regular, Lexend_700Bold, Lexend_900Black, PatrickHand_400Regular });
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
        <Stack.Screen name="learn" options={{ title: 'Learn how' }} />
        <Stack.Screen name="lesson" options={{ title: 'Lesson' }} />
        <Stack.Screen name="progress" options={{ title: 'My progress' }} />
        <Stack.Screen name="shop" options={{ title: 'Shop' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="parent" options={{ title: 'Parent area' }} />
        <Stack.Screen name="permissions" options={{ title: 'Play nearby' }} />
        <Stack.Screen name="nearby-test" options={{ title: 'Nearby test' }} />
        <Stack.Screen name="multiplayer" options={{ title: 'Play with a friend' }} />
        <Stack.Screen name="pass-play" options={{ title: 'Take turns' }} />
        <Stack.Screen name="nearby-play" options={{ title: 'Several phones' }} />
      </Stack>
    </>
  );
}
