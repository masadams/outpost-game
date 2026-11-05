# Current Focus

**Updated:** 2026-11-05 · **Milestone:** UX rebuild + first mining sortie

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
| 2 | Clickable HTML mockups of the four screen modes (Flight, Surface/Build, Base, Map); agree on look and feel. Mockup 1: [docs/mockups/ui-rebuild.html](mockups/ui-rebuild.html) | Done: mockup 1 approved; add more detail and refinement in the real build |
| 3 | Feature visibility: new games show only the focus set below; other systems remain in code, hidden. See [Feature visibility](#feature-visibility) | Done |
| 4 | Rebuild UI layer in Preact on shared design tokens, implementing the agreed mockups. See [UI rebuild progress](#ui-rebuild-progress) | In progress |
| 5 | Polish and hands-on playtest the first mining sortie until it's fun. See [Polish progress](#polish-progress) | In progress |

## Screen modes (agreed direction)
- **Flight** — minimal live HUD: core instruments, current objective, contextual prompts. No permanent toolbar wall.
- **Surface / Build** — live. Build bar with icons; ghost placement in the world with clear valid/invalid feedback. Works on foot or from the landed ship.
- **Base** — full-screen management. **Pauses while flying**; live when landed or on foot.
- **Map** — full-screen navigation. **Pauses while flying**; live when landed or on foot.

## Visible to a new player (focus set)
Flight, mining laser, cargo, landing, the astronaut on foot for building, the delivery depot, refining and fuel, and a small set of buildings: solar array, battery, storage and refinery.

## Hidden for now (code kept, not shown in new games)
Combat and drones, turrets/defence drills, shields, towing, flight computers/autopilot, facility upgrade tiers, production scheduling, colony priority policy, freight manifests, the broad research tree and ship-part catalogue, habitats, and Nacre travel UI. Each returns through a deliberate slice, ideally as something the player discovers or unlocks in play.

## Feature visibility
`src/preferences/features.ts` decides what a new player sees. In the focus set:
- Build offers five buildings (keys 1–5): solar array, battery, storage, refinery, fuel processor.
- Manage shows Facilities, Construction and Economy. Research, Ship fitting and Shields are hidden.
- The Ship panel has no Weapons, Defence or Flight computer tabs; a wrecked lander shows only recovery.
- Map has no Nacre route. Objectives show the first two goals. Help is a short first-sortie guide.
- Upgrades, scheduling, priorities, geology, towing, freight and readiness panels are hidden.
- Actions for hidden systems are ignored at one gate in `FlightScene`, so stray keys (N, O, Y, Shift…) do nothing.

Add `?features=all` to the URL, or set localStorage `outpost.features` to `all`, to see everything. The browser regression suite runs with all features on; `tests/browser/focusMode.spec.ts` checks the focus set.

## UI rebuild progress
New UI lives in `src/ui/flight/` (Preact, `.tsx`), styled from the tokens in `src/ui/theme.css` with bundled open-licensed fonts.

| Slice | What | Status |
|---|---|---|
| 4.1 Flight | Instrument cluster (reserve bars, attitude dial with nose and motion, readouts, touchdown limits), objective card, screen buttons (Ship, Build, Base, Map, Menu), icon tray, view tools by the radar, notices column, Base/Map pause while flying | Done |
| 4.2 Build | Build bar (cards, costs, what is missing, materials and power, queue with cancel), ghost placement with plain reasons at the cursor, build from the landed lander or on foot, astronaut sent automatically, Esc leaves build mode | Done |
| 4.3 Base | Base window: Overview (materials, power, what needs attention), Buildings (list + inspector with on/off and recipe, plain reasons), Ship. Nearby card on foot replaces the old facility panel. Legacy console only with `?features=all` | Done |
| 4.4 Map | Map window: clickable chart (Selene, ore clusters by colour, sites, pad, you, bearing line), places list, inspector with distance and speeds, unknowns until surveyed, site action with a plain reason, next-step note; zoom / fit / focus | Done |
| 4.5 Cleanup | Ship panel (hold, ore, nearest rock, depot on foot) in the new style; Menu, Help and Settings restyled with simpler wording; status messages shown as plain sentences; 46 dead CSS rules and the old surface panel deleted | Done |

## Polish progress
| Slice | What | Status |
|---|---|---|
| 5.1 Lander and camera | Zoom is set from the window height, so the lander is about 7% of screen height (63 px at 900) and the astronaut about 5%, on any display. Descending keeps the ground below the lander in view, clear of the instrument cluster. The camera leads in the direction you are moving. The focus point sits above centre. New lander and astronaut art (cabin with window, descent stage, braced legs, engine bell; visor, backpack, stride) and a flat landing pad | Done |
| 5.2 Mining laser and rocks | Faceted, lit rocks that spin, with mineral glints, craters and cracks that open as they take damage. A flickering beam with travelling pulses and a spark shower where it lands. Rocks throw debris when they split or shatter; ore comes aboard with a flash and a "+4.0 kg Iron" line. The camera frames the ship and the rock being worked. Sound: a wobbling beam hum, a deeper crack when a big rock splits versus a short shatter, and pickup chimes that climb when ore comes in quickly | Done |
| 5.3 Landing feel | Touchdown, dust, crash and recovery, and the sound of each | Planned |
| 5.4 First-run guidance | Does a new player find their first rock and their first delivery without help? | Planned |

## Known UX defects to fix in the rebuild
- ~~Full-screen Map/Manage windows don't pause~~ Fixed in 4.1: Base and Map pause while flying.
- ~~The Build tab stays highlighted while Manage or Map is open~~ Fixed in 4.1: screen buttons show the open panel.
- ~~Dial readouts overlap their needles~~ Fixed in 4.1: new cluster, checked for clipping and collisions at 900×600–1920×1080 and 1.5× text.
- ~~The ship is about 20 px tall at 1600×900~~ Fixed in 5.1: about 63 px, and it scales with the window.
- ~~About 15 text buttons at launch~~ Fixed in 4.1: five screen buttons, four small icons, view tools by the radar.
- ~~Help and panel text uses internal jargon~~ Fixed in 4.5 for everything a new player sees; the legacy console behind `?features=all` still has the old wording.

## Out of scope this milestone
New mechanics, parts, research, buildings or worlds. Storm, expedition and the S0–S6 systems slices wait until this milestone's playtest passes.
