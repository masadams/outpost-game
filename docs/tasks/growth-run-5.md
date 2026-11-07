# Growth run 5 (draft): a world that differs by seed, then earned automation

Follows `growth-run-4.md`. Run 4 closed the loops that were open (air, Cinder's reason, recurring storms, aiming ahead at worlds, supply pods). What is missing now is that every game has the same two worlds and a fixed Cinder, and that nothing works on its own once built except machines.

| # | Slice | Link | Status |
|---|---|---|---|
| G27 | **Third pass and suite.** Browser pass of the run 4 work (Cinder core, pods, later storms, domes), full suite, fixes, docs. | Documentation discipline. | After run 4 merges |
| G28 | **Seeded orbits.** Cinder's distance, phase and survey time, and belt altitudes, vary by seed within fair bounds (always reachable by the same probe and kit). | 4A generation; fair start. | Done: Cinder's distance (±10%/+8%, always within a probe's 25 km), starting phase and survey time (±20%) come from the seed; its debris belt follows it. Belt altitudes stay standard. Seed 0 unchanged. |
| G29 | **Body ids as data (part 1).** `BodyId` stops being a fixed union: the catalogue is built at world creation from the standard bodies plus a list the seed adds. Everything keyed by body (outposts, known, pods, surveys) works from the list. No new body yet. | Bodies are data, finished. | Planned |
| G30 | **A seeded extra world (part 2).** Some seeds add a small fourth world with its own orbit, day, seams and survey time; the Map, surveys, kit, pods and probes treat it like Cinder. Standard seed 0 never has one. | 4D diversity. | Planned |
| G31 | **Earned automation: the mining drone.** A drone built at an outpost (after it has run a while, needing research from a find) mines a chosen seam and hauls to the depot on a timer, with fuel and wear, and stops with a plain reason. Manual mining stays faster per kg. | 5B earned, with real fuel and failures. | Planned |
| G32 | **Hands-on pass four and run 6 draft.** | Documentation discipline. | Planned |

Not in this run: ship engineering (Phase 3), new star systems, terraforming, the fun items beyond what is merged (landing grade, pilot voice, contracts, early shower) until the ideal gameplay is settled.
