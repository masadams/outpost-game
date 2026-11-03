# Colony resource priorities — alpha 0.8

Open **Colony → Resource priorities** while on foot or piloting. The native disclosure stays open as telemetry updates. Four zero-default policies protect existing resources; settings do not create stock, enlarge storage, order production or prevent damage. Controls are disabled while paused. Settings can be released remotely even after the ship crashes.

| Reserve | Step | Meaning |
|---|---:|---|
| Essential systems power | 5 kJ | Rigs, refineries and fuel processors leave this battery charge untouched. Turrets, supplied service and habitat life support can spend it; habitat backup charging cannot. |
| Ship delivery room | 25 kg | Rigs leave this much physical raw-ore capacity empty; ship unloads may use it. |
| Turret alloy | 5 kg | Construction, building/ship repair, ship rearm and recovery spend only alloy above this floor. Turrets can spend the reserve. |
| Turret components | 1 kg | The same material protection for components. |

Each goal ranges from 0 to 1,000. Targets above available capacity may halt industry; lower the goal or add capacity. Existing inventory is never evicted when a reserve grows. Actual stocks and charge can be below a goal, including after firing or damage. The available-budget readout shows industrial charge, rig room and unreserved materials after protection. Refinery replenishment targets remain separate and must be set high enough if you want to manufacture replacement defence stock.

## Allocation and physical limits

Generation still charges the shared capacitor/batteries. Industrial consumers run in placement order against charge above the reserve; turret fire follows with access to actual remaining energy. Supplied service retains its existing interaction/range and 2 kJ requirement. This is protected battery charge, not a reserved generation rate or a guarantee that every turret can fire. A reserve equal to the 20 kJ base capacity prevents industry from operating until released or more capacity is built. Disabled/wrecked generators cannot charge it.

A rig's output room is physical free ore capacity minus reserved delivery room. It can finish with a fractional final amount, debiting the seam only for ore delivered. **delivery reserved** distinguishes held space from **output full**. Ship unloading uses physical free capacity, transfers partial stacks and leaves overflow aboard. Refining can consume existing ore to free space. A ship can fill the protected room, temporarily stopping rigs.

Industry shows **power reserved** when actual charge could cover the next step but the policy prevents spending it; ordinary **no power** still means insufficient actual charge. Interrupted partial cycles remain paid and resume without switching recipes or duplicating inputs. Impact wrecking now retains this progress through supplied repair, matching the documented scheduling behavior. Demolition still discards the machine and its incomplete work; seam reserves remain independent.

Material protection applies to all non-turret consumers of manufactured alloy/components, including explicit construction, repair and paid ship recovery. Home emergency suit/iron service still uses its existing raw-iron rules. Fuel and oxygen retain their existing supplied-service behavior. Turrets consume actual protected material using the normal per-shot cost, cooldown and projectile limits; no free ammunition is created. If recovery is blocked by a hold, open Colony from the wreck and lower it.

Battery/storage destruction still clips inventories to surviving capacity and reports losses. Policy does not shield inventory; configured goals remain so users can see and adjust them after damage. Zero policy reproduces the previous allocation behavior.

## Playtest route

1. On the fresh pad, open Colony and expand Resource priorities using mouse or Tab/Enter. Raise power reserve to 20 kJ while still in the ship.
2. F exits. Walk about 100 m right, B/Enter builds solar, T then select Mining rig and Enter builds on the iron seam. Close B and approach the rig. It should show **power reserved**, without consuming the seam.
3. Lower power reserve to zero: extraction resumes. Raise delivery room to 400 kg: **delivery reserved** stops the rig without losing ore. Lowering it releases output space. On a working colony, leave 50 kg and unload a ship to verify that delivery can fill that room.
4. Hold alloy/components, then attempt an otherwise affordable construction or repair. Check the blocked explanation and usable budgets. Turret fire may still consume those supplies. Release holds to resume construction, repair or ship rearming.
5. K saves settings and blocked partial work. R resets runtime to zero policy; L and browser reload restore the saved policy paused. P resumes. Expanding/collapsing the disclosure is runtime UI state and is not saved.

Version-7 checkpoints preserve policy, schedules, cycle progress, depletion and combat. Versions 1–6 keep their supported progress with zero reserves. Invalid, missing-field or out-of-range policy objects are rejected. No autosave or offline output is added. The global bus, constant solar and non-solid buildings remain prototype limits; mobile drones/towing and the full graphics/UX/UI overhaul remain future work.
