# OUTPOST — Master Phased Roadmap
**Version:** 1.0 · **Date:** 2026-11-04 · **Status:** Proposed, subject to code audit.  
**Companion:** [Master Design Bible](MASTER_DESIGN_BIBLE.md) and [Scale and Experience](SCALE_AND_EXPERIENCE.md).

## Conventions
This is a long-horizon dependency map, not a release promise or proof of implementation. Before working on a slice, inspect current code and classify it as **Verified existing / Partial / Not started / Deferred**. Unchecked items are design-tracking items, not statements that the current alpha lacks them. P0 = essential to phase; P1 = enhancement; P2 = exploratory.

| Phase | Player-visible milestone | Main dependency |
|---|---|---|
| 0. Baseline audit | Stable, documented existing alpha | Current code |
| 1. Discovery & defense | Detect and survive a real asteroid storm | Research, physics, colony |
| 2. Nearby worlds | Discover, reach, survey, mine and return from a moon | Navigation, persistent bodies |
| 3. Ship engineering | Create specialized scouts, miners and interceptors | Equipment, inventories |
| 4. Seeded system simulation | Explorable, persistent multiple-body system | Coordinates, seeds, saves |
| 5. Remote industry | Multiple connected outposts and earned logistics | Economy, autonomy |
| 6. Interstellar reach | Discover and physically travel to another star | Huge-world architecture, drive decision |
| 7. Deep universe | Diverse systems, rare phenomena and living history | Scalable simulation |
| 8. Quality/release | Complete, coherent and performant experience | Tests/playtests throughout |

Every phase should finish in a playable **vertical slice**, not an isolated infrastructure component.

## Phase 0 — Inventory & stabilize the existing alpha
**Goal:** Preserve shipped work; make the current implementation a dependable foundation.
### 0A. Audit (P0)
- [ ] Inspect code structure, entity IDs, world coordinates, gravity, terrain, event logic, saving and automated tests.
- [ ] Verify the features described by README, GAME_DESIGN, PROGRESSION and local-world documentation.
- [ ] Catalogue existing 10 technologies, 16 ship parts/8 slots, mining, tow, EVA, buildings, radar, navigation, defense drills and nearby moon.
- [ ] Identify duplicates, current gaps, and safe extensions.
### 0B. Reliability (P0)
- [ ] Verify build/tests, representative flight/landing and resource-manufacturing loop, save/load and pause.
- [ ] Maintain finite-resource accounting, clear UI feedback, no unearned resets or free refills.
- [ ] Document physics and feature contracts for successors.
**Exit:** An independent developer can play, reproduce and explain the actual current systems before adding new ones.

## Phase 1 — First discovery-to-defense story
**Player story:** I built an Observatory, discovered an approaching asteroid storm, prepared for it and recovered new resources afterward.
### 1A. Discovery research (P0)
- [ ] Persist observations, samples and discovered facts, separate from known research and fabricated parts.
- [ ] Extend existing prerequisites to support discoverable opportunities and research inputs.
- [ ] Reveal why technology is available or unavailable and its practical benefits.
### 1B. Observatory and sensors (P0)
- [ ] Powered constructible Observatory with scan state and readable UI.
- [ ] Detect at least one meaningful nearby world and impending debris event.
- [ ] Warning interval, uncertainty, arrival direction; improved scanning supplies better precision.
- [ ] Tracking radar produces trajectories and possible impact corridors rather than omniscient prediction.
### 1C. Storm simulation (P0)
- [ ] Spawn seeded incoming asteroid initial states outside the active encounter area.
- [ ] Enter detailed local physics continuously; enforce physically consistent gravity and collision.
- [ ] Include misses, far-side impacts and encounters with in-flight ships.
- [ ] Save/reload preserves the event, predictions and resulting damage.
- [ ] Tune first storm to generate meaningful urgency without routine unrecoverable losses.
### 1D. Real defense and aftermath (P0)
- [ ] Extend existing powered turret/weapon model; add meaningful range, targeting, cooling and line-of-sight constraints as needed.
- [ ] Allow manual ship interception alongside turret strategy.
- [ ] Persist impacts, physical fragments, structural damage and recoverable meteorite minerals.
- [ ] Unlock at least one new research path through analyzed impact material.
### 1E. Expanded defense (P1/P2)
- [ ] P1: periodic streams, singular large bodies, deflection trajectories and mineral-rich capture.
- [ ] P1: radar networking and probabilistic impact forecasts.
- [ ] P2: missile silos, shield generators, orbital defense.
**Exit:** A complete playthrough from observation through preparation, real impacts, aftermath and new technological opportunity, with a working save/reload.

## Phase 2 — Nearby worlds and lunar industry
**Player story:** An observed moon is a physical destination, not a menu.
### 2A. Navigation/surveys (P0)
- [ ] Link actual orbital bodies to detect/survey/explore map states.
- [ ] Show distance, relative velocity, transfer/braking considerations and uncertainty.
- [ ] Preserve direct off-sequence exploration.
### 2B. Multi-body flight (P0)
- [ ] Validate current Selene/Nacre world and extend consistently.
- [ ] Different gravity/terrain/atmospheric hazards; valid landing and EVA on each.
- [ ] Keep facilities and depletion persistent at remote sites.
### 2C. New materials & ship capabilities (P0)
- [ ] Generate unique useful deposits and harder extraction requirements; no geographical locks.
- [ ] Enable return cargo, refuelling decisions and recovery/rescue.
- [ ] Make a material sample or survey finding prerequisite to a meaningful new part/technology.
### 2D. Probes (P1)
- [ ] Finite survey probes with sensors, propellant and power; remote data return.
**Exit:** Observe, reach, land or survey, extract an unusual sample, return or transmit knowledge and obtain a meaningful advancement.

## Phase 3 — Modular ship engineering and fleet identities
**Player story:** Same mission, multiple genuinely different designs.
### 3A. Evolve existing equipment (P0)
- [ ] Audit current slots and physical mass/fuel/power/thermal costs.
- [ ] Decide constrained slots versus modular structural editor.
- [ ] Guarantee paid fabrication, salvage and saved installed state.
### 3B. Meaningful roles (P0)
- [ ] Build viable scout, cargo miner and interceptor; player can improvise hybrids.
- [ ] High-thrust versus efficient low-thrust engines, real acceleration/fuel trade-offs.
- [ ] Sensors, mining tools, weapons, armor/deflectors, cooling, grapples and cargo limitations.
- [ ] Model braking fuel and landing difficulty with payload.
### 3C. Multi-ship operations (P1)
- [ ] Persistent owned vessels, unattended state and control-switch policy.
- [ ] Docking, refuelling, transfers, rescue, towing and salvage.
### 3D. Large ships (P2)
- [ ] Detachable payloads, carriers with small landers, orbital shipyards.
**Exit:** A scout and miner handle differently, have different viable tactics and must manage physical trade-offs. No hidden magical upgrades.

## Phase 4 — Seeded system and persistent simulation
**Player story:** Travel to distant bodies; the world remains coherent after departure.
### 4A. Deterministic generation (P0)
- [ ] Hierarchical seed IDs for stars, bodies, surfaces, deposits and major anomalies.
- [ ] Stable discovery-independent generation order.
- [ ] Fair-start constraints; distinctive but plausible correlated conditions.
### 4B. Huge-world coordinates/physics (P0)
- [ ] Large-distance coordinate representation with accurate local relative physics.
- [ ] Analytic large-body orbits, detailed nearby collision, consistent frame transitions.
- [ ] Validate planet gravity, moving-body targets and externally arriving storm bodies.
### 4C. Persistence (P0)
- [ ] Local simulation versus coarse remote production versus distant orbit/event state.
- [ ] Persist changes, constructions, resource extraction, wrecks, craters and events as deltas.
- [ ] Versioned saves and migration.
### 4D. Diversity (P1)
- [ ] Variable planet sizes, gravity, atmospheres, terrain, resource maps and dense debris regions.
**Exit:** Identical seed generates identical initial geography in different visits; modified world and inventory persist through relocation and save/load; no physics or production discontinuity.

## Phase 5 — Automation, industry and multi-outpost economy
**Player story:** My remote mine supports the main settlement while I fly somewhere else.
### 5A. Multiple outposts (P0)
- [ ] Consistent power, storage, production, depletion, repair and life support at remote sites.
- [ ] Coarse simulation matches active simulation within documented budgets.
### 5B. Earned automation (P0)
- [ ] Rovers, cargo handlers, mining drones or automated rigs with real fuel/energy/maintenance needs.
- [ ] Remote commands and visible shortages; no instant cross-world transfers.
### 5C. Logistics (P1)
- [ ] Fuel depots, freight manifests, physical routes, scheduled flights and recovery of failures.
- [ ] Trade-off: ship raw ore or refine/manufacture close to source.
### 5D. Autonomous expansion (P2)
- [ ] Deployable industrial colony package with finite inputs and resource constraints.
**Exit:** Multiple outposts exchange finite products via time-consuming transport while player performs other tasks; saved inventory cannot duplicate.

## Phase 6 — Multiple star systems and interstellar travel
**Decision prerequisites:** Resolve travel model, scale/time acceleration and player control of unattended ships before final designs.
### 6A. Galaxies and detection (P0)
- [ ] Procedural stellar coordinates and system archetypes, clusters and sparse regions.
- [ ] Star observability, uncertainty and probe-based survey.
- [ ] Generate remote systems reproducibly and without simulating everything every frame.
### 6B. Interstellar propulsion (P0)
- [ ] Prototype continuous advanced drive (preferred), compare realistic/time-accelerated travel and jump alternative.
- [ ] Preserve reasons for conventional engines near surfaces and in local operations.
- [ ] Apply energy/fuel, braking, shielding and navigation constraints; no artificial system barriers.
### 6C. Traversal and hazards (P0)
- [ ] Functional origin-to-destination navigation in continuous space.
- [ ] Dense micrometeoroid/debris regions, radiation and route-choice trade-offs.
- [ ] Arrival, slowing, system entry and outpost creation under consistent physics.
### 6D. Interstellar operational logistics (P1)
- [ ] Probe-first expeditions, fuel waystations, rescue and perhaps communications delays.
**Exit:** From a single game seed, survey and reach another star system, visit one world and preserve originating base plus new-world changes.

## Phase 7 — Deep exploration, emergent history & late-game projects
### 7A. Rich world archetypes (P1)
- [ ] Binary-star orbital challenges, red-dwarf radiation, young debris-rich systems, rogue worlds and barren worlds with strategic position.
- [ ] Surveyable rare phenomena and specialized minerals.
### 7B. Emergent events (P1)
- [ ] Comets, impacts, drifting wrecks, industrial failures, recurring orbital streams and true opportunity windows.
- [ ] Persistent history without forcing a quest for every occurrence.
### 7C. Optional mysteries (P2)
- [ ] Derelicts, anomalous signals, ancient structures, rare non-linear discoveries and research branches.
### 7D. Ambitious infrastructure (P2)
- [ ] Orbital construction, mass drivers, carriers, automated remote industry and possible planetary engineering.
**Exit:** Different seeds and exploratory choices produce distinct stories, and player-built history survives long after the first homebase.

## Phase 8 — Quality, onboarding and release readiness
This work should happen **throughout**, not only at the end.
### 8A. Gameplay and accessibility (P0)
- [ ] First sortie intuitive; clear HUD and tutorial; visible why technologies and buildings are unavailable.
- [ ] Survey uncertainty and physical hazards communicated honestly.
- [ ] Recoverable loss path; avoid early softlocks.
### 8B. Technical quality (P0)
- [ ] Automated physics/economy/persistence regression tests.
- [ ] Performance budgets for local collisions, far-away systems, procedural generation and save sizes.
- [ ] Save migration, focus/pause handling, error recovery and deterministic reproductions.
### 8C. Balance (P0)
- [ ] Verify opening minute-to-minute action remains enjoyable.
- [ ] Player grows from one vulnerable lander to large industrial network while retaining hands-on flight.
- [ ] Non-level-scaled threats; viable choices between exploration, defense and industry.
**Exit:** End-to-end, repeatable, stable multi-session game with meaningful progression and a distinct sense of scale.

---

## Cross-cutting acceptance principles
1. **No hard area locks:** Every destination is theoretically explorable; hazard/range/logistics may be prohibitive.
2. **No invented resources:** Production consumes inputs; physical cargo, ammunition, fuel and electricity matter.
3. **No magic knowledge:** Instrument capability determines observations, not whether worlds exist.
4. **No destructive phase rewrites:** Extend tested alpha systems unless a documented migration is approved.
5. **No level-scaled universe:** Risks have environmental causes independent of player level.
6. **No silent scope commitments:** P2 concepts require explicit review before build work.
7. **Scale must be felt:** One ore rock early should matter; remote planetary operations late should feel earned, not trivialized.
8. **Always playable:** A milestone is not accepted on code completion alone; require hands-on test and repeatable saving.

## Working protocol for future developers / Codex
1. Read **MASTER_DESIGN_BIBLE**, **SCALE_AND_EXPERIENCE**, this roadmap and the current implementation docs.
2. Inspect the actual target code. Mark relevant items Verified existing / Partial / Not started / Deferred.
3. Choose the smallest vertical slice that yields visible player value.
4. Document assumptions, open decisions, physics/economic invariants and migration considerations.
5. Implement with targeted automated tests and manual reproduction steps.
6. Open a reviewable PR; do not merge speculative design changes into unrelated feature work.
7. Update this roadmap, feature docs and design decision log after acceptance.

## Decision backlog
See Bible D-01–D-12. Priority for near-term discussion: **interstellar mechanism, distance/time model, player identity/remote-ship control, initial seed variability, local-to-galactic coordinate system, and how to preserve scale without exhausting the player.** These are open, not blockers for Phase 1.

## Decision log
| Date | Decision | Status |
|---|---|---|
| 2026-11-04 | Hybrid exploration/building with intermittent survival/defense | Core direction |
| 2026-11-04 | No arbitrary geographic level-gating | Core principle |
| 2026-11-04 | Large seeded, persistent multi-star continuous 2D universe | Preferred direction |
| 2026-11-04 | First Observatory-triggered asteroid-storm vertical slice | Preferred milestone |
| 2026-11-04 | Advanced continuous drive vs compressed time/distance vs jumps | Open |
