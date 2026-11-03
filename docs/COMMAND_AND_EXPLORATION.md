# Command console and a populated neighborhood — scheduled expansion

These are explicit milestones requested by the user. The current prototype still has one planet and a finite asteroid field; the central console is now implemented in [Task 007G](../CODEX_TASK_007G.md), and the nearby belts/sites/navigation slice is implemented in [Task 007H](../CODEX_TASK_007H.md). Additional worlds remain **planned**; see [actual discovery rules](NEIGHBORHOOD.md). See [the actual Command rules](COMMAND.md). Atmosphere/space indication is improved in the current towing slice.

## Updated sequence

1. Task 007E: paid physical towing and clear atmosphere/space feedback (merged #15).
2. Phase 7.5: oxygen habitat domes and supplied breathable coverage (merged #16).
3. Phase 7.75: central Command console, implemented for review on `feat/command-console`.
4. Phase 7.9: finite mining arcs, physical survey/salvage/fuel sites and live navigation, implemented for review on `feat/neighborhood-discovery`.
5. Phase 8.1–8.2: ship progression, research and shield domes, integrated into Command.
6. Phase 8.5: nearby planets/moons with consistent multi-body flight, navigation and persistence.
7. Phase 9: the full graphics/UX/UI/audio overhaul across all these systems.
8. Phases 10–11: save/reliability/content hardening, playtests, then release and later expansion.

## Phase 7.75 — Central Command

The player should manage installed facilities from ship or surface without walking to each machine. Local E interactions remain useful for boarding, personal service and construction work; routine management becomes remote. The current global grid/material bus remains explicit until an actual network/wiring mechanic is implemented.

Start with a cohesive spacecraft-systems console rather than a long collection of unrelated buttons. See [the concept wireframe](mockups/command-console.svg). Mock values illustrate layout only.

| Area | Planned control/feedback |
|---|---|
| Overview | Colony map/selection, alerts, generation/demand/headroom, battery charge/capacity and time-to-shortfall |
| Power | Generator → storage/bus → facility/turret diagram; requested versus delivered kW; per-facility power caps and dispatch priorities |
| Operations | Remote enable/disable, refinery recipe/stock targets, turret automation and service settings, with IDs/world highlighting |
| Construction | Radial site preview, validated paid build queue, remaining work, materials committed/available, pause/cancel and explicit refund rules |
| Economy | Raw/manufactured stocks, protected/usable amounts, observed production/consumption rates, storage bottlenecks and recipe flows |
| Research | Actual technology costs, prerequisites, powered work and queue progress when Phase 8 research is implemented |
| Navigation | Destination/belt/world selection and travel planning as neighborhood content is introduced |

### Interaction and dispatch rules

- Drag facility cards to reorder priority and use clear dials/sliders/meters for power budgets. Also provide native keyboard controls, move-up/down buttons, labels, focus handling and large readable values. Dragging must not accidentally steer/fire the ship.
- Separate requested power, allocated power, stored energy and reserved charge. A dial never creates energy or exceeds a facility's rating. Turret burst energy and life-support needs require explicit handling rather than a misleading average kW display.
- Dispatch deterministically on the fixed clock, with stable facility IDs/tie-breaking. Show why a facility is waiting: stock, storage, queue, priority, power or damage.
- Preserve visibility of critical flight/life-support/threat warnings while managing. Paused planning may queue drafts, but actual simulation/order execution waits for resume; make queued versus applied changes clear.
- Construction orders require a real executor/work budget and existing placement/material constraints. Remote management must not grant instant buildings, free repairs or teleport the player. Define this in the command task before changing the current direct-build model.
- Integrate research when it has a real supplied work/unlock system; do not ship inert placeholder controls. Research/fabrication should remain understandable alongside the economy.
- Persist actual priorities, budgets, orders and research progress with migrations. Keep transient selection/drag state out of world saves. Test scarcity, destruction, cancellation, pause, focus, multi-selection and keyboard/mouse parity.

**Exit:** From ship or surface, the player can understand and direct the colony's power and production, inspect the economy and issue valid work without visiting every facility. The layout reads as an Outpost ship/colony systems console.

## Phase 7.9 — Make the immediate neighborhood worth exploring

Extra worlds were previously only an optional late roadmap idea. First improve nearby space within the current world, so it does not feel empty while larger-world physics is built.

- Seed recognizable resource clusters/belts with distinct composition, risk and mining value. Preserve finite depletion; revisiting must not respawn free ore.
- Add destinations such as survey beacons, derelicts/salvage, useful docking/service sites and anomalies, with meaningful interactions and supplied rewards/costs.
- Add navigation markers and an overview chart: selected destination, range/bearing, relative motion, home return and resource information. Keep off-screen orientation and camera/zoom comfortable.
- Connect exploration to short objectives and progression while retaining manual flight and the 60% action / 40% colony balance.
- Set measured body/collision/effect budgets. Use deterministic far-field/analytic motion or appropriate LOD without freezing incoming threats, losing resources or breaking checkpoints.
- Provide silhouette, density and landmark variation before the final art overhaul; empty travel should have purpose, not merely larger distances.

**Exit:** Leaving home reveals identifiable nearby mining/exploration opportunities, and the player can navigate to one, interact and return with a meaningful result.

## Phase 8.5 — Nearby planets and moons

Build a bounded first neighborhood, not an unbounded universe. Define body sizes, atmospheres, gravity and motion, plus resource and interaction differences that justify visiting each destination.

- Extend radial gravity to a documented multi-body model with finite cores; sum physical influences and test moving-body frames/energy/momentum expectations.
- Sweep contacts against each body's terrain/pads. Surface walking, domes, building placement, docking and towing must consistently identify their parent body.
- Blend local-up/camera/telemetry toward the relevant body without abrupt frame changes. Navigation must identify destination, reference frame, relative velocity, atmosphere and return route.
- Preserve continuous flight between destinations, with explicit fuel/range/rescue tradeoffs. Add origin/precision management if distance warrants it.
- Save world motion/time, body-local construction and depleted belts/sites. Migrate old home-world checkpoints without wiping progress.
- Test transfer, arrival, departure, landing and return, including save/load and coupled towing around different gravity sources.

**Exit:** Fly to a nearby moon/planet, encounter a distinct resource or interaction, land/work and return in the same continuous game with consistent physics and persistence.

## Atmosphere indication in the current build

The header now persistently identifies **ATMOSPHERE**, **THIN AIR** in the last 200 m of the modeled air layer, and **SPACE · VACUUM** beyond its physical drag boundary. The flight-status line repeats the region and says **NO AIR DRAG** in space while retaining the gravity readout. Gravity does not stop at atmosphere exit.

Distinct exit/entry chimes play on pilot-flight crossings, with a six-second cooldown to prevent boundary chatter. Loading/resetting does not create false crossing sounds; pause and on-foot modes suppress them. These cues use the same body-centre boundary as drag, without altering physics or saves. Tests cover boundary equality, directions, gravity in vacuum, cadence/pause/load and actual flight across the boundary.
