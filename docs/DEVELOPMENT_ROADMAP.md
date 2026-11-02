# Outpost — Master Development Roadmap

**Status:** Tasks 001–004 (flight, mining, surface interactions, colony construction/economy) are implemented on stacked feature branches pending review and merge. The continuing iteration request advances implementation without merging earlier work. Review in dependency order; no automatic merges.
**Source of truth:** This document tracks scope, progress, dependencies, and acceptance criteria. Update in every feature PR.  
**Vision:** Single-player retro 2D arcade spaceflight, asteroid mining, combat and colony building. Approximately **60% flight/mining/combat and 40% construction/management**. One continuous circular planetoid and surrounding space; no separate flight/surface scenes.

## Progress rules
- [ ] means not completed; [x] means implemented, tested and merged.
- Work on one milestone at a time; document deviations and known issues.
- Keep physics/simulation independent of Phaser renderer and input.
- No automatic merges. Every PR reports tests actually run and updates this roadmap and DECISIONS.md if needed.
- Milestone complete only when its acceptance criteria are demonstrated in a playable build.

## Phase 0 — Foundations and design

Review note: the Task 001 PR implements bootstrap, module architecture and CI. Checkboxes remain open until merge, per the progress rule above.
- [x] Record initial design vision and core decisions.
- [x] Define Codex instructions and Task 001 specification.
- [x] Establish master roadmap and decision log.
- [ ] Bootstrap Vite/TypeScript/Phaser project, test runner and CI.
- [ ] Establish folder architecture (sim, render, input, UI, assets, content).
**Exit:** Project installs, builds, typechecks and tests locally and in CI.

## Phase 1 — Planetary flight (Codex Task 001)

Review note: the Task 001 PR implements all items below. Local verification covers build, typecheck, 24 simulation/camera tests (including full orbit and launch-to-space/return-to-pad), plus Chromium keyboard/resize checks with screenshots. Hosted CI passed on flight PR #2; human flight-feel review remains pending. Checkboxes remain open until merge.
**Dependencies:** Phase 0 bootstrap.
- [ ] Implement one circular moon in a persistent 2D Cartesian world.
- [ ] Implement fixed-step physics, radial gravity, ship thrust/rotation/inertia and fuel.
- [ ] Add launch, orbit/circumnavigation and seamless descent.
- [ ] Add landing pad, contact handling, safe/unsafe touchdown and crash/restart.
- [ ] Camera follow, altitude-sensitive zoom and local-horizon rotation near surface.
- [ ] HUD for altitude, velocities, fuel, hull and status; desktop keyboard controls.
- [ ] Physics/landing tests, build, typecheck and playtesting.
**Exit:** Take off, fly around moon, land on original pad without scene transitions.

## Phase 2 — Space environment and mining

Review note: [Task 002](../CODEX_TASK_002.md) implements the items below as PR #3 stacked on flight PR #2. All 36 unit tests and hosted CI passed, including a complete launch/mine/collect/land/unload simulation with mass conservation. Chromium checks cover actual mining/tractor input and complete reset, alongside flight controls. The full browser return flight and human feel remain review steps. Keep boxes open until review and merge.
**Dependencies:** Phase 1.
- [ ] Spawn and simulate asteroid fields at appropriate levels of detail.
- [ ] Implement mining laser and destructible/fracturing asteroid bodies.
- [ ] Spawn physically interacting fragments/debris and mineral pickups.
- [ ] Add cargo capacity, mass effects, collection/tractor mechanic and resource inventory.
- [ ] Add basic ship damage from impacts and return-to-base unloading.
- [ ] Introduce initial five resources: iron, copper, ice, silicon, rare metals.
- [ ] Test conservation/inventory handling and edge cases.
**Exit:** Launch, mine an asteroid, collect ore, return and unload.

## Phase 3 — Astronaut and surface interactions

Review note: [Task 003](../CODEX_TASK_003.md) implements all items below as PR #4 stacked on mining PR #3. Its 52 unit tests, three Chromium checks and hosted CI passed. Suit collision is limited to terrain; fixed terminals are interaction markers. Human feel and merge remain pending; checkboxes stay open per the progress rule.
**Dependencies:** Phase 1, Phase 2 unload interface.
- [ ] Seamlessly enter/exit landed ship.
- [ ] Implement local-gravity walking, jumping, collision and camera transitions.
- [ ] Implement interactions with landing pad, containers and repair points.
- [ ] Add astronaut safety basics (oxygen/health where gameplay benefits).
**Exit:** Land, leave ship, move around planet surface and interact with cargo.

## Phase 4 — Colony construction and economy

Review note: [Task 004](../CODEX_TASK_004.md) implements the items below on a branch stacked on surface PR #4. Includes six facilities, preview/palette, costs/salvage, power/batteries, capped inventory, selectable refining, ice/fuel production, refuelling and bounded versioned full-world checkpoints. Verification covers 73 unit tests and five Chromium checks with a production screenshot. The global power/material bus, constant solar output and manual local checkpoint are deliberate prototype simplifications. Review and merge remain pending; boxes stay open until then.
**Dependencies:** Phases 2–3.
- [ ] Surface-anchored building placement around a curved planet.
- [ ] Construct storage, refinery, generator/solar array, fuel processor and repair station.
- [ ] Resource costs, recipes, construction validation and demolition.
- [ ] Power generation, storage, distribution and demand.
- [ ] Ice-to-water/oxygen/fuel processing; ship refuelling.
- [ ] Colony UI with build palette, resource ledger and production status.
- [ ] Persistence of placed buildings and production state.
**Exit:** Mine resources, refine them, build functioning facilities and refuel ship.

## Phase 5 — Planetary defence (Missile Command influence)
**Dependencies:** Phases 1, 4.
- [ ] Incoming meteors/asteroids with actual world trajectories.
- [ ] Radar early warning and trajectory indicators.
- [ ] Manually controlled surface laser turret powered by colony grid.
- [ ] Automated targeting with range/energy/ammunition limits.
- [ ] Missile and flak variants; fragment interception and residual danger.
- [ ] Persistent building damage and repairs; optional later shields.
- [ ] Intercept threats with ship as an alternative to turret defence.
**Exit:** Defend base from a real incoming asteroid, with meaningful damage on failure.

## Phase 6 — Ship combat and threats
**Dependencies:** Phases 1–2, 5.
- [ ] Ship weapon systems, heat/energy/ammo balancing and hit feedback.
- [ ] Enemy spacecraft/hostile drones with readable AI behaviours.
- [ ] Combat damage, repair and death/recovery.
- [ ] Threat escalation linked to exploration and colony development.
**Exit:** Complete a combat encounter and return to repair/rearm.

## Phase 7 — Automation and logistics
**Dependencies:** Phases 2, 4–6.
- [ ] Earned automation: refinery scheduling, auto turrets and resource logistics.
- [ ] Mining drones or asteroid towing, with costs and vulnerability.
- [ ] Priority controls for power, storage and defensive ammunition.
- [ ] Background colony operations while player is in space, using appropriate simulation LOD.
**Exit:** Colony remains functional and can defend itself while player is away.

## Phase 8 — Progression and balancing
**Dependencies:** Phases 2–7.
- [ ] Technology/unlock progression for ship, mining, energy and defences.
- [ ] Meaningful tradeoffs: cargo mass vs manoeuvrability; fuel vs range; power vs defence.
- [ ] Resource scarcity, hazards, escalating events and recovery loops.
- [ ] Mission/objective system with onboarding and longer-term goals.
- [ ] Balance toward 60% action / 40% building.
**Exit:** Engaging multi-session progression with clear short- and long-term goals.

## Phase 9 — UI, art and audio
**Dependencies:** Playable core loop.
- [ ] Cohesive early-DOS-inspired pixel art with modern particles/lighting.
- [ ] Readable ship/base/build HUD and accessibility options.
- [ ] Distinctive flight, mining, impact, construction and alarm sound effects.
- [ ] Music and audio mix responsive to gameplay; pause/settings/controls.
- [ ] Performance budgets and scalability for low-powered hardware.
**Exit:** Consistent, readable and performant presentation.

## Phase 10 — Saves, reliability and content
**Dependencies:** Core mechanics stable.
- [ ] Versioned IndexedDB save/load with migrations and corruption recovery.
- [ ] Persist ship, world, inventory, buildings, damage, resources and events.
- [ ] Deterministic/reproducible simulation tests where practical.
- [ ] End-to-end playtest of launch→mine→land→build→defend loop.
- [ ] Content tuning, bug triage and regression suite.
**Exit:** Reliable save/reload across multiple sessions and no blocking loop failures.

## Phase 11 — Release and later expansion
- [ ] Desktop browser release and deployment.
- [ ] Android feasibility, touch/controller mapping and performance testing.
- [ ] Optional extra planets/biomes, factions, story and deeper colony systems.
- [ ] Revisit co-op/multiplayer only after single-player is stable; no commitment yet.
**Exit:** Stable documented playable release.

## Immediate next action
Review **Tasks 001–004** in order and assess flight, mining, surface controls and the colony production loop. After merge, mark verified items complete. Next milestone after review is Phase 5 planetary defence.

## Risks to watch
- Camera rotation and world/screen coordinate transforms.
- Landing collision tunnelling, contact jitter and extreme velocities.
- Floating-point stability at large distances and near the planet core.
- Simulation performance from many fragments and background colony objects.
- Overcomplicating crafting at the expense of arcade gameplay.
- Regression in low-powered browser/Android builds.
