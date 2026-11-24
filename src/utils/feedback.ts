import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { speakStory, stopStory } from '../../modules/math-voice';
import { Platform } from 'react-native';

import type { VoiceStyle } from '@/constants/shop';
import { useProfiles } from '@/store/profiles';
import { useSettings } from '@/store/settings';
import type { Problem } from '@/types';
import { voiceStyleFor } from '@/utils/shop';
import { loadedVoices, loadVoices, voiceIdFor } from '@/utils/voices';

const SPOKEN: Record<Problem['operation'], string> = {
  add: 'plus',
  subtract: 'minus',
  multiply: 'times',
  divide: 'divided by',
};

/** How a problem is read out: the story, or e.g. "What is 7 times 8?". */
export function spokenProblem(problem: Problem): string {
  if (problem.story) return problem.story;
  if (problem.ask) return problem.prompt ? `${problem.ask} ${spokenLine(problem.prompt)}` : problem.ask;
  const a = problem.a < 0 ? `minus ${-problem.a}` : String(problem.a);
  return `What is ${a} ${SPOKEN[problem.operation]} ${problem.b}?`;
}

/** Reads a problem aloud when the setting is on (or when `force` is set, for the speaker button). */
export function speakProblem(problem: Problem, force = false) {
  speakText(spokenProblem(problem), force);
}

/** Reads any text aloud in the active player's voice, under the same rule as speakProblem. */
export function speakText(text: string, force = false) {
  if (!force && !useSettings.getState().textToSpeech) return;
  const { profiles, activeProfileId } = useProfiles.getState();
  speakInVoice(text, voiceStyleFor(profiles.find((p) => p.id === activeProfileId)));
}

/**
 * Reads text in a given voice style, e.g. for the Shop's Listen button. Pitch and rate are
 * always passed, because Android keeps the last ones used otherwise. If the picked voice
 * can't speak, it says it again in the tablet's own voice.
 */
export function speakInVoice(text: string, style: VoiceStyle) {
  // Start finding the device's voices; the first words may use the default voice while it looks.
  void loadVoices();
  const voice = voiceIdFor(style, loadedVoices());
  const say = (withVoice: string | undefined): void =>
    Speech.speak(text, {
      pitch: style.pitch,
      rate: style.rate,
      ...(withVoice ? { voice: withVoice } : {}),
      onError: withVoice ? (): void => say(undefined) : undefined,
    });
  try {
    Speech.stop();
    stopStory();
    // Story voices read at the player's speed; 0.9 is "normal" for the other voices.
    if (style.story && speakStory(style.story, text, style.rate / 0.9, () => say(voice))) return;
    say(voice);
  } catch {
    // Some browsers have no speech voices; the game works the same without them.
  }
}

export function stopSpeaking() {
  stopStory();
  try {
    Speech.stop();
  } catch {
    // Nothing to stop.
  }
}

/** A short buzz on phones and tablets when Vibrate on answers is on. */
export function vibrate(kind: 'correct' | 'wrong') {
  if (Platform.OS === 'web' || !useSettings.getState().haptics) return;
  Haptics.notificationAsync(
    kind === 'correct'
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error,
  ).catch(() => {});
}

/** Reads a written line the way it's said: "6 + ☐ = 11" is "6 plus what number equals 11". */
export function spokenLine(line: string): string {
  return line
    .replace(/☐/g, 'what number')
    .replace(/ \+ /g, ' plus ')
    .replace(/ − /g, ' minus ')
    .replace(/ × /g, ' times ')
    .replace(/ ÷ /g, ' divided by ')
    .replace(/ = /g, ' equals ')
    .replace(/(\d+)\/(\d+)/g, '$1 out of $2');
}

export { answerText } from '@/utils/skills/build';
