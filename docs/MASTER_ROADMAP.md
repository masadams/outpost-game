# OUTPOST — Master Phased Roadmap
**Version:** 1.1 · **Date:** 2026-11-04 · **Status:** Adopted systems direction; slices proposed, subject to code audit.  
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

Every phase should finish in a playable **vertical slice**, not an isolated infrastructure component. The integrated S0–S6 sequence below supplies cross-phase dependencies; the table is a long-horizon map, not permission to implement every phase in parallel. [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) retains shipped milestone status and release tracking.

## Phase 0 — Inventory & stabilize the existing alpha
**Goal:** Preserve shipped work; make the current implementation a dependable foundation.
### 0A. Audit (P0)
- [ ] Inspect code structure, entity IDs, world coordinates, gravity, terrain, event logic, saving and automated tests.
- [ ] Verify the features described by README, GAME_DESIGN, PROGRESSION and local-world documentation.
- [ ] Catalogue existing 10 technologies, 16 ship parts/8 slots, mining, tow, surface astronaut/suit, buildings, radar, navigation, defense drills and nearby moon; distinguish future free-flight EVA.
- [ ] Audit existing paid work queue, real astronaut dispatch, low-air stop/manual override and powered oxygen habitats before population extensions (S0).
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
- [ ] Versioned current-format saves; development resets are allowed. Defer legacy migrations until near completion per AGENTS.md.
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
- [ ] Current-format save validation, focus/pause handling, error recovery and deterministic reproductions; plan legacy migration only near completion.
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
See Bible D-01–D-18, including the adopted direction in section 20. Priority for near-term discussion: **interstellar mechanism, distance/time model, player identity/remote-ship control, initial seed variability, local-to-galactic coordinate system, and how to preserve scale without exhausting the player.** These are open, not blockers for Phase 1.

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
| 2026-11-04 | Focus reset: UX rebuild + first mining sortie before new systems; full-screen windows pause; hide non-focus systems; Preact UI layer | Agreed; see [CURRENT_FOCUS](CURRENT_FOCUS.md) |


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


## Integrated systems vertical slices (S0–S6)
Read [Bible section 20](MASTER_DESIGN_BIBLE.md#20-adopted-systems-direction--2026-11-04) for **agreed direction** and D-13–D-18 for open details. All items below are **proposed acceptance work**, not newly completed features. Stage gates limit scope: proceed after the preceding playable result has evidence. Preserve the excellent mining sortie, physical storm and first other-world expedition as the quality priorities.

| Slice | Phase integration | Dependency | Bounded player result |
|---|---|---|---|
| S0 | Phase 0 | Current alpha | Establish exactly what crew, queues and habitats already do |
| S1 | Phases 0/5; enrich signature slices | S0 | A small physical crew builds, services and returns to useful habitation |
| S2 | Phases 1/2/3/5 | S1 | Solve one environmental/power/thermal problem at an outpost |
| S3 | Phases 1/4/5 | S1; S2 for pressure/shelter effects | Excavation or impact changes terrain, access and support |
| S4 | Phases 2/5 | S1/S2; S3 only for terrain-dependent recipes | Mine, process, haul and repair through a small industrial chain |
| S5 | Phases 4/5 | S4 and working sensors | A supplied remote crew operates with limited communications |
| S6 | Phases 4/6 | S5 and time/drive decisions | Accelerated long travel preserves the originating settlement |

### S0 — Extend the shipped foundation (P0)
- [ ] Inspect code/tests against [DIRECT_CONTROLS](DIRECT_CONTROLS.md), [COMMAND](COMMAND.md), [HABITATS](HABITATS.md), [NEARBY_WORLDS](NEARBY_WORLDS.md), [AUTOMATION](AUTOMATION.md) and [DEVELOPMENT_ROADMAP](DEVELOPMENT_ROADMAP.md).
- [ ] Record Verified existing / Partial / Not started / Deferred for each relevant contract. Current docs report paid eight-second stationary work within 96 m, optional real walking dispatch, suit-air stop/manual override, local colony budgets and powered finite oxygen buffers. Verify these rather than inventing replacements.
- [ ] Distinguish the current controllable astronaut from a population of workers. Distinguish breathable dome coverage from future residential capacity, pressure volumes, shelter and full EVA.
**Acceptance:** Reproduce a paid dispatch/build, stop/cancel, low-air interruption and dome power/oxygen outage with normal controls; save/load preserves actual progress and supplies. Record actual checks and unresolved gaps. This documentation update does not claim to have run those game checks.

### S1 — First inhabited building site (P0; decide D-13/D-14)
**Story:** I support a small crew in a habitat, send workers to build a useful structure, then repair it and bring them safely home.
- [ ] Prototype one additional planetary worker and one home habitat; extend actor/job identity, construction escrow and current dispatch/manual override.
- [ ] Define explicit recruitment/arrival and transport costs without free workers appearing on a remote planet.
- [ ] Implement observable assignment, travel, stationary supplied work, completion, service and return. Start with construction and repair; generalize other jobs only after this loop works.
- [ ] Add finite occupancy/capacity and oxygen/pressure/power support. State which shelter/thermal/radiation properties are present in this slice; defer the rest to S2 visibly.
- [ ] Show suit budget, estimated travel/work/return margin, destination, worker status and actual blocked reasons. Define safe-return/service behavior beyond today's low-air stop.
**Acceptance:** Workers visibly traverse the world and complete only supplied reachable work. Moving the habitat or adding a supplied shelter changes useful working time/range. An out-of-range job is refused or pauses with a clear cause. Cut air/power or block the route: work stops and the declared safety policy runs without teleportation, free air or hidden completion. Multiple workers cannot claim one job twice or double-spend escrow. Manual control remains usable; damage/repair and current save continuation retain actor/job state.
**Gate:** Physical consequence + meaningful decisions + growing scale; useful discovery may arise from surveying a safer route/site. Reject a passive habitat productivity aura.

### S2 — One environmental engineering problem (P0; decide D-15)
**Story:** A remote vacuum site needs reliable power, heat rejection and protection; I choose between infrastructure layouts.
- [ ] Share body/site atmosphere, temperature, pressure, sunlight and radiation facts across flight, sensors, workers and equipment; expose uncertainty before surveying.
- [ ] Begin with lumped thermal budgets and simple exposure/pressure rules, not full fluid dynamics. Track generated/stored/transferred/rejected heat and declared losses.
- [ ] Extend solar/batteries with one alternative, chosen by a surveyed need (for example fission or geothermal), plus cooling and essential life-support allocation.
- [ ] Keep radioisotope, suitable wind and fusion in the agreed portfolio; add them incrementally only when distinct jobs justify them.
**Acceptance:** Compare a vacuum site and atmospheric site with the same equipment. Their conditions change a practical choice. Sustained industrial/reactor operation saturates inadequate cooling, visibly throttles or damages under declared thresholds, and recovers after a real intervention. Removing a radiator or fuel delivery is consequential. Habitat support has paid capacity; exposed crew cannot receive shelter protection from a cosmetic roof. No universal generator dominates the two tested situations.
**Gate:** Survey information changes engineering; power, worker safety and thermal design interact before adding more technology tiers.

### S3 — A crater or excavation that matters (P0; decide D-16)
**Story:** A physical impact or deliberate dig changes my base site; I shore, relocate or repair the affected infrastructure.
- [ ] Prototype bounded persistent terrain deformation and excavation using the existing radial/moving-body framework. Stage underground chambers/access after surface craters work.
- [ ] Define foundation support/connectivity with simple explicit limits; warn before undermining. Avoid full finite-element engineering.
- [ ] Connect geometry to collision, worker routes, reachable work, deposits and building support. Define pressure/shelter effects when underground volumes are introduced.
- [ ] Give damaged structures bounded repair/salvage; preserve deposits independently of demolition and terrain edits.
**Acceptance:** Create one crater and one intentional excavation; return and reload to find both unchanged. Undermining one foundation invalidates/stresses/fails it under the declared simplified rule; an unaffected building remains sound. Workers re-evaluate access, unsupported placement is rejected, and repairs cannot reset mined reserves or mint salvage. Demonstrate a feasible support/relocation response rather than unavoidable cascading destruction.
**Gate:** Permanent consequence and alternative engineering responses must justify deformation cost before generalized planet reshaping.

### S4 — Moderate industry and physical supply (P0; decide D-17)
**Story:** I choose whether to haul ore home or process it near a crewed mine, then deliver parts for maintenance.
- [ ] Reuse existing ore/alloy/wire/components/ice/water/oxygen/fuel chains. Add at most one useful intermediate or specialization for the first trial.
- [ ] Couple finite geology/extraction to local stocks, power/heat, storage, construction and repair demand. Simplified tanks/flows suffice for liquid handling.
- [ ] Prototype one visible local hauling task and one ship freight route with real mass, time, loading capacity and supplies. Document the boundary of the existing shared colony bus; replace it only through a separately reviewed slice.
- [ ] Add supplied scheduled maintenance/repair jobs with clear wear/fault causes and tolerable cadence; no constant chore timer.
**Acceptance:** Complete mine → process → transport → build/repair. Compare raw versus processed shipping with measured payload, energy, worker time and travel costs. Block a delivery: dependent work waits without stock teleportation or loss of paid progress. Verify scarce co-products, capacity, cancellation and destruction accounting. A player can explain a meaningful choice without a large recipe catalogue.
**Gate:** Interaction depth and physical expansion; no Factorio imitation through conveyor/recipe breadth.

### S5 — Sensors, communications and earned autonomy (P0; decide D-18)
**Story:** A surveyed remote site keeps its crew safe and supplies moving while contact is interrupted.
- [ ] Distinguish radar motion tracking, telescopic detection, geological prospecting and local probe measurements by useful information, range and uncertainty.
- [ ] Add one relay/coverage problem with timestamps, observed versus estimated data and explicit queued/rejected command behavior.
- [ ] Keep current direct controls working until a reviewed communications slice introduces constraints. Define autonomous jobs, emergency shelter and resource-priority policies.
- [ ] Coarse remote jobs account for crew availability, travel, supply, maintenance and faults; automation has power/material costs and manual intervention.
**Acceptance:** Survey changes the chosen site/route. Lose communications during a paid job: local policy and safety continue as declared, displayed information becomes stale, and no remote command grants instant labour or freight. Reconnect without duplicate commands/results. Inspect a remote outpost in detail and compare against coarse simulation within a documented tolerance and event ordering. Manual rescue/intervention remains possible.
**Gate:** Information and infrastructure create choices while preserving usable control; exact light-speed delay remains open.

### S6 — Long travel without skipped consequences (P0; decide D-01/D-02/D-08)
**Story:** I send a probe, provision a crewed journey and return to a settlement whose history continued coherently.
- [ ] Prototype bounded time acceleration in the existing neighborhood before committing interstellar propulsion or distances.
- [ ] Define the common clock, pause, accelerated/local/coarse updates, command latency and event boundaries. Downshift/stop at unsafe encounters under an explicit policy; do not merely simulate huge unstable physics steps.
- [ ] Budget oxygen/life support, fuel/braking, heat, maintenance and cargo for long travel; test resupply or rescue.
- [ ] Only after that evidence, compare continuous advanced drive, compressed scale/time and jump alternatives against the identity gate.
**Acceptance:** Run the same bounded trip at normal and accelerated time; production, resources, worker/job progress, orbits and hazard outcomes agree within declared tolerances. Pause advances none; load causes no offline windfall. An approaching impact or life-support shortage cannot be skipped by acceleration. Arrive, establish supplied habitat/work and preserve both origin and destination across current-format saves.
**Gate:** Distance earns new reach and logistical decisions; idle waiting, instant consequence erasure and giant world counts are not acceptance evidence.

## Engineering invariants for these slices
These are requirements for future implementation reviews, not claims of new test coverage.
1. **Local ownership and conservation:** Inventory, job escrow, cargo, habitat gas and salvage have one owner at a time. Transfers debit and credit once; capacity/reserves apply. Reaction outputs plus declared losses balance inputs; energy and heat ledgers state their approximation.
2. **Physical labour:** An actor belongs to one world/location/vehicle at a time. Work requires presence, access, tools, supplies and valid state. Travel consumes time; people and cargo do not teleport through commands or simulation LOD.
3. **Finite habitation:** Occupancy and air/power/thermal capacity constrain supported crew. Overlap cannot double-count breathable air, shelter or worker capacity. Added/repaired capacity starts without invented supplies.
4. **Safe, legible interruption:** Paused/cancelled/blocked jobs retain declared paid progress and release/refund only owned escrow. Stop/manual override cannot silently resume another job. Safety margins include return/service costs and communicate uncertainty.
5. **Terrain consistency:** Rendered modifications, collision, support, routes and resource ownership derive from the same persistent world geometry. Impacts/repairs/demolition cannot respawn reserves.
6. **Shared causal time:** Production, travel, consumption, wear, events and orbital state advance consistently. Paused simulation advances none. LOD/warp transitions preserve accounting, stable IDs and meaningful outcomes within documented tolerances.
7. **Information integrity:** Unknown/stale/estimated data stays labeled; loss of communications does not erase already valid local safety policy or retroactively execute commands.
8. **Current-save contract:** Persist worker identity/location/occupancy, jobs/escrow, supplies, thermal state, terrain/support, observations and in-transit deliveries as each ships. Development format resets are allowed; legacy migrations remain deferred until near completion.

For each implementation PR: name the smallest story, current baseline, decisions settled/deferred, gate evidence, invariants, normal-input playtest and targeted regressions actually run. Do not tick completion solely because prose or an isolated subsystem exists. No code work or merge is authorized by this planning change.


## Queued ideas from playtests (2026-11-06)
Not scheduled yet; each needs its own small spec before work starts.
- **Pad upgrades: catch arms.** A pad upgrade that catches the lander (launch-tower style), widening the touchdown limits further. Today the pad is already more forgiving than open ground (6 m/s descent and 4 m/s drift on the pad, 3.5 and 2 elsewhere).
- **AI helpers.** Printed robot crew and assisted flight that take on routine jobs (hauling, salvage runs, repairs), built on the earned-automation work in 5B and the printed-pilot story.
- **Wreck variety.** Different wreck damage states and art; a lost pilot leaving a recoverable body or suit.
- **Planetary tractor beam (mid game).** A building that pulls a passing asteroid in and mines it. Short range, and it charges like a capacitor: it stores energy for a pull, then needs time to recharge, so it cannot simply drain a planet's rocks. It becomes the main way to feed a mining world once we are interplanetary. Needs: capture rules (below), a catch zone, a charge and cooldown model.
- **Where new asteroids come from, and what happens when a region runs out.** Open decision (links to D-17). Proposal: each body has a finite local population that is only topped up slowly, by a rare deterministic capture of a passing rock into orbit, and by storms, whose pieces become ground deposits. Ground deposits are finite. When a region is used up, the player moves on to another body or belt. Needs a playtest of how fast the first belts run dry before numbers are fixed.
- **Upgrading buildings instead of building more.** One refinery with several streams in place of several refineries; battery banks that hold more; turret accuracy, range and power. The facility tiers already in the code (levels 2 and 3) come back for this, each tier costing materials and power and unlocked by research.
- **Boot-up and power priority.** Machines now warm up before they run (done). Later: an explicit priority order, so that when power is short the turrets and life support come first.
