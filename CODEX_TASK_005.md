# Codex Task 005 — Planetary defence

Continue the master roadmap after the atmospheric-flight feedback in merged PR #7. User authorized merging that PR and moving on with the plan. Build Phase 5 on its own branch; open its implementation PR for review. Do not enable automatic merges.

## Deliverable

An opt-in, browser-playable defence drill in the continuous planetary world. Colony construction, mining, walking, flight, camera and sound remain available.

- N/button starts a deterministic incoming meteor drill. One active drill at a time; wave size caps at three parents. No unsolicited attacks or wall-clock/offline progression.
- Meteors share planetary gravity/air drag and sweep terrain/ship contacts. Early warning includes radar, predicted paths, impact sites and time to contact.
- Build laser, flak and missile turrets with existing manufactured resources. Operate nearby on foot with E, A/D aim, Space fire, E release. G toggles paid-for turret automation. Automatic targeting respects range, horizon, enabled state, power, fire rate and ammunition.
- Laser pulses spend energy; flak and missiles additionally consume finite alloy/components. Projectiles travel through the world with swept relative collision. Flak has a timed burst; missiles guide toward a locked target. No remote/infinite ammunition or free energy.
- First interception splits a parent into dangerous mass/momentum-conserving fragments. Subsequent hits disperse fragments into non-collectible dust. Ship mining laser provides an interception alternative.
- Impacts damage buildings, ship and exposed crew near the contact. Wrecks retain placement footprints, stop operating and reduce storage/battery capacity. Report lost overflow stock; never silently generate replacement supplies. U repairs nearby facilities with alloy, including wrecks. Salvage scales with remaining hull.
- Version-3 full-world checkpoints preserve damage, turrets, threats, projectiles, progression and spent resources. Versions 1/2 migrate without starting attacks. Loads pause and release manual control.
- Procedural warning, shot and impact cues; no external assets.

## Acceptance

Demonstrate complete manual controls and automatic defence in production Chromium, plus deterministic simulation victories for all weapon variants, dangerous residual fragments, an undefended impact and paid recovery, scarcity/range/occlusion/fire-rate limits, projectile sweeps and active-drill save round trips. Re-run build, typecheck, unit tests and existing production browser routes. Update roadmap, decisions, README, model limits and playtest notes.

Shields are optional later work. Enemy spacecraft/combat upgrades, drones/logistics, technology trees and campaign escalation belong to later phases. Defence uses a single global colony grid, simplified blast damage and finite opt-in drills; advanced structural physics and detailed propulsion/ammunition manufacturing are out of scope.
