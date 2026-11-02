# Alpha 0.1 pre-playtest review

Scope: flight, mining/cargo, astronaut/surface interactions, colony economy, basic procedural audio and the playtest handoff. The user explicitly requested review and merge of this stack before human playtesting. This one-time authorization does not enable GitHub auto-merge or authorize future milestone merges.

## Review performed

- Read the simulation, collision/landing, resource transfer, production, checkpoint, input, camera/render and UI paths. Confirmed simulation stays independent of Phaser, DOM and audio.
- Checked the dependency chain and actual head commits of PRs #2–#5. All four had successful hosted CI, were mergeable, and had no review comments at inspection.
- Merged those four PRs in dependency order after review using normal merge commits and expected head SHAs. The audio/help pass is a separate PR against the resulting main branch; auto-merge remains disabled.
- Checked fixed-step invariants, resource/capacity boundaries, safe boarding, unoccupied controls, focus/pause handling and checkpoint corruption behavior against the automated suite.
- Added basic engine/mining/tractor/machinery loops and distinct event cues without changing physics. Output is bounded, unlocked by a user gesture, and muted on pause/focus loss. Preferences are independent of saves.
- Added H help with an in-game first-sortie/colony guide, keyboard-accessible audio controls and a playtest route. Modified browser shortcuts no longer enqueue game save/reset commands.
- Added production-preview browser checks and a static-build CI artifact. Browser audio checks measure the actual Web Audio signal as well as pause/mute silence and persistent controls.

## Findings resolved during implementation

The earlier iterations fixed swept surface/rock contact, stable pad lock, short key presses lost by Phaser, Phaser delta smoothing slowing simulation, live UI updates detaching buttons, and floating-point tank/storage bounds. This pass adds a dedicated action-safe help/pause path, immediate audio silence and lifecycle cleanup, first-click sound enabling, native volume-slider keyboard behavior, and isolation from Ctrl/Meta/Alt shortcuts.

## Verification and remaining limits

Local verification consists of build, typecheck, 84 unit tests and seven production-browser checks, including real audio signal measurement, full surface controls, construction/production/checkpoint restoration and prior flight/mining routes. Full return/landing and ore/fuel conservation are also covered in simulation. The Phaser chunk-size warning remains documented.

There are no known blockers to the first desktop playtest. This is not a claim that balance or the subjective audio mix has been human-approved. Read [PLAYTEST.md](PLAYTEST.md) for the route and limitations. Defer Phase 5 defence/combat and other new systems until feedback on this slice.
