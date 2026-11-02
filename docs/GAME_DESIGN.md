# OUTPOST — Game Design v0.1

## Vision
A single-player retro-inspired 2D space action and colony game, with 60% piloting, mining and combat and 40% construction and colony management. Players physically leave a base, fly through space with Asteroids-style inertia, mine or fight, return using Lunar Lander-style gravity and landing, exit the ship, and construct a persistent colony.

## World
One continuous Cartesian 2D world containing a circular planetoid and space. Radial gravity near the planet; smooth camera rotation/zoom. Later expansion may include additional celestial bodies.

## Gameplay loop
Build and prepare -> launch -> explore/fight/mine -> collect cargo -> return and land -> exit ship -> refine and construct -> defend colony -> repeat.

## Planned systems
- Ship: inertia, thrust, fuel, hull, cargo mass, equipment upgrades.
- Asteroids: breakable bodies, fragments, mineral collection.
- Resources: iron, copper, ice, silicon, rare metals.
- Astronaut: walk, jump, enter/exit ship, interact, repair.
- Colony: power, storage, oxygen, refinery, fuel processor, turrets, radar.
- Defence: incoming physical asteroids, manually controlled lasers, automatic turrets, missiles and shields.
- Progression: survival -> industry -> expansion -> fortress.

## Guiding principles
1. Physical continuity: no separate minigame screens for flight, landing, mining or defence.
2. Skillful arcade handling with consistent underlying physics.
3. Automation is earned through construction.
4. Begin with one moon and one ship; avoid premature scope expansion.
5. Single-player first, with modular simulation that does not preclude future multiplayer.

## Milestones
1. Planetary flight (CODEX_TASK.md).
2. Destructible asteroids and mining/cargo.
3. Astronaut movement and building placement.
4. Planetary defence and persistent damage.
5. Combat, upgrades, save/load and polish.
