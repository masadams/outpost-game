# OUTPOST — Master Game Design Bible
**Version:** 1.1 (adopted systems direction; tuning open)  
**Date:** 2026-11-04  
**Status:** Living design reference, not an implementation claim  
**Related:** [Phased roadmap](MASTER_ROADMAP.md) · [Current design](GAME_DESIGN.md) · [Alpha progression](PROGRESSION.md) · [README](../README.md)

> **North star:** Begin with one small lander and a precarious outpost. By learning to fly, mine, build, research, and explore, develop a persistent network of ships, installations, and settlements across a vast, physically navigable 2D universe. The same player who commands an interstellar industrial network can still manually pilot a fragile lander down to an unexplored world.

## 1. Authority and document conventions
This document captures the agreed **vision**, candidate mechanics, and open design decisions from brainstorming. It does not assert that every described mechanic is built. The repository's code, tests, and feature-specific docs are authoritative for **current implementation**. This bible guides design; [MASTER_ROADMAP.md](MASTER_ROADMAP.md) decomposes that vision into phases and implementable slices.

Design statuses distinguish commitment from tuning:
- **Agreed direction** — adopted by the user; implementation timing, fidelity and values still require a reviewed slice.

Other feature statuses:
- **Core principle** — protect this unless explicitly superseded.
- **Preferred direction** — strong candidate, needs prototyping or balancing.
- **Exploratory** — attractive possibility, not committed.

Do not silently convert exploratory ideas into requirements. Update both documents when a decision is made. Retain historical rationale in a decision log. Prioritize coherent mechanics over feature count.

## 2. Genre, identity, and player promise
**Genre:** Single-player, retro-inspired 2D spaceflight, mining, combat, outpost construction, exploration, research and logistics sandbox; survival/defense adds intermittent pressure.

**Initial feel:** Lunar Lander near surfaces + Asteroids-style inertial flight and combat in space + hands-on base building and mining. The repository's early target balance is approximately **60% action and 40% construction**; use that as an initial playtest hypothesis, not a quota that must hold at every progression stage.

**Core fantasy:** A continuous line from personally piloting and repairing one ship to engineering a resilient multi-world civilization. The player earns technological power and operational autonomy through meaningful work, discovery and infrastructure.

**What the game is not:**
- Not a series of disconnected flight, landing, mining and tower-defense minigames.
- Not a conventional XP/character-level grind.
- Not a fixed mission corridor with level-gated planets.
- Not an endlessly escalating enemy treadmill that invalidates prior achievements.
- Not automatically a factory spreadsheet or an infinite-content promise.

## 3. Design pillars (core principles)
1. **Continuous physical space.** Launch, fly, fight, mine, orbit, land, EVA and build in one navigable 2D world. UI overlays do not teleport the player or make gameplay separate minigames.
2. **No arbitrary geographic locks.** A place can be far, hard to detect, hazardous, fuel-expensive or logistically impossible for current equipment, but not barred by a required player level. Research opens capabilities, not magic borders.
3. **Consistent, legible physics.** Thrust, inertia, mass, cargo, gravity, atmosphere, collisions, relative motion and landing constraints are real gameplay forces. Balance for skillful arcade handling, not perfect astrophysical fidelity at the expense of playability.
4. **Discovery → understanding → engineering.** Discoveries and sampled phenomena create research opportunities; research enables practical equipment and construction. Technology should change available actions, not merely numbers.
5. **Expanding agency.** Players initially do things manually; later they earn remote control, assistance and automation without erasing the value of hands-on piloting.
6. **Threats arise from the world.** Asteroids, debris, hostile environments, fuel scarcity and occasional combat create risks. The world does not automatically scale all dangers to a player level. Events need not target the player to matter.
7. **Persistent consequences.** Craters, damage, wrecks, consumed deposits, constructed facilities, stranded ships, surveyed places and recovered resources persist. Saved history overlays deterministic seeded geography.
8. **Meaningful trade-offs.** Range versus thrust, payload versus landing control, shielding versus mass, power versus industry, manual skill versus costly automation.
9. **A discoverable unknown.** Not all stars, moons, resources, anomalies or hazards are known on day one. Tools improve observations, not conjure new worlds.
10. **Recoverable setbacks.** First encounters should create tension and material loss without commonly hard-locking a viable game.
11. **Single-player first.** Structure systems cleanly, but multiplayer is not a driver of early design.

## 4. Primary gameplay loops
### Minute-to-minute: physical action
Inspect instruments → pilot / EVA / mine / tow / fight → manage fuel, heat, hull, oxygen and cargo → avoid hazards → return, land or dock safely.

### Session: construction and capability
Extract → collect and transport → refine → provide power and storage → manufacture → research → install parts / construct facilities → undertake harder journeys and defenses.

### Campaign: exploration and expansion
Observe → detect → survey → visit → exploit or preserve → establish infrastructure → improve logistics → reach new regions → encounter new phenomena and hazards.

### Strategic: pressure and response
**Exploration pressure:** appealing signals, rare deposits, unmapped bodies and opportunities pull outward.  
**Environmental pressure:** storms, impacts, radiation, debris, atmosphere and accidental failures demand adaptation.  
**Industrial pressure:** expansion increases energy, fuel, material and transport demands as a consequence of player ambition.

None of these loops should require a constant enemy attack timer.

## 5. Universe model and procedural generation
### 5.1 Preferred universe
A **large deterministic seeded universe containing multiple star systems**, each potentially holding planets, moons, asteroid belts, dust/debris environments, stations and discoveries. The player begins in a fair, legible home region; beyond it lies a largely unknown galaxy.

**No hard routes:** maps can show convenient survey routes and fuel-efficient connections, but ships may attempt direct travel. Star systems are geographical regions, not isolated levels.

**Preferred conceptual spatial scales:**
- **Local:** terrain, individual ships, collisions, lasers, rocks, construction, EVA and detailed gravity.
- **System:** planetary ephemerides, moons, large orbital populations, navigation and system-scale environmental events.
- **Interstellar:** star positions, large-scale regions, long-haul navigation, and distant event state.

The experience should appear continuous. Under the hood, use different simulation fidelity with distance and relevance; do not demand all distant small bodies receive full frame-by-frame physics.

### 5.2 Deterministic hierarchical seeds
Derive child seeds from a universe seed + stable identifiers for region/system/body/site. Identical seeds should produce identical initial geography, physical properties, meaningful deposits and major discoverable opportunities. Save changes separately. Generation must not depend on the order in which regions are visited.

Candidate generation hierarchy:
1. Stellar geography: clusters, sparse regions, distances, star types.
2. Systems: star multiplicity, planet classes, orbits, moons, belts, debris populations.
3. Bodies: gravity, radius, terrain, atmosphere, weather, mineral distribution, energy conditions.
4. Discoveries: wrecks, signals, anomalies, rare minerals and environmental features.
5. Dynamic events: deterministic or saved event schedules/initial conditions, with physical evolution where feasible.

**Fair starting seed contract:** enough accessible base resources and physical escape capability to avoid unwinnable starts; variation in terrain, near neighbors, scarcity and hazards can encourage different strategies.

**Quality over quantity:** empty or barren planets are acceptable when meaningful by location, gravity, fuel access or navigation. Avoid millions of interchangeable planets.

### 5.3 Persistence and simulation
Persist player constructions, inventories, mining depletion, ship states, damage, modified terrain, discoveries, scanned maps, wrecks and material event results. A distant facility can progress through a coarse analytical production model; nearby ships, rocks and machinery use detailed simulation. Transitions must conserve essential accounting quantities and never duplicate resources or erase meaningful consequences.

Potential consistency issue to solve deliberately: orbital objects and event trajectories must remain predictable across unload/reload and coarse/detailed transitions.

## 6. Discovery, maps and observatories
Map knowledge is separate from world existence. Proposed knowledge states:
1. **Undetected:** no confirmed map entry.
2. **Detected:** approximate position/type, uncertainty.
3. **Surveyed:** major body/orbit/hazard characteristics, estimated deposits.
4. **Explored:** local terrain and identifiable resources.
5. **Established:** player infrastructure, beacons and ongoing observations.

Scanners differ by range, precision, observation time and data quality. A basic observatory might reveal an approaching debris field but cannot immediately report exact impact points. Tracking radar improves local trajectories; powerful telescopes reveal more distant objects; spectroscopic or probe-based surveys improve material estimates.

**Preferred signature first milestone:** construct an Observatory or equivalent upgraded scanner; reveal a moon and detect the first incoming asteroid stream. Give an intelligible warning and a reason to invent/build defenses.

Discovery paths should be non-linear. Probes and daring direct exploration may reveal information before instruments would. Nothing materializes simply because research unlocked a map entry.

## 7. Physics and traversal
### 7.1 Surface and local flight
Keep recognizable Lunar Lander mechanics: thrust, angular inertia, fuel consumption, radar/instruments, radial/tangential velocity, real gravity and landings with safe relative motion. EVA and surface facilities share the same physical world. Cargo and equipment change ship handling.

### 7.2 Orbital travel
Use velocities and positions relative to moving bodies; gravity, atmosphere and terrain are meaningful. Gravity assists and well-designed transfer orbits should reward skill when practical. Flight instruments must help players understand relative velocity, closing speed, trajectory uncertainty and braking requirements.

### 7.3 Long distance
**Preferred direction, not yet decided:** conventional rockets and efficient low-thrust engines for local/system travel; eventually a speculative high-speed continuous-travel drive that makes interstellar journeys practical without treating systems as discrete levels. Alternative options: compressed distances/time acceleration, or late-game jump technology.

Distinguish **high thrust** (launch, landing, combat) from **high efficiency** (long burns and transport). Avoid a universal arbitrary top speed if feasible; a craft may keep accelerating while it has thrust/fuel, but must still brake. If numerical or gameplay constraints require speed limits, they need explicit design rationale and transparent presentation.

The player may attempt an early interstellar mission even when impractical. A probe could make a survey journey well before a large crewed or cargo vessel can.

### 7.4 Engineering hazards, not invisible barriers
- Dense **debris / micrometeoroid** regions can damage high-relative-speed travel; go around, slow down, reinforce hull or use deflection.
- Radiation / solar activity may degrade exposed hardware; use hardened systems or timing.
- Strong gravity raises takeoff, landing and payload demands.
- Atmospheres affect drag, heating, winds and landing control.
- Very remote sites require supplies, refuelling, power and viable return or rescue strategies.

A diffuse real-world nebula is not inherently an abrasive cloud; hazardous regions need plausible density/particle conditions or an explicit science-fiction explanation.

## 8. Resources, research and progression
### 8.1 Research disciplines
Organize the long-range technology landscape into:
- Astronomy, surveying and navigation.
- Mining and materials.
- Propulsion and flight.
- Defense and weapons.
- Power and infrastructure.
- Robotics, automation and logistics.

Additional possible disciplines: atmospheric engineering, advanced computing and anomalous technologies. Avoid an overly large tech tree before playtesting its useful choices.

### 8.2 Research grammar
A technology may require:
- Prior knowledge or a physical discovery/sample.
- Laboratory capability and elapsed productive research.
- Material, energy or data inputs.
- Fabrication equipment to turn knowledge into usable parts.

Examples:
- Encounter micrometeoroid damage → analyze samples/damage → research plating → manufacture shielding.
- Observe an asteroid storm → research tracking and interception → build sensor-linked turrets.
- Survey a lunar deposit → unlock a specialized extractor → obtain mineral → develop a better long-range drive.
- Detect distant planet → develop navigation, fuel capacity, braking and protection → reach and survive it.

Knowledge is not the same as manufacturing capacity; an early discovery can be recorded long before advanced exploitation is possible.

### 8.3 Fair progression
The home system supports bootstrap industry and viable local travel. Specialized minerals and conditions may be concentrated in particular worlds. A player can explore out of order. Avoid single-resource deadlocks and opaque prerequisites. Let engineering solve problems in multiple ways, not only through one scripted unlock chain.

**Existing-alpha distinction:** the repository already contains a prerequisite research tree and real ship part trade-offs. This bible proposes broader, later systems; it is not a request to discard that foundation.

## 9. Buildings and facilities
Candidate facilities by function:
- **Knowledge:** research lab, Observatory, orbital telescope, radar/tracking station, survey station, communications relay.
- **Industry:** drill/mining rig, ore refinery, advanced extractor, fuel processor, component factory, storage depot.
- **Energy:** solar arrays, batteries, advanced reactors, power relays.
- **Ship operations:** landing pad, service station, shipyard, orbital dock, fuel depot, cargo handling hub.
- **Defense:** point-defense laser turret, missile silo, heavy interceptor, shield generator, orbital defense platform.
- **Automation:** rover depot, drone hangar, logistics terminal, autonomous construction hub.
- **Survival:** oxygen habitats, emergency shelter and repair systems.

Buildings should be introduced in response to needs. The first Observatory's warning creates demand for tracking and defense; defending creates demand for power; impacts leave resources that support new technology. Introduce buildings with clear inputs, outputs, control affordances, range/power constraints and persistent states.

## 10. Asteroid storm and planetary defense — signature system
The storm is an **event involving physical bodies**, not an animated damage roll.

1. A telescope detects a moving debris population outside the local region.
2. The player gets a countdown, initially uncertain.
3. Detailed tracking predicts arrival windows, bearings and possible impact corridors.
4. The player chooses investments: repair stores, powered turrets, radar, shelters, interceptors, shields.
5. Asteroids cross into the detailed simulation and move under gravity. Some miss; some pass behind or strike the far side; others threaten buildings or a ship in flight.
6. Impacts cause actual damage/craters where modeled; fragments and meteorites may leave extractable materials.
7. After the event, recovery/salvage/research provides a forward step.

The distribution can be seeded for interesting early play, but trajectories should remain physically consistent once established. Defenses require energy, line of sight, target acquisition, range, cooling and perhaps ammunition. Manual ship interception should be possible. Larger objects might require deflection rather than simply destroying them.

**Progression of event families:** minor showers, tracked single large objects, recurring orbital streams, rare mineral-rich bodies, debris-chain events. Do not continuously escalate all events with player progression. Early-warning technology should improve information and agency.

**Failure philosophy:** first storm is survivable with imperfect defense; consequences are meaningful but not usually unrecoverable.

## 11. Ship engineering and fleet identity
### 11.1 Modular ship principle
Prefer configurable assemblies rather than linear ship-tier replacements. Modules incur actual mass, electrical, thermal, fuel and fabrication costs.

Potential slots/components: main engine, RCS thrusters, fuel tanks, cargo holds, mining drill/laser, weapon mount, armour/deflector, sensors/navigation, grapple/tractor, docking gear, landing legs, cooling, batteries and utility modules.

Design alternatives, not universal upgrades:
- Chemical rockets: strong launch thrust, poor efficiency.
- Ion/electric drive: excellent efficiency, very low thrust.
- Plasma/fusion (later): expensive, different thrust/efficiency/thermal trade-offs.
- Heavy miner: strong extraction and hold, difficult landing.
- Scout: sensors/range, poor payload.
- Interceptor: maneuverability/targeting, small cargo.
- Transport: payload and logistics, weak responsiveness.
- Carrier: large ship carrying smaller landing craft (exploratory).

Ships should feel physically different. Empty cargo capacity is not free cargo; installed mass matters. Craft roles should emerge from the modular system, not from artificial classes.

### 11.2 Operations and recovery
Docking, latching, towing, fuel transfer, salvage and damaged equipment should obey meaningful restrictions. Running out of fuel may strand the ship in a persistent orbit/trajectory rather than instantly deleting it. Options include rescue flights, refuelling missions, recovery towing or abandonment.

**Agreed:** planetary workers physically inhabit, build and maintain outposts (section 20). **Open:** player embodiment, switching control, recruitment and mortality; a populated settlement does not settle those questions.

## 12. Industrial expansion, logistics and automation
Early play is hands-on: fly, mine, collect, land, unload, refine, build. Later tools reduce repetition:
- Auto cargo loading and unloading.
- Surface rovers and local resource hauling.
- Flight stabilization, route and landing assistance.
- Automated mines and resource drones.
- Scheduled transport routes and remote outpost supply.
- Automated defensive sensor networks.
- Late-game deployable industrial starter packages.

An outpost might be a mine, refinery, fuel depot, orbital shipyard, research station or full manufacturing settlement. Players choose whether to transport raw ore home or process it near the source.

Automation is **earned**, consumes real resources, and should not destroy the skillful manual core. Remote operations outside detailed simulation use consistent aggregate economics and can experience persistent faults/events. No magical instantaneous cargo transfers between stars.

## 13. Events, mysteries and living history
### Systemic events
Asteroid approaches, weather, power failures, radiation events, orbital opportunities, drifting wrecks, comet passages, cargo accidents and industrial emergencies can arise from state and procedural schedules. Not every event is a quest and not everything targets the home base.

### Exploratory mysteries
Signals, unusual minerals, ancient structures, abandoned vessels and unknown technology are **exploratory** content. They may add an optional narrative thread but must not require the game to become a linear story.

### Persisted history
Destroyed towers, repaired stations, deformed terrain, depleted deposits, crashed vessels and salvaged sites become personal landmarks. Generated baseline + durable deltas form the player's history.

## 14. User interface and feedback
Maintain readable flight instruments, radial/tangential speed, braking trajectory, fuel/hull/oxygen, energy and heat; distinguish predicted from observed quantities. Research UI should show discoveries, prerequisites, actual costs and what changed. Survey UI should show certainty, not false precision. Defense UI should show warning time, coverage, targeting status and consequences. Logistics UI should reveal route requirements and shortages without making ordinary play cumbersome.

Support mouse/keyboard controls already in the alpha. Player-facing explanations should make causes clear: why a laser cannot penetrate a deposit, why a ship cannot brake in time, why a turret has no power, why a building stalled.

## 15. Current alpha baseline (as observed in repository README, 2026-11-04)
The repository reports an Alpha 0.19 preparation state, including:
- Single-player 2D piloting, radial gravity, atmosphere transitions and manual landings.
- Ship/surface controls, mining and fracture, ore collection, tractor/tow rig.
- Surface astronaut/suit oxygen, oxygen habitats and resource-based colony construction. Free-flight EVA remains future work.
- Paid construction queues and optional physical dispatch of the existing astronaut: actual walking, stationary work, low-air stop and manual override; not yet a population of autonomous workers.
- Refining, fuel, power/storage/repair services and Command management.
- Research lab, ten technologies and sixteen parts across eight slots.
- Navigation to local orbital sites / nearby moon; finite resources and salvage.
- Turret controls and opt-in defense/combat drills.
- Browser checkpoints, pause/menu, UI and sound systems.

This is a summary of repository documentation, **not an independently completed code audit**. Feature-specific current documentation remains the source of truth. The master roadmap must start with validation and integration rather than reimplementing shipped features.

## 16. Open decisions (do not silently resolve)
| ID | Question | Working preference / alternatives |
|---|---|---|
| D-01 | Interstellar mechanism | Prefer continuous advanced propulsion; compare compressed distances/time warp and jumps |
| D-02 | Stellar distance scale | Choose playable compression and numerical representation without losing distance as a meaningful challenge |
| D-03 | Player identity / mortality | Single pilot, switchable remote ships, or hybrid |
| D-04 | Control and automation ceiling | Manual skill stays useful; exact fleet-control capability TBD |
| D-05 | Combat / hostile factions | Natural hazards primary; optional hostile machines/ships versus deeper faction warfare |
| D-06 | Start seed variability | Fair but varied starting systems versus fixed home world |
| D-07 | Terrain representation and support fidelity | Persistent excavation/craters and simplified support are agreed; radial geometry, underground representation and failure rules need prototypes |
| D-08 | Time acceleration | Rules when nearby hazards, automation and physical simulation are active |
| D-09 | Late-game industrial scope | Moderate processing/manufacturing and earned automation agreed; recipe depth, carriers, packages and replication limits open |
| D-10 | Narrative mysteries | Optional ancient structures/signals and degree of authored content |
| D-11 | Save determinism | Boundary between reproducible event seeds and persisted event outcomes |
| D-12 | Multiplayer | Explicitly deferred; do not constrain first-game design without evidence |

## 17. Product test: what success feels like
The first 10–15 minutes teach a viable sortie, resource collection, landing and a meaningful construction choice. In the first extended session, the player discovers a looming event, understands how to prepare and survives it with consequential outcomes. Subsequent play creates genuine reasons to explore a moon, modify a ship and establish new infrastructure. At late game, the player has a living network of useful facilities, yet manual flight, difficult landings and local exploration remain fun.

The strongest design test: **Is the next action motivated by something the player discovered, wants to build, needs to survive, or wants to reach?** If the answer is only “a progress bar requires it,” revisit the mechanic.

## 18. Change control
- The **design bible** records philosophy, intended mechanics and unresolved design questions.
- The **master roadmap** records phases, deliverables, dependencies and acceptance tests.
- The **current feature docs** record shipped behavior and exact controls.
- Work in reviewable PRs, with a small vertical slice before broad content expansion.
- After design discussions, amend this bible before building major new systems.
- Do not mark speculative features as implemented without evidence from code and tests.


## 19. Distinctive experience and competitive positioning
Read [Distinctive Experience & Design Differentiation](DISTINCTIVE_EXPERIENCE.md) as the canonical creative filter for future features. Avoid competing through sheer quantity of ship parts, buildings, factions or planets. Favor physical systemic depth, discovery-driven engineering, a persistent history, and the same continuous experience from first asteroid to multi-star civilization. Treat **asteroids as multipurpose physical objects** that may be mined, studied, destroyed, redirected, deflected or captured—not just hazards or ore pickups. Prioritize the three signature vertical slices (excellent mining sortie, physical asteroid storm, first other-world expedition). A major signature mechanic should generally satisfy at least three of four: physical consequence, meaningful discovery, interesting decision, growing scale. Supporting infrastructure need not pass that creative threshold.


## 20. Adopted systems direction — 2026-11-04
The user adopted the major-system recommendations in the [Brainstorm Outpost Progression discussion](chatgpt-conversation://6aeb57e7-1360-83e9-b3c6-3553aab735be), explicitly including planetary workers and useful habitats. The commitments below are **agreed direction**, not claims of implemented mechanics or approval of every possible subsystem. Exact fidelity, quantities and rollout remain open. [Roadmap slices S0–S6](MASTER_ROADMAP.md#integrated-systems-vertical-slices-s0s6) turn them into bounded experiments.

**Overriding gate:** physical consequence, meaningful discovery, interesting decision, growing scale. Signature features should normally satisfy at least three; explain exceptions for supporting infrastructure. Optimize interaction depth over breadth. Outpost must avoid becoming a 2D facsimile of No Man's Sky or Factorio. Prove a small world worth inhabiting before multiplying planets, recipes or worker needs.

| System | Agreed direction and useful interaction | Details still open |
|---|---|---|
| Environment | Atmosphere/density, pressure, temperature, sunlight and radiation change flight, equipment and habitability; wind/weather where they create choices | Spatial resolution, gas composition, weather severity and exposure model |
| Thermal / waste heat | Engines, emitters, reactors and industry produce heat; storage, transfer and rejection limit sustained output, especially in vacuum | Thermal nodes, radiator sizing, coolant abstraction and damage thresholds |
| Water / liquids | Mine ice, process/store water and gases, consume them in life support, fuel and industry with simplified fluid handling | Tanks versus shared stocks, pipes, phase changes and leakage fidelity |
| Terrain / structures | Persistent excavation, underground space and impact craters introduced progressively; simple foundations, support/connectivity and repairable component damage with bounded salvage | Surface/volume representation, collapse extent, bracing and underground pressure boundaries |
| Geology / industry | Planet conditions inform finite mineral distribution; moderate chains from ore to useful materials/components and applications | Recipe counts, specialist facilities, chemistry and local processing efficiencies |
| Power | Solar/storage, radioisotope, fission, geothermal, suitable atmospheric wind and late fusion form a diverse portfolio | Unlock order, rates, fuel availability and distribution topology |
| Logistics | Physical local haulage and ship freight connect buildings/worlds; local processing competes with hauling raw material | Local bus replacement, vehicles, routing, loading and throughput |
| Sensors | Radar tracks motion, telescopes find distant objects, prospectors reveal geology, probes measure local conditions | Coverage, uncertainty, scan times and sensor fusion |
| Communications | Relays carry observations, commands and operational status; autonomous policies bridge interruptions | Range, line of sight, latency and control-switch rules; avoid frustrating loss of agency |
| Time / interstellar travel | Travel consumes world time; acceleration and advanced propulsion reduce empty waiting while retaining consequences | Drive mechanism, distance compression, warp safety and interstellar clock semantics |
| Automation | Earned, supplied tools reduce repeated work while manual flight/building remain useful | Scheduling, autonomy ceiling, remote exceptions and recovery policies |
| Workers / population | People physically travel, build, operate where useful, maintain and repair structures; habitats support their lives and working reach | Recruitment, roles, staffing requirements, rest/food, mortality and population cap |

### 20.1 Workers and habitats are a coupled physical system
Extend [direct crew controls](DIRECT_CONTROLS.md), [paid Command work](COMMAND.md) and [oxygen habitats](HABITATS.md); preserve their resource accounting and manual control. Current alpha dispatch controls the existing astronaut, not a newly implemented labour population. Current domes provide paid breathable coverage, not complete shelters, residential capacity or automatic suit refills.

A future job follows **plan → reserve local inputs → assign reachable equipped worker → travel → perform supplied work → commit result → return/service or take another safe job**. Construction, maintenance, repairs, hauling and selected equipment operations use the same job vocabulary. Each job exposes its executor, location/world, required materials/tools/power, travel/work estimate and blocked reason. Delivered material and paid work remain distinct; cancellation, damage and reassignment must have explicit escrow/salvage rules.

Workers are world occupants with position, health, suit supplies and travel constraints. They cannot construct from orbit, teleport between planets or finish work while travelling. Ships carry workers and supplies with real capacity/mass costs. Surface walking is the starting extension; free-flight EVA, airlocks and orbital work come later with propulsion, oxygen, access and rescue constraints. Not every machine needs a permanently staffed operator: define which jobs require people and which supplied machines already run unattended.

Habitats provide **oxygen, adequate pressure, thermal shelter, appropriate radiation protection, power-dependent life support and finite living/crew capacity**. Shelter/protection must be explicitly engineered; current breathable roofs do not already provide it. Population capacity is limited by usable habitable space and actual life-support throughput, not a free production multiplier. Food/rest may use a simple settlement supply model if prototypes justify them; dozens of individual needs are outside the intended direction.

Practical worker range comes from safe routes, travel speed, suit endurance, return/service margin, tools and environmental exposure. Habitats, shelters and supplied service points extend that reach. Productivity emerges from time spent travelling, working, resupplying and sheltering, plus equipment availability. Moving a habitat closer to a remote work site can reduce travel and increase useful work; an arbitrary global efficiency aura cannot substitute for this.

Orders should estimate a safe return before departure, re-evaluate conditions during work and visibly stop/re-route/seek shelter when the configured safety margin fails. The current alpha low-air stop does not automatically return a worker or guarantee survival. The future safety policy needs explicit prototypes for blocked paths, depleted shelters, lost power/communications and rescue. Explain risk before dispatch; allow manual intervention without concealing costs.

### 20.2 Power, heat and industry must create alternatives
Solar depends on illumination, distance and local conditions; batteries store rather than generate energy. Radioisotope units suit small remote loads; fission provides sustained output at fuel, shielding, cooling and maintenance cost. Geothermal depends on surveyed geology; wind requires suitable atmosphere/weather; fusion is a costly late capability. No source is universally best, and these are staged options rather than a requirement to ship all generators at once.

Use a small material chain such as **finite ore/ice → alloy/wire/water/oxygen → components/fuel → equipment, shelter or repair** before adding specialization. Retain existing alpha recipes, ship thermal trade-offs and colony grids until a reviewed extension changes them. A refinery's heat, a radiator's siting, crew access and a supply route should interact; a vast conveyor catalogue or chemistry simulator is not the objective.

### 20.3 Time, information and remote work share one causal world
Elapsed simulation time advances production, wear, crew consumption, travel, orbital motion and hazards consistently. Pause advances none. Time acceleration cannot grant free production or skip an unsafe encounter. Coarse remote simulation may aggregate jobs but must retain worker availability, transport time, supplies, outages and event outcomes; it cannot turn workers into abstract bonuses.

Sensors report measured/estimated knowledge, not perfect omniscience. Communications loss makes displayed information stale and queues or rejects new commands explicitly; supplied local safety policies continue according to a declared autonomy model. Exact light-speed delays remain open. Remote planning should remain usable without pretending that a command instantly moves cargo or labour.

### 20.4 Remaining decision register
| ID | Open implementation choice | Evidence needed before locking it |
|---|---|---|
| D-13 | Worker acquisition, roles, control, death/recovery and staffing | Small crew playtest; preserve a recovery path without mandatory micromanagement |
| D-14 | Habitat capacity, occupancy, shelter, service and safe work radius | S1 travel/air/outage measurements; no passive aura |
| D-15 | Environmental/thermal resolution and pressure volumes | S2 vacuum/atmosphere comparison and bounded performance |
| D-16 | Excavation, underground geometry and support failure | S3 permanent crater, undermined foundation and repair trial |
| D-17 | Moderate manufacturing depth and logistics topology | S4 raw-versus-processed freight comparison |
| D-18 | Communication interruption and local autonomy | S5 stale-data, queued-order and emergency behavior trial |

D-01/D-02/D-08 still govern interstellar drive, scale and accelerated time. Adopting interstellar travel does not choose an FTL method. These open details do not reopen the agreed systems direction.
