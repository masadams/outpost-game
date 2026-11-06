# Growth run 2: from a wide world to a working economy

Follows `growth-run.md` (G1 to G5, done: belts and bodies as data, atmospheres by body, aiming ahead, Cinder, seeds). Same rules: small slices, unit tests, the browser specs for the area, docs, one merge per slice, depth before breadth, checked against the design bible and roadmap first.

Findings that shape this run: every colony is already simulated every step, so remote outposts keep working while the player is away (roadmap 5A is half done). What is missing is the player being able to *see* them, power that has distance, and goods that travel.

| # | Slice | Bible and roadmap link | Status |
|---|---|---|---|
| G6 | **Stabilise.** Full browser run, fix stale specs, write a short scripted first-hour sim test (mine, deliver, build, survey, first storm) so regressions in the path are caught in unit tests. | Phase 0 stabilise; "never claim tests passed unless run". | Planned |
| G7 | **Aim point for the ship.** The flight readout and Map course use the predicted position of a selected belt, so a manual burn can aim ahead of a moving target like a probe does. | Predicted vs observed quantities are distinguished (bible section 9). | Done: Map shows "Aim ahead" (bearing from your nose, time at 110 m/s) and the world draws a ring at the aim point. |
| G8 | **Outposts overview.** A Base section lists each found world with a colony: power balance, machines running or stopped and why, stores, and what is short. No instant transfers. | 5A visible state; 5B "visible shortages". | Done: Base has an "Other worlds" section for every found world with buildings (power, stores, machines, what needs attention); each colony keeps running while you are away. |
| G9 | **Relay capacity and loss.** A relay carries a limited amount of power and loses a little per hop; the Base power card shows what is carried and what is lost. | 5E "finite link capacity and explicit losses"; no loop creates energy. | Done: each relay hop keeps 96%; a relay carries 10 kW (x1.5 at tier 2) and holds back everything through it evenly past that; relays and panels show what they carry and lose in Base. Generation only; demand-side flow through relays is later. |
| G10 | **Haul it home.** Remote depots hold ore; a ship loads it at the outpost pad and unloads it at home (already possible) with the flight made worthwhile: a depot tally, a "what to haul" hint on the Map, and fuel cost shown. | 5C ship raw vs refine at source. | Done in part: on another world's pad the Ship window offers "Haul ore home" (depot tally, hold room, a refine-first hint, one button); at home it says why not. Fuel cost and a Map hint are later. |
| G11 | **Domes and shields in the earned menu.** Reveal habitat and shield buildings by sequence (second storm survived, an outpost founded), each with its tier effect, so the existing systems return one at a time. | "Hidden systems return through deliberate slices"; shields/domes after the base game works. | Planned |
| G12 | **Roadmap pass.** Update CURRENT_FOCUS, MASTER_ROADMAP ticks and DECISIONS; list what the next run should be. | Documentation discipline. | Planned |

Not in this run: ship engineering (Phase 3), terraforming and large habitats (end-game), new star systems (Phase 6).
