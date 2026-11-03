# Research and ship equipment — alpha 0.13

Task 008 implements Phase 8.1 on `feat/ship-progression`, following open discovery #18 and Command #17. Shields are the next separate milestone. This adds actual research and equipment; it does not complete the wider campaign/balance work in Phase 8 or the Phase 9 graphics/UX/UI overhaul.

## Research

Build a **Research lab** from Colony's palette button or Command's paid construction queue. It costs **6 alloy + 3 wire + 2 components**, uses a normal 20 m footprint, and follows placement/damage/repair/salvage rules. The existing solar array supplies 8 kW; an active lab asks for 4 kW at full rate. Empty/disabled/wrecked labs do not research.

| Technology | Prerequisites | Alloy / wire / components | Work | Unlocks |
|---|---|---|---:|---|
| Applied materials | None | 4 / 2 / 1 | 15 s | Cargo rack, impact armour |
| Propulsion systems | Materials | 6 / 3 / 1 | 20 s | Engine, extended tank |
| Powered extraction | Materials | 6 / 3 / 1 | 20 s | Mining head, long-range tractor |
| Combat engineering | Propulsion + extraction | 8 / 4 / 2 | 25 s | Cannon coil, cooling pump |

Open **Command → Research**. Starting pays samples once from unreserved stock; prerequisites must already be completed, and duplicate completed/queued technology is rejected. The first unpaused project works in facility priority order. Only one enabled, healthy lab contributes each tick, so lab stacking cannot duplicate progress. If a high-priority lab cannot fund work, a later eligible lab can take over. Lab power limits scale both energy and work: 50% uses 2 kW and takes twice as long. Protected energy is left for essential systems. Labs compete with other industry according to Command ordering; one lab cannot also advance a second project in the completion tick.

Every work second costs 4 kJ. Completed technologies need 60/80/80/100 kJ respectively. Queue progress and total research energy spent are real saved state. Pause yields to the next unpaused eligible project; game pause freezes all work and disables edits. Cancellation refunds only `samples × (1 − progress/duration)` if every product fits, once. No energy refund. Completion consumes the entire samples and unlocks equipment permanently, without granting the equipment itself. Destroying or rebuilding a lab never refills samples, clears paid work or erases knowledge.

## Equipment fabrication and removal

Open **Command → Ship equipment**. Each module has an explicit comparison, mass, prerequisite, fabrication cost and reason when unavailable. Installation requires the landed ship at the home pad, while piloting or with healthy grounded crew within 20 m. The home fabricator spends **20 kJ unreserved grid charge** plus materials immediately; base storage holds exactly 20 kJ, so reserve goals may require a battery or releasing charge. The home fabrication tool is available independently of whether a lab remains intact after research. Each module is binary: one installed at most, with no bonus stacking or slot duplication.

| Module | Alloy / wire / components | Dry mass | Behavior and tradeoff |
|---|---|---:|---|
| High-thrust engine | 8 / 4 / 2 | 14 kg | 18.2 kN and 1.04 kg/s instead of 14 kN and 0.8 kg/s; same thrust/burn ratio, higher peak acceleration |
| Extended fuel tank | 6 / 3 / 1 | 10 kg | 320 kg capacity instead of 240; starts with existing fuel, loaded fuel adds real mass |
| Cargo rack | 6 / 2 / 1 | 9 kg | 200 kg hold instead of 120; rack/ore reduce acceleration |
| Powered mining head | 8 / 4 / 2 | 14 kg | 550 m range and 1.5× damage rate; 6 kW ship-cell draw + 4 heat/s while beaming |
| Long-range tractor | 6 / 4 / 2 | 12 kg | 360 m instead of 260; weaker 28 m/s² force cap instead of 35, 3 kW + 2 heat/s while active |
| Cannon coil | 8 / 3 / 2 | 13 kg | 24 damage instead of 18; 12 kJ + 22 heat instead of 8 + 16 per shot, same ammo/mass/recoil |
| Cooling pump | 6 / 4 / 2 | 12 kg | 30 heat/s dissipation instead of 20; capacitor recharge falls from 12 to 9 kW to run the pump |
| Impact armour | 10 / 2 / 2 | 14 kg | 20% lower future hull damage; no healing or relaxed touchdown/hard-crash limits |

The material sum equals each module's dry mass. All eight add 98 kg. Existing fuel, hull, ammunition, heat and cell charge are preserved on installation; extra capacity does not come full. Base behavior stays identical with no modules. Extra mass participates in shared thrust/drag, body collisions, tractor/salvage momentum, recoil and coast prediction. Attitude control and landing tolerances retain their existing model.

The mining head stops if its cell cannot pay a full fixed-step draw or cooling is locked; an empty beam still costs energy. The tractor's field activation pays once per fixed step, not once per ore stack, and its existing equal/opposite force and collection momentum apply to all affected pickups. The built-in ship recharge model remains the source of cell energy; tools compete with combat, and nominal cell/heat costs are gameplay power budgets. Cannon damage is stored on the projectile when fired, so later equipment changes do not rewrite old rounds. Armour affects terrain impacts, rock/site/drone collisions, incoming projectiles and colony-area damage; catastrophic/overturned terrain impacts can still crash immediately.

Removal is performed at the same home shop and returns **50% of fabrication materials × hull/100**. The remainder is scrapped. It grants no energy or new technology. A rack cannot be removed above 120 kg cargo: unload first. Removing a tank returns fuel above the base 240 kg into colony fuel stock; if fuel or material salvage cannot fit, nothing changes. Repeated removal/install cannot duplicate refunds or fuel. Supplied Backspace recovery retains installed modules and the tow rig, but keeps the existing costs, 30 hull, at most 20 fuel and lost cargo; it does not fill extended capacities.

Fuel alarms/percentages, cargo HUD, beam/tractor ranges, normal/tender refuelling and checkpoint limits use actual equipped capacities. Research completion and installation/removal use the shared pause/mute-safe production/build/demolition cues. Equipment cards remain native keyboard controls inside Command; Enter/Space must not fly, jump or place a building.

## Saves and playtest

Version 12 preserves unique modules, completed research, committed queue samples/work, energy spent and per-round damage. Versions 1–11 receive empty research/equipment without changing supported inventory, habitats, neighborhood depletion, Command orders or the paid tow rig. Validation rejects duplicate/unknown/unresearched modules, invalid prerequisites, active progress at/above completion, oversized capacities and malformed project/round data. UI expansion/focus remain transient. No offline research.

1. R, F; walk right to about 100 m. B/Enter builds solar; T then choose **Research lab** and Enter. B closes construction. The starter kit can fund this plus materials research and a cargo rack; later branches need more production/mining.
2. Open Command → Research. Start Applied materials. Confirm supplies commit, actual lab power/work advance and pause/K/reload keeps unfinished progress. Disable or throttle the lab, raise power reserves or damage it: work must wait/slow without reset.
3. Finish materials, return to the home ship and board. Open Ship equipment and fabricate Cargo rack. Compare mass/capacity/cost; check the Cargo panel shows 200 kg and hull/fuel/ammo remain unchanged.
4. Build manufacturing, mine supplies and complete propulsion/extraction, then combat. Compare the eight modules' actual costs; keep enough grid charge above reserves for fabrication. Fly with a heavier loaded rack/tank and compare engine thrust/burn.
5. Buy fuel from existing stored fuel or the finite tender into the extended tank. Remove at home: extra fuel must return to storage, or removal must block if it cannot fit. Full stock blocks material salvage too. Excess raw cargo blocks rack removal.
6. Try mining/tractor alongside weapons and watch cell/heat. The coil spends the same ammo but more energy/heat per higher-damage shot. Armour reduces damage but never makes a hard landing safe. Save before opt-in combat.
7. On a disposable save, recover a wreck: modules/research persist, cargo is lost and extra capacities are not filled. K/reload should preserve active research/equipment; R starts a fresh sandbox while L restores the saved one.

Automated coverage includes research power/prerequisites/caps/cancellation/transfer, materials/energy/mass, every module's payment and non-stacking, engine/capacity/tool/weapon/damage effects, storage-safe removal, supplied recovery, invalid/current saves and 30/144 Hz equality. Browser routes earn research from a normally built lab and fabricate at home, then exercise all eight modules and paid extended-tank fill/removal/restoration. Human feel, economy tuning and the full presentation overhaul remain later work.
