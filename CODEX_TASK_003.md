# Task 003 — Astronaut and surface interactions

Continues the requested milestone sequence on a branch stacked on Task 002 / PR #3. Review and merge flight, mining, then surface work in order. Do not merge automatically.

## Objective

Land, leave the ship, walk/jump on the circular moon, interact with cargo and a service point, then board and launch in the same world.

## Scope

- F exits only a safely landed ship; F boards a landed ship within 20 m. A held F cannot repeatedly toggle modes. No in-flight EVA or ejection.
- A/D or Left/Right walks along the curved surface at up to 12 m/s; Space (or W/Up) jumps at 12 m/s. Jump requires release before reuse. Airborne movement uses the existing radial gravity and swept surface collision.
- Ship thrust, steering, laser and tractor are disabled while outside. All world bodies keep simulating; pause freezes the suit as well as the world.
- Camera changes focus and surface zoom smoothly, retaining local-up orientation and the same rendering scene.
- 180-second suit oxygen, health and hard-fall damage. Boarding refills oxygen; health restoration requires the service point. A lost suit requires R.
- Surface cargo depot about 54 m right of home: grounded E opens its inventory and unloads a landed nearby ship. Repeated interaction does not duplicate resources. Existing cockpit E-unload remains available.
- Service point about 54 m left of home: grounded E restores suit oxygen/health and repairs a nearby landed ship using stored iron at 1 kg / 10 hull points. No fuel production or refuelling.
- Suit HUD, station prompts, procedural astronaut/stations, and updated controls/instructions.
- Independent simulation tests, real browser controls, screenshots, build and typecheck.

## Acceptance

Walking remains on the rim at all orientations. A normal jump lands without damage, held jump cannot retrigger, high-speed falls cannot tunnel, oxygen/health stay bounded, distant/airborne interactions fail, repair cannot overspend, and boarding cannot launch an empty ship. A simulation scenario walks to the depot, unloads, returns to board and launches; browser automation walks/jumps between actual terminals and returns to flight.

## Limits and next milestone

Suit collision covers the circular terrain; ship/stations and asteroids do not collide with the astronaut in this milestone. Station buildings are fixed interaction markers. There is no backpack inventory, construction, economy, persistence, combat or EVA. Next: the roadmap's Phase 4 construction/economy after review of the existing loops.
