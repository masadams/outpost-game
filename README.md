# Outpost

A single-player, retro-inspired 2D spaceflight, asteroid mining, combat and colony-building game. Target balance: **60% action / 40% construction**.

**Status:** Flight, mining/cargo and astronaut/surface interactions are implemented on stacked feature branches, pending review. Review [flight PR #2](https://github.com/masadams/outpost-game/pull/2), then [mining PR #3](https://github.com/masadams/outpost-game/pull/3), then Task 003 surface work. No combat or colony construction yet. Nothing is merged automatically.

## Play locally

Requires Node.js 22.12+ (or 24+) and npm. No backend, API keys, external art or services are required.

```sh
npm install
npm run dev
```

Open the local Vite URL in a modern desktop browser. Click the game if keyboard focus is elsewhere. The canvas resizes with the window.

| Key | Action |
|---|---|
| W / Up | Main engine in ship; jump on foot |
| A / Left, D / Right | Rotate in ship; walk left / right on foot |
| Space | Fire mining laser in ship; jump on foot |
| C | Tractor nearby ore (hold) |
| E | Unload while piloting a landed ship; interact with nearby surface terminal on foot |
| F | Leave landed ship / board within 20 m |
| P | Pause / resume |
| R | Restore ship, astronaut, field, ore, depot, camera and clock |

The game also pauses when its window loses focus or the tab is hidden. Press P to resume; keys are released on pause to avoid queued actions. Flight controls rotate the ship in world space even as the camera reorients.

For a first return flight, launch vertically for about **6.5 seconds**, then coast. Keep the nose upright. Watch radial velocity: positive means climbing, negative means descending. Use short thrust pulses on descent, starting early to keep descent under 30 m/s, then reduce it below 6 m/s near the pad. Thrust is an acceleration, so releasing W preserves momentum. Sustained burns can escape the moon; turn around and burn to return, or press R to practice again.

For orbital flight, gradually pitch toward the horizon after launch and build tangential speed. Circular speed is about 42 m/s at 400 m altitude. The small radar shows the moon, green home pad and amber ship, including when home is off screen. Land on the green pad with radial speed ≤ 6 m/s, tangential speed ≤ 4 m/s, tilt ≤ 15° and angular speed ≤ 0.35 rad/s. A safe touchdown locks the ship to the pad until thrust resumes. Moderate impacts damage hull and rebound; hard or overturned impacts crash. Landing does not refill fuel or repair hull.

## First mining sortie

A starter iron sample is directly above the home pad. Hold **W + Space + C** to launch, mine and attract ore. Release **W after about 6.5 seconds**, keeping Space/C held while coasting toward the deposit. The beam breaks a parent rock into two fragments; mine those again for ore. The powered tractor pulls ore within 260 m and collects it within 18 m. Use the same vertical descent practice described above, then press **E** on the pad to transfer the hold into the depot. The simulation regression performs this entire sortie with ordinary control inputs. Avoid holding thrust until the hold fills: the ship can reach escape speed before collection finishes.

For other deposits, steer by the nearest-deposit bearing and colored radar blips. Keep the nose on the rock and stay within the laser's 450 m range. The first rock hit blocks rocks behind it, and the moon blocks the laser. Large rocks split into two, preserving material and momentum; each fragment releases four ore pickups when mined. Ore carries its resource color. The 120 kg hold accepts partial stacks and leaves the remaining ore in space. Cargo adds to ship mass, reducing thrust acceleration. All five resources have separate hold/depot totals; the depot is a delivery counter for this milestone. Repeat sorties with remaining fuel. Rock impacts damage hull. Pause freezes rocks and ore as well as the ship. Reset clears the **entire** sortie, including delivered ore.

![Mining cargo HUD](docs/screenshots/mining-cargo.png)

## Explore the surface

Press **F** on the home pad to leave the ship. Use **A/D** or the arrows to walk around the curved moon. Press **Space** (or W/Up) to jump; release before jumping again. Ground motion accelerates and brakes, while airborne motion retains momentum under radial gravity. The camera smoothly moves to the astronaut and zooms closer. Ship engines and tools are disabled while the pilot is outside; asteroids and ore keep moving.

The amber **cargo depot** is about 54 m right of the pad. Walk beside it, stand on the ground and press **E** to open the inventory and transfer the landed ship's hold into storage. Press E again to close, or walk away. The blue **service point** is about 54 m left of the pad. E there restores suit oxygen/health and repairs the landed ship using stored iron at **1 kg per 10 hull points**, up to available iron and missing hull. Suit servicing is free in this prototype; fuel production is not implemented.

The suit has **180 seconds of oxygen**. Return to the ship (F within 20 m) or use the service point before it runs out. At zero oxygen, health drains at 5 points/second. Falls above 14 m/s also cause damage; ordinary jumps are safe. A lost suit requires R to restart the entire sortie. Boarding refills oxygen; suit health stays damaged until serviced. You can walk through ship/station art; terrain is the suit's collision surface in this milestone.

![Surface depot](docs/screenshots/surface-depot.png)

## Verification

```sh
npm run build
npm run typecheck
npm run test
npx playwright install chromium
npm run test:browser
```

`npm run preview` serves the production build. `dist/` can be hosted on any static server. CI runs typecheck, unit tests, build and Chromium checks, and uploads screenshots and test artifacts.

The 52-test unit suite covers flight/mining invariants, return/landing and ore conservation, plus surface movement in all quadrants, jump/release/landing, swept hard falls, oxygen, frame-rate independence, boarding range/state/debouncing, unoccupied ship controls, depot access, repair costs, suit recovery and smooth camera transitions. Scenario tests cover a full mining return/delivery and walking to unload, boarding and relaunching. Three Chromium checks exercise keyboard flight/mining and a complete surface route: exit, walk to depot, open it, jump/land, walk to service, restore oxygen, return to board and launch. Screenshots capture [the pad](docs/screenshots/launch-pad.png), [flight](docs/screenshots/flight.png), [cargo](docs/screenshots/mining-cargo.png) and [surface depot](docs/screenshots/surface-depot.png). The full mining return/unload loop is verified in simulation; browser automation covers its outbound leg and surface controls. Other browsers and human feel remain for review.

## Architecture and tuning

- `src/sim/`: pure TypeScript state, Cartesian meters and seconds, 60 Hz accumulator; no Phaser/DOM imports. `world.ts` owns pilot mode, suit, ship, field, depot and button-edge state. `astronaut.ts` contains suit movement/safety (`SUIT` tuning); `surface.ts` owns boarding and stations; `cargo.ts` shares inventory transfer without simulation module cycles. Flight, bodies, mining and typed resources remain separate. Total ship mass is dry hull plus fuel plus cargo.
- `src/input/`: keyboard sampling per physics step, retaining short F/E/Space presses until consumed, and focus/pause-safe release.
- `src/render/`: Phaser scene, procedural world/ship/stars/radar and a smoothed follow frame. Local-up rotation blends into the inertial frame between 100 and 900 m altitude; zoom follows altitude continuously. A transformed world container renders the camera frame, keeping HUD/radar in screen coordinates.
- `src/ui/`: DOM telemetry and controls, outside world transforms.
- `tests/`: simulation/camera regressions and real Chromium smoke test.

Collision uses a circular 7 m hull swept against the 600 m moon, then classifies pad contact by arc tolerance, speed, tilt and spin. Semi-implicit Euler integration applies radial gravity and fuel-limited thrust with no linear drag. Phaser delta smoothing is disabled so the accumulator receives elapsed time even at low rendering rates. Catch-up is capped at 15 steps/250 ms; long stalls intentionally discard time. Angular damping stabilizes steering without changing linear inertia.

Known limitations: circular smooth collision rim (geology is decorative); approximate circular ship/suit collision; suit collides with terrain only, with no air steering, EVA or backpack; fixed stations have no solid collision or production. No audio, saves, autopilot, refuelling or physics-step interpolation. Static stars are decorative. The finite 15-deposit field does not respawn. Fragments interact with rocks/ship/surface; ore interacts with gravity/surface/tractor and passes through rocks. At most 30 fragments or 120 pickups derive from this field. Ship/rock contacts are swept; rock/rock contacts use discrete separation. Deposits remain on the moon if they fall; depot inventory is reset on R/reload. The cargo/surface panel targets desktop widths and is hidden below 560 px; mobile controls are out of scope. Phaser produces a roughly 1.23 MB minified JS bundle (about 343 KB gzip), with Vite's standard large-chunk warning.

Next recommendation: review flight, mining and surface loops, then implement Phase 4 surface construction and economy. Refinement, power and fuel production remain for that milestone.

## Start here
- [Master development roadmap](docs/DEVELOPMENT_ROADMAP.md) — authoritative phases, task checkboxes, dependencies, exit criteria and progress.
- [Design decisions](docs/DECISIONS.md) — confirmed choices versus unresolved questions.
- [Game design](docs/GAME_DESIGN.md) — gameplay vision, mechanics and core loop.
- [Codex Task 001](CODEX_TASK.md) — first playable planetary flight prototype specification.
- [Codex Task 002](CODEX_TASK_002.md) — mining/cargo iteration scope and acceptance criteria.
- [Codex Task 003](CODEX_TASK_003.md) — astronaut and surface interaction scope.
- [Agent instructions](AGENTS.md) — technical architecture, coding and testing conventions.

## Core experience
Launch from a small circular moon, fly in a continuous 2D world with radial gravity and inertia, mine asteroids, fight threats, land, walk around, build/refuel a colony and defend it from incoming meteors. No separate flight/surface minigames.

## Development workflow
Implement one roadmap phase at a time on a feature branch. Open a PR with tests and playtest notes; update the roadmap and decision log. Do not merge automatically.

Review Task 001, then Task 002, then Task 003 in dependency order. No automatic merges.
