# Growth run 5 (draft): a world that differs by seed, then earned automation

Follows `growth-run-4.md`. Run 4 closed the loops that were open (air, Cinder's reason, recurring storms, aiming ahead at worlds, supply pods). What is missing now is that every game has the same two worlds and a fixed Cinder, and that nothing works on its own once built except machines.

| # | Slice | Link | Status |
|---|---|---|---|
| G27 | **Third pass and suite.** Browser pass of the run 4 work (Cinder core, pods, later storms, domes), full suite, fixes, docs. | Documentation discipline. | After run 4 merges |
| G28 | **Seeded orbits.** Cinder's distance, phase and survey time, and belt altitudes, vary by seed within fair bounds (always reachable by the same probe and kit). | 4A generation; fair start. | Done: Cinder's distance (±10%/+8%, always within a probe's 25 km), starting phase and survey time (±20%) come from the seed; its debris belt follows it. Belt altitudes stay standard. Seed 0 unchanged. |
| G29 | **Body ids as data (part 1).** Not needed as dynamic ids: the catalogue is static and a body can be marked optional. | Bodies are data, finished. | Replaced by G30 |
| G30 | **A seeded extra world.** Ember: a small thin-aired world farther out than Cinder, present in about 60% of non-standard seeds and never in seed 0 (`bodyExists`). The Observatory only hints at and surveys worlds that exist; the Map, kit, pods and outposts treat it like Cinder. | 4D diversity. | Done |
| G31 | **Earned automation: the mining drone.** A drone built at an outpost (after it has run a while, needing research from a find) mines a chosen seam and hauls to the depot on a timer, with fuel and wear, and stops with a plain reason. Manual mining stays faster per kg. | 5B earned, with real fuel and failures. | Planned |
| G32 | **Hands-on pass four and run 6 draft.** | Documentation discipline. | Planned |

Not in this run: ship engineering (Phase 3), new star systems, terraforming, the fun items beyond what is merged (landing grade, pilot voice, contracts, early shower) until the ideal gameplay is settled.
