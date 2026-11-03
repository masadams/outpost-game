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

## Alpha 0.2 atmospheric flight feedback

The user requested a larger planet, more atmospheric flight time, a current-trajectory option and camera zoom controls. This supersedes the historical Task 001 tuning above: radius 1,800 m, mu 16,200,000 m³/s² (surface gravity still 5 m/s²), uniform-density core, atmosphere height 1,200 m, density 0.08 kg/m³ and scale height 320 m with a smooth upper cutoff. Ship, airborne suit, rocks and ore share the environmental integrator. Drag dissipates energy without reversing velocity; tractor forces now apply equal/opposite ship reaction. The planet/air do not rotate, and lift/heating/wind/mutual gravity remain out of scope.

J toggles a controls-released prediction using the exact fixed-step ship model for up to 180 seconds, stopping at first terrain contact. Moving traffic/tools are excluded. Wheel/−/+ select bounded manual zoom; 0 restores auto. Local-horizon rotation blends over 900–1,800 m. Home terminal arc distances remain ±54 m. Version-1 checkpoints reproject altitude and local velocity/attitude, signed home-relative arc distances and buildings without resetting inventories or mined deposits; loads pause and do not rewrite storage until K. Version 2 records its environment. Historical orbits necessarily change. See PHYSICS.md for model limits and measured sorties. [PR #7](https://github.com/masadams/outpost-game/pull/7) was reviewed with green hosted CI and merged after the user explicitly requested its merge and continuation of the plan.

## Task 005 planetary defence choices

The continuing instruction advances Phase 5 on a new branch after merged PR #7. Drills start only with N/button; no surprise waves interrupt flight practice. One active drill, capped at three parents, targets the latest operational facility or home pad. Meteor dynamics share gravity/drag with swept contacts; warning paths predict the same integrator up to 120 seconds. Existing mining rocks remain separate from incoming threats.

Three constructed turrets offer manual E/A/D/Space controls and G automation; manual control takes priority and suppresses walking/jumping without freezing oxygen or the world. Finite grid energy, direct alloy/component consumption, range/horizon checks, cooldown and bounded projectile counts constrain fire. First parent interception conserves fracture mass/momentum and leaves dangerous fragments; later hits disperse dust without adding ore. Defensive weapon blasts affect threats only. Ship mining laser remains an alternative.

Buildings default to 100 hull; impact energy/distance causes radial blast damage. Wrecks retain footprints but lose operations/capacity, reporting destroyed overflow inventory and discarding excess charge. U repairs within 18 m for 1 alloy/10 hull; salvage is scaled by remaining hull to prevent wreck refunds. Home pad/terminals remain recovery infrastructure. This is not solid-building structural collision. Version-3 full-world checkpoints persist damage, threats/projectiles, turret state and costs; v1/v2 migrate peacefully, loading pauses/releases manual control and clears visual beams. Existing planetary migration remains intact.

All values are provisional arcade tuning; shields, hostile ships, detailed ammunition manufacturing, campaign escalation and logistical automation belong to later work. This phase is open for review in [PR #8](https://github.com/masadams/outpost-game/pull/8), without enabling automatic merge. See [DEFENCE.md](DEFENCE.md) for controls, numbers and limitations.

## Task 006 ship combat choices

The continuing request advances Phase 6 in [PR #9](https://github.com/masadams/outpost-game/pull/9) on `feat/ship-combat`, stacked on open defence PR #8 for a separate review. O starts a patrol only while piloting above 200 m; it never starts automatically or overlaps a live patrol. Threat tier grows with delivered ore, operational facilities and recorded exploration altitude, capped at three drones. Drones use bounded vectoring thrust with finite fuel/ammunition/energy, a 0.9-second aiming telegraph, stand-off pursuit and bounded disengagement; terrain losses/disengagement award no kills.

Shift fires, Z selects cannon/guided missile, and Space retains its earlier roles. Finite magazines, capacitor regeneration, heat/cooling lock and cadence constrain fire. Ammunition contributes to ship mass; launches inherit velocity and conserve momentum through recoil. Projectiles share gravity/air drag with swept contacts and terrain/mineral occlusion. Ship/drone contacts reuse the existing ship/rock impulse response. Destruction resolves in the same fixed step so active saves remain valid. Weapons may fracture minerals/intercept meteors; friendly missile blasts do not damage the player/colony. Enemy ground impacts can damage facilities.

E on the safe pad repairs with alloy then fabricates ammunition from finite alloy/components. Existing nearby service sites can rearm under their existing range/power rules. Backspace recovers only a wreck for 8 alloy + 2 components, preserves colony/depletion, loses carried cargo, returns 30 hull and retains remaining ammo plus at most 20 remaining fuel. It ends the patrol without granting kills and does not cancel meteor drills. Version-4 full-world checkpoints preserve active combat and costs; v1–3 migrate peacefully with one starter loadout and keep previous progress. These remain prototype weapon/reactor/thermal/propulsion abstractions; no detailed chemistry, enemy loot or campaign is added. See [COMBAT.md](COMBAT.md).

The initial [presentation audit](PRESENTATION_AUDIT.md) records technical findings for the required overhaul after this playable slice; visual mockups and human usability testing are still pending.

## Graphics, UX and UI overhaul commitment

The user explicitly requested a graphics, UX and UI overhaul in the development plan. Phase 9 now requires a full visual and interaction redesign across the playable systems, including contextual HUDs, construction/management flows, onboarding/settings, camera comfort, accessibility, desktop layouts, audio polish and measured graphics budgets. Start visual direction and the UX audit after Phase 6, before adding automation/logistics interfaces; complete the overhaul before Phase 10 reliability playtesting. This schedules future implementation and does not change the current physics or begin the overhaul in the defence milestone. The established retro art direction and continuous-world design remain the foundation. See [Phase 9 in the roadmap](DEVELOPMENT_ROADMAP.md#phase-9--graphics-ux-and-ui-overhaul-audio-polish).

## Defence/combat merge and presentation foundation

The user explicitly requested merging and continuing. PR #8 was reviewed against its green head and merged first; PR #9 was retargeted from the defence branch to main, checked for conflicts and merged with its expected green head. No automatic merging was enabled. Phase 5–6 implementations are now on main.

The next planned pre-automation task implements the initial visual direction/contextual-layout foundation. One operations dock replaces simultaneous permanent panels; I toggles cargo and Esc closes details, while telemetry, warnings, weapon state and radar remain visible. Context transitions choose relevant panels; manual selection/closure persists within a context. These are runtime presentation choices, outside world checkpoints. Keyboard control activation is isolated from gameplay; Esc closes help while preserving its previous panel/pause state. Cached planet shading and inset strata do not alter collision geometry or tuning. See [PRESENTATION_DIRECTION.md](PRESENTATION_DIRECTION.md) for palette, wireframes, layout bounds and deferred work. This is merged in [PR #10](https://github.com/masadams/outpost-game/pull/10); the full Phase 9 overhaul and human usability evaluation remain pending.

## Planetary mining — first Phase 7 slice

The user requested mining on the planet with a rig/building. Implement finite surface seams as the first Phase 7 slice before adding drone/towing logistics. Deposits use the existing five ore types and deterministic surface locations; a rig's whole footprint must fit within one seam. Construction costs manufactured supplies and each powered cycle transfers actual reserve mass into shared ore storage. Depletion persists independently of the rig, including through damage, repair, demolition/rebuilding and checkpoints. Multiple rigs compete for one reserve; blocked output never destroys ore or spends extraction power.

The 6 kW, 0.5 kg / 2 s rate is deliberately slow background supply, preserving the flight/mining role. The existing global grid/material bus and placement-order allocation remain prototype limits; no separate transport simulation, new resource currency, terrain deformation, offline output or unlimited seam respawn is introduced. Existing refining/fuel recipes consume extracted ore without a parallel economy. The tenth blueprint uses the palette button/native keyboard focus to preserve 0 for automatic camera zoom. Version-5 saves preserve reserves/bindings/partial cycles; versions 1–4 receive fresh seams while retaining prior progress. Merged after green CI at the user’s explicit request in [PR #11](https://github.com/masadams/outpost-game/pull/11). See [Task 007A](../CODEX_TASK_007A.md) and [planetary mining notes](PLANETARY_MINING.md). Scheduling, priorities and vulnerable mobile logistics remain later Phase 7 work.

## Refinery scheduling — second Phase 7 slice

Continue earned automation through built refineries: opt-in automatic recipe selection replenishes configurable shared-stock targets. Manual remains the default for new and legacy facilities. Each refinery stores its own policy; no free ore, energy or extra starter supplies are granted. Between completed batches, use deterministic round-robin selection among needed recipes with inputs and room for all co-products. Retain paid progress through target edits, disabling and supply/power/storage blocks. Turning scheduling off preserves the selected recipe/progress; explicit V retains its established reset behavior and switches to manual.

Targets are desired shared stock, not hard output caps or reservations. Already-active batches finish even if a target has since been filled, so parallel refineries may exceed a target. Ice co-products can exceed one goal while fulfilling the other; physical capacity always blocks the entire batch. This avoids hidden output loss or discarded paid work. Target buttons use native keyboard activation without changing game controls. Version-6 checkpoints retain policy/cursor/progress; v1–5 remain supported and older refineries stay manual. See [PR #12](https://github.com/masadams/outpost-game/pull/12), [Task 007B](../CODEX_TASK_007B.md) and [automation model](AUTOMATION.md). Power/storage/ammunition priorities and vulnerable mobile logistics remain later work.

## Colony resource priorities — third Phase 7 slice

Continue the planned priority controls as explicit reservation policies on the current global bus. Zero defaults preserve old behavior. Industrial power excludes a configured charge floor; turrets and supplied service can consume it. Rigs exclude reserved delivery room from output capacity; ship unloading still uses physical free space. Reserve alloy/components for turrets across every non-turret manufactured-material consumer: construction, building/ship repair, rearm and recovery. Actual turret shots spend normal finite stock. Goals never grant inventory, request production or shield capacity from damage.

Policies can be changed remotely in Colony, including after a crash, so a material hold cannot trap paid recovery. Native controls and an expandable disclosure show configured goals and actual usable budgets; expansion remains runtime UI state. Distinguish reserved power/space from physical shortages and let users release holds. Oversized goals may halt industry until adjusted or capacity is added. Version-7 saves preserve policy without resetting older schedules, depletion or combat; versions 1–6 default to zero policy. The impact path previously erased paid cycles despite the documented scheduling behavior; retain progress through actual wrecking/repair and test that path. See [PR #13](https://github.com/masadams/outpost-game/pull/13), [Task 007C](../CODEX_TASK_007C.md) and [reserve model](COLONY_PRIORITIES.md). Scheduling PR #12 merged during this iteration, so the reserve branch is now based directly on main. This does not complete Phase 7.

## Landing instruments and warning audio — user feedback

The user requested warnings on landing telemetry, including green/yellow/red, a warning pulse and low-fuel lights/sound. Add a pure current-state safety model shared by HUD and audio. Use actual touchdown limits and local up; total speed reflects the worse radial/drift category rather than inventing another physical landing rule. Expose spin and keep off-pad/low-clearance feedback visible so green individual instruments cannot imply a guaranteed landing. Limit landing cues to low descending/hovering flight, with earlier activation for fast descent.

Use color plus labels/symbols, stable DOM updates and a gentle 1.4-second critical pulse. Pause and reduced-motion preferences suppress the pulse. Distinct landing/fuel tones are rate-limited, with urgent landing first, critical fuel next and existing threat/hull alarms ahead of a low-fuel caution. Preserve mute/volume, unlock and focus/pause silence; avoid repeating a landing tone rapidly when crossing the approach boundary. This modifies feedback only: physics, stock and save version stay unchanged. It is a separate review stacked on PR #13, before mobile logistics, and does not complete Phase 9. See [PR #14](https://github.com/masadams/outpost-game/pull/14), [Task 007D](../CODEX_TASK_007D.md) and [the warning model](FLIGHT_WARNINGS.md).

## Mobile logistics and explicit upgrade/dome schedule

The user asked to continue after landing feedback and asked whether ship upgrades and oxygen/protection domes were scheduled. Ship upgrades existed broadly in Phase 8; now explicitly schedule equipment categories, fabrication limits and physical tradeoffs there, with shield domes as a separate finite-energy defence system. Add Phase 7.5 oxygen habitats immediately after towing: defined curved-surface coverage/height, finite oxygen buffer, area/crew consumption and powered supply pause suit drain only while breathable. Habitat air and shields remain separate functions, with no free suit refill/healing or unlimited impact protection. Sizes/rates/costs remain provisional until each task is specified. See [UPGRADES_AND_DOMES.md](UPGRADES_AND_DOMES.md).

Task 007E starts the next Phase 7 slice with a 25 kg towing utility module fabricated from exactly 25 kg of manufactured stock, respecting reserves. Y captures nearby velocity-matched asteroids with a fixed-length slack/tension cable. Equal/opposite impulses couple the bodies; damping dissipates relative motion. Terrain, excess strain, impact and target destruction sever it. No body teleportation or free ore transfer: normal mining/tractor/unload remains required. Rig mass stays in the ship through supplied wreck recovery, while the attachment releases. Coast prediction suspends during attachment because the single-ship predictor omits cable forces. Version-8 saves preserve active equipment/cable state; v1–7 preserve prior progress and receive no free rig. See [PR #15](https://github.com/masadams/outpost-game/pull/15), [Task 007E](../CODEX_TASK_007E.md) and [TOWING.md](TOWING.md). PR #13 is merged; PR #14 was retargeted to main and remains open. This new branch stacks on landing feedback for review, without automatic merging.

## Populated space and central Command — subsequent user steering

The user requested nearby planets/moons, asteroid belts and other useful interactions, plus clear atmosphere/space indication. Promote these from optional late expansion: Phase 7.9 adds immediate resource/destination discovery; Phase 8.5 adds a bounded multi-world neighborhood with consistent gravity, reference frames, surface/camera behavior, navigation and persistent depletion. The current towing slice adds a persistent atmosphere/thin-air/space badge and entry/exit chimes at the actual drag boundary; gravity remains active. No other world or new belt is implemented by that cue.

The user also requested a spacecraft-style central management menu with power meters/dials/drag-and-drop, building queues, economy, priorities and research. Schedule Phase 7.75 after habitat buildings, before progression adds more complexity. Remote routine management replaces mandatory visits to machines; actual construction/service still needs valid work and supplies. Expose real requested/allocated power, finite charge/capacity, per-facility caps and deterministic dispatch, with keyboard alternatives. Integrate research/navigation when real systems exist; avoid inert tabs and hidden free resources. See [the functional plan and full sequence](COMMAND_AND_EXPLORATION.md) and [console concept](mockups/command-console.svg). Continue through graphics/UX/UI, reliability/content and release afterward.

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
