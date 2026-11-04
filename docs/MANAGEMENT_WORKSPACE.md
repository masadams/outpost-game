# Alpha 0.20 — Management workspace

Task 016 addresses the crowded, narrow Command menu. It uses familiar strategy-game patterns: a large planning window, clear pages, a connected technology map, selectable catalogue entries and one persistent inspector. Labels accompany original vector icons. Important information never requires hover.

## Navigation

**Manage** opens expanded by default. Ship / Build / Manage / Map navigation moves into the expanded window, and returns to the flight deck when you close or compact it. **Compact / Expand** is available on every operations panel. Build remains compact by default so mouse placement can use the world. Map and Objectives also open expanded.

Short desktops put page navigation at the side and give the selected inspector the full content height. Manage has six pages: **Facilities**, **Research**, **Ship fitting**, **Construction**, **Economy**, **Shields**. Opening one page hides unrelated controls. The colony selector remains available for home/nearby/moon inspection. Facility selection still points to the actual physical building; controls keep their original costs, power limits, work and crew requirements.

Management is live unless you press **P**. The window header retains the normal Pause/Resume button, Settings, Help and Menu; a Live/Paused badge states the simulation status; inspection remains available while paused and spending actions are disabled. Escape closes the workspace. This does not silently add a pause, travel, order, purchase, production target or resource reservation.

## Research map

Nodes are arranged by prerequisite tier and linked by actual dependency curves. Words and symbols distinguish **Locked**, **Ready**, **Queued**, **Researching**, **Paused** and **Complete**. Ready means prerequisites are complete; the inspector reports any missing samples, lab or power. Highlight filters dim other branches while keeping their dependencies visible. The map scrolls independently of the inspector.

Click a node, or Tab to it and press Enter/Space, to show its prerequisites, unlocks, samples, work/energy and explicit Research action. Arrow keys move keyboard focus between nodes; activation selects one. Hover gives a short native tooltip with state/time/cost. The persistent inspector provides those facts without hover. Clicking a prerequisite selects its node; clicking an unlocked part opens its fitting comparison. Queue pause/cancel remains explicit and preserves the simulation's unworked refund rules.

## Ship fitting

Choose a labelled slot, then a part card. Only the selected part shows detailed benefits, drawbacks, material cost, research requirement and a **current → selected** stat table. Fitting/removal requires its explicit action. Read the failure reason when paused, away from home, missing research/supplies, or blocked by cargo/tank/storage capacity. Detailed salvage rules and quotes are disclosures. Research and fitting actions stay in a fixed inspector footer while the selected details scroll.

Eight mutually exclusive slots remain. Existing sixteen parts retain their behavior. All new parts use the same paid mass-conserving fabrication, hull-scaled salvage and recovery/save rules. Capacity adds no free cargo/fuel, and cooling/weapon changes do not repair hull or refill cells/ammunition.

| New research | Prerequisites | Alloy / wire / components | Work s | Unlocks |
| --- | --- | --- | ---: | --- |
| Ion propulsion | Orbital + thermal | 16 / 8 / 5 | 55 | Ion cruise drive |
| Lightweight structures | Logistics + composites | 14 / 6 / 5 | 50 | Lightweight hold |
| Industrial extraction | Precision + thermal | 16 / 8 / 5 | 55 | Strip mining head, industrial tractor |
| Cell engineering | Thermal + orbital | 14 / 8 / 5 | 50 | Efficient cannon coil, capacitor cooling loop |

All fourteen research projects consume 520 work seconds, 2,080 kJ and 146 alloy / 74 wire / 44 components, excluding construction/fabrication. The research milestone now requires fourteen completed projects.

| New part | Dry kg | Cost alloy / wire / components | Real effect / tradeoff |
| --- | ---: | --- | --- |
| Ion cruise drive | 24 | 12 / 8 / 4 | 12.6 kN, 0.40 kg/s; less peak thrust than existing drives, better exhaust efficiency |
| Lightweight hold | 12 | 7 / 3 / 2 | 220 kg hold; 80 kg less capacity and 16 kg less dry mass than Bulk hold |
| Strip mining head | 25 | 14 / 7 / 4 | 360 m, 2.6× rate, 14 kW, 12 heat/s; short, power-hungry work |
| Industrial tractor | 23 | 12 / 7 / 4 | 320 m, 42 m/s², 9 kW, 7 heat/s; stronger pull with less reach than Precision tractor |
| Efficient cannon coil | 10 | 6 / 3 / 1 | 21 damage, 6 kJ, 12 heat/shot; lower peak damage, same ammo/recoil/interval |
| Capacitor cooling loop | 18 | 10 / 5 / 3 | 24 heat/s cooling, 16 kW recharge; prioritizes cell recharge over sustained heat removal |

Saves retain the current version-18 structure; no migration or legacy compatibility layer is introduced. New research/part IDs use the existing prerequisite, slot, capacity and state validation.

## Playtest

At 900×600, 1280×800 and 1920×1080, try enlarged text, each page, native keyboard selection, tree scroll, prerequisite/unlock jumps, compact/expand and Escape. Inspect while paused: stock, queue, fuel, equipment and time must not change. Then supply a lab, research a branch, compare/fabricate at home and fly with its actual changed stats. Try a blocked loaded-hold downgrade. Check that hovered and selected details agree and that no icon requires guessing its meaning.

Human usability, handling, economy tuning and representative-hardware performance remain acceptance work. This is not the completion of the whole development roadmap.

Screenshots: [research at 1280×800](screenshots/workspace-research-1280.png), [ship fitting at 1280×800](screenshots/workspace-fitting-1280.png), [research at 900×600](screenshots/workspace-research-900.png), [ship fitting at 900×600](screenshots/workspace-fitting-900.png). Each also has a 1920×1080 capture.
