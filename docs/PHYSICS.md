# Alpha 0.4 physics model

The fixed planet supplies the same continuous radial gravity to the ship, airborne suit, asteroids, fragments, incoming meteors and ore. Outside its 1,800 m radius, acceleration is `−mu * position / distance³`, with `mu = 16,200,000 m³/s²`. Surface gravity is 5 m/s². Inside the radius, a uniform-density model makes acceleration proportional to position and zero at the center. The surface contact constraint supports landed bodies and grounded walking.

This is a deliberately tuned arcade world, not an astronomical planet-density or atmosphere-retention model. The planet does not move or rotate. Objects do not gravitationally attract one another; they interact through contacts, mining, capture and the powered tractor. Colony facilities are supported surface markers, without rigid-body dynamics.

## Air and propulsion

Air is stationary in the planet frame. Density starts at 0.08 kg/m³ and falls exponentially with a 320 m scale height. A smooth cutoff across 900–1,200 m reaches exactly zero in space. Quadratic drag opposes velocity, using `rho * CdA * speed² / 2`; its per-step decay cannot reverse motion or add kinetic energy. Mass therefore affects drag and thrust acceleration, while gravitational acceleration is independent of mass. Ship mass includes fuel and cargo; fuel expenditure reduces it. Ship drag area is 8 m², suit 0.7 m² at 100 kg, and rocks/ore use 0.47 times their circular area. These collision/drag areas and ore masses are gameplay approximations.

All dynamic body classes use the same environmental integrator at 60 Hz. Gravity/thrust update velocity before quadratic drag decay, then position advances. Vacuum has no arbitrary linear drag. Ship angular damping represents steering assistance; there is no lift, aerodynamic torque, wind, atmospheric heating or rotating-air energy exchange. Tractor acceleration transfers an equal/opposite impulse to the ship; capture combines momentum. Safe landings, crashing and supported ground movement deliberately impose gameplay contact constraints.

## Trajectory and camera

J shows a dashed coast path with all controls released. The predictor clones the ship and calls the exact live fixed-step ship integrator, including air, gravity, spin damping and terrain contact. It refreshes at 5 Hz while running and stops at first terrain contact or 180 seconds. It never changes the world. Rocks, pickups, tractor impulses, subsequent fuel burns and other future inputs are excluded, so powered flight or traffic can deviate from the line. The arrow shows current velocity. The contact marker reflects predicted landing classification, not a guarantee of safety around traffic.

Wheel/−/+ selects manual zoom from 0.035× to 5×; 0 restores automatic zoom. Zoom works while paused. Local-up camera orientation blends into the inertial frame over 900–1,800 m altitude. Atmospheric haze is one cached procedural texture to avoid repeatedly filling large translucent discs.

## Measured practice flights

In the ship-only simulation with a clear flight path, a 6.5-second vertical burn peaks at roughly 459 m. With early descent braking (target at most 30 m/s, reducing toward 2 m/s near ground), the simulation returns safely in about 49 seconds, entirely in atmosphere. A 10-second burn peaks at roughly 1,671 m and returns in about 127 seconds, with about 74 seconds in atmosphere. In the live world, clear the starter deposit with Space or steer around it first. These are repeatable simulation profiles, not a promise that arbitrary manual braking gives the same result. At 1,600 m altitude circular vacuum speed is about 69 m/s. A low atmospheric orbit decays.

## Checkpoint compatibility and verification

Version-1 worlds used a 600 m radius. Loading one preserves altitude and local radial/tangential velocity, reorients ship attitude, and preserves signed surface arc distances from home for actors and buildings. Supplies, asteroid IDs/depletion and production state remain intact. Signed arc mapping has a far-side seam and cannot preserve every pairwise distance around the whole circumference. New gravity/air change old trajectories. The load pauses for inspection; storage is untouched until K writes version 2 with its environment metadata. New saves do not migrate twice.

Tests check inverse-square/exterior and finite/interior gravity, shared vacuum acceleration, density continuity, drag dissipation, a full orbit's bounded energy error and angular momentum, tractor/capture and nonfatal collision momentum, exact coast prediction, touchdown timing, surface sweeps and legacy save preservation. Full mining-return regression still uses ordinary control inputs. Production browser checks cover the actual controls, audio, zoom, migration and prior gameplay loop. Other browsers and human handling/mix judgments remain playtest work.

## Defence additions

Incoming meteors use the same quadratic drag and gravity, with swept terminal terrain impacts rather than mineral-body bounce. The 120-second meteor predictor calls that same step and excludes interception/ship contacts. Impact damage is an arcade radial blast scaled from contact kinetic energy; weapons inject energy and may disperse matter into non-collectible dust. Flak/missiles use shared environment integration and swept relative contacts; missiles add bounded guidance acceleration without a detailed propellant model. Weapon energy/ammunition are consumed from colony stocks. See [DEFENCE.md](DEFENCE.md). Current checkpoints use version 3 for active defence and damage; the version-1/2 migrations described above remain supported.

## Ship combat additions

Ship mass now includes the finite magazines (initially 6.5 kg). Fired projectiles inherit ship velocity; recoil preserves launch momentum using the remaining ship mass. Cannon/missile round masses match ammunition material costs. Gravity/drag remain shared, and first projectile contacts are swept against relative actor movement and terrain. Ship/drone contacts reuse the ship/rock impulse solver. Drones have finite fuel/ammo and bounded vectoring thrusters independent of gun attitude; missiles have bounded guidance, without detailed propellant or thermal simulation. Capacitor generation and radiative cooling are tuned gameplay budgets, not a closed thermochemical model. Both weapon variants have tested normal-input fight/return/paid-service profiles. Current checkpoints use version 4 and preserve earlier migrations. See [COMBAT.md](COMBAT.md).
