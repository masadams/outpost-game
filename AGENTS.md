# Outpost — Agent Instructions

Single-player, continuous 2D spaceflight, mining and outpost-engineering game. Identity: **"Don't just explore space. Engineer it."**

## Read first (in this order)
1. [docs/CURRENT_FOCUS.md](docs/CURRENT_FOCUS.md) — what we are building *right now* and what is out of scope. Short; always read it.
2. [docs/MASTER_DESIGN_BIBLE.md](docs/MASTER_DESIGN_BIBLE.md) — design authority: identity, pillars, open decisions.
3. [docs/MASTER_ROADMAP.md](docs/MASTER_ROADMAP.md) — phases and vertical slices.
4. [docs/DECISIONS.md](docs/DECISIONS.md) — decision log.

Feature docs in `docs/` describe shipped behavior. `docs/archive/` holds completed task specs and is historical only; do not treat it as current instructions. Do not read the whole docs folder every session — read what the current task touches.

## Priority rule
**Depth before breadth.** Make the current focus slice genuinely fun and clear before adding or expanding systems. Do not add new mechanics, parts, research, buildings or panels unless CURRENT_FOCUS.md calls for them. Existing systems outside the focus stay in the code but are hidden from a new player until reintroduced deliberately.

## Stack
TypeScript, Vite, Phaser 3 for world rendering/input, custom fixed-timestep simulation (60 Hz). Preact is approved for the rebuilt DOM UI layer. No backend, authentication, multiplayer or paid assets.

## Architecture
- `src/sim/` — pure simulation. No Phaser, DOM or audio imports. This is the most valuable code in the repo: extend it, don't rewrite it.
- `src/render/` — Phaser drawing and camera. Reads sim state; never mutates it except through explicit actions.
- `src/ui/` — HUD and menus. Being rebuilt (see CURRENT_FOCUS.md). New UI goes in small components that read a view model and emit actions.
- `src/persistence/` — current-version checkpoints only.

## Engineering rules
- Small modules, explicit types, readable formatting. Keep new lines under ~120 characters; one statement per line. Do not write multi-hundred-character one-liners.
- World coordinates in meters; simulation in seconds; no frame-dependent movement.
- Gravity points toward body center, diminishes with distance, remains finite near the core.
- Rotation, thrust, velocity, fuel, mass, collision and landing are physically coherent.
- Camera follows smoothly and reorients to local up near surfaces; no scene transitions.
- Procedural/vector art only until core gameplay is proven.
- Unit-test physics invariants, landing classification and resource conservation.
- npm scripts: `dev`, `build`, `test`, `typecheck`, `test:browser`, `test:browser:changed`, `test:browser:smoke`.
- **Which tests to run.** Always: `typecheck` and `test` (unit tests, about two minutes). For the browser, run
  `npm run test:browser:changed`: it picks the specs that cover the files changed since `main`, plus the smoke
  spec (`--list` shows the choice and why). Run the whole browser suite (about 50 minutes) only when that script
  says the change is central, or before a release. A new source file needs a rule in `scripts/browser-tests.mjs`;
  a unit test fails until it has one.
- Saves: current version only. No legacy-save migrations until the game is close to complete; old saves may be reset.
- Never claim tests passed unless you ran them. Report what you actually ran.
- Do not merge PRs automatically. Keep code free of personal names/identifiers.

## UI and UX rules
- It is a game, not a dashboard. Show the minimum the player needs for what they are doing now; reveal more on demand or when it becomes relevant.
- **Full-screen windows (Base management, Map) pause the simulation while the ship is flying.** When landed or on foot they stay live, so production keeps running. Menus always pause. Small in-flight panels and the HUD stay live. The player must never crash or lose something behind a window they cannot see past.
- Prefer icons + short labels, large readable type, and world-space feedback (ghost placement, markers) over walls of text.
- Every disabled action says *why* in one short line.
- Keyboard shortcuts are hints, not a requirement; the mouse path must also work.

## Player-facing writing
Write like a game, not an audit. Short, concrete, second person where needed.
- Avoid internal jargon in UI text: "paid", "supplied", "unreserved", "escrow", "conservation", "checkpoint contract", "real/actual" as reassurance.
- Say "Needs 4 alloy (you have 2)", not "Insufficient unreserved local stock to fund paid order."
- Help text explains how to play, not how the code guarantees correctness. Put guarantees in tests and docs.

## Documentation discipline
- Update CURRENT_FOCUS.md when the focus changes; update DECISIONS.md when a decision is made.
- Feature docs: what it does, how to play it, known limitations. Keep them short.
- Do not create new root-level task files; put task specs in `docs/tasks/` and move them to `docs/archive/tasks/` when done.
