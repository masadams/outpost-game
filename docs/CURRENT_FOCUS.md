# Current Focus

**Updated:** 2026-11-04 · **Milestone:** UX rebuild + first mining sortie

## Why
The alpha has a strong simulation core (fixed-step physics, landing, resource accounting, 538 passing unit tests) but grew wide before it got good. Seventeen task specs added research, 25 ship parts, combat, drones, shields, towing, autopilot tiers, facility upgrades, freight, scheduling and colony policy. Meanwhile the first minute of play is unclear and the interface reads like a web dashboard. The bible's own rule is depth before breadth, so we are returning to it.

## The goal of this milestone
A new player can, without reading help text:
1. Launch, fly and understand their speed, altitude, fuel and attitude at a glance.
2. Find and mine a rock, fly home heavier, and land on the pad.
3. Deliver ore, refine it, and place their first solar array and refinery.
4. Feel that each of those moments is satisfying on its own (bible: *physical satisfaction*).

This is the bible's first signature slice: **the excellent mining sortie**. The asteroid storm comes next, then the first expedition to Nacre.

## Steps
| # | Step | Status |
|---|---|---|
| 1 | Ground rules: rewrite AGENTS.md, archive task specs, write this page, log decisions | Done |
| 2 | Clickable HTML mockups of the four screen modes (Flight, Surface/Build, Base, Map); agree on look and feel | In progress |
| 3 | Feature visibility: new games show only the focus set below; other systems remain in code, hidden | Not started |
| 4 | Rebuild UI layer in Preact on shared design tokens, implementing the agreed mockups | Not started |
| 5 | Polish and hands-on playtest the first mining sortie until it's fun | Not started |

## Screen modes (agreed direction)
- **Flight** — minimal live HUD: core instruments, current objective, contextual prompts. No permanent toolbar wall.
- **Surface / Build** — live. Build bar with icons; ghost placement in the world with clear valid/invalid feedback.
- **Base** — full-screen management. **Pauses the game.**
- **Map** — full-screen navigation. **Pauses the game.**

## Visible to a new player (focus set)
Flight, mining laser, cargo, landing, the astronaut on foot for building, the delivery depot, refining and fuel, and a small set of buildings: solar array, battery, storage and refinery.

## Hidden for now (code kept, not shown in new games)
Combat and drones, turrets/defence drills, shields, towing, flight computers/autopilot, facility upgrade tiers, production scheduling, colony priority policy, freight manifests, the broad research tree and ship-part catalogue, habitats, and Nacre travel UI. Each returns through a deliberate slice, ideally as something the player discovers or unlocks in play.

## Known UX defects to fix in the rebuild
- Full-screen Map/Manage windows don't pause; the ship can crash behind them (observed: hull 100% → 41% while Map was open).
- The Build tab stays highlighted while Manage or Map is open.
- Dial readouts overlap their needles in the instrument strip.
- The ship is about 20 px tall at 1600×900; the player barely registers their own lander.
- About 15 text buttons are on screen at launch; secondary text is small monospace.
- Help and panel text uses internal jargon ("paid", "supplied", "unreserved") and reads like a changelog.

## Out of scope this milestone
New mechanics, parts, research, buildings or worlds. Storm, expedition and the S0–S6 systems slices wait until this milestone's playtest passes.
