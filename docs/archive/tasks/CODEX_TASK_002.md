# Task 002 — Asteroid mining and cargo

Next iteration after the Task 001 implementation. This PR is stacked on the unmerged flight PR; review/merge flight first. Do not merge automatically.

## Objective

Extend the continuous flight world with a playable launch → mine → collect → return → unload loop. Preserve independent fixed-step simulation and the existing flight/landing controls.

## Scope and controls

- Deterministic, finite asteroid field with iron, copper, ice, silicon and rare metals. One radial starter sample above home; other deposits orbit the moon.
- Hold Space for a forward mining laser (450 m, nearest unobstructed target). Parent rocks split into two mineable fragments; fragments become drifting ore. Hold C for a 260 m powered tractor; ore enters the hold within 18 m.
- 120 kg hold, partial-stack collection, cargo added to ship mass, and separate per-resource hold/depot inventories.
- Gravity/surface contact for rocks and ore, rock/rock contact, swept moving-rock/ship collisions with hull damage.
- Land safely and press E to transfer cargo into the home depot. Repeated E must never duplicate ore. No refuel/repair or construction in this milestone.
- Visible deposits, fracture/laser feedback, resource colors, cargo meter, target bearing/distance and radar deposits.
- R restores ship, field, ore and depot; pause freezes the entire world.

## Acceptance and verification

- A normal launch can reach the starter sample, fracture it, collect its ore, land and unload using the same continuous simulation.
- Fracturing and collection conserve resource mass. Capacity never overflows; partial pickups retain their remainder. Unloading is permitted only while safely landed.
- Loaded thrust acceleration is lower; gravitational acceleration remains mass-independent. Bodies and ore remain finite through surface contact.
- Build, typecheck, existing flight tests, mining tests and real Chromium control checks pass.
- README and roadmap explain controls, architecture, verified checks and limitations. Include a cargo screenshot in the PR.

## Exclusions and handoff

No astronaut, construction, enemies, weapons, economy, saves, automated mining or multiplayer. Laser and tractor are manual prototype equipment. Asteroid/ore populations stay bounded without respawning or expiring valuable material. Next milestone: astronaut interaction and explicit depot access, after flight/mining review.
