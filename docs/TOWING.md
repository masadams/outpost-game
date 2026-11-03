# Asteroid towing — alpha 0.9

The first ship utility upgrade makes earned mobile logistics playable. Fabricate a rig in **Cargo** while piloting the landed ship on the home pad. It consumes **16 alloy + 6 wire + 3 components**, respecting protected turret stock. Those 25 kg become 25 kg of installed equipment in ship mass; installation does not grant fuel, ammunition or ore. New/older ships start without it.

## Latch, haul and release

Fly within **180 m** of an asteroid, match relative velocity to **15 m/s or less**, then **Y**. The nearest eligible rock is selected deterministically. The path must clear the planet and the body must be outside hull contact range. Cargo shows nearest-rock distance/relative speed before capture, and resource/mass, cable length, tension and stretch afterward.

The cable's rest length is the current separation at latch, with a 12 m minimum. Latching adds no velocity impulse. Gentle thrust takes up slack and pulls the rock; both ship and asteroid receive equal/opposite cable impulses. Gravity, atmospheric drag and swept ship/rock contacts remain active. The target is not added to hull mass a second time: its inertia acts through the cable. A landed ship is anchored to the planet, which takes its opposing impulse.

Y releases without stopping either body. Haul rocks nearer home, release and use normal mining/tractor/landing/unloading to obtain ore. Towing never converts a body directly into inventory or freezes it in place. Mining a connected parent/fragment severs the attachment; no automatic attachment jumps to a newly created child.

## Limits and failure

The spring uses 90 N/m and damping 80 N per m/s; tension never pushes a slack cable. It snaps above **6,000 N**, more than **35 m** beyond rest length, on terrain occlusion, on ship impact/crash or loss of the target. A failed attachment increments the break counter once. The field body remains unless ordinary mining/impact resolution removed it. Rig installation survives; cable mass/spooling is abstracted within the fixed equipment mass, with no consumable cable inventory in this slice.

The cable turns amber/red as tension or stretch approaches its limit. Latch/release/snap have separate procedural cues and obey mute/pause. Cable collision covers the planet, not other rocks or buildings. There is no reeling, multi-target attachment, powered winch, autonomous pilot or drone. All bodies remain fully simulated within the existing bounded prototype field.

**Coast prediction is suspended while attached**, with an explicit status. The existing single-ship predictor does not simulate a coupled cable; showing that path would be misleading. Release the tow to resume J prediction. Landing/fuel instruments still show actual ship conditions.

## Persistence and playtest

K/L and reload preserve the paid rig, active target, length, tension and break count. Version-8 checkpoints retain prior colony policies, schedules, combat and depletion; versions 1–7 gain an unfitted rig and empty cable state. Unsupported/malformed cable references or equipment are rejected. Recovery still costs supplies, loses carried cargo and preserves paid equipment; it releases any cable. R resets the sandbox/equipment while keeping the saved checkpoint.

Try installation with mouse and Tab/Enter, launch toward the starter field, check distance/relative speed in Cargo and latch with Y. Apply gentle thrust and watch strain, then release. Save/reload an active tow paused. Try impacts/terrain and mine the attached body. Simulation regression completes fracture/collection, a controlled return/landing and unload with resource conservation; browser checks cover paid equipment and actual cable controls/persistence.

The next scheduled colony addition is [oxygen habitat coverage](UPGRADES_AND_DOMES.md), followed by the broader ship-upgrade interface and shield domes. These are planned systems, not hidden features in the towing rig.
