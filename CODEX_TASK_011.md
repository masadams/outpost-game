# Task 011 — Graphics, UX and UI overhaul (Phase 9)

Status: technical implementation complete for review on `feat/presentation-overhaul` after merged nearby-worlds PR #21. Typecheck, 390 unit tests, build, benchmark and the final 14 focused browser checks pass. The complete moon work/return route also passed. Regressions from the initial full run were fixed and rechecked; a clean final full CI run and merge remain. Human playtesting is still outstanding. See [implementation rules and limits](docs/PRESENTATION.md). Retain the established retro instrument-panel identity while overhauling the playable two-world game. Follow AGENTS.md, GAME_DESIGN.md, PRESENTATION_AUDIT.md, PRESENTATION_DIRECTION.md and the full Phase 9 roadmap. Do not call the overhaul complete from screenshots alone; record human playtest work still outstanding.

## Outcome

Make the actual flight → mine → land → build → research/equip → defend → supplied moon expedition → return loop readable, discoverable and cohesive. Preserve manual flight, continuous world coordinates, shared gravity, finite resources, local colony budgets and real freight mass. The prototype's legacy-save policy still applies: support the current format and reset incompatible development saves.

## Work

1. Refresh the audit against alpha 0.15 and create concrete layout/art mockups. Prioritize body versus target frame labels, small text, long construction/freight lists, navigation chart density and control discovery. Do not replace working controls with inert illustrations.
2. Overhaul procedural ship, crew, facilities, rocks/ore, planet/atmosphere/moon and threat visuals. Give bodies/facilities clear silhouettes and identifiable materials; keep visible terrain aligned with actual collision surfaces. Add restrained engine, mining, hit, fracture, weapon and shield effects with explicit bounds.
3. Rework HUD hierarchy for flight/landing, crew, construction, combat and turret contexts. Keep critical fuel/air/hull/landing warnings persistent, with symbols/text as well as color. Distinguish the surface frame from navigation-target relative motion. Preserve a clear central play area.
4. Improve supplied construction and logistics flow: grouped blueprints, readable locked/invalid reasons, whole-footprint/deposit/coverage feedback, direct selection/operations and cost previews. Add a useful freight manifest/kit workflow only with explicit finite stock/reserve/capacity rules; never grant a kit by selecting it. Keep per-product/raw loading available.
5. Improve system navigation and camera framing/zoom/arrival feedback around both moving bodies. A chart may support route planning, but must not hide terrain occlusion or silently take control of the ship. Preserve manual controls and honest coast-prediction limitations.
6. Add practical onboarding/short objectives for first delivery, supplied industry, equipment and moon work. Progress must come from actual simulation events, not button clicks or free resources. Keep wider survival/event/economy balancing explicitly tracked if it is not finished here.
7. Provide coherent pause/settings/help and control discovery, native keyboard/mouse parity, rebindable controls, scalable UI/text, reduced motion/effects and graphics quality options. Preferences stay separate from physical world state. Do not allow focused controls to thrust/fire/walk accidentally; pause remains inspection-only for simulation actions.
8. Polish original sound cues/mix and provide independent sound/music controls if music is added. Distinguish source/atmosphere/airless arrival cues without false atmosphere alarms; preserve mute/unlock/focus-loss/pause/load behavior and alarm priority/rate limits.
9. Measure renderer/DOM/effect budgets alongside the simulation benchmark, including both bodies, remote colonies and high body counts. Cull/cap visual work and offer reduced quality without freezing physics or remote production. Check paused rendering and reduced-motion behavior too.
10. Validate the full loop and all supported desktop sizes, update documentation/screenshots/roadmap/decisions, and open an implementation PR. Merge completed work only under the user's standing authorization and after relevant checks pass.

## Acceptance

- Every exposed control operates the real implemented game and communicates costs, ownership, scarcity and failure clearly.
- No clipped/overlapping controls at 900×600, 1280×800 or 1920×1080, including larger text, long panels and resize. Critical flight/air warnings remain visible; native focus, shortcuts and pointer behavior are reliable.
- Both worlds' art and telemetry agree with their actual moving frames; supplies, research funding, shields/air, recovery and save continuation retain their existing semantics.
- Automated tests cover the meaningful new settings/interaction/onboarding behavior plus complete existing production-browser routes. Run typecheck, unit tests, build, relevant performance checks and full production-browser regression.
- Capture fresh real-game screenshots and document measured budgets and actual limits. Human handling/usability/art/audio evaluation remains an explicit review item until performed; do not invent its outcome.

Later work remains reliability/content tuning and release preparation. Multiplayer, unbounded worlds and mobile/touch implementation are outside this task.
