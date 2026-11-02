# Outpost alpha 0.2 — first playtest

Start with the current flight/mining/surface/colony loop. Defence, combat and further systems should wait for feedback on this slice.

## Run the build under review

From a checkout of this repository:

```sh
git switch feat/atmospheric-flight-trajectory
npm ci
npm run build
npm run preview
```

Open the printed local URL in a desktop browser. The build is also available as the `outpost-playtest` artifact on successful CI runs and can be served by a static HTTP server. Opening the HTML directly from the filesystem is not supported.

Press **H** for the in-game guide. It pauses and returns to your previous pause state. Sound unlocks on your first click/key; **M** mutes and the top bar controls volume. These preferences survive reload independently of your checkpoint. Pause and focus loss silence all sounds.

## Suggested route (about 15–20 minutes)

1. **Flight:** hold Space during launch to clear the starter deposit above home, or steer around it. Launch vertically for roughly 6.5 seconds, then coast. The 1.8 km planet has 1.2 km of atmosphere. This low hop stays atmospheric; a 10-second vertical burn reaches above it. Try rotation and inertia. Toggle J to compare the coast prediction to your actual path. Release thrust before comparing; the path excludes rocks/tools. Try wheel/−/+ and 0 auto zoom while flying and paused. Return using short thrust pulses; aim for radial descent ≤6 m/s, drift ≤4 m/s and tilt ≤15° at the green pad. R resets a failed attempt.
2. **Mining:** repeat the short launch while holding Space/C. Mine the starter iron sample above home, collect ore, return and E to unload. The blue ice sample is nearby to the right. Avoid holding thrust until pickup finishes; that can reach escape speed.
3. **Surface:** F exits a landed ship. Walk/jump to the depot on the right, use E, visit the emergency service point on the left, then return and F to board. Check camera orientation, prompts and oxygen readability.
4. **Colony:** exit and walk past the depot. B opens construction; Enter places solar, T shifts the preview, 4/Enter places refinery, T then 5/Enter places fuel processing. Try an invalid site, a battery/storage building and demolition. Check power shortages, V recipe selection and the initial water/oxygen becoming fuel. Mine/unload ice for ongoing production; E in the landed ship transfers available fuel.
5. **Checkpoint:** old alpha-0.1 checkpoints migrate onto the larger planet paused, preserving the base, cargo and depleted deposits. Check the result before K overwrites the old slot. K saves the entire current world. Make a change, L restores paused, and P resumes. Reload should restore the same checkpoint without resetting mined deposits. R resets runtime progress but keeps the checkpoint. There is no autosave.
6. **Sound/help:** compare thrust, mining, impacts, touchdown, airlock, footsteps, construction and warnings. Check mute/volume persistence and silence on pause or tab/window switching. Use H without leaving the game.

## Useful feedback

Report the browser/OS, steps, expected versus actual behavior, and a screenshot or short capture when helpful. Include visible altitude/velocities/fuel/hull, whether you were piloting/on foot, and which facilities were running.

The priorities are handling, landing difficulty, camera comfort, readable UI, mining rendezvous, discoverable construction, and whether sound cues are useful or tiring. Automated tests measure audio output and silence; subjective mix quality still needs human listening.

Known prototype limits: non-solid undamaged buildings, terrain-only suit collision, a global power/material bus, constant solar, a finite field, one manual local checkpoint, and no offline production. Keep your checkpoint on the same browser/origin. No public hosting, multiplayer or cloud save is configured.
