# Task 007A — Finite planetary mining

Implement the user's request for planetary mining with a rig/building as the first Phase 7 slice, after the merged presentation foundation. Keep flight mining useful and preserve the continuous world and existing economy.

- Seed ten finite seams spanning all five ore types; show surface markers and an on-foot bearing/reserve survey.
- Add a supplied mining-rig blueprint. Require its entire footprint inside a nonempty seam and preserve all existing placement/cost checks.
- Extract 0.5 kg per two powered seconds at 6 kW into capped shared ore storage. Share reserves between rigs; pause on full storage, no power, disabling and wrecks. Never debit ore without delivery.
- Retain depletion through repair, demolition/rebuilding and versioned checkpoints, including partial cycles. Migrate older saves without resetting prior progress.
- Use existing refining/fuel/service paths. Demonstrate iron-to-alloy and ice-to-fuel-to-ship mass conservation, background operation and frame-rate independence.
- Add meaningful unit and production-browser coverage, capture the live rig, run build/typecheck/tests and open a review PR. Do not merge automatically.

Limits: circular terrain remains unchanged; no digging physics, offline output, mobile drones/towing, scheduling or player-defined grid/storage priorities in this slice. Those Phase 7 systems and the full Phase 9 graphics/UX/UI overhaul remain planned.
