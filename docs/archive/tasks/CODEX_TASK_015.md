# Task 015 — Current-format checkpoint recovery

Follow AGENTS.md and docs/GAME_DESIGN.md. User direction: merge the completed research/parts/menu work and continue to the next phase. This begins the bounded Phase 10 reliability work on top of Task 014. Do not add legacy-save migrations, autosaves, remote services or new gameplay systems.

- Before replacing a valid checkpoint, retain its exact bytes as the previous checkpoint. Validate the runtime before any storage access and abort if backup rotation fails. A failed primary write must leave a usable prior flight. Repeated identical saves must not rotate away the previous distinct checkpoint.
- Prefer the valid latest current-format save; fall back to a validated previous save only when the latest is absent/invalid. Reads do not mutate storage. Never promote corrupt/incompatible data over the backup. New Game continues to preserve stored checkpoints until an explicit save.
- Clearly identify the older flight in the title menu and after loading. Load paused, silence gameplay audio, clear held input and keep the current runtime if neither copy can load.
- Test quota/access failures, validation failure, repeated reads/saves, incompatible/corrupt/oversized/missing saves, real menu/keyboard/reload flows and existing checkpoint routes. Run build, typecheck and relevant regression checks.

Merged with Task 014 in [PR #25](https://github.com/masadams/outpost-game/pull/25). The next menu-feedback iteration is Task 016.

## Local verification

Implemented current-format-only backup rotation and read-only, visibly paused recovery. Typecheck, all 469 unit tests and the final production build pass. All 13 focused production-browser regressions pass recovery/fault injection plus existing menu, flight, crew, mining and production-line checkpoint restoration. After updating the in-game explanation, all eight menu/recovery scenarios pass again against the final rebuilt source, including enlarged text at all three desktop sizes. Twelve new unit cases and four new browser scenarios cover this slice; the full browser catalogue is now 59. These local verification notes preceded the PR #25 merge. Human multi-session usability/hardware testing and the remaining Phase 10 content/reliability acceptance are open.
