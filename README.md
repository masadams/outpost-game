# Outpost

A single-player, retro-inspired 2D spaceflight, asteroid mining, combat and colony-building game. Target balance: **60% action / 40% construction**.

**Status:** Task 001 planetary flight prototype implemented on the feature branch, pending PR review. No mining, combat or colony systems yet.

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
| P | Pause / resume |
| R | Restore original ship, fuel, hull, camera and clock |

The game also pauses when its window loses focus or the tab is hidden. Press P to resume. Controls rotate the ship in world space even as the camera reorients.

For a first return flight, launch vertically for about **6.5 seconds**, then coast. Keep the nose upright. Watch radial velocity: positive means climbing, negative means descending. Use short thrust pulses on descent, starting early to keep descent under 30 m/s, then reduce it below 6 m/s near the pad. Thrust is an acceleration, so releasing W preserves momentum. Sustained burns can escape the moon; turn around and burn to return, or press R to practice again.

For orbital flight, gradually pitch toward the horizon after launch and build tangential speed. Circular speed is about 42 m/s at 400 m altitude. The small radar shows the moon, green home pad and amber ship, including when home is off screen. Land on the green pad with radial speed ≤ 6 m/s, tangential speed ≤ 4 m/s, tilt ≤ 15° and angular speed ≤ 0.35 rad/s. A safe touchdown locks the ship to the pad until thrust resumes. Moderate impacts damage hull and rebound; hard or overturned impacts crash. Landing does not refill fuel or repair hull.

## Verification

```sh
npm run build
npm run typecheck
npm run test
npx playwright install chromium
npm run test:browser
```

`npm run preview` serves the production build. `dist/` can be hosted on any static server. CI runs typecheck, unit tests, build and Chromium checks, and uploads screenshots and test artifacts.

The unit suite covers radial gravity in all quadrants, core finiteness, inverse-square falloff, fuel use, rotation, inertia, frame-rate independence, catch-up limits, swept collisions, safe and unsafe landings, stable contact/relaunch, a complete orbit, and a controlled launch/coast/descent/landing mission. Camera tests cover local horizon and inertial-space behavior. Browser tests exercise the actual keyboard, launch, coasting, pause/resume, deterministic restart and responsive canvas, and capture [the pad](docs/screenshots/launch-pad.png) and [flight](docs/screenshots/flight.png).

## Architecture and tuning

- `src/sim/`: pure TypeScript state, Cartesian vectors in meters, time in seconds, 60 Hz accumulator and physics. No Phaser or DOM imports. `WORLD` in `config.ts` contains all flight and landing constants. Total mass is dry hull plus remaining fuel.
- `src/input/`: keyboard sampling and focus-safe key release.
- `src/render/`: Phaser scene, procedural world/ship/stars/radar and a smoothed follow frame. Local-up rotation blends into the inertial frame between 100 and 900 m altitude; zoom follows altitude continuously. A transformed world container renders the camera frame, keeping HUD/radar in screen coordinates.
- `src/ui/`: DOM telemetry and controls, outside world transforms.
- `tests/`: simulation/camera regressions and real Chromium smoke test.

Collision uses a circular 7 m hull swept against the 600 m moon, then classifies pad contact by arc tolerance, speed, tilt and spin. Semi-implicit Euler integration applies radial gravity and fuel-limited thrust with no linear drag. Catch-up is capped at 15 steps/250 ms; long stalls intentionally discard time. Angular damping stabilizes steering without changing linear inertia.

Known limitations: circular smooth collision rim (geological markings are decorative); approximate circular hull rather than leg-by-leg contact; no audio, saves, autopilot or refuelling; no interpolation between physics steps; flight tuning remains subject to human review. The static stars are decorative. Phaser currently produces a roughly 1.2 MB minified JS bundle (about 337 KB gzip); Vite reports its standard large-chunk warning. Chromium is automated; other browsers have not been checked. Mobile controls are out of scope.

Task 002 recommendation: after flight/landing review, add destructible asteroids, mining, mineral pickups and cargo mass via simulation modules before connecting inventory to the future colony loop.

## Start here
- [Master development roadmap](docs/DEVELOPMENT_ROADMAP.md) — authoritative phases, task checkboxes, dependencies, exit criteria and progress.
- [Design decisions](docs/DECISIONS.md) — confirmed choices versus unresolved questions.
- [Game design](docs/GAME_DESIGN.md) — gameplay vision, mechanics and core loop.
- [Codex Task 001](CODEX_TASK.md) — first playable planetary flight prototype specification.
- [Agent instructions](AGENTS.md) — technical architecture, coding and testing conventions.

## Core experience
Launch from a small circular moon, fly in a continuous 2D world with radial gravity and inertia, mine asteroids, fight threats, land, walk around, build/refuel a colony and defend it from incoming meteors. No separate flight/surface minigames.

## Development workflow
Implement one roadmap phase at a time on a feature branch. Open a PR with tests and playtest notes; update the roadmap and decision log. Do not merge automatically.

Review the Task 001 PR and its screenshots before beginning Phase 2.
