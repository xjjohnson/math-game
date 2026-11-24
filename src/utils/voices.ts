import * as Speech from 'expo-speech';

import type { VoiceStyle } from '@/constants/shop';

/** The part of a speech voice the game looks at (expo-speech's Voice). */
export interface DeviceVoice {
  identifier: string;
  name: string;
  quality: string;
  language: string;
}

/** True for voices that need the internet: Google's engine names them "...-network". */
export function needsNetwork(voice: DeviceVoice): boolean {
  return /network/i.test(voice.identifier) || /network/i.test(voice.name);
}

function isEnglish(voice: DeviceVoice): boolean {
  return /^en([-_]|$)/i.test(voice.language);
}

/** Higher is better: offline, Enhanced quality, US English first. */
function score(voice: DeviceVoice): number {
  let s = 0;
  if (/local/i.test(voice.identifier)) s += 4;
  if (voice.quality === 'Enhanced') s += 2;
  if (/^en[-_]us/i.test(voice.language)) s += 1;
  return s;
}

/**
 * The offline English voices on this device, best first. Voices that need the internet
 * are left out so reading aloud works with no Wi-Fi.
 */
export function rankVoices(voices: DeviceVoice[]): DeviceVoice[] {
  return voices
    .filter((v) => isEnglish(v) && !needsNetwork(v))
    .map((v, i) => ({ v, i, s: score(v) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.v);
}

/** The voice id a style asks for, or undefined to use the device's own default voice. */
export function voiceIdFor(style: VoiceStyle, ranked: DeviceVoice[]): string | undefined {
  if (style.pick === 'default') return undefined;
  const voice = style.pick === 'best' ? ranked[0] : (ranked[1] ?? ranked[0]);
  return voice?.identifier;
}

let cached: DeviceVoice[] | null = null;
let loading: Promise<DeviceVoice[]> | null = null;

/** Asks the device for its voices once and keeps the ranked list. */
export function loadVoices(): Promise<DeviceVoice[]> {
  if (cached) return Promise.resolve(cached);
  if (!loading) {
    // Some browsers never answer when they have no voices, so stop waiting after a few seconds.
    const timeout = new Promise<DeviceVoice[]>((resolve) => setTimeout(() => resolve([]), 4000));
    loading = Promise.race([Speech.getAvailableVoicesAsync(), timeout])
      .then((voices) => {
        const ranked = rankVoices(voices ?? []);
        // An empty list can mean the speech engine wasn't ready yet; ask again next time.
        if (ranked.length > 0) cached = ranked;
        return ranked;
      })
      .catch(() => [] as DeviceVoice[])
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

/** The ranked voices if they've been loaded, so speaking never has to wait. */
export function loadedVoices(): DeviceVoice[] {
  return cached ?? [];
}

/** For tests. */
export function resetVoiceCache() {
  cached = null;
  loading = null;
}
