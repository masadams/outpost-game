# Cross-cutting Gameplay Design Questions
**Date:** 2026-11-04  
**Status:** Four starting directions agreed; remaining recommendations and detailed contracts are open.  
**Related:** [Bible open decisions](MASTER_DESIGN_BIBLE.md#16-open-decisions-do-not-silently-resolve) · [Energy systems](ENERGY_SYSTEMS.md) · [Roadmap](MASTER_ROADMAP.md)

## Agreed starting directions — 2026-11-04
The user approved these four starting directions. They are design decisions, not claims of implementation or approval of every detailed recommendation below.
- **Shared time (D-08):** One consistent simulation clock for local and remote processes; pause freezes all. Exact time-acceleration interruptions and travel pacing remain open.
- **Simple conserved fluids (D-13):** Shared finite material inputs connect relevant fluid uses. Exact resources, conversions, connections and expanded life support remain open.
- **Recoverable failures (D-16):** Start with warnings, derating, safe shutdown and repairable consequences. More severe cascades or contamination need explicit review; exact recovery costs and fallback rules remain open.
- **Bounded automation (D-18):** Delegate paid jobs within finite supplies and explicit operating limits. Exact autonomy, abort thresholds, communications and alerts remain open.

Player identity/mortality (D-03), the fleet-control ceiling (D-04), and the other recommendations below remain unresolved. Preserve the questions and prototype tests to refine the accepted directions.

## Why these questions come first
The current docs already cover many individual features. The remaining risk is inconsistent rules between systems: a reactor's cooling, a habitat's water, a ship's cargo and a remote factory must belong to the same world. Resolve the minimum contract for each question before implementing the affected slice; none requires stopping polish of the first mining flight.

Existing implementation is a foundation, not an unanswered question. Habitats already have oxygen/backup accounting, freight already has physical mass and per-world inventories, construction has placement constraints, and resources can already deplete. The prompts below concern the scope and interaction of future extensions.

Priority indicates order of discussion, not a promise to implement every recommendation. The agreement above takes precedence over the earlier proposed starting points below; it does not settle every detail in those proposals.

## 1. Who is the player, and what does losing them mean? — P0
**Bible:** D-03 and D-04.  
**Ask:** Are we one mortal pilot, a commander switching between a finite crew and ships, or a hybrid with a persistent player identity and recoverable crew losses?

**Why it matters:** Rescue, unattended ships, remote construction, life support, camera/control switching and loss of research all depend on this answer. A switchable camera must not silently become teleporting labor.

**Recommended starting point:** Hybrid commander with physically located crew and ships. Direct piloting remains central; remote operation requires the appropriate equipment and a surviving local controller or crew where relevant. Losing a ship/crew costs tangible capability but does not normally erase the entire campaign. Exact mortality and recovery cost remain open.

**Before implementation, decide:** What can be commanded after the active pilot dies or is stranded? What requires a person on site? Is changing control instantaneous, and what information is available remotely?

**Small test:** Strand the current pilot at a moon outpost and recover using only assets already paid for. Identify any free replacement body, teleport or softlock.

## 2. What shares the game clock while we travel or accelerate time? — P0
**Bible:** D-02, D-08 and D-11.  
**Ask:** Do remote bases keep consuming fuel, oxygen and reserves during travel/time acceleration, and what automatically slows or pauses time when they are threatened?

**Why it matters:** Long trips, nights, storms, research, reactor service and freight schedules become unfair if their clocks disagree. A long interstellar journey cannot be balanced independently of colony endurance.

**Recommended starting point:** One simulation clock; all paid processes advance consistently, with coarse remote accounting and forecastable interruptions. Pause freezes everything. Time acceleration needs a safe interruption policy for imminent actionable danger, with attention limits tested before multi-star expansion. No wall-clock offline production by default.

**Before implementation, decide:** Which hazards interrupt acceleration? Can the player opt into risk? How much travel time is active piloting versus assisted coasting? Can several remote emergencies demand attention at once?

**Small test:** Make a supply flight while home passes through darkness and a reactor approaches fuel exhaustion; compare normal and accelerated operation, including warning timing.

## 3. How far should water, liquids and life support extend? — P0 before thermal/fuel expansion
**Bible:** D-13 (new).  
**Ask:** Should ice become one shared water resource used for oxygen, propellant, cooling and habitation, and do we connect these uses with simple tanks/links or a full pipe network?

**Why it matters:** Independent infinite coolant, oxygen and rocket-fuel systems would erase the scarcity choices energy/logistics are meant to create.

**Recommended starting point:** A small conserved material chain with tanks and simple explicit connections or local shared services. Keep the existing paid ice/oxygen/fuel behavior as the baseline; add water intermediates only when they create useful choices. Closed coolant loops consume startup inventory and lose fluid only through modeled leaks/venting. Evaporative cooling consumes water. Food, pressure rooms and detailed chemistry require separate scope review.

**Before implementation, decide:** Which resources are distinct, which conversions compete for the same inventory, and whether habitation needs food/water beyond current oxygen. Decide if freezing/boiling is a few clear states or deferred.

**Small test:** A remote icy colony must choose between one more launch, habitat reserves and emergency evaporative cooling using the same finite stock.

## 4. Which planetary conditions affect all systems? — P0 before world diversity
**Bible:** D-14 (new); relates to D-06.  
**Ask:** Should gravity, atmosphere, temperature, weather and geology form a shared environmental model for flight, generation, cooling, extraction and construction?

**Why it matters:** Wind power and atmospheric flight should agree about wind; geothermal suitability and cooling should agree about local heat. Random independent bonuses would undermine discovery and engineering.

**Recommended starting point:** Yes, using a few surveyed, correlated properties and bounded weather states. Expose uncertainty before settlement. Start with two or three worlds that demand different plans; avoid detailed climate simulation.

**Before implementation, decide:** Which conditions are constant, periodic or weather-driven; what scanning reveals; and which extremes are ruled out by the fair-start contract.

**Small test:** Move the same expedition kit from a temperate windy world to an airless long-night moon. The player should predict why their power, landing and cooling plan changes.

## 5. How much terrain and structural engineering is worth simulating? — P1; decide boundaries early
**Bible:** D-07 and D-15 (new).  
**Ask:** Can we excavate and build underground, and must foundations, supports and cables react physically when terrain changes?

**Why it matters:** Persistent craters, geothermal drilling, buried protection, mining, habitat sealing and pathfinding share geometry. A cave feature can imply a much larger structural and atmospheric simulation.

**Recommended starting point:** Existing radial terrain plus explicit foundations, bounded damage/craters and persistent local edits. Underground space, collapse and pressure volumes remain exploratory until a small prototype proves them. Avoid per-beam structural stress calculations initially.

**Before implementation, decide:** What terrain can be edited, what happens to attached facilities, whether buried hardware is protected, and whether pipes/cables are physical collision objects.

**Small test:** An impact removes ground near a refinery and its power connection. The result must be legible, persistent and repairable without resetting the world.

## 6. How severe can failures become, and how does recovery work? — P0
**Bible:** D-16 (new); relates to D-03 and D-05.  
**Ask:** Do shortages and damage mainly cause shutdown/repair, or can they trigger cascading destruction, contamination and permanent losses?

**Why it matters:** Cooling, fuel storage, habitat outages, asteroid impacts and abandoned outposts otherwise risk contradictory consequence rules. Cascades can create memorable engineering or repeated catastrophic interruption.

**Recommended starting point:** Warnings → derating → safe shutdown → local repairable damage; larger cascades need visible causes, intervention time and a credible recovery path. First storm remains survivable. Radiation contamination, crew death and permanent exclusion zones require explicit severity choices.

**Before implementation, decide:** Warning lead times, automatic safeguards, salvage fractions, emergency supplies and the fallback when the last functioning power/fabrication asset is lost. Decide whether difficulty options change consequences.

**Small test:** Break cooling and one power link during a storm. A prepared player can isolate the fault; an unprepared player suffers a meaningful setback and can still recover.

## 7. How deep are geology, manufacturing and depletion? — P0 before remote economy
**Bible:** D-17 (new); relates to D-09.  
**Ask:** Do we want a compact set of meaningful materials/components or a large processing tree, and what eventually forces a mature colony to expand?

**Why it matters:** Fuel fabrication, reactor servicing, research samples, ship mass, freight and finite mines all depend on recipe depth and resource geography.

**Recommended starting point:** Few distinct materials, short readable chains and geology-linked deposits. Expansion should be pulled by new capabilities, supply opportunities and ambitious projects. Keep basic recovery materials accessible; avoid exhausting the only local input needed to build the ship that reaches more.

**Before implementation, decide:** Which deposits deplete, which sources renew, how much salvage returns, and whether advanced parts replace basic materials or keep them useful. Fission enrichment and fusion fuel chains must fit this budget.

**Small test:** Explain every input needed to establish the first fuel-powered remote outpost; count transport trips and verify a viable bootstrap/recovery route.

## 8. What can automation do, and what deserves the player's attention? — P0 before fleet scaling
**Bible:** D-04 and D-09; D-18 (new operational contract).  
**Ask:** Can players delegate proven routes, servicing, waste handling and emergency shutdown, and when should an automated asset stop and ask for help?

**Why it matters:** A multi-world network becomes repetitive if every fuel change requires a visit, but trivial if automation ignores piloting hazards, cargo mass, staffing or communications.

**Recommended starting point:** Player-proven routes and bounded jobs with finite supplies, explicit reserve/abort thresholds and readable failure reports. Automation handles routine repeat work after investment. New landings, unusual hazards, surveys and creative interventions retain value for manual play.

**Before implementation, decide:** Remote command range/delay, loss-of-contact behavior, staffing requirements, recovery authority and notification limits. A route is not a guarantee when payload or destination conditions change.

**Small test:** Run three outposts while personally exploring. The player should spend attention on one interesting exception, not repeated refueling clicks or unexplained simultaneous failures.

## Discussion order and decision protocol
Start with **player identity, shared time and failure/recovery**, because these define what the player can lose and what they must manage. Then settle the minimum water/environment/material contracts for the energy prototypes. Terrain and automation can be bounded now and expanded only after their related slices prove useful.

For each answer, record: chosen rule, rejected alternative and reason, affected documents, smallest prototype and success condition. Update the bible and roadmap; do not treat an unresolved recommendation in this file as approval. The four agreed directions above are the exception; further detail still needs a recorded decision. Retain D-01–D-12 and their rationale. The energy questions in ENERGY_SYSTEMS remain linked here rather than spawning contradictory parallel decisions.
