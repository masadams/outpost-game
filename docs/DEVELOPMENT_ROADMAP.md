# Outpost — Master Development Roadmap

**Status:** Research/parts, menus/readiness and checkpoint recovery are merged in [PR #25](https://github.com/masadams/outpost-game/pull/25). User feedback prioritizes reducing menu density: [Task 016](archive/tasks/CODEX_TASK_016.md) implements a large tabbed management workspace, connected research map, selected-item inspectors and four new branches/six parts. The same UI review branch includes the requested compact instrument console with secondary diagnostics on demand. See [workspace design/playtest](MANAGEMENT_WORKSPACE.md). Human feel, pace, hardware and remaining content/release acceptance stay open.

[Task 017](archive/tasks/CODEX_TASK_017.md) adds three progressive researched flight computers, physical automatic landing/return/navigation, researched in-place facility tiers II/III and optional clickable labels with focused control windows. It follows the open Task 016 branch for separate user review; neither PR is merged automatically. See [controls, limits and playtest](AUTOMATION_FACILITIES.md).

## Long-horizon systems planning
The [planning bible section 20](MASTER_DESIGN_BIBLE.md#20-adopted-systems-direction--2026-11-04) records the user's adopted environmental, terrain, moderate industry, power, logistics, sensors, communications, time/travel and physical worker direction. The [integrated S0–S6 slices](MASTER_ROADMAP.md#integrated-systems-vertical-slices-s0s6) extend existing paid crew work and oxygen habitats into useful inhabited settlements. These are future reviewed slices, not completed alpha milestones or a replacement for current release work. Implementation values and fidelity remain open.

## Progress rules
- [ ] means not completed; [x] means implemented, tested and merged.
- Work on one milestone at a time; document deviations and known issues.
- Keep physics/simulation independent of Phaser renderer and input.
- No automatic merges. Every PR reports tests actually run and updates this roadmap and DECISIONS.md if needed.
- Milestone complete only when its acceptance criteria are demonstrated in a playable build.

## Current feedback iteration — alpha 0.2

Merged in [PR #7](https://github.com/masadams/outpost-game/pull/7) after green CI and explicit user authorization:
- [x] Larger 1.8 km planet and 1.2 km atmosphere with shared gravity/drag for dynamic bodies.
- [x] Controls-released coast prediction and velocity arrow, J toggle, manual zoom and 0 auto.
- [x] Preserve legacy checkpoint progress on the larger planet; load paused.
- [x] Verify physics invariants and production browser playtest routes; document tuning/limits.

## Phase 0 — Foundations and design

Merged in PR #2 with bootstrap, module architecture and CI. Art remains procedural; content is in typed config modules rather than empty asset/content folders.
- [x] Record initial design vision and core decisions.
- [x] Define Codex instructions and Task 001 specification.
- [x] Establish master roadmap and decision log.
- [x] Bootstrap Vite/TypeScript/Phaser project, test runner and CI.
- [x] Establish folder architecture (sim, render, input, UI, assets, content).
**Exit:** Project installs, builds, typechecks and tests locally and in CI.

## Phase 1 — Planetary flight (Codex Task 001)

Merged in PR #2 after review and successful CI. Simulation tests cover orbit and return/landing; Chromium checks cover controls and resize. Human flight feel remains part of the upcoming playtest.
**Dependencies:** Phase 0 bootstrap.
- [x] Implement one circular moon in a persistent 2D Cartesian world.
- [x] Implement fixed-step physics, radial gravity, ship thrust/rotation/inertia and fuel.
- [x] Add launch, orbit/circumnavigation and seamless descent.
- [x] Add landing pad, contact handling, safe/unsafe touchdown and crash/restart.
- [x] Camera follow, altitude-sensitive zoom and local-horizon rotation near surface.
- [x] HUD for altitude, velocities, fuel, hull and status; desktop keyboard controls.
- [x] Physics/landing tests, build, typecheck and automated browser playtesting.
**Exit:** Take off, fly around moon, land on original pad without scene transitions.

## Phase 2 — Space environment and mining

Merged in PR #3 after review and successful CI. Includes a bounded fully simulated field, mining/tractor input, cargo, safe unload and a launch/mine/collect/land/unload simulation with mass conservation. Human rendezvous/return feel remains for playtesting.
**Dependencies:** Phase 1.
- [x] Spawn and simulate asteroid fields at appropriate levels of detail.
- [x] Implement mining laser and destructible/fracturing asteroid bodies.
- [x] Spawn physically interacting fragments/debris and mineral pickups.
- [x] Add cargo capacity, mass effects, collection/tractor mechanic and resource inventory.
- [x] Add basic ship damage from impacts and return-to-base unloading.
- [x] Introduce initial five resources: iron, copper, ice, silicon, rare metals.
- [x] Test conservation/inventory handling and edge cases.
**Exit:** Launch, mine an asteroid, collect ore, return and unload.

## Phase 3 — Astronaut and surface interactions

Merged in PR #4 after review and successful CI. Unit/browser checks cover walking, jumping, service/depot interactions, boarding, pause and relaunch. Suit collision is limited to terrain; fixed terminals are interaction markers. Human feel remains for playtesting.
**Dependencies:** Phase 1, Phase 2 unload interface.
- [x] Seamlessly enter/exit landed ship.
- [x] Implement local-gravity walking, jumping, collision and camera transitions.
- [x] Implement interactions with landing pad, containers and repair points.
- [x] Add astronaut safety basics (oxygen/health where gameplay benefits).
**Exit:** Land, leave ship, move around planet surface and interact with cargo.

## Phase 4 — Colony construction and economy

Merged in PR #5 after review and successful CI. Includes six facilities, preview/palette, costs/salvage, power/batteries, capped inventory, selectable refining, ice/fuel production, refuelling and bounded versioned full-world checkpoints. The global power/material bus, constant solar and manual checkpoint are deliberate prototype simplifications. Economic tuning remains for human playtesting.
**Dependencies:** Phases 2–3.
- [x] Surface-anchored building placement around a curved planet.
- [x] Construct storage, refinery, generator/solar array, fuel processor and repair station.
- [x] Resource costs, recipes, construction validation and demolition.
- [x] Power generation, storage, distribution and demand.
- [x] Ice-to-water/oxygen/fuel processing; ship refuelling.
- [x] Colony UI with build palette, resource ledger and production status.
- [x] Persistence of placed buildings and production state.
**Exit:** Mine resources, refine them, build functioning facilities and refuel ship.

## Phase 5 — Planetary defence (Missile Command influence)

Implemented in [PR #8](https://github.com/masadams/outpost-game/pull/8) and merged after green CI and explicit user authorization. See [Task 005](archive/tasks/CODEX_TASK_005.md) and [defence playtest/model notes](DEFENCE.md). Includes opt-in deterministic drills, shared environmental dynamics, early warning/path prediction, powered manual/automatic laser/flak/missile turrets, dangerous fragments, ship-laser interception, persistent damage/repair and version-3 checkpoints. Shields remain optional later work.
**Dependencies:** Phases 1, 4.
- [x] Incoming meteors/asteroids with actual world trajectories.
- [x] Radar early warning and trajectory indicators.
- [x] Manually controlled surface laser turret powered by colony grid.
- [x] Automated targeting with range/energy/ammunition limits.
- [x] Missile and flak variants; fragment interception and residual danger.
- [x] Persistent building damage and repairs (shields remain optional later work).
- [x] Intercept threats with ship as an alternative to turret defence.
**Exit:** Defend base from a real incoming asteroid, with meaningful damage on failure.

## Phase 6 — Ship combat and threats

Implemented in [PR #9](https://github.com/masadams/outpost-game/pull/9) and merged into main after PR #8, with green CI and explicit user authorization. See [Task 006](archive/tasks/CODEX_TASK_006.md) and [combat notes](COMBAT.md). Includes opt-in capped drone patrols, shared environmental dynamics, cannon/guided missile weapons, finite ammunition/mass/recoil/heat/energy, telegraphed AI, supplied repair/rearm/recovery and version-4 checkpoints. Full normal-input fight/return/repair regressions cover both weapons. The [initial presentation audit](PRESENTATION_AUDIT.md) starts the Phase 9 discovery work; it is not human usability approval.
**Dependencies:** Phases 1–2, 5.
- [x] Ship weapon systems, heat/energy/ammo balancing and hit feedback.
- [x] Enemy spacecraft/hostile drones with readable AI behaviours.
- [x] Combat damage, repair and death/recovery.
- [x] Threat escalation linked to exploration and colony development.
**Exit:** Complete a combat encounter and return to repair/rearm.

## Pre-automation presentation foundation (Task 006A)

Implemented in [PR #10](https://github.com/masadams/outpost-game/pull/10) and merged into main. See [Task 006A](archive/tasks/CODEX_TASK_006A.md), [visual direction and wireframes](PRESENTATION_DIRECTION.md) and desktop reference captures. Includes a single contextual operations dock, clear central flight corridor, bottom telemetry/radar, focus/help/pause-safe panel navigation and cached planet shading. This completes the initial direction/layout prototype, not the full Phase 9 overhaul or human usability study.

## Phase 7 — Automation and logistics
**Dependencies:** Phases 2, 4–6.

The user requested planetary mining rigs/buildings. [Task 007A](archive/tasks/CODEX_TASK_007A.md) implemented the first slice in merged [PR #11](https://github.com/masadams/outpost-game/pull/11): ten finite seams, powered buildable extraction, survey/placement feedback, existing refinery/fuel integration and version-5 checkpoints. See [the model and playtest route](PLANETARY_MINING.md). [Task 007B](archive/tasks/CODEX_TASK_007B.md) adds opt-in refinery scheduling next, with desired-stock targets, fair recipe rotation, cycle preservation and version-6 checkpoints. See [automation rules](AUTOMATION.md). [Task 007C](archive/tasks/CODEX_TASK_007C.md) adds protected power, delivery room and turret materials on `feat/colony-priorities`, based on main after PR #12 merged. See [resource priorities](COLONY_PRIORITIES.md). These slices do not complete Phase 7.
- [x] Finite planetary deposits and powered surface rigs connected to colony storage.
- [x] Opt-in refinery scheduling with configurable stock targets (merged [PR #12](https://github.com/masadams/outpost-game/pull/12)).
- [ ] Earned automation: refinery scheduling, auto turrets and resource logistics.
- [x] Mining drones or asteroid towing, with costs and vulnerability (paid, breakable towing merged in [PR #15](https://github.com/masadams/outpost-game/pull/15); autonomous drones remain deferred).
- [x] Priority controls for power, storage and defensive ammunition (Task 007C merged as reserves in [PR #13](https://github.com/masadams/outpost-game/pull/13)).
- [ ] Background colony operations while player is in space, using appropriate simulation LOD.
**Exit:** Colony remains functional and can defend itself while player is away.

## Flight feedback before mobile logistics (Task 007D)

The user requested color-coded landing telemetry, warning lights/pulsing and low-fuel sound. [Task 007D](archive/tasks/CODEX_TASK_007D.md) is implemented in [PR #14](https://github.com/masadams/outpost-game/pull/14) on `feat/landing-warning-instruments`, retargeted onto main after resource-priority PR #13 merged. It adds shared touchdown-limit cues, spin telemetry, low-clearance/off-pad feedback, distinct paced alarms and pause/reduced-motion behavior. See [thresholds and validation](FLIGHT_WARNINGS.md). Physics and save formats are unchanged; the full Phase 9 overhaul remains required. Merged in [PR #14](https://github.com/masadams/outpost-game/pull/14).

## Mobile logistics (Task 007E)

[Task 007E](archive/tasks/CODEX_TASK_007E.md) implements a paid 25 kg ship utility towing rig, physically coupled breakable cable, supply/mass costs, controls/feedback and version-8 persistence in [PR #15](https://github.com/masadams/outpost-game/pull/15) merged after PR #14. Towing moves existing rocks; normal mining/collection/unload remains necessary. See [the model and playtest](TOWING.md). Autonomous drones and reeling remain deferred. The bounded field remains fully simulated; existing colony production/automatic defence continues while the pilot flies.

## Phase 7.5 — Habitat domes and life support (Task 007F, merged #16)

Merged in [PR #16](https://github.com/masadams/outpost-game/pull/16) with green CI and user authorization. See [Task 007F](archive/tasks/CODEX_TASK_007F.md) and [the habitat model/playtest](HABITATS.md). Explicitly requested by the user. Follow towing before the wider Phase 8 progression work. See [the upgrade/dome schedule](UPGRADES_AND_DOMES.md).
- [x] Define small/large surface coverage and ceiling heights, 40 m / 160 m spans; tune costs, oxygen buffers and kg/s demand.
- [x] Place dome coverage over existing colony areas with valid foundations and curved-surface geometry.
- [x] Powered, supplied breathable zones pause suit oxygen depletion only while crew is inside and air is available.
- [x] Consume oxygen for pressurization, area-dependent losses and crew; preserve finite buffers and avoid overlap/double-consumption exploits.
- [x] Warn on shortage, power loss or breach, then resume suit air safely; no free suit refill or healing.
- [x] Show habitat/suit-air source, coverage, buffer/demand and failure feedback; save, pause and test all transitions.
**Exit:** Crew can work inside a supplied dome without draining suit air, and loses that benefit predictably when supply/coverage fails.

## Phase 7.75 — Central Command console (Task 007G, merged #17)

Merged in #17; see [Task 007G](archive/tasks/CODEX_TASK_007G.md) and [model/playtest](COMMAND.md). Requested by the user to replace walking between facilities for routine control. Follow habitat buildings, before adding more progression/economy complexity. See [the functional plan](COMMAND_AND_EXPLORATION.md) and [concept wireframe](mockups/command-console.svg).
- [x] Cohesive spacecraft-style overview, colony selection/map and persistent critical warnings.
- [x] Remote facility enable/disable, recipes/targets, turret automation and supplied service management.
- [x] Power flow diagram, generation/demand/storage/capacity meters, actual versus requested allocation, per-facility caps and dispatch priorities.
- [x] Drag-and-drop ordering/dials with native keyboard alternatives, stable focus and pause-safe planning/execution.
- [x] Validated supplied construction/work queue, progress/cancellation and explicit executor/refund rules.
- [x] Economy ledger with usable/reserved stock, actual rates, bottlenecks and recipe flows.
- [x] Merged Task 008 real lab research in Command (#19); navigation is available through Nav in Task 007H. Both are implemented without inert placeholder controls.
- [x] Persist priorities/budgets/orders, and test scarcity, damage, cancellation and input parity.
**Exit:** Direct the installed colony from ship or surface without visiting every machine, with understandable power/material consequences.

## Phase 7.9 — Nearby belts, destinations and discovery (Task 007H, merged #18)

Merged in #18; see [Task 007H](archive/tasks/CODEX_TASK_007H.md) and [model/playtest/budget measurements](NEIGHBORHOOD.md). Promoted from optional late expansion in response to the user's empty-neighborhood feedback. Improve the immediate neighborhood before wider ship progression; see [the exploration plan](COMMAND_AND_EXPLORATION.md).
- [x] Distinct finite resource belts/clusters with useful mining/towing opportunities and persistent depletion.
- [x] Survey beacons, derelict/salvage, docking/service or anomaly sites with meaningful supplied interactions.
- [x] Overview chart, destination selection, range/bearing/relative-motion markers and clear home-return navigation.
- [x] Short exploration objectives and procedural silhouette/density/landmark variation.
- [x] Measured simulation/body budgets and deterministic far-field behavior without freezing threats or granting respawns.
**Exit:** Navigate to a recognizable nearby opportunity, interact/mine and return with a meaningful result.

## Phase 8 — Progression and balancing
**Dependencies:** Phases 2–7, life support, Command and neighborhood discovery.
- [x] Technology/unlock progression: Task 014 expands to ten paid prerequisite nodes and sixteen real parts in eight exclusive slots, including propulsion, logistics, extraction, thermal power tradeoffs and combat/armour; Combat engineering retains shield unlocks.
- [x] Merged #19: Phase 8.1 / [Task 008](archive/tasks/CODEX_TASK_008.md), merged from `feat/ship-progression`; see [actual progression/playtest](PROGRESSION.md). Includes powered labs and paid prerequisite research plus explicit ship equipment/fabrication UI; engines, tanks, cargo, mining/tractor, weapons/armour/cooling and utility upgrades with finite costs, real mass/capacity/fuel tradeoffs, replacement limits and persistent recovery behavior.
- [x] Phase 8.2 / merged #20: small/large powered shield domes with finite charge, impact cost, recharge/breach behavior and tested friendly/towing interactions; shield coverage supplies no oxygen.
- [x] Physical tradeoffs implemented and tested: cargo/part mass versus acceleration, efficient versus high-thrust drives, empty added tank capacity, tool/weapon heat and cell draw, cooling versus recharge and armour weight. Human tuning remains open.
- [ ] Wider scarcity/event/recovery tuning: Task 014 adds honest home recovery and local refuelling budgets plus a tested supplied recovery/repair/manufacture/refuel loop. Threats remain opt-in; wider campaign balance remains open.
- [x] Mission/objective system with onboarding and longer-term goals: [Task 013](archive/tasks/CODEX_TASK_013.md) adds eight observed-result goals, live tracking/control links and a read-only starter-route material/energy budget; implemented in this milestone; final CI and merge evidence belong to its implementation PR. See [model and limits](PROGRESSION_GOALS.md).
- [ ] Balance toward 60% action / 40% building.
**Exit:** Engaging multi-session progression with clear short- and long-term goals.

## Phase 8.5 — Nearby planets and moons

Explicitly requested by the user; a bounded first neighborhood before the full presentation/reliability/release phases. Merged in [PR #21](https://github.com/masadams/outpost-game/pull/21); see [Task 010](archive/tasks/CODEX_TASK_010.md), the [world model and route](NEARBY_WORLDS.md), and [multi-world requirements](COMMAND_AND_EXPLORATION.md).
- [x] Define distinct planets/moons, atmospheres, gravity, motion, resources and interactions.
- [x] Consistent multi-body gravity, finite cores, moving reference frames and swept surface/pad contacts.
- [x] Body-relative building/habitat/shield placement, walking, docking, towing and camera/local-up transitions.
- [x] System navigation, transfers/arrival/return and fuel/range/recovery tradeoffs in continuous flight.
- [x] Persist body motion, local colonies and depleted sites; support current-version save continuation; development saves may be reset.
- [x] Verify cross-world flight/landing/return, coupled hauling, frame transitions, precision and save continuation.
**Exit:** Visit, land/work on and return from a distinct nearby world in the same continuous game.

## Phase 9 — Graphics, UX and UI overhaul; audio polish

Explicitly requested by the user. This is a full presentation and interaction overhaul of the playable prototype. Begin the visual direction and UX audit after Phase 6, before automation/logistics adds more interface complexity; complete the overhaul here before Phase 10 reliability playtesting and release preparation. Keep fixes for blocking readability/input issues in the intervening milestones.

The existing procedural sound, mute/volume controls and H guide provide the baseline. Preserve the continuous world and established retro visual direction while replacing prototype presentation where needed.

**Dependencies:** Playable flight/mining/colony/defence/combat loop; final implementation incorporates Phase 7–8 systems.
- [x] Audit the full launch→mine→land→build→defend/combat→repair→save loop; record confusing actions, panel clutter, camera problems and missing feedback.
- [x] Establish a cohesive visual system with mockups, typography, palette, icons, spacing and reusable UI components.
- [x] Overhaul ship, astronaut, planet/surface, atmosphere, asteroid and colony visuals with readable silhouettes, animation, particles, lighting and impact/weapon effects.
- [x] Redesign the HUD around flight, on-foot, construction and turret contexts; prioritize relevant telemetry, warnings, targeting and trajectory information without overlapping panels.
- [x] Rework construction placement, inventory/production management, targeting and interaction prompts so available actions, costs, failures and outcomes are clear.
- [x] Improve onboarding, objectives, pause/settings screens, control discovery and keyboard/mouse focus behavior; include configurable controls.
- [x] Refine camera framing, zoom and transitions; provide reduced-motion/effect options, scalable text/UI, contrast and cues that do not rely on color alone.
- [x] Validate desktop layouts at 900×600, 1280×800 and 1920×1080, including resized windows and long/expanded panels. Mobile controls remain a separate release-phase investigation.
- [x] Polish distinctive sound effects and the mix; add gameplay-responsive music with independent volume controls and accessibility options.
- [ ] Set and measure frame-time/effect budgets, offer graphics quality settings, and verify readability/performance on representative lower-powered hardware.
- [ ] Add appropriate visual/input regressions and run human usability playtests across the full loop; resolve blocking findings and capture updated screenshots.

**Exit:** A coherent visual style and context-sensitive interface cover every playable system; the full loop has been usability-tested, controls and feedback are discoverable, supported desktop layouts have no overlapping/obscured controls, accessibility options work, and measured performance meets the documented budgets.


## Phase 10 — Saves, reliability and content

[Task 015](archive/tasks/CODEX_TASK_015.md) begins current-format checkpoint recovery: one previous valid copy, visible paused fallback and storage-failure regression coverage. It was merged with Task 014 in PR #25. See [storage guarantees and playtest](CHECKPOINT_RECOVERY.md). Legacy compatibility remains deferred.
**Dependencies:** Core mechanics stable.
- [ ] Reliable save/load and corruption recovery near completion. Development saves may be reset; legacy compatibility is deferred by user direction.
- [ ] Persist ship, world, inventory, buildings, damage, resources and events.
- [ ] Deterministic/reproducible simulation tests where practical.
- [ ] End-to-end playtest of launch→mine→land→build→defend loop.
- [ ] Content tuning, bug triage and regression suite.
**Exit:** Reliable save/reload across multiple sessions and no blocking loop failures.

## Phase 11 — Release and later expansion
- [ ] Desktop browser release and deployment.
- [ ] Android feasibility, touch/controller mapping and performance testing.
- [ ] Optional additional systems/biomes beyond the initial Phase 8.5 neighborhood, factions, story and deeper colony systems.
- [ ] Revisit co-op/multiplayer only after single-player is stable; no commitment yet.
**Exit:** Stable documented playable release.

## Immediate next action

Review Task 016 (PR #26) and its stacked Task 017 follow-up, then playtest the management window, tech map, fitting flow, earned autopilot and facility administration. Leave merging to the user. Use feedback on research/parts, menus, handling, pace and readiness to prioritize remaining economy/content/reliability work before release. No legacy migrations are required during this prototype phase.

## Risks to watch
- Camera rotation and world/screen coordinate transforms.
- Landing collision tunnelling, contact jitter and extreme velocities.
- Floating-point stability at large distances and near the planet core.
- Simulation performance from many fragments and background colony objects.
- Overcomplicating crafting at the expense of arcade gameplay.
- Regression in low-powered browser/Android builds.
