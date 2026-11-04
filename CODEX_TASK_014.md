# Task 014 — Research, ship parts and playtest entry

Follow AGENTS.md and docs/GAME_DESIGN.md. Builds on merged #24. User priority: flesh out research and ship parts first, then economy/recovery readiness, add a standard start menu, merge and hand over for playtesting.

1. Expand the research tree to ten paid, powered, prerequisite-driven technologies and sixteen real parts across eight exclusive ship slots. Provide usable dependency/unlock navigation and per-slot comparisons. Preserve current basic-part behavior; advanced alternatives have real mass, thrust/burn, capacity, mining/tractor, cannon, cooling and damage tradeoffs. Fit/replacement/removal must be atomic, storage-safe and conserve finite materials/fuel; no stacking or free refills.
2. Add a standard title/pause menu: New Game, Continue, Settings, Controls, Resume, Save/Load and Return to Title where appropriate. No hidden simulation/input/audio while a menu is open. New Game creates a new runtime without silently deleting the saved checkpoint. Continue loads paused. Exercise existing browser routes through the actual menu.
3. Finish the requested readiness slice: explain home recovery funding/shortfalls, current-body refuelling and fuel-production/material/energy needs. Optional spare-parts budgeting is inspection only. Keep local supplies separate, existing costs and opt-in threats; do not invent safe-range guarantees or free recovery.
4. Current-format saves preserve research and exclusive fitted parts; reject invalid families/prerequisites/capacities. No legacy migrations. Update controls/help/design/roadmap and test all new effects, atomic replacement, supplied research/recovery/refuelling, title/continue/pause/input/focus and supported desktop layouts.

Run typecheck, unit tests, build and production-browser regression. Open and merge after green checks under standing user authorization, then provide a concrete playtest handoff. Human pace/feel, representative hardware, reliability/content and release acceptance remain open; do not claim the master plan is finished.

## Implementation and verification

Implemented in alpha 0.19: ten technologies, sixteen parts/eight exclusive slots, standard title/pause flow, local fuel/home recovery guidance and optional planning allowance. Typecheck, all 456 unit tests and production build pass locally. Focused browser checks pass paid orbital research/replacement, all part/tree inspections and layouts, standard menus, ordinary research/cargo fabrication, paused readiness, paid recovery/refuelling, audio and crew construction. Panel switches now reset cross-panel scroll while preserving explicit inspection jumps; the affected native objective route passes again. The complete suite has 55 scenarios and remains the final local/CI merge gate.
