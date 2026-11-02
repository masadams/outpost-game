# Codex Task 006 — Ship combat and threats

Continue Phase 6 on a separate branch stacked on defence PR #8 while it remains open. Keep both PRs available for review; do not merge automatically. Preserve the user's required full graphics/UX/UI overhaul and start its initial technical audit after the combat loop is playable.

## Deliverable

- Opt-in O hostile patrol while piloting above 200 m. No surprise attacks on existing practice worlds. One encounter at a time, bounded to three drones; deliveries, colony development and exploration increase the patrol tier.
- Shift fires ship weapons, Z cycles cannon/guided missile; Space retains mining/turret/jump behavior. Finite ammunition, capacitor energy, fire cadence, heat and a cooling lock constrain bursts. E at the safe pad repairs/rearms from real colony materials.
- Ammunition contributes to ship mass. Projectile launches apply recoil; projectiles inherit launcher velocity and share gravity/drag with swept relative contacts. Terrain/rocks occlude shots. Hostile drones use finite fuel/ammo/energy, bounded vectoring thrust and angular speed, telegraphed attacks, stand-off pursuit and retreat/disengagement.
- Combat damages ships/crew and can damage colony facilities through hostile ground impacts. Player missile blasts affect hostile/mineral/meteor targets, without defensive friendly fire. Existing ship/mineral and ship/drone contacts use the shared swept impulse model.
- Demonstrate a combat victory and safe return under normal flight inputs, followed by supplied repair/rearm. Backspace recovers a wreck only with 8 alloy + 2 components; keep colony/depleted deposits and remaining ammunition, retain at most 20 of the remaining fuel, return with 30 hull and lose carried cargo. L/R remain fallback recovery choices.
- Version-4 checkpoints retain active combat, drone/projectile state, heat, magazines and costs. V1–3 migrate without starting enemies or resetting existing defence/inventory; loading remains paused.
- Combat HUD, radar, attack telegraph, damage/kill effects, procedural cues and H guide. Record preliminary graphics/UX issues and overhaul priorities, without treating a technical audit as human usability approval.

## Acceptance

Run build/typecheck/unit tests and all production browser routes. Cover full victories with both ship weapons, paid repair/rearm/recovery, scarcity/heat/cadence, recoil/mass, swept hits/occlusion, drone behavior/escalation, render-rate independence, active-save continuation and legacy/invalid saves. Add a real browser launch/patrol/fire/pause/save/reload route. Update roadmap, decisions, physics limits and playtest documentation.

Enemy loot/progression trees, persistent campaigns, advanced automation, complex missile propulsion, structural building collisions and the full presentation overhaul remain later milestones.
