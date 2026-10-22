import { Platform } from 'react-native';

import { useSettings } from '@/store/settings';

export type SoundName = 'correct' | 'wrong' | 'streak' | 'reward';

/**
 * Note sequences (frequency in Hz, length in seconds) for each sound. These are
 * placeholders: on web they play as simple tones; on Android they are silent until
 * real sound files are added with expo-audio (see playSound).
 */
const TONES: Record<SoundName, [number, number][]> = {
  correct: [
    [660, 0.08],
    [880, 0.12],
  ],
  wrong: [
    [300, 0.12],
    [220, 0.18],
  ],
  streak: [
    [660, 0.07],
    [880, 0.07],
    [1100, 0.14],
  ],
  reward: [
    [523, 0.1],
    [659, 0.1],
    [784, 0.1],
    [1047, 0.25],
  ],
};

type AudioContextCtor = new () => AudioContext;
let context: AudioContext | null = null;

function playTones(notes: [number, number][]) {
  const Ctor: AudioContextCtor | undefined =
    (globalThis as { AudioContext?: AudioContextCtor }).AudioContext ??
    (globalThis as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return;
  context ??= new Ctor();
  let at = context.currentTime;
  for (const [frequency, length] of notes) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.15, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    osc.connect(gain).connect(context.destination);
    osc.start(at);
    osc.stop(at + length);
    at += length;
  }
}

/** Plays a sound if the Sound effects setting is on. Never throws. */
export function playSound(name: SoundName) {
  if (!useSettings.getState().sound) return;
  try {
    if (Platform.OS === 'web') playTones(TONES[name]);
    // Native: hook expo-audio players up here once sound files are chosen.
  } catch {
    // Sound is a nice-to-have; a blocked audio device must never break the game.
  }
}
