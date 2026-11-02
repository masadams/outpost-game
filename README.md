# Outpost

A single-player, retro-inspired 2D spaceflight, asteroid mining, combat and colony-building game. Target balance: **60% action / 40% construction**.

**Status:** Planning complete; first playable prototype not yet implemented.

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

**First Codex prompt:** “Implement CODEX_TASK.md following AGENTS.md and docs/DEVELOPMENT_ROADMAP.md. Run build, typecheck and tests, then open a PR for review. Do not merge.”
