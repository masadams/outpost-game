# Task 013 — Progression milestones and resource planning

Follow AGENTS.md and docs/GAME_DESIGN.md. Build on merged direct controls #23. Continue Phase 8 with a focused, playable objectives and scarcity-guidance slice before reliability/release.

- Extend the five expedition goals with supplied habitat work, the complete research tree and real threat interception. Record actual simulation results, including only paid habitat breathing time; no menu-click completion, free rewards, autopilot or surprise threats.
- Show live objective progress, a native tracked-goal selector and useful links into existing Build/Ship/Manage/Map controls. Inspection/tracking/navigation must work while paused without spending resources or advancing physics.
- Add a read-only Selene starter-route material budget derived from actual blueprint/research/equipment costs, existing facilities, paid queues, completed projects and installed equipment. Show unreserved local stock, shortfalls/refining inputs and separate energy requirements. Do not pool remote stock or grant a kit.
- Preserve current-format objective progress through save/reload; reject malformed state and older development formats without migrations.
- Test actual supplied habitat work, power/air failure, locality, committed costs, scarcity, progression, save continuation and native input/layouts. Run typecheck, unit tests, build and production-browser checks; open and merge only after green checks under the user's standing authorization.

Wider economy/event/recovery tuning, measured human 60/40 balance, representative hardware/usability review, reliability/content and release remain open. Do not claim the master plan is complete.

## Implementation and verification

Alpha 0.18 implements the scoped goals/budget slice. Typecheck, all 418 unit tests and the production build pass locally. Native goal links and supported layouts pass browser checks; the ordinary paid construction/crew-dispatch → partial save/reload → habitat disable/resume → completed milestone route passes after correcting its input sequence to native activation. All four existing direct-control browser cases also pass. The complete suite now has 46 scenarios; full CI on the PR head remains required before merge.
