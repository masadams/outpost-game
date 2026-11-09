# Outpost — Design Decisions and Open Questions

This log distinguishes **decided** direction from ideas and unresolved choices. Update when a decision changes; link relevant PR.

## Camera and scale decisions — 2026-11-05

The user confirmed there is no need for backwards compatibility with saves or anything else: this is a fresh start, so values and formats may change freely.

- **Size follows the window, not a fixed zoom.** Ground zoom is derived from viewport height so the lander is the same share of the screen on every display. The simulation's physical sizes are unchanged: the art still spans the same 14 m envelope the collision uses.
- **Ground stays in view while falling.** The camera will not zoom in past the point where the ground below is visible in the screen space left clear by the instrument cluster. As a result the lander reaches full size only in the last 50 to 60 m. If that feels too small on approach, the options are a larger lander in the world or a shorter HUD, not a tighter camera.
- **Focus sits at 40% from the top.** More of the screen is below the ship, where the ground is.
- **Look-ahead** of up to about 1 second of travel, capped at 20% of the screen, off on foot and with reduced motion.

## Cleanup slice decisions — 2026-11-05

- **Messages are rewritten at display time, not in the simulation.** `src/ui/notices.ts` turns SHOUTING · DOT · SEPARATED messages into sentences ("Checkpoint saved. K to update. L to load."). Saves, the simulation and its tests keep their original text; key letters and names are preserved. A handful of routine HUD messages were written out in plain English directly.
- **"Checkpoint" stays** as the word for a save, because the menu already says Save checkpoint / Load checkpoint.
- **Ship panel** shows hold, ore in hold versus depot, nearest rock and a single "what next" sentence; on foot it also shows the depot and terminals with the key to press.
- **Dead code is deleted, not parked:** the old surface panel module, the old cargo and navigation markup, 46 unused CSS rules, and the dock's own navigation bar.

## Map slice decisions — 2026-11-05

- **Map window rewritten** around the mockup: chart you can click, a places list, and an inspector. Ore clusters you have not surveyed say "Unknown until surveyed" instead of showing numbers.
- **Site actions** (salvage, tender fuel, survey) stay as a button in the inspector, but because Map pauses a flight, the usual way to act is to close it and press E in range. The inspector says what is missing in plain words ("Get within 120 m of it.").
- The one-line target guidance stays in the HUD while flying.

## Base slice decisions — 2026-11-05

- **New Base window** for the focus set: Overview, Buildings, Ship. Building problems are explained in one plain sentence ("Needs iron ore. Mine some and unload it at the pad."), and Overview lists them under "Needs attention".
- **Nearby card** replaces the old on-foot facility panel: status, reason, and quick controls with their keys (E on/off, V recipe, U repair) plus Details into Base.
- **Legacy console quarantine:** the old Manage console (research tree, ship fitting, shields, scheduling, upgrades, power dispatch) is reachable only with `?features=all`, as a "Legacy console" section inside Base and its default there. It is not rebuilt; each system gets new UI when it returns in a later slice.
- Window titles are now "Base", "Ship", "Map" in the new header style.

## Build slice decisions — 2026-11-05

- **Screen buttons stay on top of full-screen windows** and act as tabs (Ship, Build, Base, Map), with the sound / help / settings / pause tray. Windows open just below them. Small change from mockup 1, so Settings and switching screens never need closing a window first.
- **Build mode replaces the instrument cluster** with the build bar; flight instruments return when you stop building.
- **Astronaut is sent automatically:** placing a site on foot dispatches them; stepping out of the lander with work queued does too. Any manual movement still cancels the order.
- **Removed:** the old build panel (category dropdown, numeric "metres from pad" site entry, "Dispatch crew" button, manual-placement disclosure). The keyboard path is Q / T / Enter next to the astronaut.
- **Reserves** are reachable from the lander under Base → Economy until the Base rebuild.

## Rewrite over adapt — 2026-11-05

The user directed: when rebuilding is faster or cleaner than adapting, rebuild; do not keep old code that has no value or no longer belongs. Applied to the UI rebuild:

- **Kept:** `src/sim`, the Phaser world renderer, saves, unit tests, and the view-model style (pure functions from world state to what a screen shows).
- **Replaced from scratch:** the HUD shell (brand header, button-wall nav, sound and zoom toolbars, objectives button, dial strip) and its legacy CSS, rather than restyled.
- **Temporary:** the old Ship, Build, Manage and Map panels stay only until their new screens land, then are deleted. Hidden systems (combat, towing, autopilot, upgrades…) lose their old panels at that point and get new UI when they return. Their simulation and unit tests remain.
- Browser specs that only exercise old UI are replaced by specs for the new screens instead of being patched.

## Mockup 1 review — 2026-11-05

The user reviewed [mockup 1](mockups/ui-rebuild.html): colors and direction approved, fonts acceptable. It reads clear but a little simple; add detail and refinement during the real build without losing clarity.

- **Attitude dial stays** in the flight cluster.
- **Building works on foot or from the landed ship.**
- **Pause rule refined:** Base and Map pause only while the ship is flying. When landed or on foot they stay live. Menus always pause. This replaces decision 1 below.
- **Map** stays a full window (as mocked); a large overlay is also acceptable if it proves better in play.

## UX rebuild and focus reset — 2026-11-04

After a full review of the alpha, the user approved four decisions:

1. **Full-screen windows pause.** Base management, Map and menus pause the simulation. In-flight HUD and small panels stay live. Rationale: the ship crashed behind a live full-screen Map during review; the continuous-world pillar is about space, not about hiding danger behind UI.
2. **Hide, don't delete.** New games show only the first-mining-sortie set (flight, mining, cargo, landing, depot, refining/fuel, astronaut building, solar/battery/storage/refinery). Combat, drones, defence, shields, towing, autopilot, upgrades, scheduling, policies, freight, the broad research/parts catalogue, habitats and Nacre travel UI stay in code but are hidden until reintroduced by a deliberate slice.
3. **Rebuild the UI layer with Preact** on shared design tokens, replacing innerHTML-string classes. `src/sim/` is kept and extended.
4. **Sequence:** ground rules → clickable mockups of Flight, Surface/Build, Base and Map → visibility gating → UI rebuild → first mining sortie polish and playtest. See [CURRENT_FOCUS.md](CURRENT_FOCUS.md).

Completed task specs moved from the repository root to [archive/tasks/](archive/tasks/). AGENTS.md now points to CURRENT_FOCUS.md and the design bible, and sets player-facing writing rules.

## Ship progression and research — Task 008

On `feat/ship-progression`, four paid prerequisite technologies use a real 4 kW research lab, with priority/caps/reserves, persistent work, one contributor per tick and storage-safe unworked-sample refunds. Eight binary modules change actual thrust/burn, fuel/cargo capacity, tools, cannon, cooling and damage. Dry mass equals paid material mass; all eight add 98 kg. Home-pad fabrication spends 20 kJ unreserved energy plus materials without refilling fuel/hull/ammo/cell. Removal gives 50% × hull salvage, returns excess tank fuel only if storage fits, and blocks excess cargo. Recovery keeps paid modules but retains existing hull/fuel/cargo losses. Dynamic stats reach physics, pickup/tender/refuel, prediction, warnings/HUD and validation; projectile damage is captured at firing. Version 12 migrates v1–11 with no new unlocks/modules. This implements Phase 8.1; shields, additional worlds, economy tuning and the full Phase 9 overhaul remain later. [Actual model/playtest](PROGRESSION.md). Stacked after open discovery #18 / Command #17.

## Nearby-space discovery — Task 007H

On `feat/neighborhood-discovery`, three four-parent arcs plus three physical sites create a bounded first neighborhood around the existing home planet. Sites use actual shared gravity/drag/collisions, not frozen markers. Rendezvous requires 120 m / 8 m/s / terrain visibility; surveys reveal remaining tagged material, salvage transfers finite raw ore, and a tender transfers finite fuel with mass/momentum conservation. Wrecks release remaining cache ore once and vent fuel; dry hardware grants no ore. Belt centroids include tagged fragments and pickups. Selection can change while paused; interactions cannot. Version 11 persists movement, supplies, damage, origins and return progress; legacy saves append new uniquely identified sectors once after reprojection. Runtime/v11 load never reseeds. The bounded population and checked-in benchmark justify keeping all bodies active instead of adding a far-field freeze. See [details, measured budgets and playtest](NEIGHBORHOOD.md). Command #17 remains open; this feature is stacked on it. Additional worlds, progression/shields and the full graphics/UX/UI overhaul remain later milestones.

## Central Command — Task 007G

On `feat/command-console`, routine facility operations address IDs directly from ship or surface. Continuous power caps scale real work/energy, solar output is capped, and habitat caps use only paid finite backup. Explicit essential/industry/burst classes preserve life-support and reserve behavior; stable priorities apply within each class. Turret/service burst costs remain explicit. A 16-order/48-total paid construction queue reserves future footprints; one stationary living crew within 96 m executes 8 s work per order. Cancel returns only unworked materials if storage fits. The existing direct manual build route remains compatible; queued work never teleports or grants drones. Service range is physical, so a serviced ship never heals distant crew. Version-10 saves retain orders/dispatch/time and migrate v1–9. Selection, drag and rate samples are transient. Single selection and disabled edits while paused are deliberate boundaries. See [actual model and playtest](COMMAND.md).

Landing warnings #14, towing #15 and habitats #16 were merged in order after green CI and explicit user authorization. Central Command follows those merged commits; neighborhood exploration is next.

## Habitat implementation — Task 007F

On `feat/oxygen-habitats`, 40 m / 160 m domes use 20 m / 45 m elliptical roofs over the curved surface. The large span replaces the provisional 80 m so both footings can clear home terminals. Real oxygen stock fills 1 kg / 4 kg buffers; real 2 kW / 4 kW life support and separately charged ten-second backups replace free grace timers. Crew air pauses suit depletion without refill/healing; leaks, depletion, wrecks and demolition consume/vent finite supplies. Overlap pays one crew source by ID. Essential life support may use reserved energy; backup charging may not. Version-9 saves retain buffers and migrate v1–8. This is life support; shields remain a later milestone. Details and rationale: [HABITATS.md](HABITATS.md). Central Command follows this slice.

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

The 6 kW, 0.5 kg / 2 s rate is deliberately slow background supply, preserving the flight/mining role. The existing global grid/material bus and placement-order allocation remain prototype limits; no separate transport simulation, new resource currency, terrain deformation, offline output or unlimited seam respawn is introduced. Existing refining/fuel recipes consume extracted ore without a parallel economy. The tenth blueprint uses the palette button/native keyboard focus to preserve 0 for automatic camera zoom. Version-5 saves preserve reserves/bindings/partial cycles; versions 1–4 receive fresh seams while retaining prior progress. Merged after green CI at the user’s explicit request in [PR #11](https://github.com/masadams/outpost-game/pull/11). See [Task 007A](archive/tasks/CODEX_TASK_007A.md) and [planetary mining notes](PLANETARY_MINING.md). Scheduling, priorities and vulnerable mobile logistics remain later Phase 7 work.

## Refinery scheduling — second Phase 7 slice

Continue earned automation through built refineries: opt-in automatic recipe selection replenishes configurable shared-stock targets. Manual remains the default for new and legacy facilities. Each refinery stores its own policy; no free ore, energy or extra starter supplies are granted. Between completed batches, use deterministic round-robin selection among needed recipes with inputs and room for all co-products. Retain paid progress through target edits, disabling and supply/power/storage blocks. Turning scheduling off preserves the selected recipe/progress; explicit V retains its established reset behavior and switches to manual.

Targets are desired shared stock, not hard output caps or reservations. Already-active batches finish even if a target has since been filled, so parallel refineries may exceed a target. Ice co-products can exceed one goal while fulfilling the other; physical capacity always blocks the entire batch. This avoids hidden output loss or discarded paid work. Target buttons use native keyboard activation without changing game controls. Version-6 checkpoints retain policy/cursor/progress; v1–5 remain supported and older refineries stay manual. See [PR #12](https://github.com/masadams/outpost-game/pull/12), [Task 007B](archive/tasks/CODEX_TASK_007B.md) and [automation model](AUTOMATION.md). Power/storage/ammunition priorities and vulnerable mobile logistics remain later work.

## Colony resource priorities — third Phase 7 slice

Continue the planned priority controls as explicit reservation policies on the current global bus. Zero defaults preserve old behavior. Industrial power excludes a configured charge floor; turrets and supplied service can consume it. Rigs exclude reserved delivery room from output capacity; ship unloading still uses physical free space. Reserve alloy/components for turrets across every non-turret manufactured-material consumer: construction, building/ship repair, rearm and recovery. Actual turret shots spend normal finite stock. Goals never grant inventory, request production or shield capacity from damage.

Policies can be changed remotely in Colony, including after a crash, so a material hold cannot trap paid recovery. Native controls and an expandable disclosure show configured goals and actual usable budgets; expansion remains runtime UI state. Distinguish reserved power/space from physical shortages and let users release holds. Oversized goals may halt industry until adjusted or capacity is added. Version-7 saves preserve policy without resetting older schedules, depletion or combat; versions 1–6 default to zero policy. The impact path previously erased paid cycles despite the documented scheduling behavior; retain progress through actual wrecking/repair and test that path. See [PR #13](https://github.com/masadams/outpost-game/pull/13), [Task 007C](archive/tasks/CODEX_TASK_007C.md) and [reserve model](COLONY_PRIORITIES.md). Scheduling PR #12 merged during this iteration, so the reserve branch is now based directly on main. This does not complete Phase 7.

## Landing instruments and warning audio — user feedback

The user requested warnings on landing telemetry, including green/yellow/red, a warning pulse and low-fuel lights/sound. Add a pure current-state safety model shared by HUD and audio. Use actual touchdown limits and local up; total speed reflects the worse radial/drift category rather than inventing another physical landing rule. Expose spin and keep off-pad/low-clearance feedback visible so green individual instruments cannot imply a guaranteed landing. Limit landing cues to low descending/hovering flight, with earlier activation for fast descent.

Use color plus labels/symbols, stable DOM updates and a gentle 1.4-second critical pulse. Pause and reduced-motion preferences suppress the pulse. Distinct landing/fuel tones are rate-limited, with urgent landing first, critical fuel next and existing threat/hull alarms ahead of a low-fuel caution. Preserve mute/volume, unlock and focus/pause silence; avoid repeating a landing tone rapidly when crossing the approach boundary. This modifies feedback only: physics, stock and save version stay unchanged. It is a separate review stacked on PR #13, before mobile logistics, and does not complete Phase 9. See [PR #14](https://github.com/masadams/outpost-game/pull/14), [Task 007D](archive/tasks/CODEX_TASK_007D.md) and [the warning model](FLIGHT_WARNINGS.md).

## Mobile logistics and explicit upgrade/dome schedule

The user asked to continue after landing feedback and asked whether ship upgrades and oxygen/protection domes were scheduled. Ship upgrades existed broadly in Phase 8; now explicitly schedule equipment categories, fabrication limits and physical tradeoffs there, with shield domes as a separate finite-energy defence system. Add Phase 7.5 oxygen habitats immediately after towing: defined curved-surface coverage/height, finite oxygen buffer, area/crew consumption and powered supply pause suit drain only while breathable. Habitat air and shields remain separate functions, with no free suit refill/healing or unlimited impact protection. Sizes/rates/costs remain provisional until each task is specified. See [UPGRADES_AND_DOMES.md](UPGRADES_AND_DOMES.md).

Task 007E starts the next Phase 7 slice with a 25 kg towing utility module fabricated from exactly 25 kg of manufactured stock, respecting reserves. Y captures nearby velocity-matched asteroids with a fixed-length slack/tension cable. Equal/opposite impulses couple the bodies; damping dissipates relative motion. Terrain, excess strain, impact and target destruction sever it. No body teleportation or free ore transfer: normal mining/tractor/unload remains required. Rig mass stays in the ship through supplied wreck recovery, while the attachment releases. Coast prediction suspends during attachment because the single-ship predictor omits cable forces. Version-8 saves preserve active equipment/cable state; v1–7 preserve prior progress and receive no free rig. See [PR #15](https://github.com/masadams/outpost-game/pull/15), [Task 007E](archive/tasks/CODEX_TASK_007E.md) and [TOWING.md](TOWING.md). PR #13 is merged; PR #14 was retargeted to main and remains open. This new branch stacks on landing feedback for review, without automatic merging.

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

## Task 009 — Paid selective shields

Merged reviewed green-CI Command #17, discovery #18 and progression #19 into main under the user’s explicit merge instruction. Continue with separate Combat-engineering shield emitters: finite SP capacity and actual kJ upkeep/recharge, essential air first, stable maintenance/charging priorities, preserved breach timers and empty rebuild/repair. Shield SP are gameplay damage capacity; kinetic energy and dispersed mass are tracked separately. Swept incoming meteors/hostile rounds pay sequential boundary costs; overflow slows with a persisted residual budget and rechecked moving-target collisions. Ordinary traffic, tow cargo and friendly weapons pass; no oxygen or free ore. Version 13 persists protection state; older formats are rejected during development under the user’s explicit direction to defer legacy-save support. See [rules, accounting, limitations and route](SHIELDS.md). Nearby worlds and the full Phase 9 presentation overhaul remain next.

Preserve manually chosen operation panels when threats arrive/clear in the same player mode. These transitions previously hid Command and left its counters stale; construction, turret control, recovery and boarding still choose their contextual defaults.

## Task 010 — Moving worlds and supplied local colonies

Phase 8.5 adds one airless moon. Exact circular binary ephemerides and shared finite-core gravity replace the fixed source; moving terrain sweeps, surface-relative motion/telemetry, air-relative drag, prediction, camera and rendering share body definitions. All actors retain continuous coordinates. A typed local inventory view routes existing colony operations to home or moon while actor/scalar writes stay on the root world. Both colonies tick; materials/power are local. Research/work are intentionally shared, with a single paid contributor per step and funding origin retained for refunds. Manufactured freight shares ore capacity/mass, and raw depot loading enables a real mining return. Moon starts empty, with finite natural seams and no free suit service. Paid home recovery loses cargo. Current version 14 saves restore exact motion and shared identity; no legacy migration. See [rules, budgets, limitations and acceptance route](NEARBY_WORLDS.md).

Final moving-frame review also corrected automatic turret lead to subtract launcher motion and made missile cruise guidance retain its launch inertial frame. Snapshot and boost-invariance regressions cover the live missile paths and current saves; the bounded steering force and ammunition/energy costs remain intact.

## Alpha 0.16 — presentation, explicit frames and supplied shortcuts

Keep the continuous binary simulation and manual flight intact. A named surface frame distinguishes landing data from destination-relative navigation. Improve real controls with grouped blueprints, native physical-facility selection, an atomic missing-quantity freight manifest and scalable settings/rebinding. Manifests spend local unreserved stock and shared mass/capacity; they never grant kits. Short objective progress observes actual simulation results, with a crash-disarmed moon-return condition, and persists in current version-15 saves. No legacy migration layer.

Keep presentation preferences separate from checkpoints. Native focus gates gameplay; closing modal help/settings returns to gameplay safely. Original three-voice adaptive music has an independent bus beneath master mute/volume, with alarm ducking. Bound/cull visual effects, cache stars/body textures and stable paused scenes, and measure CPU submission separately from physics and GPU/hardware performance. Technical regressions and screenshots do not replace human handling/usability/art/audio evaluation.

## Alpha 0.17 — direct controls without removing physical travel

Respond to reported menu/walking friction with Ship/Build/Manage/Map entry points, categorized construction, real pointer projection, paid queue placement and optional orders for the existing astronaut. Preserve travel time, acceleration, oxygen, gravity, local costs and eight-second queued work. Manual movement/boarding/turret use cancels automation; explicit stop and low air pause dispatched work. No autonomous ship flight, free workers, teleporting construction or decorative cable-link controls. The existing grid remains body-local/shared. Current saves advance to version 16 for crew orders; development resets remain preferable to migration work. Paused UI planning changes only view metadata, with physical actions stopped.

## Alpha 0.18 — observable milestones and honest material planning

Continue Phase 8 after merged #23 with eight persistent observed-result milestones and a single tracked goal in the existing Objectives dock. Count only habitat air actually paid for the deployed healthy crew, capped at 20 seconds; do not count passive roof coverage, ship time or shields. Research/interception goals observe existing outcomes, and threats remain opt-in. Derive the Selene starter-route bill from actual costs and remaining work, credit paid queues without calling them completed, keep remote/freight stock separate, respect reserves and round refining inputs to whole cycles. Show energy costs separately; no rewards, purchases or flight automation are introduced. Current saves advance to version 17; no legacy migrations. Human pace/60–40 measurements and wider economy/recovery/event tuning remain open. See [scope and limits](PROGRESSION_GOALS.md).

## Alpha 0.19 — complete parts catalogue before readiness/playtest

Follow the user priority after #24: expand research/ship parts first, then readiness and a standard start menu, merge and playtest. Ten paid powered technologies unlock sixteen parts in eight exclusive slots. Advanced alternatives implement actual physics/tool/thermal/damage effects; replacement requires the full new cost before old hull-scaled salvage and blocks unsafe cargo/tank downgrades atomically. No capacity refill or duplicate-slot stacking. Standard title/pause menus freeze simulation/input/audio; New Game preserves the checkpoint until an explicit save, and Continue loads paused. Save format 18 validates the expanded tree and exclusive slots, with no legacy migration. Home recovery and current-world fuel estimates remain read-only, separate local stock and shared ice co-products, and offer no safe-range guarantee or automatic reservation. See [catalogue and playtest](PLAYTEST_ALPHA019.md).

## Alpha 0.20 — Large management workspace

User feedback prioritized reducing menu density. Manage now uses a large window with separate icon-labelled pages, a prerequisite-connected research map and one selected-item inspector. Ship fitting compares current and selected stats. Details and salvage rules are progressively disclosed; hover briefs supplement persistent click/keyboard information. Native research/fabrication actions remain explicit and have a fixed inspector footer. Compact Build preserves the world for placement; expansion preserves the existing controls and does not implicitly pause or spend. No new backend, external art or legacy migration is introduced. See MANAGEMENT_WORKSPACE.md and Task 016.

## Alpha 0.20 — Compact cockpit instruments

The user requested a smaller, calmer bottom HUD. A single gauge bank prioritizes flight/landing or crew essentials; secondary measurements and the FlightTools-owned environment/coast status move into an explicit diagnostics popout. Active cautions remain visible when diagnostics are closed, and existing audio/physics thresholds are unchanged. Routine narration and inactive weapon text are quiet. See INSTRUMENT_CONSOLE.md for sizes, units and controls.

## Alpha 0.21 — earned automation and in-place facility tiers

User requested progressively expensive auto-land, return-home and full autopilot plus building upgrades/labels/direct controls. Add one exclusive avionics slot and three paid computers with prerequisite research. Guidance creates ordinary fixed-step controls; it never teleports or bypasses fuel, shared gravity, drag or collision. Landing assist requires a prepared local pad approach. Longer routes use high-clearance waypoints; nearby projected hazards disengage for manual control rather than promising obstacle avoidance. Selected destinations are captured when engaged; orbital rendezvous performs no mining/transfers. Manual input and supply/equipment loss disengage; loading always disarms an active program. Current checkpoints advance to 19, with no legacy migration.

Facility tiers II/III require research, full repair, local unreserved materials and 20/40 kJ. Preserve building identity, type, footprint, existing health, buffers, schedules, progress and power limits. Capacity starts empty. Faster production/extraction/research increases power proportionally; fixed yield/input and energy per work remain unchanged. Solar/storage/battery gain capacity, other structures gain damage protection without fictitious range or oxygen bonuses. Salvage includes only paid tier materials and existing hull scaling. Optional labels are presentation preferences and click through to the actual colony/id; focused facility controls reuse existing paid actions, with the full management workspace one explicit action away. No merge is authorized for these review PRs.

## Adopted major systems and inhabited outposts — 2026-11-04
**Agreed direction:** Environmental conditions (atmosphere, pressure, temperature, radiation, sunlight and waste heat), progressive excavation/craters and simplified support, moderate material processing/manufacturing, diverse situational power, physical logistics, differentiated sensors, communications, earned automation and consequential long-distance time/travel. Planetary workers physically travel, construct, operate where useful and maintain/repair. Habitats support finite population through paid air/pressure, shelter, power and practical working range; productivity emerges from actual travel/work/service rather than passive bonuses.

Extend existing astronaut dispatch, paid construction queues and oxygen domes; these do not yet constitute an autonomous population or complete residential/shelter system. Current exact behavior remains in [direct controls](DIRECT_CONTROLS.md), [Command](COMMAND.md) and [habitats](HABITATS.md). Surface suit activity is implemented; free-flight EVA is future work.

**Still open:** Worker arrival/recruitment, roles/control/mortality, staffing, habitat capacity and safety values, environmental resolution, pressure volumes, terrain/support representation, recipe depth, distribution networks, communications latency/autonomy and interstellar drive/time model. Adopted direction does not approve all possible detailed implementations. See [Bible section 20 and D-13–D-18](MASTER_DESIGN_BIBLE.md#20-adopted-systems-direction--2026-11-04) and [roadmap S0–S6](MASTER_ROADMAP.md#integrated-systems-vertical-slices-s0s6) for dependencies, invariants and acceptance.

**Overriding gate:** Physical consequence, meaningful discovery, interesting decision, growing scale. Prefer depth through interacting systems to breadth; avoid a 2D facsimile of No Man's Sky or Factorio and excessive population micromanagement. Preserve manual flight and building. This records design direction only; no game implementation or merge authorization.

## Mining feel (slice 5.2) — 2026-11-05
Rock, laser and debris art is render-only and deterministic: a rock's look comes from its id, sparks from a time tick, so nothing here touches the simulation or saves. Debris counts are capped by the quality setting and drop to zero with reduced motion. The camera frames the ship plus the rock under the beam, but never zooms in past the normal level. Audio distinguishes a big rock splitting (`split`) from a small one shattering (`fracture`); pickups climb in pitch within a short run. The pickup feed is display only and reads cargo changes.

## Landing feel (slice 5.3) — 2026-11-05
Landing rules are unchanged. Feedback is render-only: pad beacon colour follows the existing approach check (`flightSafety`), and dust is cosmetic, capped by quality and off with reduced motion. Existing sounds for touchdown and impact are kept.

## First-run guidance (slice 5.4) — 2026-11-05
Guidance is one pure function from world state to the next instruction (`coach`), shown in the objective card and as a world-space arrow. It reads state only, so there is nothing to save, and it stops after the first delivery. No tutorial mode, popups or locked controls.

## Playtest fixes after slice 5.4 — 2026-11-05
- The R restart key is removed: it was too easy to hit and wipes progress. New Game lives in the menu only.
- Queued buildings now show in a card whenever the build bar is closed, with a cancel button per site, Cancel all, and a Start building button once the astronaut is on foot. From the lander it says to step out (F). Stepping out waits until the astronaut is standing before sending them to work, instead of giving up if they are still in the air.
- The engine sound is a low rumble (filtered noise under a soft sine) instead of a buzzing sawtooth.

## Building life, menus, sun and day — 2026-11-05
- **Buildings show life.** Finishing a building flashes rings and glints; each working building has its own movement (smoke, rotors, a sliding glint, a shuddering bit, an orbiting spark). The Observatory sends three slow rings when it first starts listening and pings the sky while it runs. All render-only, off on reduced motion.
- **Menus.** Right-click a building for its menu; Demolish always asks, shows the refund and works from anywhere. The X key no longer demolishes. Key hints sit beside labels. Rules are in `docs/UI_CONVENTIONS.md`.
- **Sun and day.** The sun moves round the sky once every 1000 s instead of the planet spinning, so flight and landing physics stay as they are; real rotation is a later decision. Solar output follows the sun at each building; batteries bridge the night. A new game starts in the morning with the first dusk about 6½ minutes in. The cycle is on by default and off with `?sun=off` or localStorage `outpost.sun=off`; the browser suite runs with it off. See `docs/tasks/sun-and-day.md`.
- **Storm on the Map.** Rocks the Observatory has seen appear on the chart with their uncertainty, far ones pinned to the edge, plus the predicted landing zone.

## Real planet rotation — 2026-11-06
Planets turn when the day cycle is on: Selene once per 1000 s, Nacre once per orbit (tidally locked). The world frame is inertial and the star Helia is fixed, so it can one day be approached. Surface things keep surface angles and move with the ground (about 11 m/s at the equator); air turns with the planet; landing, drift and coast paths are measured against the ground. With the day cycle off nothing turns, so the regression suites and old behaviour are unchanged. The first storm now arrives at 1150 s, in daylight on the second day; storms armed later can arrive at night, when batteries matter. See `docs/tasks/sun-and-day.md`.

## Printed pilots and wrecks — 2026-11-06
Pilots are printed bodies. Losing the lander prints a new pilot and a basic lander for the old recovery price (8 alloy, 2 components); the old lander becomes a physical wreck with what survived (25–90% by crash speed, 60% if destroyed in flight), a one-hour transponder, and can be salvaged with E. Wrecks beyond 60 km are lost. This replaces "tow it home with 30 hull, cargo lost". See `docs/tasks/clones-and-wrecks.md`.

## Land anywhere — 2026-11-06
The lander can touch down anywhere. The pad stays the easy place (descent 6 m/s, drift 4 m/s, tilt 15°); open ground needs a gentler touchdown (3.5 m/s, 2 m/s, 10°) and the instruments and touchdown limits switch to those numbers off the pad, with "ROUGH GROUND" in the approach message. Ore still only unloads, and service and refuelling still only happen, on the pad. Pad upgrades (catch arms) and AI helpers are queued in the roadmap.

- **Earned build menu.** The new-player build menu lists only what has been earned (solar and refinery first; storage, battery, fuel processor and mining rig after industry; Observatory after the survey buoy; laser after the Observatory), to steer early play. Nacre opens on the Map once the Observatory has surveyed it.

- **Soundscapes by area.** Music root, chord and loudness, background ambience and the engine voice change with where you are: home ground, home sky, open space, Nacre ground and Nacre sky. Engines roar in air and thrum quietly in vacuum. All procedural; no sound files. (`src/audio/soundscape.ts`)
- **Research comes from finds.** In day-cycle games research projects open only when a find is studied; each find also names the part it lets you fabricate.

- **Upgrade in place is the default way to grow.** Tier 1→2 is available to new players once Infrastructure retrofits is researched; each building defines what a tier does, including buildings added later.

- **Bodies, belts, air and discovery are data.** Adding a world is a catalogue row; a body's air, orbit, spin and survey time are fields. Discovery is by Observatory watching, hinted once, with probes able to reveal things earlier by scanning.
- **Power has distance.** In day-cycle games a building must be wired to the pad; relays extend reach (600 m), carry 10 kW and keep 96% per hop; upgrades scale both.
- **Sequence over menus.** Buildings, research and systems reach a new player in a fixed, explained order (see CURRENT_FOCUS). Each building defines what an upgrade tier changes.
- **World seed.** Seed 0 is the standard layout (tests and developer runs); a new day-cycle game gets its own seed, saved with the game. Variation never makes the first three home seams smaller than standard.

- **Optional worlds and earned automation.** A catalogue body can be optional: Ember (thin air, farther than Cinder) is in about 60% of non-standard seeds and never in seed 0. The mining drone bay is earned by Precision extraction (from the Cinder core), mines a seam within 300 m without sitting on it, is slower than a rig, and costs fuel and wear, so automation is a trade, not a free upgrade.

- **A lost pilot comes first.** Printing a new pilot and lander may spend stores held back for the turrets. Salvage refits the wreck's parts before loading cargo (so a bigger hold counts), fits a part wherever the new lander has a free slot, and breaks down a part whose slot is taken for materials. Messages say which of the two limits (hold full, parts left, tank full) actually applies.

- **Strays and a seeded sky.** From the second storm on, any non-standard seed can add bodies that pass by and miss, and from the third a rare big body (radius 24 to 34) that comes down well away from the base; the standard seed and the first storm never change. A body that missed and is heading back out is removed so the storm can end. The sky behind the game (galaxy band, glowing clouds, band stars, far galaxies) comes from the world seed and is drawn once into a texture, never every frame.

- **B and the Build button are the same thing.** Pressing B used to open an extra legacy "Build" panel as well as build mode. The legacy colony panel is gone: nearby machine controls live in the Nearby card (always shown now), stock targets for refineries in the Base buildings card, the ore seam readout in the on-foot Ship panel. What is still legacy and has no replacement yet: the Base "Legacy console" (research tree, ship fitting, economy reserves), shown only with all features on. The research tree redesign replaces it.

- **Research is a tree.** Base has a Research tree section (once a first find is studied, or with all features on): every technology on a left-to-right map with its prerequisites, what it opens, its cost, and why it is locked in plain words, plus a Ship parts tab with each slot's parts, what they trade off and what role the ship would become. The seven find-linked technologies still open only from their find; the other twelve now open once their prerequisites are done, so the tree can be followed to the end. The old console research and fitting pages remain only behind the all-features Legacy console.

- **Three new buildings, each with a reason.** Air condenser (water and oxygen from the air, slower in thin air, none where there is no air; earned after the first industry), Comms antenna (each running antenna adds 50% to Observatory watching, up to two; earned with an Observatory), Workshop (ship parts can be fitted on another world while a powered Workshop stands there; earned once there is a base on another world). Each defines what a tier upgrade does.

- **Building upgrades are a tree.** Base → Research tree → Buildings lists every building with its two tiers and what each needs. Tier II needs Infrastructure retrofits; Tier III needs Advanced facility systems plus the technology of the building's family (power: Cell engineering; industry: Industrial extraction; storage and habitats: Lightweight structures; turrets: Advanced ballistics; shields: Layered composites; research and observation: Autonomous navigation; service: Thermal engineering). Base offers the next tier on each building, II then III. Gating by story comes later, once the content has been played.

- **More to try before we gate it.** Nine more technologies (28 in all) and three more buildings, all open by prerequisites alone so everything can be tried: Geoscience (Geothermal tap, steady 5 kW day and night), Aeronautics (Wind turbine, up to 6 kW following how thick the air is), Mass drivers (Mass driver: pods leave on 40% of the fuel and carry 80 kg), and six perks: Photovoltaics (+20% solar), Deep storage (+25% storage), Lab automation (labs 50% faster), Field repair (repairs cost half the alloy), Pod logistics (half as many lost pods), Survey optics (+25% Observatory watching). Story gating comes after play shows what matters.

- **Nine more ship parts, one per slot.** Afterburner engine (22 kN, thirsty), Drop tank (+200 kg fuel), Cargo bay (+140 kg hold), Pulse mining head, Wide-field tractor, Rail coil (40 damage), Radiator fins, Ablative plating (50% less hull damage), Mission computer (the Navigation computer's flights for 2 kW). Each opens with a technology in the tree and each pays for what it gives.

- **Cargo pods are things you can see.** A pod leaves straight up from the sending depot (flash, streak, trail), crosses to where the far world will be when it arrives (it takes as long as that lane needs at 140 m/s), and comes straight down onto the far depot. The Map shows its lane, a countdown and the landing ring; when it lands a beacon marks the site on the Map and on the ground (mint if the ore went in, red if the pod was lost), for 15 and 30 minutes. Mass drivers and Pod logistics still apply.
- **Generators read as generators.** Geothermal taps and wind turbines say Generating and their output; a wind turbine on an airless world says No air.

- **Deep signal, expedition first.** A one-way beacon (earned with the Deep signal technology, needs a running Observatory and Comms antenna) is sent from Base and, after a seeded wait of 60 to 180 minutes, hears back from a far star system (name, star, worlds, hazard, bearing, distance), shown on Base and as an arrow at the Map's edge. The voyage to it will be an expedition that returns with discoveries; relocation is not planned. See docs/tasks/deep-signal.md.

- **Trouble on the expedition is a decision.** Each of three legs may bring trouble (chance set by the far system's hazard, lowered by what is packed). The craft stops and waits in Base: push on (about a coin flip), hold and wait (five more minutes, usually works), or a certain answer if the matching pack is aboard (shields, long-range fuel, supply stores; each used once). If nobody answers in five minutes it waits the trouble out. Pods, the beacon echo and the expedition's return each have a sound.
- **Unused code swept.** All unused imports and locals in `src/` were removed.

- **A long soak test caught three ways a game could become unsaveable.** Slow machines (condenser, drone bay) kept a cycle timer past the save limit of 3 s; a big storm body's toughness was above the save limit; and uncollected storm pieces piled past 16. Limits are now wide enough for the sim, pieces on the ground are capped at the newest 32, and `tests/soak.test.ts` plays a hundred minutes of a busy base with pods, a beacon and an expedition, checking for bad numbers and that it saves.

- **The far system has worlds you can land on.** Each world is seeded (kind, air, danger, what its ground holds). A fly-by surveys the next world; a surveyed world that is not a gas giant can be landed on, at the price of a fourth leg and ten more minutes, for a bigger haul of its own kind of ore.

- **Supply lines are ore-only and reserve-driven.** One switch and a reserve per world and kind of ore; the line moves ore to whichever world is furthest short from whichever has the most spare, one pod a minute at most, counting pods already flying. It never takes a world below its own reserve, pays real fuel, and says in a line what it did or why not.

- **Ship handling follows mass.** Turn rate scales with the ship's mass (a gentle 0.92 to 1.08 around the standard fuelled ship): a light ship turns a little faster, a laden one a little slower. The ship profile shows `agility` and `loadedAgility`.

- **Deeper research waits for a story beat.** Seven technologies need an event as well as their prerequisites (a storm survived, a mining rig running, a base on another world, an Observatory, a Research lab, an Antenna). The research tree says so in plain words ("Not yet: live through a storm first"). The standard test layout is not gated.

- **The story reveals itself.** Milestones do not list what is ahead: the objective card shows a milestone only after something has happened to bring it up (its cue), and its text describes the situation rather than giving orders. When nothing has come up the card is just "Journal · n". New blueprints are announced when they unlock ("New blueprint · Observatory") instead of being pointed at beforehand. The all-features switch still shows every milestone, for testing.

- **Plain game words.** "Unreserved", "fabrication materials", "retrofits" and "in place" are gone from the live screens: "Needs more materials", "Not enough materials", "Infrastructure upgrades", "Upgrade any building from Base". Older Manage and Help text still has some of the old wording and is slated for the same pass.

- **Events between storms.** A seeded timeline (`src/sim/events.ts`, saved under `exploration.events`) brings seven kinds of event once the story has reached them: solar flares (after an Observatory: 60 s warning, panels at 1.5x, and a base with no battery loses a machine to a surge), dust fronts (air worlds: panels at half, rigs at 70%), richer seam pockets (after a rig), comets (after the buoy: five ice rocks in orbit), machine faults (after four buildings: a running machine takes 35 damage, U repairs it), claim-jumpers (after a second world: drains an unclaimed seam; a rig on it drives them off) and debris fields (after a pod or supply line: pod loss risk x3 and supply lines hold). The first can come at 1800 s, then 300 to 700 s after the last one ends; never two at once, never the same kind twice running. They run only in seeded day-cycle games, so the standard layout and the scripted tests stay predictable. A corner chip shows the nearest warning and the Journal lists what happened. Not yet built from the design: expedition chains, habitat life events, the rare big body.

- **Rocks keep drifting in.** In seeded day-cycle games a new rock enters home orbit every 300 s while fewer than six loose rocks are left (iron 40%, copper and ice 20% each, silicon 15%, rare metals 5%). The ship keeps earning after the 31 starting rocks are gone, at a little under a mining rig's rate, and only if you fly for it.
- **Wrecks on the expedition.** On a clear leg (not the last) there is a 30% chance of a wreck: salvage it (3 more minutes; 75% of the time 50 to 110 kg of iron and copper comes home, otherwise a setback) or leave it. Unanswered, the craft leaves it.
- **Air leaks.** A dome with air in it can spring a leak (an event): it loses half its air and takes 20 damage until patched with U.
- **The Journal opens** in the Objectives panel once anything has been recorded.

- **The giant.** From the fourth storm, 30% of seeded storms carry one body of 40 m or more aimed close to the base, announced when the storm starts ("lasers will not stop it, missiles can"). Missiles do 3x damage to any rock of 20 m or more; a giant takes about eight missile hits and well over eighty laser shots. The save limit on a falling rock's toughness rose from 12 to 40, which also fixes saves while the existing large rocks fell.
- **Research leans on wire and components the deeper it goes.** Each step down the tree moves 8% (up to 40%) of a technology's alloy cost into wire (60%) and components (40%); totals are unchanged. The whole tree is now 363 alloy, 338 wire and 205 components (was 481, 267, 158).
- **Northern lights.** On a world with air, at night, green and violet curtains sway across the sky behind the world; faint most nights, bright during a solar flare.
- **A bigger, livelier system.** Three more optional worlds, each in about half of seeded games: Verdant (living: thick air, seas, forests; solar at 75%), Tide (ocean world: 70% sea, islands; solar at 80%) and Murk (very thick hazy air, hard to fly; solar at 40%). Seas and trees are placed by the seed; you cannot build on water, landing on it is a splashdown, and ore seams always sit on dry land. Each has its own ore and its own Observatory hint, and the Map names the kind of world.

- **Missiles and lasers have jobs.** A missile vaporises a small or medium rock (under 20 m) outright. A big rock (20 m or more) is never vaporised: whatever breaks it, it splits into three pieces (four for a giant of 40 m or more), with mass shared and toughness 0.12 per metre of radius. A giant takes one missile to break into four ~25 m chunks, one more missile each breaks those into ~16 m pieces, and lasers (about 7 shots) or missiles finish those. Lasers on small rocks still split them in two as before. Each rock remembers the last weapon that hit it.

- **Upgraded turrets reach farther, rocks are tougher.** Tier II and III add 15% and 30% range (laser 900/1035/1170 m, missile 1800/2070/2340 m) on top of firing faster. The giant is tougher (0.8 per metre of radius, 35% chance from storm 4), big-rock pieces are tougher (0.16 per metre), and later storms grow 10% per storm (was 8%). Simulated against a lone giant: 2 missile + 2 laser turrets at tier I or II lose 3 to 5 buildings; 3 + 3 at tier I hold on one approach and not another; 2 + 2 at tier III or 3 + 3 at tier III hold.
- **One landing zone instead of a path per rock.** The screen no longer steps a full prediction for each rock (about 900 steps each). A cheap guess (one-second steps, nearest world's gravity only) runs for every rock twice a second, and one shaded band on the ground spans where they are headed. The HUD countdown uses the same guess.

- **Old drills are gone from play.** The defence drill (N) and hostile patrols (O) no longer have keys, buttons or bindings; storms are the only rocks and there are no hostile drones. Their simulation code is still in the repository, unreachable, for a later full removal. Objectives links to research and ship parts open the Base window instead of the old Manage console in a normal game.
- **Landing anywhere saves.** Two save checks still allowed a landed ship only on Selene or Nacre, so landing on Cinder, Ember or any newer world made the game unsaveable; wrecks and research funding had the same limit. All now accept every world, with a test that lands on each world and saves.

- **Performance pass.** Profiled in the browser (CPU profile per scene). Fixes: (1) northern lights are painted once into a tiling texture that scrolls and fades (was about 480 shapes redrawn every frame) and fade out with altitude, gone by the top of the air; (2) planet positions remember the last two answers per body, and orbit shapes, optional-world checks, seas, trees and storm configurations are worked out once per seed instead of rebuilding random streams on every call; (3) storm planning aims with 0.1 s predictions instead of 1/60 s and plans one body every quarter second, cutting the freeze per planned rock from about 650 ms to about 45 ms, with landing spots within a fraction of a metre of before; (4) trees and seas off the screen are not drawn. Frame drawing time fell 55 to 70% in every profiled scene (busy base 4.5 to 2.0 ms, flying 2.8 to 0.8 ms).
