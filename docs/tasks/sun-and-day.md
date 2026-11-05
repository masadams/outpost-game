# Sun and day cycle

**Why:** solar and batteries only matter if there are nights. A light source also lets rocks, buildings and the ground be lit properly, and sets up seasons, eclipses and other planets later.

## Decision (made 2026-11-05, open to change)
- **Add a sun now; do not rotate the planet yet.** The planet keeps its fixed surface frame so flight, landing and terrain stay exactly as they are. Instead the sun moves round the sky once per day, which looks and plays the same from the surface. Real rotation (ground speed, co-rotating air, launch assist) is a later, separate slice.
- **Day length:** 12 minutes of play (a minute of that is dusk and a minute dawn), tuned once it can be played. Stored as a constant, not in saves, so it can be retuned.
- **A new game starts mid-morning** so the first sortie is in daylight and the first night arrives after the first delivery, when the player has solar and probably a battery.
- **Solar output follows the sun** at the building: 0 at night, full at noon, smooth through dusk and dawn. Batteries and storage in the existing model carry the player through.
- **The moon (Nacre)** gets its own day from the same sun, using its own surface angle and the time. It is not tidally locked in this slice.
- **Year / orbit round the star** is only a slow change of the sun's direction in a later slice; it has no effect on play yet.
- **Tests and the browser suite** run with the sun off (constant daylight, as before), the same way they run with every feature on. Dedicated tests cover the sun itself.

## Slices
| # | What | Status |
|---|---|---|
| S1 | `sun.ts`: day phase, sun direction, illumination at a surface angle; solar output and the Base power numbers follow it; a clock chip ("Day · dusk in 3:10") | Planned |
| S2 | Lighting: sky colour and stars by sun height, sun and its glow in the sky, rock and ground shading from the real sun direction, buildings dim and show lamps at night | Planned |
| S3 | Moon day, long-night play tuning, eclipses by the moon, Map and Base power forecast | Planned |
| S4 | True planet rotation and ground speed (separate decision) | Not started |
