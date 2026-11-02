# Alpha 0.4 ship combat

Save with **K** before experimenting. Launch above 200 m, clearing the starter deposit with Space or steering around it, then **O** starts a hostile drone patrol. Attacks never start automatically. Only one patrol can be active; wait for live drones/projectiles to resolve before another. **Shift** fires, **Z** switches cannon/missile, and **Space** remains mining. Stay upright for the first encounter: the first drone appears about 320 m ahead of your nose.

## Fight and disengage

Drones approach a roughly 300 m stand-off distance, turn their guns toward a leading aim point, then display a red aiming line for 0.9 seconds before firing. The warning strip names approaching/aiming/disengaging behavior, and red radar squares track drones off screen. Turn and thrust to dodge; the usual gravity, air drag and inertia still apply. A damaged drone retreats. Landing, leaving the ship or outrunning the engagement makes drones disengage; disengagement and accidental terrain losses do not award kills. Existing hostile shots remain dangerous until impact/expiry. There is no automatic victory teleport or free repair.

| Weapon | Magazine | Energy | Heat | Interval | Speed | Rearm materials per round |
|---|---:|---:|---:|---:|---:|---|
| Cannon | 40 | 8 kJ | 16 | 0.18 s | 260 m/s | 0.1 alloy |
| Guided missile | 2 | 25 kJ | 38 | 1.2 s | 150 m/s | 1 alloy + 0.25 components |

The 100 kJ capacitor regenerates at 12 kW; heat dissipates at 20 units/second. Reaching 100 heat locks firing until heat falls to 35. Burst fire preserves charge and avoids the lock. These are prototype auxiliary-power/radiator abstractions, without a detailed reactor fuel or thermal model. The magazine cannot replenish without supplies. Fresh/migrated ships receive one finite starter loadout; current-version saves never refill it on load.

Cannon rounds deal 18 damage; drones have 48 hull. Missiles deal 55 within a 55 m blast radius and acquire a visible drone inside a forward cone of about 37° and within 1,400 m. A missile whose target disappears coasts until contact/expiry. Missiles expire after 12 seconds, cannon rounds after 5; spending a round is never refunded. Defensive weapon blasts do not harm the player/colony. Hostile cannon rounds deal 10 ship damage, 15 suit damage, or a small colony blast at a ground impact. Mineral rocks and terrain block shots; combat damage can fracture mineral rocks and intercept meteors using their existing destruction rules. Projectiles do not collide with ore pickups.

Drone thrusters vector independently of gun/body attitude, supplying at most 4 kN with finite fuel. Each drone starts with 24 rounds and 50 kJ, regenerates 6 kW, and spends 10 kJ per shot; firing also requires alignment, range and a clear planetary horizon. Projectile paths use shared gravity/drag and swept relative contacts. Ship/drone collisions reuse the ship/rock impulse response. Drones disappear after they have disengaged; wreck visuals/dust do not grant collectible loot in this phase.

Patrol tier is capped at three: base tier one, plus one per 40 kg delivered ore, six operational colony facilities, or 3 km of recorded flight altitude. There are at most three drones and 96 combat projectiles. This is development-linked opt-in escalation, not a campaign or background raid director.

## Repair, rearm and recover

Return safely and **E on the home pad** repairs hull first (1 alloy/10 hull), then fabricates cannon rounds and missiles up to what the remaining stock can afford. Fuel still needs manufactured fuel. The home suit-service terminal and a supplied nearby built service station can rearm the landed ship as part of their normal service; their existing repair/power/range rules remain. No airborne or remote replenishment is provided.

If the ship is lost, **Backspace** spends **8 alloy + 2 components** to tow it home with 30 hull. You lose carried cargo, retain the remaining magazines, retain at most 20 of the fuel still aboard, and start with an empty capacitor. Recovery ends the hostile patrol without awarding kills, but does not cancel a meteor drill or reset the colony, storage or mined deposits. It does not grant free fuel/ammunition. If unaffordable, L restores your manual checkpoint paused; R resets the runtime sandbox while keeping that checkpoint.

## Saves and verification

Version 4 persists the full active encounter, drone fuel/ammo/aim/windup, projectile targets/lifetimes, heat/energy/magazines, counters and costs. Versions 1–3 gain a peaceful combat state and starter loadout; v3 defence progress and the earlier planet migration are preserved. Loading pauses and clears cosmetic flashes; it never starts a new encounter or rewrites the slot until K.

Simulation regressions fight with both weapons, take damage, return and pay for repair/rearm using normal flight inputs. They check recoil momentum, ammunition mass, fire/heat/energy limits, drone telegraph/cadence/retreat, escalation, swept hits, terrain occlusion, render-rate independence, supplied recovery and live-save continuation. The production browser route covers launch, opt-in combat, pause, weapon switching, ammo/heat feedback, victory and reload. Human handling/difficulty/readability and the mix still need playtesting. See the [initial presentation audit](PRESENTATION_AUDIT.md) for the required overhaul work.
