# Oxygen habitats

Task 007F implements Phase 7.5 on `feat/oxygen-habitats`, stacked after towing #15. Central Command follows; shields are a separate milestone.

| Property | Small | Large |
|---|---:|---:|
| Surface span / maximum roof height | 40 / 20 m | 160 / 45 m |
| Alloy / wire / components | 10 / 4 / 2 | 16 / 6 / 4 |
| Oxygen buffer | 1 kg | 4 kg |
| Life support | 2 kW | 4 kW |
| Maximum fill | 0.2 kg/s | 0.4 kg/s |
| Passive seal loss | 0.002 kg/s | 0.008 kg/s |
| Backup capacity | 20 kJ | 40 kJ |

Buffers start empty. Gas transfers from real colony oxygen; ice refining remains the replenishment route. Above 15% pressure reserve, a crew member uses 1/180 kg/s and pauses the corresponding seconds of suit drain. Below 30% buffer shows AIR LOW. No suit refill, health gain or revival. Overlapping coverage selects the lowest-ID breathable dome, paying for one crew only; each dome still leaks. Gas transferred to buffers cannot also feed fuel production.

Life support runs before industry and can use reserved power. All domes' essential loads are funded before backup charging; ID order resolves shortages. Backup charges at no more than the dome's rated kW using unreserved grid surplus. It supplies at most ten seconds after a full charge; turning power off/on never renews it. Base power must be fully funded for that step; insufficient charge is retained but grants no air. Disabled domes stop support/filling/charging while retaining finite buffers. Suit coverage samples the start of each fixed step using the last completed paid support state; boundaries and outages have at most one 1/60 s quantum of latency.

Leak multiplier is `1 + (100 - hull)/25`, including while disabled. Destruction immediately vents oxygen and backup. Repair restores hull using alloy, never gas/energy. Demolition vents without gas refund. `colony.oxygenUsed` records breathed, leaked and vented habitat gas; ordinary storage losses retain the existing damage ledger. Version-9 checkpoints validate/save gas, charge, operating flags and usage. Versions 1–8 migrate with zero usage and no free habitats. Pause stops all time.

The 160 m large span replaces the provisional 80 m: footings at ±80 m can clear both home terminals and pad. Each 2 m-wide footing must obey existing foundation separation; the roof can cover existing facilities. Placement also checks proposed ordinary foundations against existing dome footings. A conservative suit bounding box fits horizontally and below the lower outer edge of an elliptical ceiling measured above the curved surface. There are no pressure doors, roof collisions, interior scenes or breathable atmosphere outside the roof. Habitats do not shield crew, buildings or ship from falls, meteors or combat.

The HUD shows active buffer percentage under HABITAT AIR and the held suit percentage below it. Outside/unavailable zones show SUIT AIR. Caution identifies low air/backup; depleted suit reserve has a critical warning when unprotected. Source changes use an airlock cue; low-suit nagging stops under supplied air, while low habitat air/near-empty backup use existing warning tones. Pause, mute, volume and load/reset behavior remain shared with other audio. The colony machine card shows buffer, status, rated power and remaining backup; an operational roof is brighter. Controls work within 18 m of the centre or either footing. Remote operation is scheduled in Command.

## Playtest

1. R, then F. Walk right to about 90–100 m. B → Enter builds solar about 24 m ahead.
2. Q four times puts the preview at −96 m. Select Large habitat using its native palette button and Place. Its roof spans home; check both footings clear the pad/terminals/solar.
3. B closes construction. Walk back under the roof, toward its centre near home. With solar and starter oxygen, HABITAT AIR appears and the suit reserve holds.
4. Inspect the nearby habitat card. Disable it: SUIT AIR resumes depletion immediately. Enable it: supplied air returns. Air buffers and backup must not reset.
5. Leave the roof or jump above a small roof to lose coverage. To test a long outage, disable solar and let stored grid energy plus charged backup exhaust. Watch BACKUP, then unavailable air; refill ice-derived oxygen before prolonged habitation.
6. K while paused, reload: source/buffers remain and time stays stopped. Resume with P. Damage/repair must not refill or shield; demolishing vents gas once.

Automated coverage includes construction/footings, curved roofs, partial breath supply, empty suits, overlap, essential reserves, backup accounting/exhaustion, leaks/damage/demolition, ice mass balance, v8/v9 persistence and 30/144 Hz equality. Two production browser routes cover native building/controls, source switching, real suit drain, backup failure and paused restoration. Human sound balance and dome aesthetics remain playtest items; the full Phase 9 graphics/UX/UI overhaul is still scheduled.
