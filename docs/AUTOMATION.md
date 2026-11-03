# Refinery scheduling — alpha 0.7

Built refineries can automatically replenish manufactured stocks. This uses the existing paid facilities, raw ore, power and recipes. It adds no recurring free supplies or offline production. The world keeps simulating while the player flies; pause stops all work.

## Configure

Walk within 18 m of a refinery and open Colony. **Auto recipes** toggles scheduling. Five target rows set desired amounts in shared manufactured storage, using minus/plus buttons in 5 kg steps from 0 to 1,000 kg. Targets do not expand storage: a goal above capacity waits for room. Each refinery keeps its own policy, with defaults of 20 alloy, 10 wire, 5 components, 10 water and 5 oxygen. New and older refineries begin in manual mode.

Mouse clicks and native Tab/Enter/Space work. Controls are disabled while paused or away from a usable refinery. Turning automatic mode off retains the selected recipe and incomplete progress. **V** explicitly chooses the next manual recipe, turns scheduling off and resets incomplete progress, preserving the existing manual-cycle behavior.

## Selection and blocking

At a batch boundary, scan recipes starting from the saved cursor. A recipe is needed if any of its output stocks are below that refinery's target. Select the first needed recipe with all inputs and room for every output. After completion, advance the cursor to the following recipe, so a continuing iron deficit cannot starve available copper, component or ice processing.

If no recipe can run, show the first outstanding goal's normal no-feedstock/output-full status. If every goal is met, show **target met**, draw no production power and keep watching stocks. Spending a product below its target restarts replenishment. Generation, batteries and per-step power allocation still work in placement order; scheduling does not grant power priority.

Once a paid cycle starts, its recipe stays selected until completion. Missing inputs, power loss, full output, disabling or damage retain its progress. The scheduler waits rather than switching a partially completed cycle and losing its paid work. Ore is still consumed only when a complete batch reaches storage. Parallel factories share actual input stock, so they cannot both consume the final unit.

Targets are replenishment goals, not exact quotas or inventory reservations. Already-active batches may finish after another factory fills a target or the user lowers it. Such batches can exceed the goal, but never storage capacity. Ice always yields both 0.7 water and 0.3 oxygen: either deficit can request ice, both outputs require room, and one product may exceed its goal to supply the other. Consume excess co-product or add storage if it blocks production.

## Fresh-build playtest route

1. F exits; walk about 100 m right of home. B/Enter places solar near 125 m.
2. T, select Mining rig, Enter places the rig near 157 m. T, 4, Enter places a refinery near 189 m.
3. Walk right to about 130 m while the palette is open; its preview follows the crew. Select 1 and Enter to add solar around 221 m. Two arrays supply 16 kW for the 6 kW rig and 4 kW refinery. The 96 m construction reach prevents extending indefinitely from one position.
4. Close B, approach the refinery and use Auto recipes. For an iron-only line, set wire/components/water/oxygen targets to zero. Set an alloy goal above current stock; watch it fill and stop while raw iron continues accumulating.
5. Raise the target, interrupt power or disable the factory, then resume. Save an active cycle with K; R/L and browser reload should restore its policy, reserve and progress paused. P resumes; V switches back to manual.

For mixed scheduling, unload copper, silicon/rare metals and ice or add surface rigs. Watch the current recipe rotate only between completed batches. Ice still feeds normal water/oxygen/fuel processing and supplied ship refuelling; automatic mode adds no alternate conversion rates.

## Persistence and remaining work

Version-6 checkpoints retain each configured refinery's enabled state, targets, selection cursor, selected recipe and cycle progress. Versions 1–5 retain their supported progress and existing manual refinery behavior; v5 surface depletion and combat state are preserved. Malformed policies and schedules attached to other building kinds are rejected. The browser slot remains `outpost.checkpoint.v1`.

Global power/material transport, constant solar and non-solid circular-surface buildings remain prototype limits. The next [resource-priority slice](COLONY_PRIORITIES.md) adds protected battery charge, delivery room and turret-material floors. Mobile drones/towing remain future Phase 7 work. The required full graphics/UX/UI overhaul and human usability/economy tuning remain planned.
