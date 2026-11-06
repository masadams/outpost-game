# Growth run: slices in order

Direction from the playtest review: grow the universe on solid physics before ship engineering. Each slice below is small, keeps the game playing, is unit-tested, and is merged on its own. Check each against the design bible (sensors earned, no opaque gates, depth before breadth) before starting.

| # | Slice | Why | Status |
|---|---|---|---|
| G1 | **Belts and sites as data** (bodies-are-data stage 4). Each belt names the body it circles, its altitude, phase, rocks and resources; sites hang off a belt. Prove it with a new belt around Cinder. | A new place becomes one table row, not code. | Done: belts name the body they circle, their spacing and resources; Cinder debris added (hidden until Cinder is found, out of probe reach). Sites still tied to the three original belts. |
| G2 | **Atmospheres by body** (stage 5). Air density, drag, engine voice and landing rules read each body's own atmosphere. | A future air world needs no special cases. | Planned |
| G3 | **Orbit prediction and intercept marks.** `bodyAt(id, t)` for catalogue bodies, circular prediction for belts; the Map offers Intercept (pick arrival time) and probes lead their target. | Moving targets work the way real missions do. | Planned |
| G4 | **Reaching and finding Cinder.** A hint once Nacre is surveyed that more is out there; probes reach any known body; first reason to go (a rare seam only on Cinder). | Gives the third body a purpose. | Planned |
| G5 | **Seeded variation** (roadmap 4A, small). Belt rock layouts and deposit sizes come from a hierarchical seed so a fresh game can differ but is repeatable. | Foundation for generated systems. | Planned |

Rules for the run: unit tests for every new rule, the browser specs that touch the area, docs updated, one merge per slice, no new mechanics outside the table.
