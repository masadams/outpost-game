# Alpha 0.19 — Research, ship parts and playtest entry

This implements Task 014, following merged #24 and the user's requested order: flesh out research/ship parts, finish readiness guidance, add a standard menu, merge and playtest. It is a bounded playable catalogue, with no placeholder technologies or parts. Human feel, pacing, hardware and release acceptance remain open.

## Start and continue

The title offers **New Game**, **Continue**, **Settings** and **Controls**. New Game creates a fresh runtime; it keeps the old checkpoint until you explicitly save. Continue is enabled only for a valid current-format checkpoint and loads it paused. Press your pause binding (P by default) to resume.

The toolbar **Menu** button opens Resume, Save checkpoint, Load checkpoint, Settings, Controls and Return to title. Escape closes an operations panel first; with no panel open it opens this pause menu. Escape resumes from the pause menu and leaves the title open. Settings/Controls return to the underlying menu. Physics, held inputs and gameplay audio stop while menus are open.

K/L and R still save/load/reset during gameplay. R keeps the checkpoint. There is no autosave. Current saves use **version 18**, validate one part per slot, research prerequisites and equipped capacities, and preserve research, damage, supplies, local colonies and fitted parts. Older development formats are deliberately unsupported; no migrations were added.

## Research

Open **Manage → Research**. The default view shows technologies with completed prerequisites; **Full tree** and **Completed** are also available. The dependency overview lists actual prerequisites and unlocked parts; Inspect scrolls/focuses the real technology card. Inspection and filters work while paused. Research buttons commit samples once and require a healthy powered lab for real work. The existing shared one-lab contributor, funding-colony refunds, power limits, priorities and cancellation rules remain.

| Technology | Requires | Alloy / wire / components | Work seconds | Unlocks |
| --- | --- | --- | ---: | --- |
| Applied materials | — | 4 / 2 / 1 | 15 | Cargo rack, impact armour |
| Propulsion systems | Materials | 6 / 3 / 1 | 20 | High-thrust engine, extended tank |
| Powered extraction | Materials | 6 / 3 / 1 | 20 | Powered head, long-range tractor |
| Combat engineering | Propulsion + extraction | 8 / 4 / 2 | 25 | Cannon coil, cooling pump, shield domes |
| Orbital propulsion | Propulsion | 10 / 5 / 3 | 35 | Orbital drive, survey tank |
| Bulk logistics | Materials + extraction | 8 / 4 / 2 | 30 | Bulk hold |
| Precision extraction | Extraction | 10 / 6 / 3 | 40 | Deep head, precision tractor |
| Thermal engineering | Propulsion + extraction | 10 / 6 / 3 | 35 | Cryogenic cooler |
| Advanced ballistics | Combat | 12 / 6 / 4 | 45 | Heavy coil |
| Layered composites | Materials + combat | 12 / 5 / 4 | 45 | Layered armour |

All ten need 310 work seconds, 1,240 kJ lab energy and 86 alloy / 44 wire / 24 components in samples. This excludes construction and fabrication. The research milestone now requires the complete ten-node tree.

## Sixteen parts, eight slots

Choose **Manage → Ship equipment → Ship part slot**. Each slot shows two alternatives, the currently fitted part, live ship totals, costs and tradeoffs. A standard unfitted slot remains usable. The tow rig remains its separate paid Cargo utility.

| Slot | Basic part | Advanced alternative | Main tradeoff |
| --- | --- | --- | --- |
| Drive | High thrust: 18.2 kN / 1.04 kg/s / 14 kg | Orbital: 16.8 kN / 0.64 kg/s / 20 kg | Less peak thrust, better exhaust efficiency |
| Tank | 320 kg capacity / 10 kg dry | Survey: 400 kg / 18 kg dry | Extra capacity starts empty; loaded fuel adds mass |
| Hold | 200 kg / 9 kg dry | Bulk: 300 kg / 28 kg dry | Much heavier empty and when loaded |
| Mining | 550 m / 1.5× / 6 kW / 4 heat/s | Deep: 650 m / 2× / 10 kW / 8 heat/s | More cell and heat load |
| Tractor | 360 m / 28 m/s² / 3 kW / 2 heat/s | Precision: 430 m / 22 m/s² / 6 kW / 4 heat/s | Longer, gentler, more power |
| Cannon | 24 damage / 12 kJ / 22 heat | Heavy: 30 damage / 16 kJ / 28 heat | Same ammunition/recoil; higher heat/cell cost |
| Cooling | 30 heat/s, 9 kW recharge | Cryogenic: 40 heat/s, 6 kW recharge | More cooling diverts power from recharge |
| Armour | 20% reduction / 14 kg | Layered: 35% / 26 kg | No healing or relaxed catastrophic landing rules |

Advanced dry masses in slot order are 20 / 18 / 28 / 22 / 20 / 21 / 20 / 26 kg. Fabrication material mass equals installed dry mass; every fit also spends 20 kJ unreserved home grid charge. Fuel, hull, ammunition and cell charge are preserved.

Only one part fits each slot. Replacement requires the full new cost before crediting old salvage, then atomically pays/fits/refunds. Salvage is 50% of the old cost multiplied by current hull fraction. Downgrading a hold blocks until cargo fits; reduced tank capacity returns excess fuel to local storage, or the entire operation blocks if it cannot fit. Repeated swaps cannot duplicate parts, fuel or refunds. Supplied wreck recovery preserves fitted parts without filling upgraded capacities.

## Recovery and fuel readiness

Ship / Cargo shows home recovery funding and **Expedition readiness & refuelling**. Recovery still costs 8 alloy + 2 components from unreserved Selene stock, loses cargo, returns at 30 hull and retains at most 20 kg of remaining fuel. Full repair and rearm cost extra and compete for the same stock. Moon stock and ship freight do not silently finance home recovery. The starter budget's optional recovery allowance adds those parts to its bill; it reserves nothing.

The fuel input is a read-only manufacturing estimate. Whole fuel cycles consume 1 water + 0.25 oxygen, produce 1.25 fuel, need 3 work seconds and 18 kJ. Ice refining co-produces 0.7 water + 0.3 oxygen per kg, so the estimate uses the maximum required ice-cycle count for both shortages instead of charging ice twice. It separates local depot stock from delivery shortfall, reports work/energy/power needs, and never starts production or transfers fuel. Habitats compete for oxygen. Two simultaneous refinery/processor loads ask for 10 kW; one 8 kW solar array may need storage, extra generation or serialized priorities.

The paid starter equipment route still leaves 2 alloy / 3 wire / 2 components. Including recovery parts makes its initial alloy bill 34 kg, a 6 kg shortfall against the starter kit. Use the actual mining/refining loop before committing to risk. These are funding facts, not safe-range guarantees: mass, burn, steering and atmosphere determine the flight.

## Suggested playtest

1. Try New Game, Controls, Settings, pause/menu, save and Continue. Verify the flight stays paused after loading until you resume.
2. Build powered research, inspect dependencies, earn a branch and compare the two parts in its slot. Fit at home and fly with the changed mass, burn or tools.
3. Swap a loaded tank/hold carefully; try a blocked downgrade and confirm nothing disappears. Compare stronger cooling with slower cell recovery.
4. Check recovery funding and fuel-production inputs before launching. On a disposable saved run, recover a wreck, repair with real stock, manufacture fuel and transfer it.
5. Report confusing menu paths, unclear costs, handling differences, unreadable layouts, pacing and sound/performance issues. The full-loop human 60/40 balance and representative hardware review remain to be done.

Screenshots: [title menu](screenshots/start-menu-1280.png), [research dependencies](screenshots/research-tree-1280.png), [ship parts](screenshots/ship-parts-1280.png), [local readiness](screenshots/readiness-1280.png). The browser cases also capture 900×600 and 1920×1080; long panels scroll and critical flight instruments remain outside them.
