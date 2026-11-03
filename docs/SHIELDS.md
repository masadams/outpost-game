# Powered shield domes — alpha 0.14

Task 009 implements Phase 8.2. Complete Combat engineering research, then select either emitter in Colony or Command's paid construction queue. Foundations follow ordinary building placement; the field can cover the pad, habitats and other facilities. Emitters start empty. Both sizes use the same global colony power bus and existing remote toggle, dispatch priority, power cap, repair and demolition controls.

| Emitter | Radius | Capacity | Upkeep | Recharge | Build cost |
|---|---:|---:|---:|---:|---|
| Small | 60 m | 120 SP | 1 kW | ≤4 SP/s | 12 alloy, 4 wire, 3 components |
| Large | 120 m | 360 SP | 2 kW | ≤8 SP/s | 20 alloy, 8 wire, 5 components |

SP are gameplay protection points, separate from physical kinetic energy. Recharging buys one SP per kJ. Charge never appears on construction, toggling, repair or load. Life support is funded first, then shield upkeep, habitat backup charging, shield charging, industry and turret bursts. Essential upkeep can use protected grid energy; both kinds of charging use only unreserved energy. The emitter's power cap applies to upkeep plus recharge. Below upkeep it drops; above upkeep the remainder limits charging. Within each class, dispatch priority and building ID give stable allocation. A full small emitter needs only 1 kW maintenance; an empty one requests up to 5 kW. Large charging can exceed one solar array's output.

Every hit suspends recharge for two simulation seconds. Empty charge breaches the field for at least five seconds; it must also reach 25% capacity to rearm. Initial charging uses that same 25% threshold. A disabled or unpowered emitter retains paid charge, but provides no protection. Toggling does not reset hit/recovery timers or bypass the rearm threshold. Wrecking/demolition dissipates remaining charge, recorded separately; repairs buy hull only. Pause freezes simulation timers.

## Selective collision policy

Only incoming meteors and enemy cannon rounds cross the barrier collision path. Ships, crew, ore, ordinary asteroids, physical neighborhood sites, towed cargo, mining/tractor beams and friendly weapons pass normally. Shields provide no oxygen, suit refill, hull repair or terrain collision protection. A hostile round spawned inside a field can hit occupants. Pay for a habitat separately for breathable air.

Each field is a circle centred on its emitter at the planet's surface. Rendering hides the underground portion. Swept entry tests include threat radius, stop at earlier terrain/physical victims, and handle crossings whose endpoints are both outside. Threats outside the dome can hit an unprotected ship first. Overlap absorbs at the earliest boundary; equal-time entries use emitter ID. Each exhausted field passes only the remaining budget to the next field, with no double payment. A threat already inside another overlapping field does not retrospectively cross its boundary.

A meteor's initial SP cost uses the established terrain damage budget: kinetic joules / 2000, clamped to 15–180. Hostile rounds cost 10 SP, matching baseline ship/terrain damage. Partial absorption stores a residual damage budget and slows velocity by the square root of its remaining fraction. Recompute the remaining path and moving-target tests after slowing; do not apply gravity twice. A slowed projectile retains that damage fraction on later steps (suit damage scales from its usual 15). A partially intercepted meteor uses its stored budget at terrain, rather than clamping kinetic energy and reducing damage a second time. Turret-created fragments divide a parent's remaining budget equally. Full absorption disperses the body into non-collectible dust, bypassing the ore/fracture reward path. Terrain impacts and ship contacts remain dangerous.

Command's accounting reports hits, breaches, SP absorbed, actual grid energy spent, discarded stored charge, fully dispersed mass and kinetic energy dissipated at interception. Partial impacts dissipate energy but retain all moving mass; full impacts account for the remaining mass as dust. The fixed planet/emitter anchoring absorbs the reaction; this prototype does not simulate planet recoil or dust particles. Collision resolution stops a meteor step at its first physical ship contact. Orange threat prediction shows unopposed terrain impact, excluding future interception. Friendly-fire penetration and inside-origin attacks are explicit game rules, not a universal material barrier.

## Feedback and persistence

World outlines show coverage and charge bars. Command's facility card shows SP, status, radius, power, hit delay and breach recovery. Defence lists emitters; the persistent threat notice reports active protection/breaches during threats. Distinct original procedural hit/breach tones use existing global mute/volume. There is no strobe, camera shake or pulse. A brief colour accent can be disabled in Command → Shields and defaults off for reduced-motion preference. This view preference lasts for the current session; charge/timers/accounting are persistent simulation state.

Checkpoint version 13 preserves emitters, timers, charge, accounting and residual threat budgets. Older formats are intentionally rejected during development; start a new world with R. Legacy migrations are deferred until closer to completion. Validation rejects missing/overfull charge, invalid readiness/recovery, non-finite/negative budgets, misplaced shield state and shield emitters without completed Combat engineering. Loaded state stays paused. Manually chosen operation panels remain selected across threat arrival/clear transitions, so interception cannot hide Command while you are using it.

## Playtest

1. Save before dangerous drills. Supply labs and finish the four technologies, then produce emitter materials using the existing finite resources/refineries.
2. Place an emitter clear of home foundations. Add solar/storage; select the emitter in Command. Confirm charge rises and protection starts at 25%. Cap its power below upkeep: the outline fades and status reads power limited. Release the cap; no free refill occurs.
3. Start an opt-in meteor drill. Compare the unopposed impact prediction with actual boundary interceptions. A large full emitter may absorb a whole meteor; a small field can breach and leave damaging overflow. Stacked attacks can empty either size.
4. Observe recharge pause, recovery and threshold. Disable/re-enable and K/L while breached: neither action grants protection or charge. Repairing a wreck leaves an empty emitter.
5. Fly and haul through a charged dome; mine normally. Test habitat air independently with and without its oxygen/power supply.
6. Inspect Command → Shields, toggle colour accents, pause/resume, save/load and check the three desktop viewport sizes.

Remaining limits: no projectile/meteor ricochet, dust salvage, shields on ships, dome entry gates or configurable allegiance. Multi-world anchoring belongs to Phase 8.5. Full art/UI/audio polish and human usability evaluation remain Phase 9.
