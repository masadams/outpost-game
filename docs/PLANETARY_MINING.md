# Planetary mining — alpha 0.6

Surface rigs provide finite background ore through the existing colony economy. Asteroid mining remains the faster active source. No terrain deformation or scene transition is added.

## Build and operate

On a fresh runtime, F exits the ship. Walk right to about 100 m from home, then B/Enter places solar near 125 m. T shifts the preview 32 m farther. Select **Mining rig** with its palette button, then Enter. The rig should sit near 157 m on the iron seam. Its entire 24 m footprint must fit inside the colored seam; normal overlap, home-terminal, range and material checks still apply. Blueprint 10 has no number-key shortcut because 0 remains auto zoom. Native Tab/Enter/Space can activate the button.

Construction costs 8 alloy, 3 wire and 2 components. Each rig consumes 6 kW over a two-second cycle, delivering up to 0.5 kg of its seam's ore into shared storage. The last cycle can deliver a fractional reserve or storage remainder. Walk within 18 m and E toggles it. The nearby-machine panel shows power, cycle progress, status and reserve; the surface survey shows the nearest seam/bearing and checks the preview when selecting a rig. Marker symbols distinguish resources alongside color, and exhausted markers fade.

No power, full storage, disabling or wrecking pauses work without discarding partial cycle progress. Empty seams stop permanently. A seam is debited only when ore reaches storage. Multiple rigs share its remaining mass in building placement order. Repair, demolition and rebuilding cannot regenerate it. R deliberately starts a new runtime; K/L preserves depletion.

## Deposits

Distances are signed surface meters from the pad, right positive. All seams are fixed prototype content; widths are total along-rim widths.

| Seam | Ore | Position | Width | Initial reserve |
|---|---|---:|---:|---:|
| 1 | Iron | +160 m | 68 m | 180 kg |
| 2 | Ice | −180 m | 80 m | 120 kg |
| 3 | Copper | +420 m | 72 m | 180 kg |
| 4 | Silicon | +760 m | 80 m | 160 kg |
| 5 | Rare metals | +1160 m | 48 m | 60 kg |
| 6 | Ice | +2100 m | 90 m | 240 kg |
| 7 | Iron | +3200 m | 96 m | 360 kg |
| 8 | Copper | −1700 m | 80 m | 300 kg |
| 9 | Silicon | −3000 m | 80 m | 240 kg |
| 10 | Rare metals | −4400 m | 60 m | 100 kg |

## Power, processing and persistence

One solar supplies 8 kW, enough for a rig alone. Add generation for simultaneous refining (4 kW) and fuel processing (6 kW); batteries buffer deficits. Existing allocation serves production facilities in placement order, then turrets. Capacity remains 400 kg base raw ore, plus 200 kg per operational storage building. Ore shares this capacity with ship deliveries.

Extracted iron feeds the normal alloy recipe. Ice feeds water/oxygen and fuel processing; manufactured fuel transfers to the ship through existing supplied service/unload actions. No new inventory, currency or free fuel is introduced. Power loss never creates output; reserve depletion plus downstream inventories/consumption conserve mass. All operations use the fixed 60 Hz world clock, continue while the pilot flies and freeze on pause.

Version-5 checkpoints retain every reserve, rig/seam binding and partial cycle. Versions 1–4 receive fresh surface seams while retaining their previously supported world progress. Malformed reserves, missing/duplicate deposits and rigs linked outside their seam are rejected. The browser slot key remains `outpost.checkpoint.v1`; its envelope version controls migration. No autosave or offline production is added.

The grid and material transport remain a global prototype bus, buildings remain non-solid markers, solar remains constant and the planet remains circular. Rig animation, dedicated industrial audio, scheduling, storage/power priorities, vulnerable transport and the complete presentation overhaul remain future work. Human playtesting is needed to tune reserve sizes and the active/background supply balance.
