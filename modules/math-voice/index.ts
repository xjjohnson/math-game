import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

interface NativeVoice {
  voices(): string[];
  speak(voiceId: string, text: string, speed: number): Promise<void>;
  stop(): void;
}

// Missing on the web, on PC, and on APKs built before Story Voice was added.
const native =
  Platform.OS === "android"
    ? requireOptionalNativeModule<NativeVoice>("MathVoice")
    : null;

/** Built-in natural voices on this APK (empty when there are none). */
export function storyVoices(): string[] {
  try {
    return native?.voices() ?? [];
  } catch {
    return [];
  }
}

/** Speaks in a built-in voice; false when this app can't, so the caller can use another voice. */
export function speakStory(
  voiceId: string,
  text: string,
  speed: number,
  onError: () => void,
): boolean {
  if (!native || !storyVoices().includes(voiceId)) return false;
  native.speak(voiceId, text, speed).catch(onError);
  return true;
}

export function stopStory() {
  try {
    native?.stop();
  } catch {
    // Nothing playing.
  }
}
