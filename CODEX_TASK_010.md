# Task 010 — Nearby worlds (Phase 8.5)

Status: implementation plan prepared after merged shield PR #20. The current playable build still has one landable world. Work on `feat/nearby-worlds`; do not mark this task complete until the full transfer/landing/work/return route is demonstrated.

Follow AGENTS.md, GAME_DESIGN.md and the [worlds model](docs/NEARBY_WORLDS.md). Legacy saves may be reset. Keep the existing single continuous world and 60 Hz simulation.

## Deliverable

Add one distinct airless moon before increasing world count. Fly there manually from home, land, leave the ship, work with finite resources and supplied local construction, then return and deliver cargo. Existing home gameplay, shields, habitats, mining, hauling, combat and Command must remain coherent.

## Implementation sequence

1. Shared celestial-body configuration and deterministic motion/time. Sum finite-core gravity for all moving physical actors. Add body-relative position/velocity and swept-contact helpers, proving the one-source limit matches current physics.
2. Moving terrain/pads and surface attachment: ship touchdown/takeoff, astronaut walking/jumping/boarding, altitude/local-up, air-relative drag and contact velocities. Keep continuous coordinates and use earliest physical contact across bodies.
3. Body-local colonies, seams, facilities, shield/habitat coverage, damage, power, stocks and service. Transport manufactured supplies physically in the ship's mass/capacity budget; create an empty remote colony, not a second free kit or wireless cross-world grid.
4. Navigation, chart/radar, camera, region indicators and transfer/arrival/return guidance use live body frames. Add a finite moon opportunity and a supplied recovery rule that cannot teleport cargo or refill equipment.
5. Current-format save/load continues time/body motion, local colonies/depletion, freight, attachment and towing. Reset incompatible development saves; add no migration layer.
6. Validate the complete playable route, home regressions, moving-body hauling, renderer-rate equality and bounded performance. Update controls/help/README/roadmap/decisions, run typecheck/unit/build/production browser checks and open an implementation PR.

## Acceptance

- Both worlds exert continuous gravity on ships, crew, asteroids, sites, fragments, pickups, meteors, drones and ammunition, including during transfers and at large distances.
- Touchdowns and instruments use surface-relative velocity; a landed ship remains with its moving pad and leaves with that velocity. Air moves with its parent world; an airless moon never reports atmospheric drag or supplies free air.
- Actual paid freight enables remote work. Costs, extraction, deliveries, gas, charge and depletion remain finite and local; no grants from selecting a destination or changing the active colony.
- Native controls work through departure, navigation, landing, building/servicing, return and save continuation. No new screen/scene transition, frozen remote simulation or inert placeholder controls.
- Tests cover finite gravity/cores, source motion, surface sweeps, body/frame selection, moving contacts, costs/locality, scarcity/recovery, save continuation, towing and fixed-clock equality. A production browser route performs the real transfer/landing/work/return sequence without substituting hidden UI state.
