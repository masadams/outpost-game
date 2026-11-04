# Current-format checkpoint recovery

Task 015 adds one previous checkpoint to alpha 0.19. It does not change the version-18 world format and does not migrate earlier development saves. Checkpoints remain manual and browser-local; clearing browser data, private browsing or device loss can remove both copies.

On an explicit save, validate and serialize the runtime first. If the latest stored checkpoint is valid, copy its exact bytes into the previous slot before replacing the latest. If the previous-slot write fails, stop and keep the latest. If the latest-slot write fails, the old latest is still usable. Identical serialized saves leave the previous distinct checkpoint alone. Corrupt/incompatible latest data never overwrites a valid previous copy.

Continue and L prefer the validated latest checkpoint. When it is absent or invalid, they can load the validated previous checkpoint instead. The title identifies this as an older flight; the HUD reports **PREVIOUS CHECKPOINT LOADED**. It loads paused, with held controls cleared and gameplay audio silent. Loading never rewrites either stored copy. Saving explicitly after recovery writes a new latest while preserving the valid fallback. New Game preserves both slots until you save. If neither copy is valid or storage is inaccessible, Continue is unavailable and a requested load keeps the current runtime.

This uses localStorage's atomic individual writes, not a multi-key transaction or cross-tab lock. One game tab at a time is recommended. There is no autosave, cloud sync, checkpoint history beyond one previous copy, legacy migration or guarantee against browser-wide deletion. A first save has no earlier checkpoint yet; the second distinct valid save creates the fallback.

## Review and playtest

1. Save a flight, make a meaningful change and save again. Continue normally loads the latest flight paused.
2. In a disposable browser profile, corrupt or remove only `outpost.checkpoint.v1` in developer tools. Keep `outpost.checkpoint.previous`. Reload: the title should identify the previous checkpoint. Continue loads that older flight paused without changing either stored entry.
3. Save explicitly after recovering. Reload and confirm the latest now loads normally. The valid fallback must not have been replaced with corrupt data.
4. With storage denied/full, check that Save reports failure and the current flight stays intact. An invalid load must not replace your runtime. Do not test quota failures on a valued save.

Automated fault-injection covers both write positions and denied reads. Native browser routes cover title recovery across reloads, explicit save, menu and K/L storage failures, pause/input/audio, and unusable current/previous copies. Existing menu/flight/checkpoint routes remain regression coverage. Human multi-session testing and representative hardware remain open Phase 10/9 acceptance work.
