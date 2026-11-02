# Outpost — Master Development Roadmap

**Status:** Phases 0–4, basic sound/help and atmospheric flight feedback are merged through PR #7. The user authorized merging #7 and continuing the roadmap. Phase 5 planetary defence is implemented on its feature branch pending review; Phase 6+ remain separate milestones.
**Source of truth:** This document tracks scope, progress, dependencies, and acceptance criteria. Update in every feature PR.  
**Vision:** Single-player retro 2D arcade spaceflight, asteroid mining, combat and colony building. Approximately **60% flight/mining/combat and 40% construction/management**. One continuous circular planetoid and surrounding space; no separate flight/surface scenes.

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

Implemented in [PR #8](https://github.com/masadams/outpost-game/pull/8) on `feat/planetary-defence`, pending review/merge; checkboxes stay open until merged. See [Task 005](../CODEX_TASK_005.md) and [defence playtest/model notes](DEFENCE.md). Includes opt-in deterministic drills, shared environmental dynamics, early warning/path prediction, powered manual/automatic laser/flak/missile turrets, dangerous fragments, ship-laser interception, persistent damage/repair and version-3 checkpoints. Shields remain optional later work.
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

Playtest pass: original procedural flight/mining/surface/colony cues, M mute, persistent volume, focus/pause silence and H quick-start help are included. Full art/audio polish, music, broader accessibility and subjective mix approval remain in this later milestone.
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
Review the Phase 5 implementation and playtest alpha 0.3 using [PLAYTEST.md](PLAYTEST.md). Check defence handling, danger, scarcity, repairs and active saves alongside the existing loop before starting Phase 6 ship combat.

## Risks to watch
- Camera rotation and world/screen coordinate transforms.
- Landing collision tunnelling, contact jitter and extreme velocities.
- Floating-point stability at large distances and near the planet core.
- Simulation performance from many fragments and background colony objects.
- Overcomplicating crafting at the expense of arcade gameplay.
- Regression in low-powered browser/Android builds.
