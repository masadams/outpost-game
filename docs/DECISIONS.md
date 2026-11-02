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

## Task 001 provisional tuning (human balance feedback pending)

The implementation follows D-003–D-008 and D-017 without revising them. Initial constants: moon radius 600 m, gravitational parameter 1,800,000 m³/s², softened core radius 120 m, dry mass 900 kg, fuel 240 kg, thrust 14 kN, burn rate 0.8 kg/s. The 7 m circular hull uses swept collision; the home pad spans ±30 m of surface arc. Safe landing requires hull clearance inside the pad, radial speed ≤6 m/s, drift ≤4 m/s, tilt ≤15°, spin ≤0.35 rad/s. Angular damping is allowed; free-flight linear drag is absent. The camera blends local to inertial orientation over 100–900 m altitude. These are tunable prototype values, not new permanent design commitments. Safe landings do not refuel/repair; R restores the test fixture. No optional landing gear or flight assist is introduced.

Verification and screenshots are in the Task 001 PR and README.

## Task 002 prototype choices (human tuning feedback pending)

The next-iteration request adds the roadmap's mining/cargo loop on a branch stacked on flight PR #2. Existing flight/design decisions remain in force. Manual equipment uses Space for a 450 m forward laser and C for a powered 260 m tractor; these are provisional controls and tuning. Parents split once into two mineable fragments, then ore; resource mass and fracture momentum are conserved. A 120 kg hold accepts partial stacks, contributes to thrust mass, and unloads via E only in the safe landed state. Ore capture combines momentum with the ship. All five planned resources are represented. One radial starter sample supports a short first sortie; other deposits start in orbit. The bounded field is fully simulated, with no respawn or valuable-ore expiry. Depot totals are a temporary unload interface, not a colony economy or save system. Reset intentionally clears field, hold and depot. No astronaut, construction or combat systems are added. Review flight first and mining second; automatic merging remains prohibited.

## Task 003 prototype choices (human tuning feedback pending)

The continuing iteration request adds Phase 3 on a branch stacked on mining PR #3. F boards/exits a landed ship; exit spawns 14 m along the rim, boarding range is 20 m. A/D walks at 12 m/s with grounded acceleration/braking, Space or W/Up jumps at 12 m/s, and radial gravity governs airborne motion. The suit has a 2.5 m terrain collider, 180 seconds of oxygen, 5 health/second loss when oxygen is exhausted, and impact damage above 14 m/s. A lost suit requires reset. Boarding refills oxygen but preserves health. Fixed depot/service points are at ±0.09 radians (about ±54 m) from home, with 12 m interaction range. The depot unloads a nearby landed ship; the service point freely restores the suit and consumes 1 kg stored iron per 10 missing hull points. These fixed prototype amenities do not add construction, production or refuelling. Camera focus/zoom changes smoothly between ship and suit in the same scene. Short action presses are retained until a fixed step consumes them; held actions are debounced. Suit collision excludes station/ship/asteroid geometry. All values remain provisional for review.

## Task 004 prototype choices (human tuning feedback pending)

Phase 4 is stacked on surface PR #4. A finite fabrication/tank kit bootstraps six build types; further materials come from mining/refining. Construction requires a grounded living crew member, a clear affordable site within 96 m, protected pad/terminal clearance and no facility overlap. Demolition refunds 75% and cannot strand inventory. One global grid uses 8 kW per solar array, a 20 kJ base buffer and 200 kJ per battery; fixed-step consumers run in placement order. Solar has no day/night in this slice. Base ore capacity is 400 kg; storage adds 200 kg and raises per-product capacity from 100 by 100. Recipes conserve input/output mass: iron/alloy, copper/wire, silicon+rare metals/components, ice/water+oxygen, then water+oxygen/fuel. Built service uses 2 kJ plus manufactured supplies; the home emergency service remains available. E on the safe pad transfers manufactured fuel, never free fuel. A nearby radial ice sample makes fuel feedstock accessible. K/L provide a bounded version-1 full-world local checkpoint; startup resumes it paused, R leaves the checkpoint intact, and offline production/autosave/cloud sync/migrations are deferred. The entire finite field is saved to avoid duplicating mined ore. Buildings are non-solid, with damage/defence deferred to Phase 5. All tuning remains provisional.

## Alpha 0.1 playtest and merge authorization

The user explicitly requested basic sound, readiness review and merging of the current stack before human playtesting. PRs #2–#5 were reviewed, verified green in hosted CI and merged in dependency order using normal merge commits with expected head SHAs. No GitHub auto-merge was enabled, and this does not authorize future milestone merges. The playtest pass adds original Web Audio loops/cues, conservative default volume, M mute, persisted audio preferences and H help that preserves pause state. Audio does not affect simulation or checkpoints. Production-preview browser tests measure actual audio output/silence and verify the previous gameplay routes. A CI build artifact and playtest/review guides support the handoff. Defer new systems, including defence, until human feedback.

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
