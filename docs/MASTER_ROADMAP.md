# OUTPOST — Master Phased Roadmap
**Version:** 1.0 · **Date:** 2026-11-04 · **Status:** Proposed, subject to code audit.  
**Companion:** [Master Design Bible](MASTER_DESIGN_BIBLE.md) and [Scale and Experience](SCALE_AND_EXPERIENCE.md).

> **Core identity: Don't just explore space. Engineer it.** Every phase should deepen creative engineering, player-invented solutions and personal persistent history. Depth, ingenuity and excellent gameplay come before breadth. Apply the [identity acceptance gate](#core-identity-acceptance-gate-all-phases) alongside all existing exits.

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

### 0C. Energy baseline audit (P0)
- [ ] Trace generation, finite storage, dispatch, essential reserves and paid habitat backup in current code.
- [ ] Verify per-world energy isolation, remote ticking and paused/save-restored state; record current units and allocation order.
- [ ] Classify each proposed item in [Planetary Energy Systems](ENERGY_SYSTEMS.md) as existing, partial, new or deferred before assigning build work.
**Energy exit:** Document the actual shared-bus/constant-solar baseline and extend it without losing current resource protections.

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

### 1F. Energy resilience for the first storm (P0 for reserve/feedback; P1 for thermal prototype)
- [ ] Extend existing power budgets with demand, stored reserve and defense-burst visibility; distinguish kW supply/rate from kJ capacity.
- [ ] Give at least two viable preparation choices: extra generation/storage, prioritized loads, manual interception or protected emergency supply.
- [ ] Prototype simple weapon/industrial cooling warnings and derating only when they improve readable storm decisions; do not require a complete thermal network.
- [ ] Expose cause of a stopped defense and a recoverable power-restoration action.
**Dependencies:** 0C, existing paid dispatch and defense, D-16 failure severity before damaging thermal cascades.
**Energy exit:** Survive a storm under a finite energy budget, explain a deliberate reserve trade-off and restore a damaged/stalled system without free refills. Broad reactors/weather do not block this signature slice.

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

### 2E. Expedition energy and site suitability (P1)
- [ ] Survey illumination/dark intervals, ambient temperature and relevant atmosphere/geology as ranges with uncertainty.
- [ ] Prototype environmental solar plus batteries on a test world with an explicitly defined rotation/illumination clock; do not silently add nights to existing non-rotating surfaces.
- [ ] Compare solar/storage with a finite supplied radioisotope package for low-load remote instruments. RTG is not an industrial replacement.
- [ ] Add finite portable startup storage and verify a remote foothold can recover essential power.
**Dependencies:** 0C, freight/inventory, D-08 shared clock, D-14 environment; fuel-package fabrication/import must have a bootstrap route.
**Energy exit:** Two viable expedition kits have different mass, endurance and supply costs; local output cannot appear at home. A blackout can be restarted with paid assets.

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

### 3E. Common power and heat grammar (P1)
- [ ] Use explicit generation, auxiliary demand, charge/discharge limits, heat production and rejection for the modules included in the slice.
- [ ] Compare exposed radiators in vacuum with appropriate atmospheric cooling using the same environmental inputs.
- [ ] Prototype heat buffers, warnings, derating and restart behavior across a ship tool and an installation; do not require full fluid simulation.
**Dependencies:** D-13 fluid scope, D-14 environment, D-16 failure/recovery; existing module costs and controls.
**Energy exit:** Repeated laser/tool use is limited by paid energy and thermal capacity; disabling, refitting or reloading cannot erase incurred heat or restore charge.

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

### 4E. Deterministic energy environments (P1)
- [ ] Generate correlated stellar flux, illumination cycles, atmosphere/wind bands, temperature and accessible geothermal sites.
- [ ] Preserve survey uncertainty separately from seeded ground truth; changes in visit order cannot create better generation sites.
- [ ] Include fair-start energy/material access and explicit night/weather durations in generation validation.
**Dependencies:** D-06 start variability, D-08 time, D-14 environmental scope and 4A/4C.
**Energy exit:** A repeated seed yields the same usable site opportunities and forecasts; contrasting worlds support contrasting viable power plans.

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

### 5E. Local grids, storage and heat rejection (P1)
- [ ] Evolve shared-bus operation into useful local districts/relays; preview connections and independent islands before requiring detailed cables.
- [ ] Apply finite link capacity and explicit losses if selected; extend current dispatch/reserves with essential cooling/control dependencies.
- [ ] Add rate-limited batteries/capacitors, local black-start reserves and understandable outage/thermal forecasts.
- [ ] Couple generation and heavy industry to bounded cooling loops/sinks. Waste-heat reuse credits only compatible displaced heating demand.
- [ ] Keep local and coarse simulation consistent across darkness, grid splits, fuel exhaustion and thermal thresholds; advance at event boundaries.
**Dependencies:** 3E, 4C/4E, D-08, D-13, D-16, D-18.
**Energy exit:** Breaking a link isolates only the affected district; reserves, load shedding and repair provide alternative responses. No transfer loop creates electricity or cooling capacity.

### 5F. Industrial generation and fuel economy (P1, separate playable slices)
- [ ] Fission: standardized fuel manufacture/import, startup/auxiliary power, shielding, bounded cooling, residual heat, service and finite spent-fuel storage.
- [ ] Geothermal: survey/pilot bore, drill startup supplies, site-bound shared yield, heat exchange and readable seismic/drawdown rules if included.
- [ ] Wind: density-dependent output, correlated weather, calm/storm shutdown and repair; zero generation in vacuum.
- [ ] Link fuel, spares and waste to real freight and bounded automation, preserving earlier solar/RTG roles.
**Dependencies:** 5A/5C/5E, D-13–D-18; select fuel recipe and failure severity before reactor implementation.
**Energy exit:** At least two industrial power mixes are viable on contrasting sites. Shutdown remains possible with full waste storage; cooling/fuel loss is warned and recoverable. No unavoidable supply-chain deadlock.

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

### 7E. Advanced energy experiments (P2, explicit review before build)
- [ ] Evaluate fusion only after industrial fuel, cooling and logistics slices work; decide fuel chain, startup/recirculating power, net export, servicing and waste implications.
- [ ] Consider thermal/chemical storage, specialist stores and power beaming only when they add a distinct useful choice.
- [ ] Retain efficient small-site options, conventional generation and local backups.
**Dependencies:** 5E/5F, advanced materials/industry, D-09 scope and energy-specific open decisions.
**Energy exit:** A paid advanced plant enables a new ambitious project, yet cannot eliminate fuel supply, heat rejection, transmission constraints or the value of simpler outposts.

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
See Bible D-01–D-18 and [Cross-cutting Gameplay Design Questions](DESIGN_QUESTIONS.md). Priority for near-term discussion: **interstellar mechanism, distance/time model, player identity/remote-ship control, initial seed variability, local-to-galactic coordinate system, and how to preserve scale without exhausting the player.** These are open, not blockers for Phase 1.

## Decision log
| Date | Decision | Status |
|---|---|---|
| 2026-11-04 | Hybrid exploration/building with intermittent survival/defense | Core direction |
| 2026-11-04 | No arbitrary geographic level-gating | Core principle |
| 2026-11-04 | Large seeded, persistent multi-star continuous 2D universe | Preferred direction |
| 2026-11-04 | First Observatory-triggered asteroid-storm vertical slice | Preferred milestone |
| 2026-11-04 | Advanced continuous drive vs compressed time/distance vs jumps | Open |
| 2026-11-04 | One consistent simulation clock for local and remote processes; pause freezes all (D-08) | Agreed starting direction; acceleration rules open |
| 2026-11-04 | Simple conserved fluids and shared finite inputs (D-13) | Agreed starting direction; resource/connection detail open |
| 2026-11-04 | Recoverable failures with warnings, derating and safe shutdown (D-16) | Agreed initial baseline; greater severity requires review |
| 2026-11-04 | Bounded automation with paid jobs, finite supplies and explicit limits (D-18) | Agreed starting direction; autonomy thresholds open |


## Distinctive-experience quality gate (applies to all phases)
See [Distinctive Experience & Design Differentiation](DISTINCTIVE_EXPERIENCE.md). Feature proposals must explain how they strengthen the physical simulation, discovery-driven engineering, consequential choices and/or the intimate-to-civilizational scale progression. A signature mechanic should usually meet at least 3 of 4 qualities; supporting accessibility, reliability and infrastructure features are exempt. Prioritize polish of the first mining flight, the first real asteroid storm, and the first physical expedition to another world before broad content expansion.

### Additions to Phase 1 signature slice
- [ ] Offer more than one viable response to storm hazards, including physical ship interception or trajectory modification where feasible.
- [ ] Preserve fragment motion and meaningful consequences; interception is not a magical delete operation.
- [ ] Allow a valuable object to become salvage or a future industrial opportunity rather than only a defense score.

### Additions to Phase 3 research and engineering
- [ ] Evaluate multi-application engineering principles (emitters, cooling, sensors, materials) rather than redundant isolated upgrades.
- [ ] Test trade-offs of dual-use mining/defense/ship hardware before increasing module count.

### Additions to Phase 7 persistent identity
- [ ] Support memorable player-origin stories, e.g. asteroid threatening home → deflected/captured → mined → used as station site (advanced, exploratory).
- [ ] Test whether a player can recount a distinctive emergent event, not merely list available mechanics.

## Energy verification gate (for affected implementation slices)
Design detail: [Planetary Energy Systems](ENERGY_SYSTEMS.md). These unchecked requirements are proposed work, not test results.
- [ ] Verify finite energy balance, storage/rate limits, conversion losses and bounded heat transfers; no negative stock or profitable charge/discharge loop.
- [ ] Verify fuel/heat/waste/partial service state through toggles, demolition, salvage, pause, current-version save/load and local/remote transitions.
- [ ] Verify deterministic priorities and dependency funding: no full reactor export with unpaid cooling/control; no reserve spent twice.
- [ ] Verify no free cross-world electricity or cargo, and no entire coarse production interval credited across an interruption.
- [ ] Playtest a blackout/black-start, cooling failure and supply interruption with a visible recovery path.
- [ ] Compare two useful power mixes on contrasting sites and test that no generator universally dominates.
- [ ] Follow AGENTS.md prototype-save policy: support current-version saves; defer legacy migrations until later development. Earlier roadmap migration entries remain long-term work.

## Core identity acceptance gate (all phases)
**Agreed core principle, 2026-11-04:** [Don't just explore space. Engineer it.](MASTER_DESIGN_BIBLE.md#defining-identity--agreed-core-principle-2026-11-04) These unchecked items are future review requirements, not completed playtests. Retain the existing four-part distinctive-experience gate and phase exits; this gate adds evidence for the identity rather than replacing them.

Before accepting a major signature slice or materially expanding its content:
- [ ] **Capabilities, not prescribed solutions:** Identify the physical capabilities and at least two useful applications or combinations of the relevant components. Explain mass, fuel, energy, heat, mounting and recovery constraints; prefer reusing existing machinery over adding an isolated solution mechanic.
- [ ] **Emergent ingenuity:** Present a physical problem with more than one viable response. Observe players without prescribing the answer and record an independently invented approach, why it works and whether it depends on a scripted exception. Refine and retest if only the intended solution appears.
- [ ] **Physical satisfaction:** Playtest flying, mining, constructing and object manipulation without leaning on progression rewards. Record handling, feedback, clarity and enjoyment problems, then resolve material weaknesses before multiplying content. Research and exploration also need satisfying decisions and discovery in their own right.
- [ ] **Personal persistent history:** Record a player account of something they built, changed, saved or destroyed. Revisit the relevant object/site after travel and current-version save/load; verify that its meaningful state and causal consequences remain recognizable.
- [ ] **Depth before scale:** Review evidence across the first mining flight, physical storm and other-world expedition before substantial expansion into more planets, technology tiers or components. Specify what a larger scope adds to agency rather than merely counting new content.

Use the [distinctiveness proof-test table](DISTINCTIVE_EXPERIENCE.md#10-agreed-identity-and-proof-tests) in PR/playtest notes: setup, player action, observed outcome, unresolved weakness and next adjustment. Automated physics, economy and persistence checks accompany human evidence; they do not establish enjoyment or ingenuity. Supporting accessibility, reliability and infrastructure work may explain an indirect contribution instead of passing every creative test independently.

### Minimal phase applications (extend existing slices)
- **Phase 1:** Compare physical interception, deflection where supported, protection or evacuation instead of prescribing one turret count. Preserve meaningful fragments, damage and recovery history; unavailable responses remain proposals until prototyped.
- **Phase 3:** Demonstrate useful component reuse across roles, with real trade-offs. A dual-use mining/defense tool or a tug repurposed for deflection is an example, not a requirement to build both.
- **Phases 4–5:** Retain the identity and consequences of player-built assets through local/remote transitions and earned automation. Logistics must support new inventions without removing the satisfying manual core.
- **Phases 6–7:** Expand only after the small-scale proof holds. Captured-asteroid stations, converted ships and other advanced combinations remain illustrative/exploratory under existing scope rules.

### Recorded identity decision
| Date | Decision | Status |
|---|---|---|
| 2026-11-04 | “Don't just explore space. Engineer it.”; multipurpose physical components, player-invented solutions and capabilities rather than prescribed answers; emergent ingenuity, physical satisfaction and personal persistent history as proof tests; depth before scale | Agreed core identity and evaluation criteria; implementation evidence still required |
