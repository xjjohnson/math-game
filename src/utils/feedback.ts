import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { useSettings } from '@/store/settings';
import type { Problem } from '@/types';

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

/** Reads any text aloud, under the same rule as speakProblem. */
export function speakText(text: string, force = false) {
  if (!force && !useSettings.getState().textToSpeech) return;
  try {
    Speech.stop();
    Speech.speak(text, { rate: 0.9 });
  } catch {
    // Some browsers have no speech voices; the game works the same without them.
  }
}

export function stopSpeaking() {
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

/** How an answer is shown: its label (a word, sign, time or fraction) or the number with its unit. */
export function answerText(problem: Problem, value: number): string {
  const label = problem.labels?.[value];
  if (label !== undefined) return label;
  if (!problem.unit) return String(value);
  return problem.unit === '¢' ? `${value}¢` : `${value} ${problem.unit}`;
}
