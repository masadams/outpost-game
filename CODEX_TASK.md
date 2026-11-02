# Codex Task 001 — Continuous Planetary Flight

## Objective
Produce a genuinely playable single-player browser prototype where a ship launches from a small circular moon, flies into open space, can orbit or circumnavigate the body, and returns to land at a designated pad, without loading screens or scene changes.

## Deliverables
1. Vite + TypeScript + Phaser 3 application with responsive desktop canvas.
2. Circular planetoid, visible terrain rim, stars, landing pad and simple vector ship.
3. Fixed-step custom physics at 60 Hz: position, velocity, orientation, mass, radial gravity, main thrust, angular control, fuel.
4. Stable landing detection on pad with impact-speed and tilt thresholds; crash/restart and hull damage feedback.
5. Smooth camera follow, altitude-sensitive zoom, and rotation that keeps local horizon level near surface and transitions smoothly to inertial orientation in space.
6. HUD: altitude above surface, radial and tangential velocity, speed, fuel, hull, landing state; simple controls overlay.
7. Keyboard: A/D or Left/Right rotate, W/Up thrust, R restart, P pause. Optional landing gear toggle only if useful.
8. A minimal test suite for radial gravity direction/magnitude, fuel consumption, timestep independence, and safe versus unsafe landing conditions.
9. README instructions for npm install, npm run dev, npm run build, npm run test, npm run typecheck.
10. PR with screenshots or a short gameplay capture if feasible, and test results.

## Physics guidance
- Use Cartesian coordinates centered on planet. Gravity acceleration = -mu*r / max(|r|, minimumRadius)^3, tuned for fun rather than realism.
- Use a fixed timestep accumulator with capped catch-up to avoid spiral-of-death.
- Surface collisions require contact point/ship hull approximation and landing-pad tolerance; prevent tunneling at typical velocities.
- Thrust changes acceleration according to ship orientation and available fuel.
- Rotation controls angular velocity with reasonable damping; no arbitrary linear space drag.
- Reset should restore identical initial state.
- Tune moon size, ship thrust, fuel, and camera to allow an enjoyable launch-and-return loop within a few minutes.

## Acceptance criteria
- Player can launch, reach space, fly around the moon, and return to the same pad in one continuous simulation.
- Ship retains inertia when thrust stops.
- Gravity direction changes correctly around the circular body.
- Safe upright touchdown is recognized; high-speed or tilted impact causes damage/crash.
- HUD is readable and the game runs in a modern desktop browser.
- Build, typecheck and automated physics tests pass.
- No server required beyond local static dev hosting.

## Out of scope
Mining, enemy ships, weapons, resource collection, construction, astronaut, saves, mobile controls, multiplayer.

## Handoff
Open a PR; summarize architecture, controls, tests actually executed, known bugs, and recommended Task 002 (asteroid mining).
