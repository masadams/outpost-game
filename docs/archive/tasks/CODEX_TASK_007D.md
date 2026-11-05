# Task 007D — Landing and fuel feedback

Implement the user's request for immersive landing instrument warnings before continuing mobile logistics. Initially stacked on resource-priority PR #13; PR #14 now targets main after #13 merged. Do not merge automatically.

- Add green/yellow/red telemetry with symbols and clear labels for descent, drift, total speed, tilt, spin, altitude/clearance, fuel and hull. Use actual touchdown limits; show rotation rate explicitly.
- Gate landing warnings to low descending/hovering approaches, include off-pad and early fast-descent cues, and avoid landing alarms during launch/ascent, orbit, walking or after touchdown/crash.
- Add gentle urgent-warning pulsing, disabled on pause and by reduced-motion preferences. Keep stable instrument nodes and preserve supported desktop layouts.
- Distinguish landing and low/critical fuel tones, rate-limit repetition and prioritize urgent alarms. Preserve existing threat/oxygen warnings, audio unlock, mute/volume and pause/focus-loss silence.
- Keep physics, tools, inventories and save schema unchanged. Document thresholds and limits; no autopilot or landing-success guarantee.
- Test actual physics thresholds, alarm transitions/cadence, audio output and desktop layout. Run build/typecheck/unit/browser checks and open a separate review PR.

This feedback slice does not complete the full graphics/UX/UI overhaul or Phase 7 mobile logistics.
