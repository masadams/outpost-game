# Phase 1 — The first storm

**Story:** I built an Observatory, saw something coming, prepared, survived the impact and learned from what it left.

## Slices
| # | What | Status |
|---|---|---|
| P1.1 | Storm simulation: a seeded set of rocks that travel in from far away, enter the existing meteor physics and can hit the colony. Saved and restored. | Done (disarmed until P1.2 arms it) |
| P1.2 | Observatory building; observing narrows the arrival time and bearing. Nothing is known without it | Done |
| P1.3 | Warning in plain language: countdown card, map and radar markers with uncertainty | Done (map window marker still to do) |
| P1.4 | Preparation in the focus set: laser turret, manual interception from the ship, power reserve | Planned |
| P1.5 | Aftermath: meteorite fragments to recover, analyse one for a research unlock; full playthrough test | Planned |

## Design (P1.1)
- The storm is a set of **real bodies**. Far away they fly straight (no gravity modelled outside the local region). At 14 km from the planet each one is handed to the existing meteor physics (gravity, drag, swept terrain, ship and shield hits) with exactly the state it had.
- The plan is made once, from a fixed seed, when the storm is first needed. Each body's entry direction is adjusted by simulating its fall, so some bodies land near the colony, some miss and some strike far from it.
- The first storm reaches the planet at a fixed time (`STORM.arrivalTime`). Bodies appear in the far field `STORM.lead` seconds earlier, which is the warning window an Observatory can use.
- The opt-in defence drill (N) stays as it is, hidden in the focus set.
- Saves: storm state is part of the checkpoint (version bump; no migration).

## Not in this slice
Observation and uncertainty (P1.2), any UI (P1.3), balance of damage (P1.4).
