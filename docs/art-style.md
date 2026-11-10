# How things look

One drawing style for the whole game, so a cupboard, a buddy and a button look like they came
from the same picture book. Everything is drawn in code (no copied art). The values live in
`src/constants/artStyle.ts`; screen colours for text and buttons stay in `src/constants/theme.ts`,
which is checked for contrast.

## The rules

1. **One outline.** Everything drawn gets the same warm dark-brown outline, `INK` (`#4E3324`).
   People and buddies use `inkWidth(size)` so a small figure and a big one look the same;
   room pieces (walls, cupboards, counters) use `INK_ROOM` (3 px).
2. **Soft colours, a few bright ones.** Most of a picture uses the `SOFT` colours (cream, sand,
   peach, sky, mint...). `BRIGHT` colours are saved for the thing you should notice: a Play
   button, a new item, a lit lamp.
3. **One darker shade per colour.** The shadow side of a shape (under an arm, the side of a
   cupboard, the bottom edge of a button) is `shade(color)`, about 18% darker and a bit warmer.
   Highlights use `tint(color)`. No other gradients.
4. **Everyone stands on a shadow.** People, buddies and standing things get a soft oval shadow on
   the floor (`GroundShadow`, colour `SHADOW`). It hides while they are lifted or riding something.
5. **Shiny eyes.** Eyes are dark dots with one small white `SHINE` dot, top right.
6. **Round and chunky.** Big round heads, mitten hands, rounded corners on everything; no sharp
   points except on things that are meant to be sharp (a star, a crown).

## Where it's used

| Step | What | State |
| --- | --- | --- |
| G1 | Shared outline, palette, shades, floor shadows at home and in Community | Built (PR #79) |
| G2 | People and buddy bodies redrawn in SVG; faces take a `mood` | Built |
| G3 | Drawn furniture, food and toys instead of emoji (`DrawnItem`, 20 so far) | Building |
| G4 | Rooms with depth: crown moulding, chair rail and darker lower wall, floorboards, wall shadow on the floor, a front edge | Built |
| G5 | Round buttons with a white ring and shadow, red dots, colour-coded buddy home tabs, white panels on grid paper (`components/Chrome.tsx`) | Built |
| G6 | Drawn menu background patterns | Planned |

## Faces

`PersonFigure` takes `mood`: `smile` (everyday), `happy` (open grin, used while carried),
`sad`, `surprised`, `cross` and `silly`. `Figure` passes it through. Sleeping is still `asleep`.

## Drawn room things

`components/DrawnItem.tsx` draws room things in the outlined style instead of their emoji, in the
room and in the shop list. Each drawing fills a 100 x 100 box standing on its bottom edge, so seats
line up with the item's `seat` height. Small things use `grow()` to fill their box like an emoji.
Add more ids to `DRAWINGS` bit by bit, most-seen first. Drawn so far: couch, chair, bed, TV, plant,
clock, radio, apples, bread, cookies, cupcake, milk, hot cocoa, teddy bear, ball, rubber duck,
blocks, books, backpack, balloon.
