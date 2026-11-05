# Task 007B — Refinery scheduling

After the explicitly authorized merge of planetary mining PR #11, continue Phase 7 with opt-in automatic refining. Preserve continuous flight, the existing economy and manual production.

- Configure each built refinery's desired shared stocks for alloy, wire, components, water and oxygen. Use native button controls with 5 kg increments bounded to 0–1,000 kg.
- Select needed recipes at batch boundaries in deterministic round-robin order. Skip missing inputs or blocked co-products; stop without power demand when all targets are met. Resume when stock is consumed.
- Keep the current recipe and paid progress through supply/power/storage interruptions, target edits, disabling and wrecking. Turning automatic mode off preserves the current cycle. V explicitly selects a manual recipe and resets progress as before.
- Use existing costs, power, recipes, inventories and physical storage caps. Multiple active batches may exceed replenishment goals; never duplicate scarce inputs or discard co-products.
- Persist schedules, targets and cursor with active progress in version-6 checkpoints. Keep older progress and manual refinery behavior.
- Test fairness, shortages, shared input contention, manual controls, target bounds, mass conservation, fuel/refuelling, background operation and save continuation. Exercise real construction and native controls in production Chromium.
- Run build/typecheck/tests, update roadmap/decisions/playtest notes and open a review PR. Do not enable automatic merging.

This slice does not implement mobile drones/towing, power/storage/ammunition priorities, offline production or the full graphics/UX/UI overhaul.
