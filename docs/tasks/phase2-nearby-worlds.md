# Phase 2 — Nearby worlds (first slices)

**Story (roadmap Phase 2):** an observed moon is a physical destination, not a menu. Survey it, fly there, set up a mine, bring something back that matters.

Builds on what is already in the code but hidden in the focus set: surface deposits and mining rigs, the moon Nacre (binary orbit, its own colony), freight, and the Map's route to Nacre. Landing anywhere and printed pilots/wrecks make remote work safe to try.

## Slices
| # | What | Status |
|---|---|---|
| P2.0b | **Earn the Observatory.** The Observatory is not in the build bar at first. After your first industry, the next goal is the Frost survey buoy orbiting about 1.5 km up: fly out, match its speed and press E to download its data. That unlocks the Observatory blueprint, and building it starts the storm story as now. The Observatory shows locked in the build bar until then (day-cycle games only). Coach pointer at the buoy still to do. | Done, except the pointer |
| P2.0c | **Earned build menu.** New players see only Solar array and Refinery. Battery, Storage, Fuel processor and Mining rig appear once industry runs; the Observatory after the buoy; the laser turret once an Observatory exists. Hidden blueprints cannot be picked by number key either. (`src/sim/unlocks.ts`) | Done |
| P2.1 | **Mining rigs back in the focus set.** Surface deposits on Selene show on the ground and in the build bar; a mining rig placed on one extracts ore into the depot while powered, and the deposit runs out. Clear reasons when a rig can't run. | Rig in the build bar; deposit visibility and run reasons to check by playtest |
| P2.2 | **Survey Nacre from the Observatory.** Nacre goes from "seen" to "surveyed" after the Observatory watches it: its gravity, day length and estimated deposits appear on the Map, with uncertainty. This opens the route to Nacre in the focus set. A powered Observatory surveys Nacre after 90 s of watching. | Done |
| P2.3 | **First expedition.** Once Nacre is surveyed the Ship window offers a rig kit (15 alloy, 5 wire, 5 components). Load it on the home pad, pick Nacre on the Map, land on its pad and press E to unload, step out and build a solar array and a mining rig on a marked seam, fill the hold, fly home. The goals "Work on Nacre" and "Return from the moon" now show in the new-player set. Unit-tested only; the full trip is not yet played through in a browser. | Built, needs a playthrough |
| P2.0 | **Easier start and batteries.** A new game begins with loose ore from old impacts scattered near the base (iron, copper, ice) for first alloy, wire and fuel. Batteries hold 1200 kJ, enough for two to carry a small base through a night. | Done |
| P2.4 | **Something worth the trip.** A blue crystal lies about 240 m east of the Nacre pad (walk over it to pick it up, drawn with a slow glow). Back home, Base shows "Nacre crystal": study it with a working Observatory and 20 kJ and your lander gets the bigger hold (+80 kg) for free, and any replacement lander keeps it. (`src/sim/crystal.ts`; save version 24.) Pad catch arms are a later upgrade. | Built, needs a playthrough |

| P2.5 | **Research from what you find.** Base gets a Research section once something has been studied. Three finds, each opens one project and one part: storm pieces → Applied materials → Impact armour; the Frost buoy data → Powered extraction → Powered mining head; the Nacre crystal → Bulk logistics → Bulk cargo hold. Build a Research lab (it appears in the build menu after the first find), start the project, then fabricate and fit the part at the home pad. In day-cycle games only find-opened projects can be researched. (`src/sim/finds.ts`, `src/ui/base/researchView.ts`.) Derelict salvage data and richer finds are later. | Built, needs a playthrough |

| P2.6 | **The second storm and the derelict.** After a quiet spell (500 s) a bigger storm forms: nine bodies, faster, tougher, with its own warning. The missile turret joins the build menu when it forms; the goal "Survive the second storm" is added. The Copper derelict now counts as a find (Derelict data → Propulsion → High-thrust engine). New refineries start on Auto recipe (they pick what the base is short of; "Next recipe" switches it off, a button turns it back on). Save version 25. | Built, needs a playthrough |

## Research and upgrades (from the bible, section 8.2)
A technology may need a discovery or sample, lab time, material or energy inputs, and fabrication equipment to turn the knowledge into a part. Knowledge is not manufacturing: you can record a discovery long before you can exploit it. The existing research tree and ship parts stay; the focus set brings them back a little at a time, each unlocked by something the player actually found.

## Not in these slices
Probes (2D), expedition energy kits beyond solar plus battery (2E), other worlds.
