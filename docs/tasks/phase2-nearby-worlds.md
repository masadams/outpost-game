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
| P2.3 | **First expedition.** Load a rig kit as freight, fly to Nacre, land anywhere, step out, build a rig on a surveyed deposit and fill the hold. Nacre's own gravity and day apply. | Planned |
| P2.0 | **Easier start and batteries.** A new game begins with loose ore from old impacts scattered near the base (iron, copper, ice) for first alloy, wire and fuel. Batteries hold 1200 kJ, enough for two to carry a small base through a night. | Done |
| P2.4 | **Something worth the trip.** One deposit type that is only on Nacre; bringing a sample home and analysing it unlocks one useful upgrade (first candidate: a bigger hold or the pad catch arms). | Planned |

| P2.5 | **Research from what you find.** One loop for every discovery: find something (a storm piece, data from an old derelict, a Nacre sample), study it in the **Research lab** (lab time, power, materials), then **fabricate** what it unlocks. The derelicts already orbiting Selene (survey buoy, copper derelict, fuel tender) become finds with salvage and data; the storm's pieces move from the Base button into the lab. | Planned |

## Research and upgrades (from the bible, section 8.2)
A technology may need a discovery or sample, lab time, material or energy inputs, and fabrication equipment to turn the knowledge into a part. Knowledge is not manufacturing: you can record a discovery long before you can exploit it. The existing research tree and ship parts stay; the focus set brings them back a little at a time, each unlocked by something the player actually found.

## Not in these slices
Probes (2D), expedition energy kits beyond solar plus battery (2E), other worlds.
