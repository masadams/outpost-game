# Outpost alpha 0.13 — first playtest

Start with flight, asteroid mining, surface exploration and construction. Then try finite planetary mining and automatic refinery targets. Save before the opt-in defence drill or ship patrol. Then try protected power, delivery room and turret-material reserves. Mobile logistics and the full presentation overhaul remain later work.

## Run the build under review

From a checkout of this repository:

```sh
git fetch origin
git switch feat/ship-progression
git pull --ff-only
npm ci
npm run build
npm run preview
```

Open the printed local URL in a desktop browser. The build is also available as the `outpost-playtest` artifact on successful CI runs and can be served by a static HTTP server. Opening the HTML directly from the filesystem is not supported.

Press **H** for the in-game guide. It pauses and returns to your previous pause state. Sound unlocks on your first click/key; **M** mutes and the top bar controls volume. These preferences survive reload independently of your checkpoint. Pause and focus loss silence all sounds.

## Interface checks

Cargo/Colony/Combat/Defence open one right operations dock; I toggles Cargo and Esc closes the dock. Ordinary flight starts with details closed. Construction, depot, turret, threat and combat contexts choose a relevant panel. Try selecting/closing a panel, switching contexts, browsing while paused, H/Esc and keyboard Tab/Enter/Space. Warnings, telemetry, weapons and radar should remain readable. Resize to 900×600, 1280×800 and 1920×1080; scroll the construction palette and operate the last blueprint. Report blocked targets, obscured controls or confusing automatic panel choices. See the [direction/wireframes](PRESENTATION_DIRECTION.md).

The landing instruments now add color, symbols and text while descending/hovering near the surface. Compare radial/drift/tilt/spin to the touchdown limits, watch clearance/off-pad cues, and check that the warning clears during launch/ascent. Compare landing and low-fuel tones, mute and pause, and try the OS/browser reduced-motion preference. The low-fuel lights start at 15%, becoming critical at 5%; ship warning tones stay silent on foot or after landing/crashing. See [warning thresholds and limits](FLIGHT_WARNINGS.md). Human timing and sound-balance feedback is needed.

For atmosphere transitions, launch beyond the 1,200 m body-centre air boundary and check the persistent ATMOSPHERE → THIN AIR → SPACE / VACUUM badge, exit/entry tones and continuing gravity readout. Reverse the flight and verify entry. Loading a paused checkpoint should not play a false crossing tone.

For towing, open Cargo on the piloted home pad and fabricate the rig. Check the 16 alloy / 6 wire / 3 components cost and 25 kg equipment mass. In flight, match a nearby rock's velocity and Y to latch within 180 m. Check strain, gentle hauling, Y release, mining/collection and return/unload. Save/reload an active cable; coast prediction should explicitly suspend while attached and resume after release. See [TOWING.md](TOWING.md). Habitats, wider ship upgrades and shield domes are [scheduled separately](UPGRADES_AND_DOMES.md), not playable yet.

## Suggested route (about 25–30 minutes)

1. **Flight:** hold Space during launch to clear the starter deposit above home, or steer around it. Launch vertically for roughly 6.5 seconds, then coast. The 1.8 km planet has 1.2 km of atmosphere. This low hop stays atmospheric; a 10-second vertical burn reaches above it. Try rotation and inertia. Toggle J to compare the coast prediction to your actual path. Release thrust before comparing; the path excludes rocks/tools. Try wheel/−/+ and 0 auto zoom while flying and paused. Return using short thrust pulses; aim for radial descent ≤6 m/s, drift ≤4 m/s and tilt ≤15° at the green pad. R resets a failed attempt.
2. **Mining:** repeat the short launch while holding Space/C. Mine the starter iron sample above home, collect ore, return and E to unload. The blue ice sample is nearby to the right. Avoid holding thrust until pickup finishes; that can reach escape speed.
3. **Surface:** F exits a landed ship. Walk/jump to the depot on the right, use E, visit the emergency service point on the left, then return and F to board. Check camera orientation, prompts and oxygen readability.
4. **Colony:** exit and walk past the depot. B opens construction; Enter places solar, T shifts the preview, 4/Enter places refinery, T then 5/Enter places fuel processing. Try an invalid site, a battery/storage building and demolition. Check power shortages, V recipe selection and the initial water/oxygen becoming fuel. Mine/unload ice for ongoing production; E in the landed ship transfers available fuel.
5. **Planetary mining:** on a fresh runtime, F exits; walk right to about 100 m. B/Enter places solar near 125 m; T shifts right 32 m. Click Mining rig in the palette, then Enter. Watch iron arrive in shared storage every two seconds and the surface survey reserve fall. Close B, approach the rig, and E disables/enables extraction. Save with K, reset with R and restore with L: reserve, ore and cycle progress must survive. Repeat on the ice seam 180 m left of home, adding generation/refinery/fuel processing for ongoing refuelling. See [locations and limits](PLANETARY_MINING.md).
6. **Scheduling:** near a refinery, enable Auto recipes in Colony. Adjust the five stock targets with the minus/plus buttons. Supply multiple ores and watch the refinery rotate needed recipes, skip missing inputs and stop at targets. Spend stock to restart production. Try blocking ice with a full co-product, interrupting power and disabling/re-enabling an active batch: paid progress stays. V stops scheduling and selects a manual recipe. Save/reload an active automatic cycle; see [the fresh-build route and limits](AUTOMATION.md).
7. **Resource priorities:** open Colony → Resource priorities from ship or surface. Set a 20 kJ power floor on the base capacitor: solar charges it but rigs/refineries wait, while turrets/service can draw it. Lower it to resume industry. Leave delivery room for ship ore, then confirm unloading may fill it. Protect alloy/components, try construction/repair/rearm, then release them. Test native keyboard activation, pause, reset/load and an active save. See [the detailed route](COLONY_PRIORITIES.md).
8. **Checkpoint:** old alpha-0.1 checkpoints migrate onto the larger planet paused, preserving the base, cargo and depleted deposits. Check the result before K overwrites the old slot. K saves the entire current world. Make a change, L restores paused, and P resumes. Reload should restore the same checkpoint without resetting mined deposits. R resets runtime progress but keeps the checkpoint. There is no autosave.
9. **Defence:** save with K first. On a fresh runtime build solar around 120 m, T/7/Enter for a laser turret 32 m farther along. Walk near the turret, E to control, A/D to aim and Space to fire. E releases. G enables automation nearby. N starts a meteor drill with real damage. Zoom out, check orange warning paths/impact markers and let automation intercept the parent and fragments. Try 8 flak or 9 missile on later attempts, with enough alloy/components/energy. Disable defence for an impact, stand near the damaged facility and U to repair with alloy. Save/reload both a live drill and its aftermath. L restores the pre-drill checkpoint paused if needed.
10. **Ship combat:** K saves first. Launch upright above 200 m, using Space to clear the starter deposit, then O starts a patrol. Release mining; Shift fires cannon, Z switches missiles. Watch heat, charge, finite magazines, aiming lines and named drone states. Dodge with normal rotation/thrust. Defeat the drone, brake to a safe landing and E pays to repair/rearm from colony stocks. On another attempt, let the ship be lost; Backspace charges 8 alloy + 2 components, preserves colony/depletion and loses cargo. Try saving/reloading a live encounter and its aftermath. Land or leave the engagement to disengage. Patrol size grows with deliveries, exploration and facilities, capped at three.
11. **Sound/help:** compare thrust, mining, impacts, touchdown, airlock, footsteps, construction and warnings. Check mute/volume persistence and silence on pause or tab/window switching. Use H without leaving the game.

## Useful feedback

Report the browser/OS, steps, expected versus actual behavior, and a screenshot or short capture when helpful. Include visible altitude/velocities/fuel/hull, whether you were piloting/on foot, and which facilities were running.

The priorities are ship handling/aiming, combat difficulty, heat/ammo feedback, recovery fairness, defence readability/difficulty, power/ammo scarcity, repair recovery, handling, landing difficulty, camera comfort, readable UI, mining rendezvous, discoverable construction, and whether sound cues are useful or tiring. Automated tests measure audio output and silence; subjective mix quality still needs human listening.

Known prototype limits: non-solid buildings with blast damage, terrain/small-arms suit collision, a global power/material bus, constant solar, a finite field, one manual local checkpoint, and no offline production. Keep your checkpoint on the same browser/origin. No public hosting, multiplayer or cloud save is configured.

The initial [graphics/UX/UI audit](PRESENTATION_AUDIT.md) records prototype issues; human usability testing and the full Phase 9 overhaul remain pending.


## Oxygen habitats — alpha 0.13

Follow [the habitat route](HABITATS.md#playtest). Confirm the source changes to HABITAT AIR, the suit reserve holds, disabling/exit resumes consumption, charged backup visibly exhausts, and K/reload preserves buffers while paused. Habitat air offers no fall/combat protection. Small/large palette buttons remain reachable with keyboard focus. The central Command console is the next milestone.


## Central Command — alpha 0.13

Follow [the Command route](COMMAND.md#playtest): remote operation from ship/surface, power scarcity and ordering with drag/native controls, paid queue work/refunds, selected dial/focus stability and checkpoint continuation. Landing warnings #14, towing #15 and habitats #16 are merged. Nearby-space discovery is next.


## Nearby-space discovery — alpha 0.13

Follow [the neighborhood route](NEIGHBORHOOD.md#playtest): live chart and target/home selection, slow physical rendezvous, survey manifests, finite salvage/fuel, normal return delivery and checkpoint depletion. Command #17 remains open and this slice follows it. Ship progression/research is the next milestone.


## Ship progression — alpha 0.13

Follow [the research/equipment route](PROGRESSION.md#saves-and-playtest): build/power a lab, pay samples, pause/save active work, fabricate at home and verify real capacities/mass/tool budgets. Tank removal must return existing fuel, while full stock/excess cargo blocks unsafe removal. Recovery preserves modules without free refill. Shields are next; broader balancing and the full graphics/UX/UI overhaul remain scheduled.

## Phase 8.2 shield domes

Use the [supplied-shield playtest route](SHIELDS.md#playtest). Check power shortages, initial charging, real impacts/overflow, breach recovery, toggling, habitat independence, friendly hauling/mining and K/L. Review Command and field visibility at 900×600, 1280×800 and 1920×1080.
