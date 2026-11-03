# Nearby worlds — Phase 8.5 implementation plan

Task 010 follows merged shield PR #20. This document defines the next implementation, not features already available in alpha 0.14. Begin with home plus one airless moon, retaining one continuous Cartesian simulation and manual flight. The full graphics/UX/UI overhaul remains Phase 9.

## Physical model

Keep home radius 1800 m, surface gravity 5 m/s² and the existing 1200 m atmosphere. Start tuning the moon at radius 450 m, surface gravity 1.6 m/s², no atmosphere and 9500 m centre separation. These are provisional playtest parameters; validate transfer duration, fuel costs and useful work before freezing them.

Use a documented circular two-body orbit around their common barycentre. Derive each source's mass ratio from its gravitational parameter (μ = surface gravity × radius²), and orbital angular rate from sqrt((μ_home + μ_moon) / separation³). Offset the fixed barycentre so home starts at the existing origin. Both source centres move; initial actors inherit their source's actual velocity. Store simulation time/epoch and derive consistent body positions/velocities. Do not orbit a moon around an artificially stationary home while treating their mutual acceleration differently in ship physics.

Every physical actor samples the sum of both finite-core gravity fields. Within each uniform-density core, its own acceleration is linear and finite; the other source still contributes. Moving-source fields can exchange energy with a test particle, so do not assert that an isolated ship's inertial energy remains constant during a transfer. Test the analytic source separation/period and appropriate bounded integration error instead. Planet recoil from individual ships is outside this massless-actor approximation.

Introduce explicit body IDs/configuration and small shared frame helpers before changing consumers. Each body's terrain, pad, atmosphere, colonies and deposits use that ID. Sweep actor motion relative to each body's start/end centre and resolve the earliest surface contact. Landing classification, parked state, walking, takeoff and boarding use surface-relative velocity. Atmospheric drag uses air moving with its source. Camera/instrument body selection needs hysteresis and gradual local-up changes; it must not change the forces or teleport actors. Keep the current nonrotating surfaces initially; orbital translation alone already requires consistent attachment.

## Supplied remote work

Give the moon a distinct finite mining opportunity. Store each colony's buildings, seams, products, raw depot, energy, research/work and habitat/shield state locally. Tick all colonies; changing the viewed body changes only the interface. Solar, turrets, service, domes, queues and stock reserves must not borrow another world's grid/materials.

The current ship carries raw ore only, so add manufactured freight explicitly before remote construction. Loading at a supplied local depot removes real products; freight shares the ship's cargo capacity and adds mass. Unloading transfers to the local depot within real storage and proximity limits. Starting on a new world grants no second fabrication kit. Cancellation/salvage/recovery must not duplicate transported stocks. Research knowledge may be shared intentionally, while samples, work energy and manufactured equipment remain paid; document that choice in the implementation.

A moon visit should consume fuel and suit air, justify bringing supplies, and permit a useful return. Home-return guidance and a bounded supplied recovery path prevent a silent permanent softlock. Recovery cannot teleport moon cargo to home, restore consumed source stocks or fill upgraded capacities for free.

## Integration audit

- `environment`, `physics`, `bodies`, `meteor`, `combatProjectiles` and exploration-site motion currently assume the origin is the only source/surface.
- `surface`, `astronaut`, colony placement/service, geology, habitats/shields, turrets and damage currently assume one planet radius and one colony bus.
- Towing constraints must use consistent inertial positions/velocities across source boundaries; tractor/mining line-of-sight must consider both terrains.
- HUD/flight safety, coast/threat prediction, navigation destinations, radar, camera and planet/atmosphere drawing need the same body/frame definitions.
- Checkpoint validation must cover current body/colony/freight state and simulation time; older formats may be reset. Preserve current-version paused continuation rather than implementing legacy migrations.

Do not expose moon buttons, stock screens or colony controls until they act on the implemented physical model. See Task 010 for the complete test and playable-route acceptance criteria. Wider balance/objectives, full presentation polish and release reliability remain later roadmap work.
