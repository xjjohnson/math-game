# Math Game

A math learning game for kids ages 5-15: flashcards, speed drills, rewards and two-device multiplayer.
Built with Expo, React Native and TypeScript for Android, with a web build for PC.

The full plan lives in [docs/build-plan.md](docs/build-plan.md).

## Status

- [x] Phase 1: scaffold (Expo Router navigation, theme, multi-profile store, settings store)
- [x] Phase 2: math engine and unit tests
- [x] Phase 3: single-player core (10-question rounds, scoring, per-question timers, number pad, streaks, times tables, adaptive difficulty, results and high scores)
- [x] Phase 4: rewards (coins, stars, streak bonuses, daily challenge, day streak calendar, progress screen, sound effect hooks)
- [ ] Phases 5-10: see the build plan

The shop where coins get spent arrives in Phase 5. Sounds are placeholder tones on web and silent on Android until real sound files are added.

## Running it

```bash
npm install
npm run web        # open in a browser on this computer
npm test           # unit tests
npm run typecheck
```

On Android, most of the app runs in Expo Go today (`npm start`, then scan the QR code).
Later phases add native modules (Nearby multiplayer), which need a development build:
`npx expo run:android` with Android Studio installed, or `npx eas-cli@latest build --profile development`.

## Layout

```
src/app         routes (Expo Router); each file just renders a screen
src/screens     Home, Profiles, ModePicker, Play (round + results), Progress, Settings
src/components  BigButton, OptionGroup, ChoiceButtons, NumberPad, FlashCard, TimerBar, StreakCalendar, Screen
src/constants   theme, difficulty configs
src/store       Zustand stores persisted to AsyncStorage
src/utils       mathEngine, gameSession, scoring, adaptive, rewards, progress, dates,
                soundEffects, seededRandom (+ tests in __tests__)
src/types       shared types
src/hooks       useTimer, useGameSession
src/services    multiplayer transports (Phases 7-9)
```
