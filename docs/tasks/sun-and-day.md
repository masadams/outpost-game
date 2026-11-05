# Sun and day cycle

**Why:** solar and batteries only matter if there are nights. A light source also lets rocks, buildings and the ground be lit properly, and sets up seasons, eclipses and other planets later.

## Decision (made 2026-11-05, open to change)
- **Add a sun now; do not rotate the planet yet.** The planet keeps its fixed surface frame so flight, landing and terrain stay exactly as they are. Instead the sun moves round the sky once per day, which looks and plays the same from the surface. Real rotation (ground speed, co-rotating air, launch assist) is a later, separate slice.
- **Day length:** 1000 seconds (about 17 minutes) of play, tuned once it can be played. Stored as a constant, not in saves, so it can be retuned.
- **A new game starts mid-morning** so the first sortie is in daylight and the first night arrives after the first delivery, when the player has solar and probably a battery.
- **Solar output follows the sun** at the building: 0 at night, full at noon, smooth through dusk and dawn. Batteries and storage in the existing model carry the player through.
- **The moon (Nacre)** gets its own day from the same sun, using its own surface angle and the time. It is not tidally locked in this slice.
- **Year / orbit round the star** is only a slow change of the sun's direction in a later slice; it has no effect on play yet.
- **Tests and the browser suite** run with the sun off (constant daylight, as before), the same way they run with every feature on. Dedicated tests cover the sun itself.

## The star is a body (added 2026-11-05)
Helia is a real object with a position, a size and a brightness (`src/sim/star.ts`). Light at any point comes from geometry:
- **Direction** is the line from the point to the star, so the sun's height, the rock shading and the sun disc in the sky all come from one source.
- **Brightness** falls as one over distance squared, and is 1 at the usual distance. Solar panels follow it (capped at double), so flying toward the star will one day mean more power and more danger. In a flat 2D world real light would fall off more gently; we use the familiar square law.
- **Shadows and eclipses** are circle overlap: the share of the star's disc hidden by the moon (or by the home planet, for someone on the moon). The moon is bigger in the sky than the star, so eclipses can be total. The first one happens within the first hour or so; roughly one every 55 minutes after that.
- **Night** is the planet blocking the star below the horizon, through the sun's height.

**Why the star circles for now.** The day comes from the planet turning relative to the star. The game's world frame is the planet's own surface frame, which does not spin, so in this frame the star circles once per day (that is the only place the day is decided: `starPosition`). It sits 3,000 km away, so nothing can reach it and its speed in this frame does not matter. When planets get real rotation the world frame becomes inertial, the star stops moving, and `starPosition` becomes a fixed point. Nothing else changes, and a ship can then fly toward it.

## Slices
| # | What | Status |
|---|---|---|
| S1 | `sun.ts`: day phase, sun direction, illumination at a surface angle; solar output and the Base power numbers follow it; a clock chip ("Day · dusk in 3 min 10 s") | Done |
| S2 | Lighting: sky colour and stars by sun height, sun and its glow in the sky, rock shading from the real sun direction, the world dims and buildings glow at night | Done |
| S3 | Eclipses by the moon, the star on the Map, Base power forecast. Moon day works through the same light code | Done |
| S3b | Long-night play tuning | Needs hands-on play |
| S4 | True planet rotation and ground speed (separate decision) | Not started |
