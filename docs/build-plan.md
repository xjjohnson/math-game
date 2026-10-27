# Math Learning Game - Full Build Plan

**Platform:** Android phones/tablets (Google Play) + optional PC via web build
**Use:** Personal, sideloaded APK (no store release, no accounts, no analytics, no ads)
**Status:** Planning only. Nothing has been built or run.

---

## Original Requirements Summary

Cross-platform interactive math learning game for kids (ages 5-15), React Native with Expo and TypeScript.

- Flashcards across Addition, Subtraction, Multiplication, Division
- Difficulty: Easy (1-digit), Medium (2-digit), Hard (3-digit / mixed)
- Speed drills: 10s, 30s, or untimed practice
- Star/coin rewards, streak bonuses, unlockable avatar items and badges in a shop
- Visual progress tracker and positive sound effects
- Offline local storage (AsyncStorage) for high scores, unlocks, streaks, profile stats
- Two-device multiplayer: Head-to-Head Race (first to 10 correct) and Co-op Defense (shared score bar vs. timer)
- Vibrant, high-contrast UI, extra-large tap targets, Reanimated animations
- Large typography and optional text-to-speech for younger kids
- Modular folders, a math engine guaranteeing clean integer results, placeholder sound triggers, modular multiplayer service wrappers

---

## Stack

- Expo + TypeScript (custom dev build, not Expo Go), Android target + web target
- Expo Router navigation
- Zustand + persist middleware on AsyncStorage (coins, stars, streaks, unlocks, high scores, profile stats, settings)
- React Native Reanimated (card flips, answer pops, celebrations)
- expo-audio (sound effects), expo-speech (text-to-speech), expo-haptics (Android)

---

## Folder Structure

```
/src/components   reusable UI (FlashCard, BigButton, NumberPad, ChoiceButtons, StarBar)
/src/screens      Home, ModePicker, Play, Shop, Profile, Settings, ParentArea, Lobby
/src/hooks        useTimer, useGameSession, useProfile, useReducedMotion
/src/utils        mathEngine.ts, soundEffects.ts, scoring.ts, seededRandom.ts
/src/types        shared TypeScript types
/src/services     multiplayer.ts (transport interface), transports/
/src/store        Zustand stores (profiles, progress, shop, settings)
/src/constants    theme, palettes, shop catalog, difficulty configs
```

---

## Math Engine (src/utils/mathEngine.ts)

- Pure functions, no UI dependencies, seedable
- `generate(operation, difficulty, rng)` returns `{ prompt, answer, choices? }`
- Division: pick divisor and quotient first, multiply for dividend (always an integer)
- Subtraction: never negative on Easy/Medium
- Easy = 1-digit, Medium = 2-digit, Hard = 3-digit/mixed (3-digit multiplication capped to sensible sizes)
- Times-tables mode: pick specific tables
- Unit tests, including "every division result is an integer" over thousands of seeds

---

## Single Player

- 4 operations, 3 difficulties
- Timers: 10s, 30s, untimed practice
- Answer input: multiple choice for younger kids, number pad for older, set per profile or automatically by difficulty
- Coins and stars for correct answers, streak bonuses, progress tracker, sound triggers on correct answers
- Shop: avatar items, badges, backgrounds, card-flip styles, companions (each buddy has a home to pet, feed and play with)
- Multiple profiles, PIN-protected parent area

---

## Multiplayer (one interface, three transports)

**Interface:** `discover()`, `host()`, `connect(peerId)`, `send(message)`, `onMessage(cb)`, `disconnect()`

1. **MockTransport** - same-device testing, built first
2. **NearbyTransport** - Android to Android, no Wi-Fi/internet needed (Google Nearby Connections via custom Expo native module, Kotlin + config plugin)
3. **WebRTCTransport** - PC <-> phone/tablet over shared Wi-Fi or hotspot, QR/short-code pairing (only if PC multiplayer is wanted)

**Rules:**
- Game logic never touches a transport directly
- Both devices share a seed and generate identical problems locally
- One device is host and decides winner / co-op timer result
- Only small events are sent: `{ type: 'answer', cardIndex, correct, playerId }`

**Modes:**
- Head-to-Head Race: first to 10 correct wins
- Co-op Defense: shared score bar, clear waves before the timer expires
- Pass-and-play on one device (no networking)

---

## Android Permissions (Nearby)

- Android 12+: Bluetooth scan/advertise/connect
- Android 13+: nearby Wi-Fi devices
- Older versions: location
- Dedicated permission-check screen, built before multiplayer

---

## Learning Features

- Adaptive difficulty from recent accuracy
- Weak-spots review (resurfaces missed facts)
- Word problems for the older range

## Motivation

- Daily challenge with bonus reward
- Daily streak calendar (separate from in-session streak)
- Weekly goals that unlock a special badge
- Parent report: accuracy by operation (PIN area)

## Accessibility

- Large typography, extra-large tap targets, high-contrast palette
- Text-to-speech prompts toggle
- Dyslexia-friendly font option
- Colorblind-safe palette toggle
- Reduce-motion toggle (also respects OS setting)
- Haptics on correct/wrong (Android)

---

## Build Phases

1. **Scaffold:** Expo + TS, folders, theme, navigation, store (multi-profile ready), confirm web build runs
2. **Math engine + unit tests**
3. **Single-player core:** modes, difficulty, flashcards, input styles, timers, streaks, times-tables, adaptive difficulty
4. **Rewards:** coins, stars, streak bonuses, progress tracker, sound triggers, daily challenge, daily streak calendar
5. **Shop and avatar:** items, badges, backgrounds, flip styles, companions, weekly goals
6. **Polish:** Reanimated animations, accessibility options, text-to-speech, parent area, weak-spots review, word problems
7. **Permission screen + Nearby prototype:** two physical Android devices connect and exchange a message BEFORE any multiplayer game code
8. **Multiplayer:** transport interface + mock, NearbyTransport, Head-to-Head, Co-op Defense, pass-and-play
9. **WebRTC transport for PC** (only if PC multiplayer is wanted)
10. **Device testing and APK build**

Phases 1-6 deliver a complete single-player game before any native Bluetooth work, so the riskiest part cannot block the rest.

---

## Key Risks

- Nearby has no maintained Expo-ready library I can vouch for; a custom Kotlin module is likely
- Android Bluetooth/nearby permissions are the most common failure point
- Multiplayer cannot be tested on emulators (two physical devices needed)
- Nearby is Android-to-Android only; PC multiplayer needs WebRTC on a shared network or hotspot
- PC version is a browser web app, not a native Windows program
- Scope is large: phases 1-6 ship a complete single-player game first

---

## Todo List

### Answer input
- [ ] Multiple choice buttons for younger kids, number pad for older, chosen per profile (Phase 3)
- [ ] Automatic switching by difficulty (Phase 3)

### Multiplayer
- [ ] Verify all target tablets have Google Play Services (confirmed: Google Play tablets)
- [ ] Android permission-check screen (Bluetooth, nearby devices, location by OS version)
- [ ] NearbyTransport via custom Expo native module (Kotlin + config plugin)
- [ ] Two-device Nearby prototype before multiplayer game code
- [ ] Pass-and-play on one device (Phase 8)
- [ ] WebRTC transport for PC multiplayer (Phase 9, only if wanted)
- [ ] LAN WebSocket fallback if WebRTC pairing is flaky (only if needed)
- [ ] Keep MockTransport for solo testing of multiplayer logic

### Profiles
- [ ] Multiple kid profiles on one device, each with its own coins and progress (Phase 1 store design)
- [ ] PIN-protected parent area (Phase 6)

### Learning features
- [ ] Adaptive difficulty based on recent accuracy (Phase 3)
- [ ] Weak-spots review (Phase 6)
- [ ] Times-tables mode (Phase 3)
- [ ] Word problems for the older range (Phase 6)

### Motivation and retention
- [ ] Daily challenge with bonus reward (Phase 4)
- [ ] Daily streak calendar (Phase 4)
- [ ] Weekly goals that unlock a special badge (Phase 5)
- [ ] Parent report of accuracy by operation (Phase 6)

### Accessibility
- [ ] Dyslexia-friendly font option (Phase 6)
- [ ] Colorblind-safe palette toggle (Phase 6)
- [ ] Reduce-motion toggle that respects the OS setting (Phase 6)
- [ ] Haptic feedback on correct and wrong answers, Android only (Phase 6)

### Shop content
- [ ] Avatar items (Phase 5)
- [ ] Themed backgrounds and card-flip styles (Phase 5)
- [ ] Pets or companions that react to answers (Phase 5 or later)
- [x] Bluey and Stitch avatars and buddies (fan-style drawings for family use only; kid request 2026-10-23)
- [x] Themed backgrounds with faint pictures: space, ocean, jungle, candy, dinos, rainbow, snow, backyard, beach
- [x] More buddies (bunny, panda, fox, penguin, octopus, unicorn) and a "My buddy" home: pet, treats, a fetch math game, hearts, levels 1-5 with a gift worn at each level

---

## Open Question

Is PC solo-only, or does it also need multiplayer? If solo only, drop Phase 9 and the WebRTC transport entirely.
