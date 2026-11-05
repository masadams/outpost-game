# Task 007C — Colony resource priorities

Continue Phase 7 after finite planetary mining and the refinery-scheduling slice. Scheduling PR #12 merged during implementation; base this slice on main and do not merge automatically.

- Add zero-default configurable reserves for industrial battery use, raw-storage delivery space and turret alloy/components. Bound each setting to 0–1,000 in visible steps, with native keyboard/mouse controls.
- Rigs/refineries/fuel processors can spend only charge above the power reserve. Turrets and supplied service may use it. Preserve existing deterministic allocation within each class.
- Rigs leave reserved ore space empty for actual ship unloads; never evict stored ore or regenerate seams. Preserve fractional deliveries and extraction conservation.
- Construction, building/ship repair, ship rearming and recovery use only unreserved alloy/components. Turrets may consume held material normally. Let users release holds from the ship, including after a crash.
- Show distinct reserved-power/material/delivery blocking and usable budgets. Keep controls available in Colony, pause-safe and collapsible without telemetry closing them.
- Version-7 checkpoints preserve policy, partial work, schedules and prior progress; support older versions with zero reserves. Fix real impact wrecking to preserve paid work as documented, with a regression using impact and repair.
- Verify all consumers, scarce stock, capacity destruction, physical limits, background determinism, save continuation and a real-browser reserve/build/mining route. Run build/typecheck/tests and open a review PR.

This is reservation policy for the existing global bus, not wiring, inventory teleportation changes, mobile logistics or full Phase 7 completion. Graphics/UX/UI overhaul remains required in Phase 9.
