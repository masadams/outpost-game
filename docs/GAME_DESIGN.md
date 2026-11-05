# OUTPOST — Game Design v0.1

## Vision
A single-player retro-inspired 2D space action and colony game, with 60% piloting, mining and combat and 40% construction and colony management. Players physically leave a base, fly through space with Asteroids-style inertia, mine or fight, return using Lunar Lander-style gravity and landing, exit the ship, and construct a persistent colony.

## World
One continuous Cartesian 2D world containing Selene, the airless moon Nacre and surrounding space. Both sources move in a bounded binary orbit and exert shared finite-core gravity; surfaces, local colonies, drag, landing telemetry and camera use their parent frame. See NEARBY_WORLDS.md for the Phase 8.5 implementation. Further worlds remain later expansion.

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
1. Planetary flight ([Task 001](archive/tasks/CODEX_TASK.md)).
2. Destructible asteroids and mining/cargo.
3. Astronaut movement and building placement.
4. Planetary defence and persistent damage.
5. Combat, upgrades, save/load and polish.

## Prototype progression
The current goal journal records actual deliveries, industry, equipment, a moon work/return expedition, supplied habitat work, completed research and meteor interception. Goals may be tracked in any order and grant no materials or control of the ship. The starter-route budget explains finite local costs and shortages; wider economy/event/recovery tuning remains open. See PROGRESSION_GOALS.md.

Alpha 0.19 expands progression to ten technologies and sixteen functional parts across eight exclusive ship slots. Higher parts exchange thrust, efficiency, dry mass, capacity, cell draw, heat and protection rather than granting free refills. A standard title/pause flow precedes play, and readiness budgets expose existing finite recovery/refuelling rules. See PLAYTEST_ALPHA019.md.

Alpha 0.20 responds to menu-density feedback with a large operations workspace and separate labelled/icon management pages. Research uses a connected fourteen-node map and a selected-node inspector; ship fitting uses eight slot selectors, twenty-two parts and a current-versus-selected comparison. Hover hints supplement persistent click/keyboard details. Inspecting never purchases, pauses or moves the player. The four new branches add six real tradeoff parts; see MANAGEMENT_WORKSPACE.md.

The same alpha 0.20 UI branch condenses the bottom flight HUD into a one-row gauge console: six ship or four crew readings, with active cautions retained and secondary diagnostics available through Details. Signed surface-relative velocity, local-up attitude, real tank percentages and the existing warning/audio rules remain authoritative. See INSTRUMENT_CONSOLE.md.

Alpha 0.21 adds earned flight automation and in-place facility advancement. Three exclusive avionics parts progress from prepared-approach landing, through return-home/landing, to selected-destination navigation. Guidance produces normal bounded thrust/steering; fuel, mass, power, gravity and collision remain authoritative. Orbital rendezvous leaves interactions manual. Infrastructure research unlocks facility tiers II/III with local material/energy costs, preserved identity/contents/work and proportionally powered throughput. Toggleable labels and physical facility clicks open focused controls; full colony management remains explicit. See AUTOMATION_FACILITIES.md.
