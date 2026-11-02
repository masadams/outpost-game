# Task 006A — Presentation foundations before automation

After explicitly authorized merges of PRs #8 and #9, implement the visual-direction and contextual-layout foundation scheduled by the initial presentation audit. Work on a new branch against main and open a review PR. This is the early Phase 9 work required before Phase 7 adds automation interfaces, not completion of the full art/accessibility milestone.

- Define a cohesive retro palette, typography, spacing and three layout wireframes/reference captures.
- Replace permanently competing cargo/colony/combat/defence panels with one contextual operations dock and explicit navigation. Keep critical telemetry, warnings, weapon state and radar visible.
- Keep a central flight corridor free of DOM panels; place instruments along the bottom and reserve radar space. Long notices must flow without overlapping.
- I toggles Cargo; Esc closes the dock and returns keyboard focus. Context transitions select relevant panels, but manual browsing/closure persists within a context. UI selection stays outside world checkpoints.
- Support mouse and native keyboard activation, paused browsing, help/Escape semantics and a scrollable nine-blueprint palette. All existing game actions remain reachable; panel browsing must not alter physical state or trigger accidental inputs.
- Improve cached procedural planet shading/strata within the existing collision rim; do not change simulation or save formats.
- Verify 900×600, 1280×800 and 1920×1080 control bounds/separation, central clearance, focus/scroll/context behavior and all previous gameplay routes. Run build, typecheck, unit tests and production browser tests; capture live references.

Document the merge status, implementation, limits and remaining Phase 9 work. Human usability approval, full sprites/animation, camera look-ahead, configurable/scalable accessibility, music and measured hardware/quality budgets remain later tasks. Phase 7 automation follows review of this foundation.
