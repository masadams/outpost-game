# Task 004 — Colony construction and economy

Continues the requested milestone sequence on a branch stacked on Task 003 / PR #4. Review and merge flight → mining → surface → colony in order. Never merge automatically.

## Objective

Place facilities on the curved surface, mine and unload feedstock, refine it using generated power, produce fuel, and refuel the ship. Preserve the shared world, prior controls and independent 60 Hz simulation.

## Deliverables

- Six facilities: solar array, battery, storage, refinery, fuel processor and repair/fuel station. A finite fabrication kit starts the loop: 28 alloy, 14 wire, 8 components, 4 water and 2 oxygen; no recurring free materials.
- Grounded living astronaut only: B palette, 1–6 selection, Q/T preview movement, Enter placement, X nearby demolition. Mouse buttons use the same simulation actions. Validate proximity, affordability, overlaps, protected home pad/terminals and a 48-facility limit. Demolition returns 75% and cannot strand stored inventory.
- Shared grid: enabled solar arrays generate 8 kW each; base capacitor stores 20 kJ, batteries add 200 kJ. Consumers use deterministic placement order, pause when starved, and cannot create negative energy.
- Base ore capacity 400 kg; storage adds 200 kg ore and 100 kg capacity per manufactured product (base 100 each). Partial unloading leaves overflow aboard.
- Refinery recipes (V nearby): iron → alloy, copper → wire, silicon + rare metals → components, ice → water + oxygen. Fuel processors consume water/oxygen for fuel. No output without power, inputs and room. Show ledger, recipes, progress and supply/demand.
- E toggles nearby machines; built service stations require stored power and use manufactured oxygen/alloy/fuel. The home emergency suit service remains available. Cockpit E on the safe pad unloads and transfers manufactured fuel.
- Production continues while flying; pause freezes it. New radial starter ice sample near home supports repeated fuel sorties.
- K saves a versioned local checkpoint; L loads it. Startup loads an existing checkpoint paused. Persist the entire world, including depleted deposits, inventory, facilities, production progress, ship and suit. R resets the runtime sandbox and leaves the checkpoint intact. Reject corrupt/unsupported saves without replacing the live world.
- Procedural buildings/preview, browser screenshot, README, roadmap, decision notes, unit/browser tests, build/typecheck and review PR.

## Acceptance and limits

Construction cannot overspend or overlap protected structures. Storage/energy stay bounded. Refining conserves recipe mass, fuel transfer respects ship capacity/range/landing, and a checkpoint resumes production without recreating mined resources. Browser automation builds a powered line, produces fuel, saves, resets, loads and reloads successfully.

Prototype simplifications: one global power/material bus, constant solar output, fixed recipes, passive non-solid buildings and manual single-slot local checkpoints. No wiring, day/night, offline production, defence, combat or advanced automation. Phase 10 remains responsible for a mature save/migration system. Next milestone after review: Phase 5 planetary defence.
