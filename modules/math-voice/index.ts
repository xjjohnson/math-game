import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

interface NativeVoice {
  voices(): string[];
  speak(voiceId: string, text: string, speed: number): Promise<void>;
  stop(): void;
  readLog(): string;
  clearLog(): void;
  setOptions(threads: number, debug: boolean): void;
  selfCheck(): string;
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

/** Why the app closed lately and the steps Story Voice took (for the Parents area). */
export function storyVoiceLog(): string {
  try {
    return native?.readLog() ?? "Story Voice isn't built into this app.";
  } catch (e) {
    return `Couldn't read the log: ${String(e)}`;
  }
}

export function clearStoryVoiceLog() {
  try {
    native?.clearLog();
  } catch {
    // Nothing to clear.
  }
}

/** For tracking down the crash: threads for the speech engine, and whether it prints its own details. */
export function setStoryOptions(threads: number, debug: boolean) {
  try {
    native?.setOptions(threads, debug);
  } catch {
    // Not built in.
  }
}

/** Sizes of the speech files saved on the tablet. */
export function storySelfCheck(): string {
  try {
    return native?.selfCheck() ?? '';
  } catch (e) {
    return `Couldn't check: ${String(e)}`;
  }
}
