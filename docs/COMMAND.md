# Central Command — alpha 0.11

Task 007G implements the Phase 7.75 console on `feat/command-console`, following merged landing feedback #14, towing #15 and oxygen habitats #16. Open **Command** in the operations navigation from ship or surface. The right-hand console keeps the central flight corridor, instruments, region and threat/air warnings available. It does not pause gameplay.

## Operations and power

The overview follows Solar → stored bus → requested load, with real energy/capacity and an estimated time-to-shortfall. Requests are conditional on available stock/room/targets; burst averages and future actions make this an estimate. Facility alerts identify power, feedstock, storage and damage problems. Locate/select buttons associate surface arc positions with facility IDs and highlight the actual building. Rows support dragging before another row, plus equivalent ↑/↓ native controls. Logical focus follows the same facility when reordered.

Select a facility to enable/disable it, change refinery recipes or automatic stock targets, toggle turret automation, or request supplied service. These actions address IDs directly, without moving the player or spoofing a nearby interaction. Recipe changes retain the existing rule: manual selection discards partial work; throttling/starvation retains it. Disabled/wrecked machines retain the same consequences. Capacity buildings remain passive. Service uses 2 kJ and real supplies; it requires crew on foot within 18 m or a landed ship within 80 m. A distant crew is not healed/refilled just because a nearby ship receives service. Repairs and manual turret aiming still require physical presence.

Power sliders cap solar, refineries, fuel processors, rigs and habitat grid draws, in percent of rated kW. At 50%, solar produces half power and industry spends half power while completing half as much work per second, preserving recipe mass/energy costs. Zero holds work. Habitats still need their full rated support: a restricted grid draws the difference from already charged backup; charging stops while capped. Empty backup cannot grant partial/free air. Turrets/service have explicit per-action energy costs rather than a fictional continuous cap.

Dispatch is deterministic. Essential habitats run first in priority order; all essential loads precede backup charging. Backup charging respects the protected energy reserve. Continuous industry follows priority order and leaves protected charge. Turret bursts follow their own priority order using protected energy/materials. Priorities do not move industry ahead of essential support or bypass reserves. Unconfigured facilities preserve the prior insertion order, with IDs resolving configured ties. Actual/requested kW are last-step telemetry; turret delivered power is an instantaneous pulse, so the card shows its real kJ/shot.

## Construction and economy

Choose a blueprint and a signed surface distance from home, then **Queue paid construction**. There is a 16-order queue and a shared 48-facility-plus-order limit. A valid/invalid world ghost, fabrication cost and placement message precede payment. Enqueue validates real sites, materials, reserves, future footings, terminals, pad and finite seam coverage. It pays all fabrication supplies immediately, holding them as implied escrow. Reserved footprints block conflicting queued and manual sites.

One living, stationary, grounded astronaut within 96 m of the site does **8 seconds of manual work** per order. No power is required for this crew tool, allowing the first solar array. Being in the ship, moving/jumping, leaving range or dying stops work. The first unpaused order waits if blocked; pausing it yields to the next. Completion revalidates the site/deposit, creates one facility with normal empty habitat buffers and clears the order. A depleted seam never refills or grants a rig for free.

Cancel refunds `blueprint cost × (1 − work/8)` once; worked supplies are lost. Unstarted orders refund fully. Cancellation is blocked until product storage can accept every refund. Damage or changed reserves never create a second deduction. Queueing can plan remote sites but never teleports workers, buildings or repair supplies. Existing direct local construction stays compatible with earlier playtests; drones and group orders are future work.

The economy ledger shows raw/manufactured stocks, usable quantities after material reserves, ore/product capacities and observed net stock change per simulated second. This includes deliveries, construction/refunds, production and habitat transfers; it is not gross manufacturing throughput. Sampling and selection are presentation state and reset on a new world/load; closed-console samples average over the elapsed simulated interval. Recipe work and flows remain visible in the selected facility. Protected energy/delivery targets and cumulative habitat gas usage are explicit.

Pause freezes work/flows and disables command edits, while allowing selection/inspection. Dragging, arrows, Space/Enter and field typing cannot steer/fire; P, K/L, M, H and Escape remain global controls. No offline progress. Version-10 checkpoints preserve queue work, dispatch caps/order and simulation time; versions 1–9 get an empty queue without changing supported inventories, equipment, habitat buffers or prior progress.

## Playtest

1. Open Command from the ship. Queue solar at **120 m**; confirm the starter alloy drops from 28 to 24 while the order waits for crew.
2. F exits. Walk right to within 96 m of the order and stop; eight seconds of stationary work completes it. Inspect its world highlight and actual generation.
3. Queue a battery at 160 m. Pause, save with K, reload and confirm it retains work/escrow and stays paused. Resume with P and finish, or cancel to test the proportional refund. Full storage must block a refund rather than destroy/duplicate it.
4. Build/queue refineries and supply ore. From the ship select one, disable it, switch manual recipes or enable targets. No walking between facilities is required. Switch selected facilities after moving a power dial; it must show each facility's own value.
5. Set solar to 50%, leaving 4 kW. Two full-rate refineries now compete; drag the second before the first, then repeat with the native ↑ button. Work follows priority without clearing the losing machine's partial progress.
6. Inspect Economy, protected reserves, alerts and a habitat power cap. Its finite backup supplies a real shortfall and then air returns to the suit. Service cannot heal a remote astronaut.
7. Check Command at 900×600, 1280×800 and 1920×1080. The panel scrolls, flight/life support remain readable, and editing/dragging does not fly/fire.

Automated coverage adds remote operations, power/work accounting, priority scarcity, habitat backup, physical service range, queue payment/worker/footprints/refunds/depletion, invalid/active/legacy saves and 30/144 Hz equality. Production-browser routes cover mouse/keyboard/drag controls, selected dial/focus stability, pause, actual queue work and restoration. Human usability/balance and the full Phase 9 art/UX/UI/audio overhaul remain scheduled. Research/navigation controls join this console with their actual systems; current selection is one facility at a time.
