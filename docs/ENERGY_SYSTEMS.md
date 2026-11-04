# Planetary Energy Systems
**Date:** 2026-11-04  
**Status:** Preferred design directions unless marked exploratory; balance and exact recipes remain open. This is planning, not an implementation claim.  
**Companions:** [Master Design Bible](MASTER_DESIGN_BIBLE.md) · [Master Roadmap](MASTER_ROADMAP.md) · [Cross-cutting design questions](DESIGN_QUESTIONS.md)

## 1. Purpose and implementation boundary
Energy should turn a surveyed planet into an engineering problem with several credible answers. A sunny home outpost, a dark remote probe and a geothermal industrial settlement should have different sensible power mixes. Bigger generators should create new possibilities without making earlier equipment pointless.

Protect the three signature experiences: the first mining flight, first physical asteroid storm and first other-world expedition. Power supports preparation, flight, discovery and recovery; it must not become a mandatory wiring chore before those experiences are enjoyable.

Current foundation inspected for this design:
- [power.ts](../src/sim/power.ts) defines solar rated power as 8 kW and dispatch helpers. This does not establish a full environmental generation model.
- [Colony priorities](COLONY_PRIORITIES.md) documents constant solar and a shared colony bus as prototype limits, finite stored energy and essential energy reserves.
- [Habitats](HABITATS.md) already have paid life support and finite backup energy. These are not free emergency refills.
- [Nearby worlds](NEARBY_WORLDS.md) documents separate colony inventories and energy, continuing remote production and initially non-rotating surfaces.
- Physical cables, environmental solar variability, the other generation families and a general thermal network are future proposals. Audit current simulation before implementing; do not impose a night cycle on the existing non-rotating worlds by assumption.

All numerical examples below illustrate design accounting, not adopted balance values. Existing alpha costs and operating rules remain authoritative until a specific implementation slice changes them.

## 2. Core contracts and progression
**Agreed starting directions (2026-11-04):** Use one consistent simulation clock, simple conserved fluids, recoverable failures and bounded automation. These decisions guide future energy slices; detailed acceleration rules, material/connection models, recovery costs and automation thresholds remain open in [the discussion backlog](DESIGN_QUESTIONS.md). More severe cascades or contamination are outside the initial failure baseline and require explicit review.

**Core principles:** finite inputs, local consequences, legible shortages, recoverable setbacks and several viable solutions. Electricity is local to a connected installation; opening a remote colony view does not move energy. Export requires a real carrier, battery cargo or an explicitly built transmission system.

**Preferred progression:** solar plus batteries → remote radioisotope capability and/or surveyed wind/geothermal opportunities → fission-backed industrial grids → advanced storage, distribution and cooling → optional late fusion. This is a branching capability landscape, not a mandatory replacement ladder. Wind and geothermal depend on the world; research knowledge alone does not create suitable sites.

Research should pair discovery with useful engineering:
- Observe a long shadow or storm → energy forecasting, reserve controls and improved storage.
- Need a persistent remote instrument → compact long-duration radioisotope package.
- Survey a thermal anomaly → geothermal drilling and heat exchange.
- Obtain fissile material or a supplied fuel package → fuel fabrication, shielding and fission operations.
- Develop materials, control systems and high-power cooling → exploratory fusion research.
Knowledge, fabricated equipment, fuel supply and a viable construction site are separate requirements. Avoid circular dependencies that require a running reactor to make its first fuel or a geothermal plant to power its first drill; offer imported startup supplies or an alternative bootstrap source.

## 3. Generator families and meaningful choices
| Family / design status | Role and prerequisites | Operating limitations and costs | Why choose it / why retain alternatives |
|---|---|---|---|
| Solar arrays + batteries / preferred | Cheap early surface power; basic materials and exposed collector area | Output follows surveyed illumination, star flux, shadow, orientation and later dust/weather; land footprint and vulnerable exposed arrays; storage needed for gaps | Minimal fuel freight and modular expansion; predictable sunlight rewards planning, while long darkness or heavy industry favors a hybrid |
| Radioisotope generator (RTG) / preferred | Small continuous supply for probes, beacons, emergency controls and isolated research; scarce prefabricated isotope core | Low electrical output, costly specialist material, continuous waste heat and shielding/handling needs; no fast on/off fuel saving | Excellent unattended endurance without sunshine; cannot cheaply scale into a main industrial plant |
| Fission / preferred | Sustained industrial baseload; fabricated reactor, fuel, shielding, startup reserve and working cooling | Finite enriched fuel, servicing, spent-fuel storage, warm-up and controlled shutdown; cooling footprint and hazardous damaged components | Compact generation and independence from daylight; ongoing supply and recovery burden preserve solar/geothermal niches |
| Geothermal / preferred, site-dependent | Steady local power at surveyed accessible thermal gradients; drilling and plant construction | Site-bound output/depth, drill startup energy, pipes/heat exchange, seismic exposure; finite useful site capacity and possible long-term drawdown | Low recurring fuel freight; surveying and location matter more than building count; cold/inaccessible geology favors another source |
| Wind / preferred, atmosphere-dependent | Distributed supplemental generation at surveyed windy sites | Requires atmosphere with adequate density and usable wind; calm periods, icing/abrasion and extreme-wind shutdown; exposed structures | Useful in darkness where weather supports it; vacuum gives zero output and weather correlation prevents assuming guaranteed solar backup |
| Fusion / exploratory P2 | Late industrial hub or ambitious project; advanced fabrication, control, fuel processing and major startup power | Net output only after internal power demands; fuel and startup reserves, maintenance, large heat rejection and infrastructure cost | Large sustained throughput with a costly supply chain; small outposts still prefer simpler systems. Never an infinite, fuel-free universal upgrade |

### 3.1 Solar and batteries
Use a readable illumination model tied to actual world conditions. A first model can combine star flux, local exposure and shadow into a bounded output factor. Extend to seasons, eclipses and dust only when predictions and rendering can explain them. Tracking arrays trade construction/maintenance cost for a wider useful exposure window; fixed arrays stay worthwhile.

Star distance and type inform surveyed potential rather than arbitrary planet-tier bonuses. In multiple-star systems, sum contributions only when that system model exists. Placement preview shows expected range and the next likely interruption, not perpetual nameplate output. Solar in vacuum still needs thermal control; hot panels may derate in later thermal slices.

Batteries complement generation; they do not generate energy. More collector area can refill a battery faster but cannot replace sufficient capacity for a long night.

### 3.2 Radioisotope systems
Treat the RTG as a low-rate source with a long-lived isotope inventory. Output declines over campaign simulation time only if the chosen timescale makes decay meaningful; otherwise document a fixed long service life rather than making the player replace a core every few minutes. Restrict scaling through cost/material availability, mass and low specific electrical output, not an arbitrary one-per-colony cap.

The isotope continues producing heat when electrically disconnected. Shielding and service packaging are shared engineering concepts with other radiation systems, without requiring a radiation transport simulator. A remote beacon can remain online after the main industrial bus fails; a field of RTGs should be a poor economic substitute for industrial generation.

### 3.3 Fission
Separate fuel manufacture or import, reactor operation, cooling and waste handling. Start with one standardized fuel cartridge and a small set of service parts; enrichment chemistry, isotope-by-isotope processing and manual rod control are outside the first slice.

The reactor has off, starting, running, derated, shutting-down and safe/service states. Startup consumes stored electrical energy; pumps and controls use power before export. Running consumes fuel against useful operation and minimum stable operation as selected by the prototype. Store partially used fuel state so toggling never replenishes it.

Insufficient cooling first gives a clear warning, then throttling or automatic shutdown. Residual heat persists after shutdown and needs a finite emergency cooling reserve. The initial preferred failure is a recoverable shutdown and damaged plant; catastrophic release or permanent exclusion zones remain an explicit severity decision, not a surprise requirement. Routine service must be visible and automatable later.

### 3.4 Geothermal and wind
Surveyed geothermal sites report estimated thermal yield, depth, access cost and uncertainty. A pilot bore can improve estimates before committing the full plant. More plants share a site's extractable thermal budget rather than multiplying an unlimited deposit. If depletion is introduced, use slow, forecastable drawdown with a stated recovery rule; do not hide exhaustion behind random failures.

Wind surveys report likely useful output, calm duration and storm exposure. An early implementation can use bounded seeded weather bands rather than fluid simulation. Adjacent turbines share weather; spreading a grid across terrain can diversify exposure, while cables and maintenance make distant sites costly. Extreme storms can force stowing/shutdown precisely when defense needs reserves.

### 3.5 Fusion
Prototype only after sustained industry, fuel transport and heat accounting are enjoyable. Define a provisional fuel chain before implementation; deuterium/tritium or an alternative remains open, with breeding, blanket activation and specialist waste included only if that choice needs them. Fusion must pay its internal loads and repay startup energy before it is a useful net source. Failed startup retains consumed resources and requires a visible recovery process.

Prefer automatic safe termination on loss of control, with hot hardware and plant damage as possible consequences. Do not copy fission's failure behavior wholesale. Fusion does not remove storage, local backups, distribution or heat rejection.

## 4. Environmental suitability and surveying
| Setting | Promising approaches | Main constraint / useful choice |
|---|---|---|
| Bright, dry airless moon | Solar + batteries; imported fission for sustained industry | No wind or convective cooling; darkness/shadow and exposed radiators make reserves and protected layout valuable |
| Distant, dim or permanently shadowed site | RTG for low loads; fission for industry; geothermal where surveyed | Imported startup/fuel versus a longer cable from an illuminated site; heating loads can dominate |
| Geologically active world | Geothermal + solar or fission backup | Rich heat is not automatically easy cooling; surface temperature, drill access and seismic risk matter |
| Temperate windy atmosphere | Wind/solar mix + storage | Clouds and calm or storm shutdown can correlate; survey both before assuming complementary production |
| Hot, dense atmosphere | Suitable wind and site-specific geothermal; high-temperature cooling hardware | High ambient temperature limits heat rejection; dust/corrosion and structural weather loads raise upkeep |
| Long night, eclipse-prone or tidally locked world | Storage, lit-side transmission, geothermal or nuclear mix | Night duration and transmission vulnerability can outweigh solar's low construction cost |
| Remote sensor/probe | RTG or small solar + battery | Endurance, launch mass and communications load favor simplicity over peak power |
| Large late industrial hub | Mixed fission/geothermal, optional fusion and distributed renewables | Throughput, maintenance access, fuel freight and common cooling failures matter more than one generator's rating |

Body surveys should expose star illumination, expected dark intervals, atmosphere density, wind statistics, thermal sites, ambient temperature, hazards and accessible fuel/material opportunities. Unknown information is shown as a range or missing survey, not a precise hidden-stat guess. Conditions derive from correlated world generation: volcanic activity, ice, wind and temperature should not be independent random bonuses.

Every starting seed must admit a workable early power and repair path. Remote expeditions can be unsuitable for a particular technology, but should have a viable alternative if the player brings sufficient equipment. No mandatory nuclear resource should exist only behind a destination that already requires nuclear power.

## 5. Distribution, grids and dispatch
**Staged approach:** preserve the current shared bus initially. Introduce explicit local power districts and relay connections only once connection range and failures create worthwhile layout choices. Physical cables are a preferred later representation, not a demand to rewrite the alpha before the signature slices.

A connected grid has finite transfer capacity, generators, storage, consumers and priority policy. Disconnected islands operate independently. Relays/cables have construction cost, range, capacity, health and repair access; simple distance-based loss can be added only when visible. Model transfers once per link with consistent loss accounting. No passive flow loops create energy. Default construction should auto-connect nearby compatible equipment and show a clear preview; offer deliberate isolation for emergency circuits.

Separate rate (kW) from stored quantity (kJ). A large battery may still have too little discharge power to run a laser burst. A high-output reactor may fail to supply a distant mine through an undersized link.

Extend existing paid dispatch and reserve controls rather than inventing a competing allocation system:
1. Player-configurable priorities with a safe default protecting life support, essential cooling and control.
2. Defense reserves and burst loads, with explicit player overrides when risk warrants.
3. Industry/research, battery charging and discretionary loads.
Dependencies must be paid together: a reactor cannot export full power while its pumps receive none. Explain whether a load throttles continuously or needs a complete paid work quantum. Stable tie-breaking and restart thresholds prevent flickering priorities and on/off oscillation.

Storm damage can break a link and leave a remote district on batteries while the generator survives. Reconnect, repair, shed industry or bring portable supplies. Later power beaming is exploratory: it must have transmitter/receiver hardware, losses, line of sight and finite rate; it never becomes automatic cross-planet electricity.

## 6. Storage and black-start capability
| Storage / design status | Best use | Limitation |
|---|---|---|
| Batteries / preferred | Short interruptions, solar nights within practical capacity, portable startup packs | Capacity, charge/discharge rate, efficiency, mass and damage exposure; aging only if it produces a useful servicing choice |
| Capacitors / preferred extension of present buffer concept | Laser/deflection bursts, sharp industrial peaks | High rate, relatively small energy budget; cannot bridge a long night economically |
| Thermal stores / exploratory | Time-shifting collected heat, industrial heating, geothermal/fission integration | Temperature limits, leakage and conversion loss; heat is not interchangeable with electricity |
| Chemical/fuel-cell storage / exploratory | Long reserve duration and transportable energy | Manufacture consumes power/feedstock, tanks and conversion hardware cost mass; round-trip losses prevent perpetual fuel loops |
| Flywheels or other specialist stores / exploratory | Alternative high-cycle installations | Add only if a distinct role survives comparison with batteries and capacitors |

For each store show usable capacity, current charge, max input/output, efficiency and estimated remaining support time for selected essential loads. Reserve settings protect actual stored energy; they do not guarantee generation or survival.

Illustrative sizing: a 10 kW critical load over 120 seconds needs at least 1,200 kJ of delivered energy before losses and safety margin. An 8 kW source cannot sustain that load indefinitely regardless of battery size. Burst sizing must also check discharge rate and the time needed to recharge between shots.

A completely dark outpost needs a black-start route: portable charged battery, small independent solar/RTG supply, or a service vessel. Reactor controls, cooling circulation and fuel processing must not all depend on an already-running main reactor. Startup cost is consumed once, not refreshed by rebuilding, control switching or save/load.

## 7. Cooling, thermal storage and waste heat
Use one comprehensible engineering language across reactors, refineries, mining lasers, defenses, habitats and ship modules: heat produced, heat stored and heat rejected. Initially model equipment or a small connected cooling loop with a few thermal states; defer full spatial fluid/temperature simulation.

Electrical work eventually becomes heat in many loads. Generator conversion and auxiliary losses add their own heat. Track heat once across transfers; do not count the same electrical energy as both immediate generator waste and consumer waste. Where an abstract model omits heat, document the boundary.

**Vacuum:** heat cannot be removed by blowing air into space. Radiators reject it; useful capacity depends on radiator temperature, exposure and environment, including incoming stellar heating. Cold space does not mean instantaneous cooling. Radiator panels consume area/mass and are vulnerable to impacts; shutters or redundant panels trade protection against throughput.

**Atmosphere:** air coolers depend on density, temperature and airflow. Hot ambient air can make them poor sinks. Water/liquid cooling transfers heat to another sink; a closed loop is not itself a source of free cooling. Evaporative cooling, if introduced, consumes real water and is a choice on water-rich sites.

**Ground/ice sinks:** accept finite heat at a modeled rate; ground warms and ice melts if those mechanics are in scope. Geothermal heat extraction must not also provide an unlimited zero-temperature cooling sink.

Operating response: normal → rising heat warning with predicted time to limit → controlled derating → shutdown → damage only if remaining margins are exhausted. Re-enabling never clears stored heat. Essential pumps and residual reactor heat require protected supply after shutdown. Damaged cooling may disable a powerful generator before its electrical equipment is damaged.

Waste heat can warm habitats, melt mined ice or preheat a process when a compatible heat exchanger and nearby demand exist. Credit only displaced heating demand; useful heat is neither free electricity nor a reason to ignore remaining rejection. Use a few temperature/quality bands if needed so lukewarm exhaust cannot power arbitrary high-temperature processing.

A shared cooling loop is compact but creates a common failure point. Separate loops and local backups cost materials and space but improve resilience. Players should see that choice before committing to a layout.

## 8. Fuel, waste, maintenance and persistent consequences
- Solar/wind need repair materials and accessible exposed equipment; ordinary wear should be predictable and later serviceable by automation.
- RTG cores are specialist cargo with persistent inventory/condition. Disassembly recovers the same core rather than creating a fresh one.
- Fission has fresh fuel, partially used fuel and spent fuel/waste. A safe storage module has finite capacity, construction/shielding cost and an eventual transport or disposal route. No hidden infinite waste slot.
- Full spent-fuel storage prevents accepting another fuel batch or starting a new cycle; it must not prevent emergency shutdown or trap unavoidable residual heat without warning.
- Damaged hazardous cargo can require isolation and repair; initial handling can be a simple marked container rule. Exact radiation radius, contamination and cleanup are open severity choices.
- Decommissioning must account for remaining fuel, stored electrical energy, hot components and waste. Salvage returns configured materials after handling costs; it never refunds consumed fuel or deletes hazardous inventory without a recorded disposal outcome.
- Shipments take real time, capacity and mass. A rare fuel source creates an expedition/logistics opportunity rather than a recurring invisible tax.
- Save/load and remote ticking preserve heat, charge, fuel, wear, waste, grid connections and service state. Pause advances none of them; no offline production is introduced implicitly.

## 9. Player-facing decisions and feedback
Prefer decisions with visible consequences:
- Build extra solar/storage or import a fission plant for the first industrial night.
- Put a geothermal plant beside the seam and haul products, or transmit power to a safer refinery.
- Keep one central reactor efficiently cooled or pay for several independent districts.
- Spend stored charge on asteroid interception now or retain life support and restart reserves.
- Run a refinery on surplus daytime power, or buy constant production with fuel deliveries.
- Deploy an RTG beacon now or a cheaper solar beacon that sleeps through darkness.
- Protect radiators behind terrain with reduced exposure, or expose redundant panels for higher throughput.

The power overlay should show actual output versus potential, demand, unmet load, link bottlenecks, available reserves, fuel endurance, cooling margin and upcoming environmental gaps. A stalled machine names its cause: no charge, discharge-rate limit, disconnected link, reserve held, fuel exhausted, cooling limit or waste storage full. Forecasts state assumptions and uncertainty.

Give simple presets such as survival, storm preparation and industry plus manual controls. Warnings identify the affected site and next useful action. Avoid per-second alarms and mandatory repeated switch toggling.

## 10. Implementation slices and acceptance
See the roadmap's phase-linked energy workstreams. Begin with the smallest playable scenario:
1. Keep the existing sortie playable; add a predictable power interruption preview and finite reserve budgeting before complex weather.
2. Compare two viable ways to sustain a remote installation across that interruption.
3. Connect power, defenses and cooling in the first storm only after the standalone budgets are understandable.
4. Add fuel/waste operations and world-specific sources through explicit research/logistics slices.
5. Prove remote/coarse accounting before extending to large networks; leave fusion and specialist stores behind P2 review.

Acceptance invariants for each implemented slice:
- Stored energy delta equals accepted generation/charging minus delivered loads, conversion loss, export and recorded spill; never negative or above capacity. kW × seconds = kJ.
- Charge/discharge rate limits apply; storage cannot charge and discharge into a profitable loop.
- Fuel, isotopes, spent material and freight cannot duplicate through toggles, cancellation, salvage or save/load.
- Heat transfers conserve the modeled budget; rejection and useful export are bounded. Disconnecting, switching views or restarting cannot erase heat.
- Load priorities never spend the same reserve twice. Automatic shutdown remains possible during shortages.
- Local and remote simulation agree within stated tolerances across darkness, weather, fuel exhaustion, grid splits and thermal limits. Resolve transitions at event boundaries rather than awarding a whole coarse interval of impossible production.
- Save/reload and pause preserve current-version state. Follow repository prototype-save policy; legacy migrations remain deferred until later development.
- A damaged plant has an understandable recovery path. The fair start can recover essential power without rare unavailable materials.
- A playtester can explain why their chosen mix suits the site and name a viable alternative. If one source always wins, revise economics or site suitability before adding more generators.

## 11. Decisions still open
These are review prompts, not implementation authorization:
- How many thermal states and manual connections earn their complexity?
- Which fission fuel chain and fusion fuel concept create worthwhile expeditions without recipe sprawl?
- Are hazardous failures limited to repair/shutdown initially, or can they create persistent contamination?
- How long should nights, weather outages, maintenance intervals and fuel cycles last in playable simulation time?
- Which storage families and transmission losses are worth introducing after the solar/battery/dispatch slice?
- How far can automation handle fuel, servicing, waste and emergency islanding while manual engineering stays useful?

Resolve the broader coupled questions in [DESIGN_QUESTIONS.md](DESIGN_QUESTIONS.md) before detailed subsystem implementation.
