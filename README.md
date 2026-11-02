# Outpost

A single-player, retro-inspired 2D spaceflight, asteroid mining, combat and colony-building game. Target balance: **60% action / 40% construction**.

**Status:** Task 001 planetary flight plus Task 002 mining/cargo implemented on feature branches, pending review. Task 002 is stacked on [flight PR #2](https://github.com/masadams/outpost-game/pull/2); review/merge that first. No combat, astronaut or colony construction yet.

## Play locally

Requires Node.js 22.12+ (or 24+) and npm. No backend, API keys, external art or services are required.

```sh
npm install
npm run dev
```

Open the local Vite URL in a modern desktop browser. Click the game if keyboard focus is elsewhere. The canvas resizes with the window.

| Key | Action |
|---|---|
| W / Up | Main engine (hold) |
| A / Left, D / Right | Rotate counterclockwise / clockwise |
| Space | Fire forward mining laser (hold) |
| C | Tractor nearby ore (hold) |
| E | Unload cargo while safely landed |
| P | Pause / resume |
| R | Restore ship, field, ore, depot, camera and clock |

The game also pauses when its window loses focus or the tab is hidden. Press P to resume. Controls rotate the ship in world space even as the camera reorients.

For a first return flight, launch vertically for about **6.5 seconds**, then coast. Keep the nose upright. Watch radial velocity: positive means climbing, negative means descending. Use short thrust pulses on descent, starting early to keep descent under 30 m/s, then reduce it below 6 m/s near the pad. Thrust is an acceleration, so releasing W preserves momentum. Sustained burns can escape the moon; turn around and burn to return, or press R to practice again.

For orbital flight, gradually pitch toward the horizon after launch and build tangential speed. Circular speed is about 42 m/s at 400 m altitude. The small radar shows the moon, green home pad and amber ship, including when home is off screen. Land on the green pad with radial speed ≤ 6 m/s, tangential speed ≤ 4 m/s, tilt ≤ 15° and angular speed ≤ 0.35 rad/s. A safe touchdown locks the ship to the pad until thrust resumes. Moderate impacts damage hull and rebound; hard or overturned impacts crash. Landing does not refill fuel or repair hull.

## First mining sortie

A starter iron sample is directly above the home pad. Hold **W + Space + C** to launch, mine and attract ore. Release **W after about 6.5 seconds**, keeping Space/C held while coasting toward the deposit. The beam breaks a parent rock into two fragments; mine those again for ore. The powered tractor pulls ore within 260 m and collects it within 18 m. Use the same vertical descent practice described above, then press **E** on the pad to transfer the hold into the depot. The simulation regression performs this entire sortie with ordinary control inputs. Avoid holding thrust until the hold fills: the ship can reach escape speed before collection finishes.

For other deposits, steer by the nearest-deposit bearing and colored radar blips. Keep the nose on the rock and stay within the laser's 450 m range. The first rock hit blocks rocks behind it, and the moon blocks the laser. Large rocks split into two, preserving material and momentum; each fragment releases four ore pickups when mined. Ore carries its resource color. The 120 kg hold accepts partial stacks and leaves the remaining ore in space. Cargo adds to ship mass, reducing thrust acceleration. All five resources have separate hold/depot totals; the depot is a delivery counter for this milestone. Repeat sorties with remaining fuel. Rock impacts damage hull. Pause freezes rocks and ore as well as the ship. Reset clears the **entire** sortie, including delivered ore.

![Mining cargo HUD](docs/screenshots/mining-cargo.png)

## Verification

```sh
npm run build
npm run typecheck
npm run test
npx playwright install chromium
npm run test:browser
```

`npm run preview` serves the production build. `dist/` can be hosted on any static server. CI runs typecheck, unit tests, build and Chromium checks, and uploads screenshots and test artifacts.

The 36-test unit suite covers flight physics, fuel, frame-rate independence, landing, full orbit, return flight and camera behavior, plus laser occlusion/range/target order, fracture mass/momentum conservation, tractor range/force, partial-stack capacity, cargo mass, all-resource unloading, moving-body collisions, deterministic field reset and mining timing. An end-to-end simulation test launches, mines, collects, lands and unloads while checking total ore across field, pickups, hold and depot. Two Chromium checks exercise actual keyboard flight/mining/collection, pause/resume, complete reset, responsive canvas and page errors, and capture [the pad](docs/screenshots/launch-pad.png), [flight](docs/screenshots/flight.png) and [cargo](docs/screenshots/mining-cargo.png). The full return/unload loop is verified in simulation; browser automation covers the outbound mining leg.

## Architecture and tuning

- `src/sim/`: pure TypeScript state, Cartesian vectors in meters, time in seconds, 60 Hz accumulator and physics. No Phaser or DOM imports. `WORLD` in `config.ts` contains flight/landing constants; `MINING` in `mining.ts` contains mining constants. Total ship mass is dry hull plus fuel plus cargo. `world.ts` owns field/ship/depot and update order; `bodies.ts` handles physical bodies; `resources.ts` defines typed inventories; `mining.ts` owns raycast, fracture and collection.
- `src/input/`: keyboard sampling and focus-safe key release.
- `src/render/`: Phaser scene, procedural world/ship/stars/radar and a smoothed follow frame. Local-up rotation blends into the inertial frame between 100 and 900 m altitude; zoom follows altitude continuously. A transformed world container renders the camera frame, keeping HUD/radar in screen coordinates.
- `src/ui/`: DOM telemetry and controls, outside world transforms.
- `tests/`: simulation/camera regressions and real Chromium smoke test.

Collision uses a circular 7 m hull swept against the 600 m moon, then classifies pad contact by arc tolerance, speed, tilt and spin. Semi-implicit Euler integration applies radial gravity and fuel-limited thrust with no linear drag. Phaser delta smoothing is disabled so the accumulator receives elapsed time even at low rendering rates. Catch-up is capped at 15 steps/250 ms; long stalls intentionally discard time. Angular damping stabilizes steering without changing linear inertia.

Known limitations: circular smooth collision rim (geological markings are decorative); approximate circular hull rather than leg-by-leg contact; no audio, saves, autopilot or refuelling; no interpolation between physics steps; flight tuning remains subject to human review. The static stars are decorative. The finite 15-deposit field does not respawn. Fragments interact with rocks/ship/surface; small ore interacts with gravity/surface/tractor and passes through rocks. At most 30 fragments or 120 pickups derive from this field, so all bodies stay simulated without a distant-body approximation. Fast ship/rock contacts are swept, while rock/rock contacts use discrete separation. Deposits that fall to the moon remain there, and depot inventory is not persisted across resets/reloads. The cargo panel targets desktop widths and is hidden below 560 px; mobile controls are out of scope. Phaser produces a roughly 1.2 MB minified JS bundle (about 340 KB gzip); Vite reports its standard large-chunk warning. Chromium is automated; other browsers have not been checked.

Next recommendation: review flight/mining feel, then add the roadmap's astronaut/surface interactions and explicit depot access. Colony construction, refinement and fuel processing remain later milestones.

## Start here
- [Master development roadmap](docs/DEVELOPMENT_ROADMAP.md) — authoritative phases, task checkboxes, dependencies, exit criteria and progress.
- [Design decisions](docs/DECISIONS.md) — confirmed choices versus unresolved questions.
- [Game design](docs/GAME_DESIGN.md) — gameplay vision, mechanics and core loop.
- [Codex Task 001](CODEX_TASK.md) — first playable planetary flight prototype specification.
- [Codex Task 002](CODEX_TASK_002.md) — mining/cargo iteration scope and acceptance criteria.
- [Agent instructions](AGENTS.md) — technical architecture, coding and testing conventions.

## Core experience
Launch from a small circular moon, fly in a continuous 2D world with radial gravity and inertia, mine asteroids, fight threats, land, walk around, build/refuel a colony and defend it from incoming meteors. No separate flight/surface minigames.

## Development workflow
Implement one roadmap phase at a time on a feature branch. Open a PR with tests and playtest notes; update the roadmap and decision log. Do not merge automatically.

Review Task 001 first, then its stacked Task 002 mining/cargo PR. Neither is merged automatically.
