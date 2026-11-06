# Growing the universe: bodies are data

**Goal:** more planets, moons and belts with proper physics, without rewriting the game each time. Today two bodies (Selene, Nacre) are hard-coded across about 30 files.

## What already generalises
- `gravity()` sums every body from `planets(system)`, so adding a body changes gravity everywhere correctly.
- Landing, drift, terrain contact and the camera work from `nearestPlanet`, not from a named body.
- Day and night uses the star's position and each body's spin.

## What is hard-coded
- `BodyId = 'home' | 'moon'` and `CELESTIAL` hold exactly two bodies; `planetAt` places them as a two-body orbit around a shared centre.
- The second colony lives in `world.moon` (22 uses). Anything that wants a third colony has no home.
- `airDensity` reads only the first planet; `ATMOSPHERE` is Selene's.
- Belts (`BELT_IDS`) and sites (`SITE_IDS`) are fixed lists with fixed orbits.
- Sound, light, rendering and the Map list Selene and Nacre by name in a few places.

## Stages (each keeps the game playing exactly as now until the last)
1. **Catalogue (done).** One `BODIES` table: id, label, radius, mu, atmosphere (height, surface density, scale height), spin, and an orbit (around the star, or around a parent body). `planetAt`, `planets`, `airDensity` read it. Still two bodies. Tests unchanged.
2. **Colonies by body (done).** Replace `world.moon` with `world.colonies[bodyId]`; the local-world view and checkpoint follow. Bumps the save version.
3. **A third body (done: Cinder).** Add one far body (an airless dwarf planet with its own orbit and day) to prove the catalogue: it appears on the Map, in light and eclipse, can be landed on, scanned by a probe, and has its own gravity.
4. **Belts and sites as data.** Belts become entries (orbit, rocks, resources); sites hang off them. Probes and scans work on any of them.
5. **Atmospheres by body.** Drag, engine sound and landing rules read the body's own atmosphere.

## Moving targets (probes and flights)
Orbits are predictable, so aiming should be too. Real missions aim at where the target will be, not where it is. Plan:
- A pure `bodyAt(id, time)` for catalogue bodies (exact orbits) and a circular-orbit prediction for belts (rocks stay near circular).
- Marking a point on the Map offers **Intercept**: pick an arrival time, and the mark follows the predicted position of the nearest body at that time. The probe aims there.
- The Map shows the predicted path and the intercept point; the ship's navigation uses the same prediction, so a manual burn can aim at it too.
- Belts already work for probes by pursuit (they steer toward the live position). Prediction makes the burn cheaper and makes marks usable on moving bodies.

## Rules
- Keep `src/sim/` pure; add unit tests for orbit prediction (a body returns to its start after one period) and for gravity from three bodies.
- Do not add content on a new body until the catalogue stage that supports it is done.

## Stage 2 notes (done)
`world.moon` is now `world.outposts[bodyId]` (colony, depot, ground deposits) for every body except the home planet, built from the catalogue. `colonyWorld(world, id)` gives a per-body view of the world, `allColonies` walks the catalogue, research is shared across all colonies (`shareResearch`), and building ids start at a different thousand on each body. Save version 28.

## Stage 3 notes (done)
Cinder is the third body: radius 260 m, gravity 0.9 m/s², airless, circling the shared centre of Selene and Nacre at 22 km (a slow orbit of its own), tidally locked. It has its own colony slot, can be landed on, casts eclipses and is lit like the rest, all from the catalogue with no special cases. It is not given: the Observatory must watch for 420 s (Nacre takes 90 s) before it shows on the Map. Discovery state is `exploration.known` (bodies surveyed), replacing the Nacre-only flag; each body states its own `surveySeconds`. Save version 29.
Not yet: a way to tell the player to look for it (a hint after Nacre is surveyed), content on Cinder, and probes that reach it (probes reach 6 km; Cinder is 22 km out).
