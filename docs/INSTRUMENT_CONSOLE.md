# Compact instrument console

The alpha 0.20 UI branch also addresses the oversized bottom HUD. Six ship instruments occupy one row: **ALT**, **V/S**, **DRIFT**, **ATT**, **FUEL**, **HULL**. Crew mode uses altitude, surface-relative speed, habitat/suit air and suit integrity. The bezel names the current world and flight/landing/EVA mode.

The strip is 88 px high at standard text size, 96 px at 125% and 104 px at 150%. This replaces the 176 px, two-row small-desktop layout. Altitude and velocity gauges auto-range and print their current range. Large distances/speeds use km or km/s; exact values remain available in Details. Signed V/S is positive outward/climbing and negative descending. Attitude uses the current body's local up, including the moving moon. Fuel percentage uses the actual fitted tank capacity.

Normal readings no longer repeat FUEL OK/HULL OK/WITHIN LIMIT under every value. Active cautions appear as words/symbols in the bezel and on the affected gauge; critical spin remains visible even though its full instrument is secondary. Landing/fuel alarms, emergency messages and reduced-motion/pause/mute rules are unchanged. Routine status narration, a separate surface-frame strip and inactive weapon text are removed from the normal flight view. Navigation remains one quiet target line. Combat status appears while relevant.

**Details** opens a native, scrollable diagnostics popout with all readings, full warning reasons, spin/total speed, ammunition/cell/heat and the live ship-coast/environment data. Its button supports mouse, Tab, Enter and Space. Browsing does not pause or spend supplies, and button activation cannot thrust, jump or mine. Keyboard activation retains focus; mouse activation releases it so normal flight keys work again. The same FlightTools-owned status node continues updating inside the drawer.

No simulation, save format or legacy compatibility changes are included. Human cockpit readability/handling feedback and representative-hardware review remain open.

Previews: [900×600](screenshots/instruments-900-standard.png), [1280×800](screenshots/instruments-1280-standard.png), [enlarged text](screenshots/instruments-900-large.png), [crew gauges](screenshots/instruments-crew.png).
