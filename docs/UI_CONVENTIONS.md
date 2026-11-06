# Menu and interface conventions

How menus behave, so everything works the way players of other games expect.

- **Right-click a building** opens its menu: name and status, Details, Turn on/off, Next recipe, Auto defence (turrets), then a separator and **Demolish…**.
- **Demolish always asks first**, says what you get back ("You get back 3 alloy, 2 wire, 1 component") and offers **Keep it**. It is red, last in its group, and its label ends in "…".
- The same Demolish control is in the Base building inspector and the Nearby card on foot. Demolishing from a menu works from anywhere: you do not have to stand beside the building.
- **Esc** closes the topmost thing: context menu, then panel, then opens the pause menu.
- **Left-click** selects or places; **right-click** opens a menu, cancels placement, or sends the astronaut walking.
- Destructive or costly actions are never one click. Disabled buttons say why on or beside the button.
- Labels are plain words in sentence case ("Turn off", "Next recipe"), not codes or all capitals. Keys are shown as small hints, never required.
- Notices are short sentences in the second person.

## Still to normalise
- The legacy management console (only with `?features=all`) still uses the old wording and layout.

## Upgrade in place (building rule)
Improving a building where it stands is preferred to building more of it. Every building defines what a tier changes (see `tierEffect` in `src/ui/base/upgradeView.ts`): solar output, battery and storage capacity, machine speed, relay reach. When you add a building, add its tier effect and make sure the grid, power and rendering code read `capacityFactor` and `workFactor`. New players see the first tier only; tier 1 to 2 needs Infrastructure retrofits, which opens after Applied materials and Bulk logistics.
