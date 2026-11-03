# Outpost — Agent Instructions

Build a single-player, continuous 2D spaceflight and colony-building game. Target gameplay balance: 60% flight/mining/combat, 40% colony building. First deliverable is a browser-playable planetary flight vertical slice.

## Stack
TypeScript, Vite, Phaser 3 for rendering/input, custom fixed-timestep physics (60 Hz). Keep simulation independent of rendering. No backend, authentication, multiplayer, or paid assets.

## Engineering rules
- Small modules, explicit types, clear separation of simulation, rendering, and input.
- Use world coordinates in meters; simulation in seconds; avoid frame-dependent movement.
- Gravity points toward planet center, diminishes with distance, and remains finite near the core.
- Ship rotation, thrust, velocity, fuel, collision and landing are physically coherent.
- Camera smoothly follows and reorients to local up near the surface; no scene transition.
- Avoid external images until core gameplay works; use procedural/vector placeholders.
- Unit-test physics invariants and landing classification.
- Provide npm scripts for dev, build, test and typecheck.
- During prototype development, support current-version saves only. Do not build legacy-save migrations until the game is closer to complete; older saves may be reset (user direction, November 2026).
- Document commands and known limitations. Never claim tests passed unless run.
- Do not merge PRs automatically. Keep code free of personal names/identifiers.

## Scope discipline
Implement CODEX_TASK.md first. Do not begin mining, combat, astronauts, construction, or multiplayer in this milestone. Keep extension points for them.
