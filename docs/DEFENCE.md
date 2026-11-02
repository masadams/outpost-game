# Alpha 0.3 planetary defence

Drills are opt-in. Press **K** to save your peaceful world, then **N** (or Start defence drill) when ready. The drill causes real damage; **L** restores your checkpoint paused, **P** resumes, and **R** starts a fresh runtime while keeping the checkpoint. The first drill sends one meteor, the next two, then at most three. Finish incoming threats and active projectiles before starting another. Drills target the most recently placed operational facility, or the pad if there are no facilities. Nothing attacks automatically while you practise other systems.

## Prepare and operate

Leave the ship with F. Walk beyond the depot to about 100 m right of home. B/Enter builds solar; T shifts the preview 32 m, **7/Enter** builds a laser turret. Close B and walk within 18 m of the turret. E takes control: **A/D aims**, **Space fires**, **E releases**. While controlling, walking/jumping are suppressed but suit oxygen still runs down. F releases control and attempts boarding normally. Damage, walking out of range, disabling/demolishing the turret or losing the suit releases control. Pause/focus loss releases held inputs; loading also releases manual control.

**G** toggles automatic defence for the nearby turret; release manual control to let it operate. The constructed turret provides automation, paid for through blueprint materials. It only targets incoming meteors/fragments in range and above its local horizon; ordinary mining deposits are not selected automatically. A nearer mineral rock can block the laser and will take its damage. Automatic shots still need power, ammunition and cooldown. Factories use the shared grid before turrets; limited energy can starve defence. Add solar/batteries and manage production.

| Blueprint | Range | Energy per shot | Materials per shot | Interval |
|---|---:|---:|---|---:|
| 7 Laser turret | 900 m | 1.5 kJ | None | 0.25 s |
| 8 Flak turret | 1,100 m | 2 kJ | 0.25 alloy | 0.8 s |
| 9 Missile turret | 1,800 m | 4 kJ | 1 alloy + 0.25 components | 2.5 s |

Construction costs appear in the palette. Flak launches at 220 m/s and bursts after a timed fuse, with a 65 m interception radius. Missiles launch at 150 m/s, guide toward a locked target with bounded acceleration and burst within 100 m. Missiles lose guidance if their target disappears and then coast until contact/expiry. Manual missiles acquire a nearby visible target if one exists. Missiles expire after 20 seconds, flak after 8; a launch is never refunded. Projectile mass equals the alloy/component stock consumed at launch; their drag areas use a tuned ballistic coefficient. Ammunition is abstracted as direct fabrication-stock consumption, without a free ammo pool or new ammo production chain. Blast damage from defensive weapons affects incoming threats only; weapon friendly fire is not modeled.

## Observe and intercept

Orange radar dots, dashed world paths and crosshair markers identify threats and predicted first terrain contacts. A persistent warning strip shows incoming count and earliest predicted impact time. Use wheel/−/+ to see the incoming path; 0 restores auto zoom. Prediction clones meteor state and reuses its exact 60 Hz gravity/drag/swept-terrain step for up to 120 seconds; it excludes weapon hits and ship collisions. It refreshes at 2 Hz while running and once for a paused load; paths change after interception. At most 12 predicted paths are drawn, while the incoming count includes all threats.

Meteors begin above the atmosphere and decelerate in air. A destroyed parent splits into two fragments, conserving mass and fracture momentum; both retain gravity/drag and can still damage the colony. Keep firing until the incoming count reaches zero. A second hit disperses fragments into non-collectible dust. Interception does not produce free raw ore. You can fly up and use the ship mining laser instead; ship collision and hull damage remain active.

## Damage and recovery

Ground impact energy and distance from the impact determine blast damage. Buildings have 100 hull. A wreck remains at its site but provides no power, production, service or storage/battery capacity. Losing storage destroys overflow raw/manufactured stock; the defence ledger reports cumulative kilograms lost. Lost battery capacity discards excess charge. Supported buildings remain non-solid for movement; this is radial blast damage, not structural rigid-body collision. The home pad/terminals remain indestructible recovery infrastructure; ship and exposed suit can take nearby blast damage.

Stand within 18 m of a facility and **U** repairs it using **1 alloy per 10 hull**, up to what you can afford. Wrecks can be repaired. Repairing capacity restores room, without restoring lost stock or charge. Demolition refunds up to 75% of blueprint cost, scaled by remaining hull; a wreck has no salvage. It still cannot strand remaining inventory.

## Save and model limits

Version 3 stores active meteors/projectiles, counters, building health, turret aim/cooldown/automation and spent inventory. Versions 1/2 migrate to peaceful defence state; the version-1 larger-planet projection is retained. The slot key is unchanged. Loading pauses, clears visual beams and releases manual control, while preserving automatic settings and live projectiles. It does not rewrite the previous slot until K. No offline progression, automatic waves, hostile ships, shields or detailed missile fuel/thermal model are included.

Simulation tests cover all variants through complete drills, manual aim/fire without movement, power/ammunition/range/occlusion limits, bounded cadence, swept projectile hits, residual danger, impact/wreck/repair, stock loss and active save continuation. A production browser route builds a solar/laser pair, operates it, enables automation, survives a drill and reloads the resolved checkpoint. Human difficulty, mix and readability feedback remains necessary.
