# Growth run 7 (draft): choose what comes after a wide world

Follows `growth-run-6.md`. The world is now wide (three to four bodies, belts, air, probes, pods, drones, storms, a star) and the base can grow in place. The agreed order says ship engineering (Phase 3) follows once the world is wide enough. Nothing here starts until the direction is confirmed.

| # | Slice | Link | Status |
|---|---|---|---|
| J1 | **Decide the next direction.** Either start Phase 3 (modular ship roles: scout, miner, interceptor) or spend a run on the open gameplay questions (the fun items, pacing, what the first hour feels like). | Design authority. | Needs a decision |
| J2 | **Hands-on screenshot pass.** A scripted pass of Ember, drones, relay placement and the pods over a long run. | Hands-on pass. | Planned |
| J3 | **Phase 3, first cut.** Ship profile and role line in the fitting screen (done). Pre-flight check still to do. | Phase 3. | In progress |

Not in this run: new star systems, terraforming.

## Phase 3 audit (J1 chosen: start Phase 3)
- Slots: nine constrained slots, 25 parts, paid fabrication, salvage and saved state already exist (3A decided: constrained slots, not a free editor).
- First cut of 3B: `src/sim/shipProfile.ts` works out lift, loaded lift, delta-v, hold, mining, cannon and armour from the fit, and names the job the ship is best at (Scout, Miner, Interceptor, Hybrid, or Standard lander). The fitting screen says what a selected part would turn the ship into.
- Next: pre-flight check that compares a trip's fuel to the ship's delta-v; role-specific gaps found in play (miner ascent with a full hold, scout fuel range).
