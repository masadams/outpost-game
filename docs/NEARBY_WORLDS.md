# Nearby worlds — alpha 0.15

Task 010 implements the first continuous two-world neighborhood on `feat/nearby-worlds`. Selene and the airless moon Nacre move in one Cartesian world; flight, landing, walking, mining, colonies and return trips use the same fixed 60 Hz simulation. The full graphics/UX/UI overhaul remains Phase 9.

| Source | Radius | Own surface gravity | Atmosphere | Opportunity |
|---|---:|---:|---:|---|
| Selene / home | 1800 m | 5 m/s² | 1200 m | Existing home industry, terminals and finite belts |
| Nacre | 450 m | 1.6 m/s² | None | Five finite seams: ice, iron, rare metals, silicon and copper |

These are compact game-scale worlds. The gravity readout sums both sources, so its inertial magnitude can differ from the source-only values above.

## Gravity, motion and surfaces

The sources follow a circular binary orbit at 9500 m separation around their common barycentre. Each μ equals its own surface gravity × radius². Their orbital angular rate is sqrt((μ_home + μ_moon) / separation³), giving a period of about 23.9 simulation minutes. The barycentre is offset so home starts at the previous origin. Both worlds move; actors spawn with home's actual orbital velocity. Surfaces do not rotate initially.

Every moving ship, crew member, asteroid, fragment, ore stack, neighborhood site, meteor, drone and ammunition round samples the sum of both finite-core fields. A uniform-density interior makes each source's own acceleration linear and finite at its core. Actors are test masses: source recoil from a ship or mined load is negligible and is not simulated. A moving source can exchange inertial energy with an actor; isolated-ship energy is not constant during a transfer. Active distant actors and remote production are never frozen.

All terrain tests sweep motion relative to the source's start/end centres and choose the earliest contact. Parked ships and grounded crew move with their world. Takeoff/jumping retains surface velocity. Ship altitude, radial speed, drift, speed and tilt are measured in the nearby surface frame; the same frame drives landing lights and warning sounds. Camera local-up blends gradually into the inertial view at altitude. Air translates with home; Nacre has no drag layer. Its header reads AIRLESS · VACUUM, and visiting it never creates a false atmosphere-entry chime. Wrecks and lost crew remain physical, with grounded bodies attached to their source.

Each world currently has one marked 60 m landing pad at local angle zero. The established safe limits apply to both: 6 m/s radial, 4 m/s drift, 15° tilt and 0.35 rad/s spin, with the whole ship inside the pad. Other terrain still collides and can damage or destroy the ship. Coast/meteor prediction advances the same moving sources and terrain; it remains unpowered and excludes future tools/traffic/interceptions. There is no gameplay autopilot.

## Navigation and local colonies

Nav offers the live Nacre pad and Return to home pad, in addition to belts and physical sites. Range, bearing, closing and total relative speed use the actual moving target. The system chart/radar shows both worlds. An occluded direct line may pass through a planet: climb clear and fly around it rather than steering through the circle. A useful return route is to approach outside home's atmosphere from the arrival side, circle above the surface, then descend toward the marked pad. Zoom/wheel/auto framing remain available throughout; there is no flight/surface scene transition.

Home retains the original finite fabrication kit. Nacre starts with zero buildings, manufactured stock, raw depot stock and stored energy. Its seams are finite natural resources. The bare local depot provides existing base storage capacities, not supplies. Each colony has its own buildings, raw ore, manufactured products, energy, reserves, queue, extraction and habitat/shield buffers. Both tick while away. Command's Colony view selector inspects/directs either world; changing a view cannot transfer stock or power. Queued construction still needs stationary living crew within 96 m on that same world. Facility identities stay distinct through rebuilding.

Research knowledge and the paid project queue are shared intentionally. At most one powered lab contributes per step: eligible home labs first, then moon labs, in each colony's dispatch order. Its own colony pays the work energy. A remote lab can take over if home labs are disabled/starved. Samples commit from the colony where the project is ordered; cancellation returns the unworked fraction there, using the project's recorded funding colony. Ship equipment/tow fabrication still requires home. Domes, turrets, damage, service, repairs and their supplies belong to their actual world; shields still supply no oxygen.

## Real freight and return cargo

Open Cargo → Manufactured freight at a marked pad. Load/unload each product in up-to-5 kg increments, obeying stock/reserves/storage and actual available hold room. All manufactured freight shares the raw ore hold's 120 kg capacity (200 with the rack) and adds one kg of ship mass per kg loaded. Installing/removing equipment, mining collection and salvage use the combined hold mass. Transfers while flying, at another world's pad or away from a landed ship are rejected.

Bring building parts rather than receiving another starter kit. One solar array plus one mining rig costs 12 alloy + 5 wire + 3 components. Loading 15 alloy, 5 wire and 5 components uses the current 5 kg buttons and leaves some parts after construction. Unload these into Nacre's depot, build on its ice seam and supply local solar power. The rig buys 0.5 kg of real reserve every two work seconds using 6 kW; one solar array can support it. Cargo's Local raw ore → ship controls then load up to 5 kg of depot ore into hold room. Fly home and E unloads it into home's depot. Loading never creates ore; the mined seam remains depleted.

The moon has a depot terminal but no free suit/hull service. Bring oxygen/materials and build a powered service station or habitat for extended surface work; boarding the existing cabin restores suit reserve as before. Watch suit air. Home recovery still costs 8 unreserved alloy + 2 components from home: a wreck returns to the moving home pad with hull 30 and at most its existing 20 kg fuel. Modules stay fitted; all raw/freight cargo is lost rather than teleported. Moon buildings/stocks remain there. A lost crew beside an intact ship still uses checkpoint/reset; rescue missions are later content.

## Persistence and budgets

Version 14 / binary-flight-1 saves simulation time, actual actor motion/attachment, freight, both local colonies/depletion and shared research. Body centres/velocities derive deterministically from time/configuration. Loading rebinds the shared research state and stays paused. P freezes both sources, production and actors. Current malformed/overfull stocks, impossible attachment, invalid body/clock state and foreign runtime-view metadata are rejected. Incompatible development saves may be reset; no legacy migration layer was added.

Per-colony limit: 48 facilities / 16 construction orders. The existing 27 parent rocks, up to 54 fragments or 216 ore stacks, three sites and bounded global threat/projectile pools remain. The two-source benchmark measured mean kernel steps near 0.13 / 0.30 / 0.49 ms for those three body scenarios; this was a shared cloud host with a browser running and is not a renderer FPS guarantee. Both sources and empty remote-colony ticking were active. Phase 9 still needs lower-powered hardware and full visual/effect budgets.

## Validation and playtest

Automated simulation coverage checks analytic source separation/barycentre/velocity, finite cores and the one-source limit, co-moving air/vacuum, moving terrain sweeps, attached motion/takeoff, all threat frames, remote protection/damage/air, hauling, real freight mass/capacity, local scarcity, shared research, reconstruction identity, recovery, malformed current saves and independent continuation. A normal-input test flies home → moon, builds supplied mining, loads real ore and returns/lands/delivers. The production browser repeats that whole route through keyboard controls and public HUD telemetry, with a checkpoint reload on the moon. Its virtual host clock renders at 10 Hz while executing all ordinary 60 Hz physics steps; it never injects actor positions or resources. Another browser route checks actual moon instruments and native power controls at 900×600, 1280×800 and 1920×1080.

For a manual playtest, save first, load the parts above, select Nacre in Nav, clear the starter rock with the mining beam and climb out. Approach the moving moon pad using its relative velocity, land and unload parts. Walk toward the ice seam around +160 m, build a rig and solar, then return before suit air runs low. Load mined ice, select home, route around its terrain, land and E deliver. Check Command's two colony views and K/L mid-trip. Human handling/economy tuning, more pads/worlds, missions and the full art/UI/audio overhaul remain later work.
