# Math Learning Game - Full Build Plan

**Platform:** Android phones/tablets (Google Play) + optional PC via web build
**Use:** Personal, sideloaded APK (no store release, no accounts, no analytics, no ads)
**Status:** Phases 1-8 built, plus buddy home, community and kid-test features. The APK rebuilds on each merge to main.

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
- react-native-svg (chalkboard lines, School easel painting and coloring pages)
- expo-audio (sound effects), expo-speech (text-to-speech), expo-haptics (Android)
- expo-updates + EAS Update (over-the-air updates, Expo free plan, project `math-game` in team xjjohnsonxs-team)

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

## Skill Engine (src/utils/skills/)

- K-3 is filled in skill by skill (67 skills, from the K-12 Math Fundamentals guide); grades 4-6 wrap the old engine levels, and the catalog takes grades up to 12
- Each skill has a grade, a strand (counting, adding, taking away, place value, times, sharing, story problems, time, money, measuring, shapes, fractions), a maker and an optional coin bonus
- Subtraction ladder for 2nd grade: no trade, trade a ten (1-digit), trade a ten (2-digit), 3-digit trade once, trade twice, trade across a zero; adding has the matching bundle ladder
- Picture questions (ten-frames, number bonds, base-ten blocks, number lines, arrays, groups, bar models, clocks, coins and bills, rulers, shapes, area grids, fraction bars and number lines) are plain data so every phone draws the same question from the seed
- No settings: grade is the starting point, earlier grades count as known unless they keep going wrong, a skill is learned at 8 of the last 10 right (or the first 5 right) and comes back if it gets shaky
- Each round (Just for me, or one area) is mostly the skill being learned, plus the trickiest known skill and review; Warm up / Just right / Challenge set the mix (4 / 7 / 8 of 10 new)
- +5 stars for each new skill learned (once per skill)
- Profile store v14 adds `skills`

---

## Single Player

- 4 operations, 3 difficulties
- Timers: 10s, 30s, untimed practice
- Answer input: multiple choice for younger kids, number pad for older, set per profile or automatically by difficulty
- Coins and stars for correct answers, streak bonuses, progress tracker, sound triggers on correct answers
- Shop: avatar items, badges, backgrounds, card-flip styles, companions (each buddy has a room to decorate, and can be petted, fed and played with)
- Multiple profiles, parent area behind a fixed 4-digit code (1210, same on every device)

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
- Monster Battle (team): one shared monster, 6 health per player, every right answer is a hit, 2 minutes on the clock
- Relay (team): one player answers at a time and every phone shows that card so the team can help; a right answer passes the baton; 3 laps, 20 seconds per leg
- Pass-and-play on one device (no networking): Take Turns (competition) or Team Up (everyone's right answers hit one monster, 7 health per player)

---

## Android Permissions (Nearby)

- Android 12+: Bluetooth scan/advertise/connect
- Android 13+: nearby Wi-Fi devices
- Older versions: location
- Dedicated permission-check screen, built before multiplayer
- After 30 minutes in the background the app closes itself (stops Nearby, leaves Recents, ends the process). The timer lives in the native Nearby module (`BACKGROUND_LIMIT_MS`) and checks once a minute on the clock that counts while the phone sleeps.

---

## Learning Features

- Adaptive difficulty from recent accuracy
- Weak-spots review (resurfaces missed facts)
- Word problems for the older range
- Count it out: tap-to-count picture of the problem during a round (dots, ten-frames, rows, shared groups, hundreds/tens/ones blocks)
- Learn how: step-by-step lessons on school methods, grouped by area (counting, adding, taking away, place value, times, sharing, story problems, time, money, measuring, shapes, fractions) with a grade on each; 37 lessons, including tens and ones blocks, friendly numbers, break it apart, back to ten, trading across a zero, bar models, tell the time, count coins, make change, area, perimeter and fractions; each ends in a practice round on that skill
- Smart help: a 💡 Help button during play and "Show me how" after a miss. It picks the way that fits the child on that skill: pictures first (blocks, ten-frames, counters), then tricks (number line, count up, break apart, friendly numbers), then the stacked paper method. During the question it leaves the last step for the child (and that answer doesn't count toward learning the skill); after a miss it shows everything and names the slip when it spots one (smaller-from-bigger, forgot the traded ten, no bundle, added instead of times)
- School words throughout: trade, unbundle, bundle and regroup (no borrow or carry)
- Hands-on answers in Play and town jobs: drag the clock hands, fill a coin purse (count up for change); worksheets and two-player games ask the same questions with choices
- Skill map: Progress shows each area's skills as got it / learning now / coming up, tap one to practise it; the Parent area shows the same with tries, right answers, help opened and date learned
- Worksheet mode: all 10 questions on one page, answered in any order with a short pad, marked together at the end (untimed; same coins, stars and high scores, kept separately)

## Motivation

- **Coins are spending money** (per right answer by operation, level and grade; also Community jobs). **Stars are progress:** each round earns stars, and star levels unlock free rewards. Points are gone from play.
- **Navigation:** Home is "Buddy Street" (character + buddy scene, big Play) with a bottom tab bar: Home, Buddy, Town, Shop, Me.

- Daily challenge with bonus reward (60 seconds a question, 90 for K-2nd; right answers under 30 seconds pay +2 coins each, and 7+ speedy answers add +1 star)
- Daily streak calendar (separate from in-session streak)
- Weekly goals that unlock a special badge
- Lolo the hidden axolotl: hides in a new built-in spot each day (buddy home, backyard, town buildings), one per player; found once a day, asks one skill question at the player's grade, pays 15 coins + 1 star (10 coins after a miss); counted finds move Lolo into the living room fish tank (5), and unlock golden (10), wild green (20), a crown (30) and sparkly blue (50)
- Town cars: 100 stars (Number Ninja) gives every car a faster gear; the race car is fastest
- Parent report: accuracy by operation (PIN area)

## Accessibility

- Large typography, extra-large tap targets, high-contrast palette
- Text-to-speech prompts toggle; each player picks a voice bought in the Shop (best offline device voice, with pitch and speed styles)
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

## Updates

- **JavaScript-only changes ship over the air** with EAS Update (channel `production`). On each merge the Android workflow compares the native fingerprint (runtime version) with the released APK's; if it matches, it skips the APK build and runs `eas update`. Phones download it in the background at launch, and Home offers "Restart to get it". Needs the `EXPO_TOKEN` repository secret.
- **Native changes ship as a new APK** (new native libraries, the Nearby module, permissions, icon/name, Expo SDK upgrades, app.json changes). The fingerprint changes, the workflow builds the APK, and the in-app Update now button offers it. Running the workflow by hand always builds an APK.
- **Multiplayer:** phones on different updates can still play as long as `PROTOCOL_VERSION` matches; it is already checked in the hello/welcome handshake. Bump it whenever messages change shape.
- Free plan covers 1,000 monthly active devices with no overage charges, far above family use.

---

## Key Risks

- Nearby has no maintained Expo-ready library I can vouch for; a custom Kotlin module is likely
- Android Bluetooth/nearby permissions are the most common failure point
- Multiplayer cannot be tested on emulators (two physical devices needed)
- Nearby is Android-to-Android only; PC multiplayer needs WebRTC on a shared network or hotspot
- PC version is a browser web app, not a native Windows program
- Scope is large: phases 1-6 ship a complete single-player game first
- Device voices differ per tablet; a tablet with no offline voice downloaded falls back to its default voice

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
- [x] Town driving shared over Nearby (protocol v11, no update needed to visit; older phones just don't see cars): each phone sends its own car spot (map points, heading, car, paint, stripe) about 5 times a second while moving and every 2 seconds while parked, relayed by the host; other phones glide each car between updates and show a name flag; tap a friend's car to honk at it (v11 "honk", relayed to that phone), tap it twice to follow it; a friend who leaves takes their car away
- [x] Stable joining in Community: no screen wipes on internal steps, keep your own things on join, 15 s reconnect grace, tap-to-join bubble (Several phones still uses its own join-or-host)
- [ ] More co-op modes: Monster Battle and Relay on several phones, Team Up on one phone (protocol v3)
- [x] Drivable town (replaces the walk-around street map, src/components/community/DriveTown.tsx): a top-down town drawn in code (TownArt, TownLife) with a road network of 9 crossings and a roundabout (src/utils/roads.ts); cars always stay in the right-hand lane and go round the fountain anticlockwise. Tap to drive (default K-1st): tap a building or road and the car finds the way, with a dotted route line. Wheel and GO pedal (default 2nd up): hold GO to drive, turn the wheel the way you want at the next crossing (an arrow on the road shows which way), a turn-around button; arrow keys or WASD and space to honk on a computer. The camera follows the car looking ahead; drag to look around, pinch or +/- to zoom. Park at a building's spot and tap Go in (zooms into the door); Walk mode is the old look-around map (tap a building to go in). Where to? lists every place. Car wash, gas pump and a bakery drive-through window are fun stops with no math. Two empty "Coming soon" lots for later buildings. Day and night from the phone's clock (lamps and windows light up). Fountain, chimney smoke, ducks, a walker, a bird and cloud shadows move (still with Animations off)
- [x] Community: full-screen scrolling Toca-style street and building interiors (school, shop, bakery, library, park, farm); opening it is always solo; each phone quietly offers a visit and shows nearby friends, and one tap on "Join" joins a friend's visit (no automatic role switching). Starting, retrying and short drops never clear the screen; joining keeps your own chalkboard, easel and room; a dropped link gets 15 seconds to reconnect; everyone in a building stands in the room as their character with their buddies and an accessory, and each player moves only their own person and buddies, live (protocol v6; the host ignores moves for anyone else's pieces)
- [x] Join or host for Community and Several phones: look once at start, join a host or host and stay; two lonely hosts merge (tag in the advertised name, smaller tag gives way; a host with friends never does)
- [x] A host never gives way to an older phone with no tag (it starts over and joins by itself)
- [x] Shop and Bakery jobs: customer scene, "Give back: ?", tap green US dollar bills ($1-$100, no $2) onto the counter, hint and a second try (grade 1 up)
- [x] Realistic customer payments: the smallest single bill that covers the price or the fewest bills that cover the price, never exact, no unneeded bills; "That's $X" shown under the bills
- [x] Community street shows the bottom tab bar, so there is always a way back
- [x] Community jobs always pay: first play of the day full pay plus bonus (5 coins or 2 hearts), same-day replays 1 coin per right answer
- [x] Community buildings 3 screens long (park and farm 3.4) with 100+ movable things that land on shelves; shared over Nearby (ids starting "~"; anyone may move them)
- [x] Bakery baking: 12 ingredients dropped on a mixing bowl go in it and spring back to their shelves (contents and finished treats kept as shared switches; no protocol change), wrong mixes give funny messes, bowl on the stand mixer and tap it to mix (unmixed food bakes into a lumpy mess), bowl into the hot oven for 3 s, and the recipe (cake, cookies, pie, bread, pancakes and more; src/utils/bakery.ts) comes out on the rack; tap it to eat
- [x] Community rooms take several fingers at once like the buddy home (one finger carries, another scrolls; edge-scroll while holding)
- [x] Tap-to-use things: school bell and easel, shop fridge and till, bakery mixer and oven (bakes dough), library lamp and math computers, park swings
- [x] Park playground: drop yourself or a buddy on a swing to sit and swing, at the slide to climb the ladder and slide down, in the tree to sit on a branch, or in the pond to swim; worked out from spots alone (src/utils/park.ts), so it shows on every phone with no protocol change
- [x] Library books: tap any of the 27 shelf books to read it (big words, page arrows, Read to me); 18 easy stories, and 9 story books that hide all 15 bakery recipes as "secret recipe" pages built from src/utils/bakery.ts; the open book on the rug is a guide (src/utils/libraryBooks.ts; reading is on this phone only, no store or protocol change)
- [x] Visit a friend's buddy home over Nearby (read-only copy, moves not saved; protocol v7 home-ask and home messages, relayed through the host)
- [x] You come along on a home visit: your character plus the buddies picked in Bring (or the buddy in use if never picked) stand just inside the friend's front door, drawn with their home body colors and outfits, and can be dragged anywhere like the friend's things. Shown on the visitor's phone only (no protocol change); ids `guest~me` / `guest~<item id>` (utils/homeVisit.ts `guestsOf`)
- [x] School, a fifth building next to the corner shop (protocol v8; place and building id "school"; street 3.4 screens long; phones older than v8 are asked to update before visiting): chalkboard you draw on with one or more fingers (5 chalk colors, eraser, Wipe), shared live with everyone on the visit (v8 "chalk" and "chalk-wipe" messages, relayed and kept by the host, sent to newcomers on join; lines up to 120 points, 250 lines kept); teacher's desk, 3 pupils' desks, number line; school job "Teacher asks" (K adds, 1st adds/subtracts, 2nd adds times, 3rd up all four); Learn how button inside
- [x] Chalkboard draws each line as one smooth SVG path (react-native-svg) instead of many small bars, so a full board stays fast; messages unchanged
- [x] School easel in the Color corner (protocol v10, no update needed to visit; older phones just paint alone): tap the easel to open it full screen. Free paint on blank paper (13 colors, 3 brush sizes, rub out, paint bucket, Undo of your own last action, New paper); 8 coloring pages (house, flower, rocket, fish, cat, turkey, pumpkin, butterfly) with tap-to-fill areas, outlines always drawn on top; color by number on any page with Easy (+), Medium (+/−) and Hard (×/÷) sums, level picked from the player's grade, Check flashes the areas still wrong; Save to My pictures (12 per player, kept in their own store `math-game.paintings`, lines simplified to at most 6,000 points), open again, delete, and Hang it in the buddy's home as a framed picture (hidden room item `myPicture`, thing key `art-<id>`); the easel in the room shows the current picture. Shared live on a visit: v10 "paint" (batched actions under 20 KB), "paint-undo" and "paint-page" messages, relayed and kept by the host, sent to newcomers on join
- [x] Farm, a sixth building after the park (protocol v9; place and building id "farm"; farm 3.4 screens long, street 4 screens; phones older than v9 are asked to update before visiting; spot limit raised to 320): barn with hay loft, silo, hen house, pen with mud puddle, duck pond, vegetable patch, windmill (tap to spin), tractor; 17 animals you can drag and tap (hop and say their sound, out loud when Sounds are on), animals in the mud roll about and in the pond bob; drop food on an animal and it says "Yum!"; drag eggs into the egg basket to count them (count kept as a shared switch); farm job "collect eggs": tap single eggs, boxes of 10, crates of 100 or trucks of 1000 into a basket until it holds the answer to a grade-level egg story (K counts and adds, then the same operations as the school), hint and a second try, pays coins

### Profiles
- [ ] Multiple kid profiles on one device, each with its own coins and progress (Phase 1 store design)
- [ ] PIN-protected parent area (Phase 6)

### Learning features
- [ ] Adaptive difficulty based on recent accuracy (Phase 3)
- [ ] Weak-spots review (Phase 6)
- [ ] Times-tables mode (Phase 3)
- [ ] Word problems for the older range (Phase 6)
- [x] Counting aid during play (kid-test feedback)
- [x] Learn how lessons on school methods (kid-test feedback)
- [x] Worksheet mode: many questions per page, check at the end (kid-test feedback)
- [x] K-3 skill engine with automatic next skill (no parent settings)
- [x] Smart help that picks the strategy (pictures, tricks, paper) and spots common slips
- [x] School words: trade, unbundle, bundle, regroup
- [x] Skill map on Progress and in the Parent area
- [ ] Fill in grades 4-12 skill by skill (catalog and engine are ready)
- [x] Set the clock by dragging the hands (snaps to 30 / 5 / 1 minutes by grade) and time passing for 3rd grade
- [x] Coin purse: make an amount, and make change by counting up
- [x] Town jobs ask from the skill list (school: what they're learning; shop: money; bakery: measuring, time, fractions; library: stories; park: counting and shapes; farm: open a box of 10 eggs to take some out). Kindergarten keeps the adding jobs. Town answers count toward learning skills.

### Motivation and retention
- [ ] Daily challenge with bonus reward (Phase 4)
- [ ] Daily streak calendar (Phase 4)
- [ ] Weekly goals that unlock a special badge (Phase 5)
- [ ] Parent report of accuracy by operation (Phase 6)
- [x] Daily hidden axolotl (Lolo): utils/axolotl.ts, components/Axolotl.tsx, AxolotlFind.tsx; profile.axolotl optional, no store bump, OTA only

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
- [x] Buddy room in a side-view dollhouse style: 20 things to buy with coins (furniture, toys, food bowl, decorations), drag to place, toy box to put away, free wall and floor colors
- [x] Buddy home that scrolls left and right through a living room, kitchen and bedroom (each with its own free paint), several buddies home at once, 45 everyday things in shop shelves, and 10 Halloween things sold only in October (bought ones stay all year); drag a thing to the side to carry it to the next room
- [x] Full-screen buddy home with tabs along the bottom (Care, Shop, Toy box, Buddies, Paint) that open drawers
- [x] Things to play with in the home: kitchen cupboards, oven, fridge, freezer and a bedroom wardrobe open and shut, with shelves to keep small things on; front door and curtains open; lamps switch on; tapping things makes them do something
- [x] Furniture to use: tables, coffee table, nightstand and dresser to set things on; couch, chair, stool, bench, beanbag and bed (naps) for buddies to sit on; buddies hold one small thing each
- [x] 10 Thanksgiving things sold only in November (same rule as Halloween), with fall leaves outside
- [x] People buddies (girl, boy, kid, mom, dad, grandma, grandpa, baby; several skin tones, everyday clothes) in the Shop
- [x] Buddy bodies (face as the head, fur-colored body, arms that hold things, feet) and 22 clothes and accessories (hats, glasses, neck, shirts, shoes) in a Dress up tab; bought once, any buddy can wear them, each buddy keeps its own outfit (profile store version 9)
- [x] People drawn in a Toca-style cartoon look (round head, dot eyes, rosy cheeks, separate hair) with free Hair, Hair color, Beard and Skin tabs in Dress up; tops, dresses and bottoms come off (undershirt underneath) with an All off button, and each person starts in their own outfit (profile store version 10)
- [x] Shop has ready-made family characters (Mom, Dad, Little sister, Big sister) drawn like the family photo; Shop, Buddies and Home tiles show every person as their drawing instead of an emoji
- [x] Bigger home: 5 rooms (living room, kitchen, bedroom, bathroom, playroom), each about 2.5 screens wide, with more windows, cupboards, tables and shelves; light switches in every room and a desk lamp (the other tap-stickers on the walls were taken out at Justin's request); two buddies can be dragged at once with two fingers; a Hide button turns off the name and tips at the top (profile store version 11)
- [x] Drawn appliances in every room, like the kitchen's: a fireplace that lights and a TV on a cabinet (living room), a dresser with drawers (bedroom), a bathtub with shower, a toilet and a washing machine (bathroom), and a TV, ball pit and chalkboard (playroom); cabinets, dresser and washer open to store things, and the mantel and tops hold things; with the lights off, a lit fireplace, candle, lamp or desk lamp lights up the dark around it; firelight, flames and candle flames flicker and sway (still when Animations are off); candles are drawn (wax, wick, flame) and a plain Candle is sold all year in Living
- [x] Using the built-ins: buddies can be dropped into the bathtub (bubble bath when the water runs), onto the toilet (flush) and into the ball pit (it jiggles, and bounces when tapped); doors swing open to the side, with milk and juice in the fridge door; the washing machine's buttons start a wash (drum spins, machine shakes, stops by itself); the desk lamp and Lamp are drawn lamps instead of an oil-lamp emoji
- [x] While one finger holds a person or thing, a second finger on the background slides the home along, and what's held stays under its finger
- [x] Animations, batch 1: buddies and people breathe in place (slower while napping on a bed, with a drifting 💤), people blink, tapping a buddy makes it hop and wave, tapped things wiggle, dropped things land with a squash, tap pictures float up and fade, things added to the home pop in, a level-up throws confetti; in a round the buddy hops for right answers and shakes its head after misses, the feedback line pops in, and a notable round end throws confetti. All of it stops when Animations is off in Settings (or the device's reduce motion is on)
- [x] Animations, batch 2 (one approach for the whole app, written up in docs/animation.md): in Community the people and buddies breathe, blink, walk to where they're put instead of jumping (friends' moves too), hop and wave when waving, and squash a little when put down; things slide to where they land; bodies match the buddy home (each buddy in its own colors and clothes, people buddies and people avatars drawn as whole people); a buddy standing by the bakery mixer runs it for you (pulls the bowl over, mixes, rocks while it works, "Mixing! 🥄"); on Home your character and buddy breathe, and tapping your character makes it hop
- [x] A buddy dragged onto the bakery mixer hangs off the end of its arm and swings while it mixes the bowl for you
- [x] Cars for the town (My car menu, src/constants/cars.ts, all original drawings in CarDrawing.tsx): little round car and pickup truck free; ice cream van 60, school bus 80, bakery van 60, farm tractor 50 coins; fire truck at 50 stars and race car at 175 stars (stars never spent). 8 free paint colors, rainbow stripe 30 coins once. Buddies ride along (up to the car's seats). Choice saved as optional `profile.garage` (no store version change)
- [x] 3D printer (buddy home, Appliances shelf, 150 coins): filament spools 10 coins = 3 prints (red, blue, green, yellow, purple, white); pick a toy and color, answer one printer check question from the child's skill list (wrong = help and another question, no filament lost; counts toward skills), then about 8 seconds of printing (head zig-zags, toy builds up in layers, spool turns, toy pops out onto the floor). 12 original toys drawn in code, unlocked by stars (never spent): star/heart/boat/cat at start, dinosaur/race car 25, rocket/robot 50, octopus/castle 100 + glow-in-the-dark filament, dragon 175, trophy 275 + rainbow filament. Printed toys are normal room things (item id print-<toy>-<color>), shown on home visits. Profile store version 15; no Nearby protocol change
- [x] Tree house treasure chest gives 10 coins once a day per player (first open each day, coin shows on the closed chest while ready; later opens say "Come back tomorrow for more coins"). Claimed day saved in optional profile field treeHouseCoinsDay; no store version bump, no Nearby protocol change
- [x] Tree house sleeping bags: 3 free bags (red, blue, green) hang rolled up on wall pegs; tap to roll out or up, drop a buddy on one to climb in (head on the pillow), lights off = eyes closed + Zzz, everyone in (or all 3 bags full) = Sleepover goodnight, lights on = wake-up stretch; tap to hop out or drag out. Positions not saved. Colored floor cushions removed, ground shadows instead. No store bump, no Nearby protocol change
- [x] Voices shelf in the Shop (coins): Classic free; Clear Teacher 40, Friendly Storyteller 60 (best offline device voices); Chipmunk 50, Giant 50, Robot 60, Grandpa 60, Grandma 60 (pitch and speed styles); Listen before buying; each player keeps their own and it reads everywhere (questions, help, lessons, books, town); Parent area Voice check lists the offline voices found. Ships over the air (profile store version 16, no Nearby protocol change)
- [x] Story Voice: two natural voices, Story Voice: Woman and Story Voice: Man (Piper en_US-hfc_female-medium and en_US-hfc_male-medium), 200 coins each, run on the tablet with sherpa-onnx in a local module (modules/math-voice), reading everywhere for the player who owns one. The Android workflow downloads the library and voices at build time (not in git), so it needs a new APK (about 120 MB bigger). Older APKs, the web and PC hide these two voices. A voice is loaded the first time it speaks, and only one at a time

---

## Open Question

Is PC solo-only, or does it also need multiplayer? If solo only, drop Phase 9 and the WebRTC transport entirely.
