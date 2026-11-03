# Task 012 — Direct colony controls and crew orders

Follow AGENTS.md, GAME_DESIGN.md and the current presentation model. Builds on merged #22. The user reports that menus still feel convoluted and routine manual walking is slow; implement a focused interaction phase before broader balance/reliability/release work.

## Outcome

A clear Ship / Build / Manage / Map hierarchy, discoverable mouse construction and optional physical crew orders. Keep meaningful exploration, manual flight, finite local supplies, power, atmosphere/gravity and suit risk. No fake cable-link controls: each colony currently has a shared grid.

## Scope

- Group cargo/weapons/defence under Ship and make construction distinct from facility management. Make the build catalog compact with clear categories, selected costs and a short action sequence. Keep native keyboard alternatives and a single operations dock with persistent warnings.
- In Build, point at a surface to preview the real body-local site. Left click places/queues the selected paid blueprint according to the current construction rules; right click cancels pointer placement. Native site/queue buttons provide the same operations. Keep selection/inspection while paused; no paid action executes until resumed.
- Optional click-to-walk and dispatch-to-build orders move the existing healthy grounded crew on its current world using normal acceleration, speed, gravity, air and oxygen. They never teleport, fly the ship, grant supplies or work on another world. Manual movement/jump/boarding/turret control cancels the order. Low air, loss of footing, death or unavailable work stops safely with feedback.
- Preserve local construction geometry, costs/reserves, paid 8-second queue work, cancellation/refunds, actual habitats/shields and background production. Current-format saves include active crew orders; incompatible development saves reset without migrations.
- Update help, roadmap, decisions and native browser routes for the simplified flow. Test pointer transforms on both moving bodies, placement/queue costs, manual override/low-air/pause/load, keyboard parity and supported desktop sizes. Run typecheck, unit tests, build and production browser regressions; open and merge the implementation after checks under the user's standing authorization.

Human playtesting, representative hardware validation, wider scarcity/objectives/balance, current-format reliability/content and release preparation remain open. Do not call this the end of the master plan.

## Implementation and verification

Implemented in alpha 0.17. Local typecheck, 401 unit tests and production build pass. The initial complete 42-scenario browser regression passed, including the normal-input moon round trip; all 15 focused scenarios passed after final refinements, including the added invalid-site case. A final pinned-site feedback fix revalidates reservations and stock while the pointer is over UI; all four direct-control browser scenarios, typecheck, 401 unit tests and build pass again. The complete suite now has 43 scenarios and must pass CI on the PR head before merge. See [controls and limits](docs/DIRECT_CONTROLS.md) and [selected facility inspection](docs/screenshots/direct-build.png). Human usability and representative hardware review remain open.

The corrected implementation passed 42 of 43 CI browser cases; the cancellation case exposed a wall-clock refund assumption (two seconds of valid work produced exactly 23 alloy). Replace that bound with a paused snapshot and exact unworked refund checks for all three materials. Both Command browser cases pass locally after the test correction; gameplay is unchanged. Final CI remains the merge gate.

Merged in [PR #23](https://github.com/masadams/outpost-game/pull/23) after Flight checks #112 passed typecheck, 401 unit tests, build and all 43 production-browser scenarios on final head `6816895f75c63168a255bec390f02891ade9f14b`.
