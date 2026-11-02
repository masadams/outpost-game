# Outpost — Design Decisions and Open Questions

This log distinguishes **decided** direction from ideas and unresolved choices. Update when a decision changes; link relevant PR.

## Confirmed
| ID | Decision | Rationale |
|---|---|---|
| D-001 | Single-player first | Focus on a polished core; multiplayer may be considered later |
| D-002 | Roughly 60% flying/mining/combat, 40% construction/colony | Arcade action remains central |
| D-003 | One continuous 2D world | Ship, planet, projectiles, asteroids and base share coordinates |
| D-004 | Small circular, fully circumnavigable planetoid | Genuine radial gravity and orbit/landing skill |
| D-005 | Gravity points toward planet centre | Supports any surface orientation |
| D-006 | Camera levels local horizon near ground and transitions in space | Readable surface gameplay and natural spaceflight |
| D-007 | Asteroids-style thrust, rotation and momentum | Pilot skill matters; avoid arbitrary drag |
| D-008 | Lunar Lander-style takeoff/landing and collision consequences | Landing is a gameplay challenge |
| D-009 | Player can leave ship and build on surface | Colony and flight share one world |
| D-010 | Mining uses breakable asteroids, fragments and cargo recovery | Physical interaction rather than menu-only mining |
| D-011 | Meteor threats can be intercepted by ship or ground defences | Unifies spaceflight and Missile Command-style defence |
| D-012 | Base production/defence continues while player is away | Colony is persistent and consequential |
| D-013 | Initial resource set: iron, copper, ice, silicon, rare metals | Simple expandable economy |
| D-014 | Earn automation through progression | Manual skill precedes autonomous drones/turrets |
| D-015 | Retro early-DOS pixel-art aesthetic, modern effects | Nostalgic but readable |
| D-016 | Browser first; Android later | Fast iteration and accessible testing |
| D-017 | TypeScript, Phaser 3, Vite, custom fixed-step physics | Modular browser implementation |
| D-018 | GitHub PR workflow; do not auto-merge code | Reviewable development and handoff |
| D-019 | No backend for initial prototype | Minimize setup and complexity |

## Task 001 provisional tuning (pending flight review)

The implementation follows D-003–D-008 and D-017 without revising them. Initial constants: moon radius 600 m, gravitational parameter 1,800,000 m³/s², softened core radius 120 m, dry mass 900 kg, fuel 240 kg, thrust 14 kN, burn rate 0.8 kg/s. The 7 m circular hull uses swept collision; the home pad spans ±30 m of surface arc. Safe landing requires hull clearance inside the pad, radial speed ≤6 m/s, drift ≤4 m/s, tilt ≤15°, spin ≤0.35 rad/s. Angular damping is allowed; free-flight linear drag is absent. The camera blends local to inertial orientation over 100–900 m altitude. These are tunable prototype values, not new permanent design commitments. Safe landings do not refuel/repair; R restores the test fixture. No optional landing gear or flight assist is introduced.

Verification and screenshots are in the Task 001 PR and README. No later milestone was implemented.

## Open questions (not decisions)
- Exact planet scale, gravity strength, thrust-to-weight ratio, orbit speeds and landing tolerances: tune through prototype playtesting.
- Whether lateral thrusters, landing gear toggles or advanced flight assists improve controls.
- Mining beam versus projectile weapons, tractor beam range and asteroid fragment lifetime.
- Base construction placement UX and wiring/power model.
- Enemy types, narrative, campaign structure, difficulty and progression pace.
- Exact ship and colony visual language, audio direction and controller support.
- Additional worlds and multiplayer: future possibilities, not current scope.

## Change process
When a confirmed decision is revised, record the new decision, reason, and PR link. Never silently change established gameplay direction.
