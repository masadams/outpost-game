# Progression goals and resource guidance — alpha 0.18

Task 013 continues Phase 8 after direct-control PR #23. The Objectives button now offers a tracked milestone, live progress and links into existing controls. It adds no top-level menu, material reward, automatic flight or automatic threat spawning.

## Eight milestones

The five expedition milestones remain: deliver ore, run supplied industry, install equipment, work on Nacre and return home. Three colony milestones can be pursued in any order, including before the moon expedition:

- **Work under supplied air:** accumulate 20 seconds of air actually paid from a powered, pressurized habitat while healthy and deployed. Both worlds count once toward the same total. Empty/disabled/out-of-coverage domes, ship time and shields supply no progress. Progress is cumulative, capped at 20 seconds and stored with the world; suit risk continues whenever coverage fails.
- **Complete the research tree:** finish all four real, paid projects. Queuing, clicking and merely building a lab do not complete the milestone. Equipment and shields still cost materials and energy after unlocking.
- **Intercept a threat:** destroy a meteor through the existing interception system. Opening Ship / Defence starts no drill. Save and prepare before opting into a drill; its damage remains real.

Recorded milestones remain recorded after supplies are used or buildings are lost. The selected tracked goal is temporary UI state, while completion and partial supplied-air work persist. Loading remains paused. Current saves are version 17; incompatible development formats reset without migrations.

Keyboard-accessible links open Ship / Cargo, Build, Map, Ship / Defence, or the actual Research/Ship equipment section in Manage. The latter use Selene's colony view, matching the starter budget. Opening a section is inspection; Build additionally enables ordinary pointer planning. No link purchases, queues work, starts a threat or controls flight. All paid actions keep their existing pause gates.

## Selene starter-route budget

The collapsible budget describes one home route, derived from the live configuration:

| Step | Alloy | Wire | Components |
| --- | ---: | ---: | ---: |
| Solar array | 4 | 2 | 1 |
| Refinery | 6 | 2 | 1 |
| Research lab | 6 | 3 | 2 |
| Applied materials research | 4 | 2 | 1 |
| Cargo rack | 6 | 2 | 1 |
| Total from a new world | 26 | 11 | 6 |
| Remaining from the finite 28 / 14 / 8 kit | 2 | 3 | 2 |

Paid construction orders count as committed work, including paused ones. Completed research and installed equipment remove their cost; queued research has already paid its samples. Disabled intact facilities still exist and need enabling; wrecks need repair or replacement. The bill is not a guarantee of valid geometry, available crew, working feedstock or immediate power. Research needs 60 kJ over 15 work seconds and fabrication needs 20 kJ at once above the energy reserve. Pending research subtracts energy already spent.

Only unreserved Selene product stock funds the remaining bill. Moon stock and freight aboard a ship are not silently pooled. Shortfalls show their refining inputs, rounded up to whole recipe cycles, with depot raw stock and still-to-deliver amounts separated. Refineries still require real power and feedstock. The budget never transfers, reserves, spends or grants anything.

## Verification and next work

Simulation tests exercise actual paid construction → supplied breathing, failures on both worlds, finite stock, paused/current-save continuation, research/interception outcomes and 30/144 Hz equality. A separate route actually constructs the advertised facilities, powers research, walks home and buys the cargo rack with the starter kit. Browser coverage exercises native links, inspection while paused, the ordinary paid construction/crew-dispatch path to the habitat milestone and enlarged text at 900×600, 1280×800 and 1920×1080.

This is the objectives/scarcity-guidance slice. Wider economy/event/recovery tuning, measured human action/build time toward the 60/40 goal, representative hardware/usability review, current-format reliability/content and release remain open. No claim of completed campaign balance is made.

Layout evidence: [900×600](screenshots/milestones-900.png), [1280×800](screenshots/milestones-1280.png), [1920×1080](screenshots/milestones-1920.png). Long panels use the existing dock scroll, especially with enlarged text.
