# Landing and fuel instruments — alpha 0.8.1

Landing feedback uses the existing physical limits. It does not steer, brake, change gravity or guarantee a landing.

| Instrument | Green | Yellow | Red |
|---|---|---|---|
| Descent (RADIAL) | ≤70% of 6 m/s | >70%, up to 6 m/s | >6 m/s descending |
| DRIFT | ≤70% of 4 m/s | >70%, up to 4 m/s | >4 m/s in either direction |
| TILT | ≤70% of 15° | >70%, up to 15° | >15° from local up |
| SPIN | ≤70% of 0.35 rad/s | >70%, up to 0.35 rad/s | >0.35 rad/s in either direction |
| FUEL | >15% | ≤15% | ≤5%; EMPTY at zero |
| HULL | >50% | ≤50% | ≤25% |

SPEED displays actual total linear speed; its warning follows the worse of descent/drift, since touchdown has separate radial/tangential limits. There is no invented total-speed landing constraint. Read the text and symbols (●, ▲, !) alongside colors.

Landing cues activate in flying state while descending or hovering (radial speed ≤0.5 m/s), within 300 m clearance. Fast descents also activate within 800 m when clearance/current descent is at most 10 seconds. Launch ascent, high orbit, walking and landed/crashed states do not show landing-limit warnings. Fuel/hull status remains visible while piloting. Suit telemetry keeps its existing behavior.

Altitude shows a low-clearance caution at 100 m and below. Below 30 m, an unsafe descent/drift/tilt/spin or off-pad approach turns it red. Off-pad warnings use the same 30 m pad half-width as contact classification. Green individual values describe margins only: pad alignment and conditions at actual contact still matter. This is current-state feedback, not a prediction of future control inputs, obstacles, fuel sufficiency or braking distance. The J coast path retains its separate gravity/drag-based prediction.

## Light and sound behavior

An unsafe approach becomes urgent at ≤100 m or when clearance/current descent is ≤5 seconds. Its critical lights pulse gently over 1.4 seconds and a descending two-tone landing alarm repeats at most every 2.5 seconds. Critical fuel uses a different lower two-tone alarm every four seconds; a low-fuel caution repeats every eight seconds. Active threats/hull warnings retain priority over a noncritical fuel caution. Urgent landing takes highest priority, followed by critical fuel. One warning tone category plays at a time; other game effects remain audible.

Pause freezes alarm cadence, stops current tones and disables pulsing. Landed, crashed and on-foot states do not play ship landing/fuel alarms. M and global volume still control sound; no sound plays until audio is unlocked by a gesture. Reduced-motion preferences disable pulsing while retaining solid colors, labels and warning text. The HUD uses stable DOM updates so an animation is not restarted by every telemetry refresh. Crossing out of and back into approach does not bypass the landing repeat interval.

## Verification and scope

Unit tests cover threshold equality, each physical limit, local-up orientation, signed drift/spin, pad alignment, clearance gating, fuel boundaries, state immutability, alarm priority/cadence, rapid re-entry and pause/mode suppression. Production Chromium checks load valid checkpoints to exercise dangerous descent and low fuel, measure actual audio output and scheduled tone frequencies, check pause/mute/reduced motion, and inspect the eight-instrument layout at 900×600, 1280×800 and 1920×1080.

This responds to the user's landing/HUD feedback before mobile logistics. No world state or save version changes are needed; warnings derive from live telemetry. Resource priorities remain a separate review. The full graphics/UX/UI overhaul, configurable warning preferences and human sound/landing-feel tuning remain future work.
