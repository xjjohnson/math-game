# How things move

One set of moves for the whole app, so a buddy acts the same at home, in Community, on a visit and in a round.
Every piece lives in `src/components/Motion.tsx`, runs on Reanimated (smooth, off the main thread), and
stops when Animations is off in Settings or the phone's reduce-motion setting is on (`useMotion`).

## The rules

1. **Anything alive breathes.** People and buddies standing still use `Lively` with `breathe` (slower
   while asleep). People blink (`alive` on `PersonFigure`). Each one gets its own `seed` so a crowd
   doesn't breathe in step.
2. **Nobody teleports.** A person, buddy or thing that changes spot walks or slides there with `Glide`
   (a waddle and small bounce per step for people and buddies, a plain slide for things). While a
   finger carries it, it follows the finger exactly. Moves from friends' phones glide too.
3. **Picked up = dangle; put down = fall and land.** Carried people and buddies hang from the finger and
   swing behind it like a pendulum, stretching a little and grinning (`Glide` with `dangle`, `happy` on
   `PersonFigure`). Let go up high, they fall to the floor (or onto the seat under them), speeding up as
   they drop, and squash when they touch down (`Glide` with `land`). Things squash on landing too.
4. **Tap = react.** Tapping a person or buddy makes it hop and wave an arm (`useArmWave`);
   tapping a thing wiggles it.
5. **Working = busy.** Someone doing a job bobs and rocks while it runs (`Busy`), with a short bubble
   over their head saying what they're doing ("Mixing! 🥄").
6. **Machines show they're on.** Running things shake (`Rumble`), spin (`Spin`), flicker (`Flicker`),
   bob (`Bob`) or swing (`Swing`), and stop when switched off.
7. **One body everywhere.** People and buddies are drawn with `Figure` (from `figureFor` in
   `src/utils/figures.ts`): your own buddies wear what they wear at home; a friend's come in their
   own colors and starting clothes.
8. **Dressing up poofs.** A piece of clothing put on (tapped in Dress up or dropped on someone) pops on
   in a little cloud (`Poof`) and the wearer stretches up (`bounceKind="pop"`); the piece it replaced
   falls off, bounces on the floor and fades (`Tumble`), since it went back to the wardrobe.
9. **Celebrations are short.** `Confetti`, `FloatUp` and `PopIn` play once and get out of the way.

## Where it's used

| Place | What moves |
| --- | --- |
| Buddy home, tree house and home visits | breathe, blink, nap, hop + wave on tap, dangle while carried, fall + land on drop, pop in, appliances, firelight |
| Community (street and every building) | breathe, blink, walk to new spots, hop + wave on wave, dangle while carried, fall + land on drop, things slide, park rides, farm animals, buddy at the mixer |
| Home (Buddy Street) | your character and buddy breathe; tap your character to hop |
| Rounds | buddy hops on right answers, shakes its head after misses, feedback pops in, confetti |

## Next ideas (not built yet)

- Walking with legs that step, instead of a waddle.
- Buddies that wander a little on their own when left alone for a while.
- Cupboard and oven doors that ease open instead of snapping.
- Buddies helping with other jobs (stacking shelves in the shop, reading in the library).
