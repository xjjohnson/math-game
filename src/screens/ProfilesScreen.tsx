import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { Sticker } from '@/components/Sticker';
import { AVATARS, colors, fontSizes, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { useProfiles } from '@/store/profiles';

export function ProfilesScreen() {
  const { profiles, activeProfileId, addProfile, removeProfile, setActiveProfile } = useProfiles();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);

  const create = () => {
    if (!name.trim()) return;
    addProfile(name, avatar);
    setName('');
    router.back();
  };

  return (
    <Screen title="Players">
      {profiles.map((p) => {
        const active = p.id === activeProfileId;
        return (
          <View key={p.id} style={[styles.row, active && styles.activeRow]}>
            <Pressable
              style={styles.rowMain}
              accessibilityRole="button"
              accessibilityLabel={`Play as ${p.name}`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                setActiveProfile(p.id);
                router.back();
              }}
            >
              <Sticker value={p.avatar} size={40} />
              <Text style={styles.rowName}>{p.name}</Text>
            </Pressable>
            <Pressable
              style={styles.remove}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${p.name}`}
              onPress={() => removeProfile(p.id)}
            >
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        );
      })}

      <Text style={styles.heading}>New player</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        maxLength={20}
        accessibilityLabel="New player name"
        onSubmitEditing={create}
      />
      <View style={styles.avatars}>
        {AVATARS.map((a) => (
          <Pressable
            key={a}
            onPress={() => setAvatar(a)}
            accessibilityRole="button"
            accessibilityLabel={`Avatar ${a}`}
            accessibilityState={{ selected: a === avatar }}
            style={[styles.avatarChoice, a === avatar && styles.avatarSelected]}
          >
            <Text style={styles.avatarText}>{a}</Text>
          </Pressable>
        ))}
      </View>
      <BigButton label="Add player" color={colors.correct} disabled={!name.trim()} onPress={create} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.disabled,
  },
  activeRow: { borderColor: colors.primary },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TAP_TARGET, paddingHorizontal: spacing.md },
  rowName: { fontSize: fontSizes.button, fontWeight: '700', color: colors.text },
  remove: { width: TAP_TARGET, height: TAP_TARGET, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: fontSizes.button, color: colors.wrong, fontWeight: '800' },
  heading: { fontSize: fontSizes.button, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  input: {
    minHeight: TAP_TARGET,
    fontSize: fontSizes.button,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  avatarChoice: {
    width: TAP_TARGET,
    height: TAP_TARGET,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  avatarSelected: { borderColor: colors.primary },
  avatarText: { fontSize: 40 },
});
