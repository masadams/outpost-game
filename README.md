# Outpost

A single-player, retro-inspired 2D spaceflight, asteroid mining, combat and colony-building game. Target balance: **60% action / 40% construction**.

**Status:** Flight, mining, surface exploration and colony construction/economy are implemented on stacked feature branches pending review. Review [flight #2](https://github.com/masadams/outpost-game/pull/2), [mining #3](https://github.com/masadams/outpost-game/pull/3), [surface #4](https://github.com/masadams/outpost-game/pull/4), then the colony PR. No defence/combat yet; no automatic merges.

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
| B / 1–6 | Toggle build palette / choose facility (on foot) |
| Q / T / Enter | Shift preview left/right 32 m / place |
| X / V | Demolish nearby facility (palette open) / cycle nearby refinery recipe |
| K / L | Save / load browser checkpoint |
| P | Pause / resume |
| R | Reset runtime sandbox, including colony; keep saved checkpoint |

The game also pauses when its window loses focus or the tab is hidden. Press P to resume; keys are released on pause to avoid queued actions. Flight controls rotate the ship in world space even as the camera reorients.

For a first return flight, launch vertically for about **6.5 seconds**, then coast. Keep the nose upright. Watch radial velocity: positive means climbing, negative means descending. Use short thrust pulses on descent, starting early to keep descent under 30 m/s, then reduce it below 6 m/s near the pad. Thrust is an acceleration, so releasing W preserves momentum. Sustained burns can escape the moon; turn around and burn to return, or press R to practice again.

For orbital flight, gradually pitch toward the horizon after launch and build tangential speed. Circular speed is about 42 m/s at 400 m altitude. The small radar shows the moon, green home pad and amber ship, including when home is off screen. Land on the green pad with radial speed ≤ 6 m/s, tangential speed ≤ 4 m/s, tilt ≤ 15° and angular speed ≤ 0.35 rad/s. A safe touchdown locks the ship to the pad until thrust resumes. Moderate impacts damage hull and rebound; hard or overturned impacts crash. Landing does not refill fuel or repair hull.

## First mining sortie

A starter iron sample is directly above the home pad. Hold **W + Space + C** to launch, mine and attract ore. Release **W after about 6.5 seconds**, keeping Space/C held while coasting toward the deposit. The beam breaks a parent rock into two fragments; mine those again for ore. The powered tractor pulls ore within 260 m and collects it within 18 m. Use the same vertical descent practice described above, then press **E** on the pad to transfer the hold into the depot. The simulation regression performs this entire sortie with ordinary control inputs. Avoid holding thrust until the hold fills: the ship can reach escape speed before collection finishes.

For other deposits, steer by the nearest-deposit bearing and colored radar blips. A radial ice sample also starts just right of the iron sample above home. Keep the nose on the rock within laser range (450 m); nearer rocks and the moon block the beam. Parents split into two mineable fragments; each fragment releases four drifting ore pickups. Resource mass and fracture momentum are conserved. The 120 kg hold accepts partial stacks and leaves the remainder in space. Cargo adds to ship mass. All five resources have separate hold/depot totals. Rock impacts damage hull. Pause freezes the entire world. R resets all runtime progress; K/L protects a saved checkpoint.

![Mining cargo HUD](docs/screenshots/mining-cargo.png)

## Explore the surface

Press **F** on the home pad to leave the ship. Use **A/D** or the arrows to walk around the curved moon. Press **Space** (or W/Up) to jump; release before jumping again. Ground motion accelerates and brakes, while airborne motion retains momentum under radial gravity. The camera smoothly moves to the astronaut and zooms closer. Ship engines and tools are disabled while the pilot is outside; asteroids and ore keep moving.

The amber **cargo depot** is about 54 m right of the pad. Grounded E opens inventory and transfers the landed ship's hold, leaving overflow aboard if storage is full. E again closes, or walk away. The blue **home emergency service** is about 54 m left: E restores suit oxygen/health, repairs the landed ship using stored iron (**1 kg / 10 hull points**), and transfers any manufactured fuel available. Its emergency suit service remains free. Buildable service stations use grid energy and manufactured supplies.

The suit has **180 seconds of oxygen**. Return to the ship (F within 20 m) or use the service point before it runs out. At zero oxygen, health drains at 5 points/second. Falls above 14 m/s also cause damage; ordinary jumps are safe. A lost suit requires R to restart the entire sortie. Boarding refills oxygen; suit health stays damaged until serviced. You can walk through ship/station art; terrain is the suit's collision surface in this milestone.

![Surface depot](docs/screenshots/surface-depot.png)

## Build a colony and refuel

The finite starter kit contains **28 alloy, 14 wire, 8 components, 4 water and 2 oxygen**. Raw ore still comes from mining; the kit never replenishes unless the runtime is reset. Blueprint buttons show exact material costs.

1. Leave the ship with F. Walk right past the depot to about 100 m from the pad. Press B: the preview follows the rim 24 m ahead. Green means a valid affordable site; red explains a blocked site. Keep the pad, home terminals and other facilities clear.
2. Enter builds the selected **solar array**. T shifts the preview 32 m right; choose **4** and Enter for a **refinery**. T again, **5**, Enter builds a **fuel processor**. Mouse palette/placement buttons provide the same actions. Build within 96 m of the crew; walk farther to extend the colony.
3. The array supplies 8 kW; the fuel processor uses 6 kW and converts starter water/oxygen into fuel. The refinery waits for ore. Every recipe needs power, inputs and output room. Production continues while you are flying.
4. Mine ice, return and unload. Walk within 18 m of the refinery and press **V** to select **Ice → water + O₂** (after iron, copper and components). E toggles machines. Iron makes alloy, copper makes wire, and 0.9 silicon + 0.1 rare metals makes one component. Recipe choice changes discard incomplete cycle progress.
5. Fuel processors turn **1 water + 0.25 oxygen into 1.25 fuel** in 3 powered seconds. Return to the landed ship and E unloads/refuels from colony tanks, up to tank capacity. Fuel never appears without feedstock. Built repair/fuel stations also transfer fuel within 80 m of a landed ship, use 2 kJ per service, and spend alloy on hull repair and oxygen on suit refill.
6. Add **batteries** for 200 kJ each (base capacitor 20 kJ), **storage** for 200 kg extra ore and 100 kg extra room per manufactured product (base 400 kg ore / 100 kg each product), and **repair/fuel stations** for away-from-home suit service. X removes a nearby facility while B is open, refunding 75%; removing essential storage is blocked, and excess battery charge is discarded.

The left colony ledger shows generation/demand, energy, material stocks and machine status. Scroll the panel to reach all controls. The grid and inventories form a single global bus in this prototype; solar output is constant and lower building IDs receive power first. If total demand exceeds generation, batteries buffer the deficit and machines wait rather than generating free output. Storage and batteries are passive capacities with no power switch. Facilities are surface markers, without solid collision or damage yet.

![Colony production line](docs/screenshots/colony-production.png)

## Save and resume

**K** writes one local browser checkpoint. **L** restores it, and page startup automatically loads an existing checkpoint **paused**; press P to resume. Saves include the entire world: facility placement, production timers, energy, raw/manufactured inventories, depleted asteroid field, ship and suit. Thus loading does not recreate already-mined ore. R starts a fresh runtime sandbox while keeping the last checkpoint; L recovers it. Saving the new runtime with K deliberately replaces that checkpoint.

Saves are local to the browser/origin and are not cloud synced. There is no autosave, offline production or migration from future/unsupported formats. Invalid checkpoints and storage failures leave the live world playable, with feedback. The versioned bounded loader rejects malformed data; a mature save/backup/migration system remains a later roadmap phase.

## Verification

```sh
npm run build
npm run typecheck
npm run test
npx playwright install chromium
npm run test:browser
```

`npm run preview` serves the production build. `dist/` can be hosted on any static server. CI runs typecheck, unit tests, build and Chromium checks, and uploads screenshots and test artifacts.

The **73 unit tests** cover flight, mining, suit/camera behavior and colony construction/power/storage/recipes/refuelling/checkpoints. Scenarios cover mining return/delivery, depot walking/relaunch, and unloaded ice → water/oxygen → fuel → ship refuel with recipe mass conservation. Checkpoint tests round-trip the finite field and mid-cycle production, and reject corrupt versions/shapes, duplicate IDs and overflows. **Five Chromium checks** cover flight, surface route/oxygen pause, mining, mouse/keyboard construction and fuel production, save/reset/load/reload, and corrupt-save recovery. Screenshots show the pad, flight, cargo, surface depot and colony. Full mining return remains a simulation check; other browsers and human feel remain for review.

## Architecture and tuning

- `src/sim/`: pure TypeScript state, Cartesian meters and seconds, 60 Hz accumulator; no Phaser/DOM imports. `world.ts` owns pilot mode, suit, ship, field, depot and button-edge state. `astronaut.ts` contains suit movement/safety (`SUIT` tuning); `surface.ts` owns boarding and stations; `cargo.ts` shares inventory transfer without simulation module cycles. Flight, bodies, mining and typed resources remain separate. Total ship mass is dry hull plus fuel plus cargo.
- `src/sim/colonyConfig.ts`, `colony.ts`, `colonyService.ts`: blueprints/recipes, placement/production/power and supplied service/refuelling. `stations.ts` and `messages.ts` share home geometry/feedback without runtime module cycles.
- `src/persistence/`: versioned full-world snapshot encoding, bounded validation and storage adapters; browser storage is accessed only by the scene.
- `src/input/`: keyboard sampling per physics step, retaining short F/E/Space presses until consumed, and focus/pause-safe release.
- `src/render/`: Phaser scene, procedural world/ship/stars/radar and a smoothed follow frame. Local-up rotation blends into the inertial frame between 100 and 900 m altitude; zoom follows altitude continuously. A transformed world container renders the camera frame, keeping HUD/radar in screen coordinates.
- `src/ui/`: DOM telemetry and controls, outside world transforms.
- `tests/`: simulation/camera regressions and real Chromium smoke test.

Collision uses a circular 7 m hull swept against the 600 m moon, then classifies pad contact by arc tolerance, speed, tilt and spin. Semi-implicit Euler integration applies radial gravity and fuel-limited thrust with no linear drag. Phaser delta smoothing is disabled so the accumulator receives elapsed time even at low rendering rates. Catch-up is capped at 15 steps/250 ms; long stalls intentionally discard time. Angular damping stabilizes steering without changing linear inertia.

Known limitations: smooth circular terrain; approximate ship/suit collision; suit collides with terrain only, with no air steering, EVA or backpack; buildings are non-solid and have no damage. No audio, autopilot, interpolation, wiring, day/night, offline production or advanced automation. The finite 15-deposit field does not respawn. Fragments interact with rocks/ship/surface; ore interacts with gravity/surface/tractor and passes through rocks. Ship/rock contacts are swept; rock/rock contacts use discrete separation. Panels target desktop widths and are hidden below 560 px; mobile controls are out of scope. Phaser's roughly 1.25 MB minified JS bundle (~347 KB gzip) emits Vite's standard large-chunk warning.

Next recommendation after review: Phase 5 planetary defence, incoming physical meteors, interception and persistent structure damage.

## Start here
- [Master development roadmap](docs/DEVELOPMENT_ROADMAP.md) — authoritative phases, task checkboxes, dependencies, exit criteria and progress.
- [Design decisions](docs/DECISIONS.md) — confirmed choices versus unresolved questions.
- [Game design](docs/GAME_DESIGN.md) — gameplay vision, mechanics and core loop.
- [Codex Task 001](CODEX_TASK.md) — first playable planetary flight prototype specification.
- [Codex Task 002](CODEX_TASK_002.md) — mining/cargo iteration scope and acceptance criteria.
- [Codex Task 003](CODEX_TASK_003.md) — astronaut and surface interaction scope.
- [Codex Task 004](CODEX_TASK_004.md) — colony construction, economy and checkpoint scope.
- [Agent instructions](AGENTS.md) — technical architecture, coding and testing conventions.

## Core experience
Launch from a small circular moon, fly in a continuous 2D world with radial gravity and inertia, mine asteroids, fight threats, land, walk around, build/refuel a colony and defend it from incoming meteors. No separate flight/surface minigames.

## Development workflow
Implement one roadmap phase at a time on a feature branch. Open a PR with tests and playtest notes; update the roadmap and decision log. Do not merge automatically.

Review Tasks 001–004 in dependency order. No automatic merges.
