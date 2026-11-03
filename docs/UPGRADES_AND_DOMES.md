# Ship upgrades, habitats and shield domes — development schedule

Ship upgrades were already listed broadly in Phase 8. This makes the categories and building milestones explicit in response to the user's request. The tow rig and habitats are merged; Command #17 and neighborhood #18 are open for review. Ship progression/research is now implemented on `feat/ship-progression`; [actual costs, effects and playtest](PROGRESSION.md) supersede the earlier provisional equipment list. Shields, nearby worlds and the full presentation overhaul remain planned.

## Order and dependencies

| Order | Milestone | Depends on |
|---|---|---|
| Now: Task 007E | Paid physical asteroid towing, first utility equipment | Flight, mining, material reserves and checkpoints |
| Implemented for review: Phase 7.5 / Task 007F | Oxygen habitat domes and life-support coverage | Power, ice → oxygen supply, surface placement, suit safety |
| Phase 7.75 | Central Command console, remote facilities, power allocation, queues and economy | Habitat/building foundation |
| Phase 7.9 | Nearby belts, destinations and navigation | Towing and Command |
| Implemented for review: Phase 8.1 / Task 008 | Paid lab research, eight module upgrades and fabrication | Stable logistics/economy and supplied service |
| Phase 8.2 | Powered shield domes and defence progression | Building damage, meteors/projectiles, power priorities |
| Phase 8.5 | Nearby planets/moons and consistent cross-world flight | Navigation, ship range and body-relative colonies |
| Phase 9 | Full graphics/UX/UI overhaul across these systems | Playable upgraded ship and colony loop |

See [the Command and exploration plan](COMMAND_AND_EXPLORATION.md) for the user’s later requests, full sequence and the [console concept](mockups/command-console.svg).

## Ship upgrades

The first utility upgrade is the towing rig: supplied fabrication at home adds real module mass and enables breakable physical hauling. Later upgrades need an explicit equipment/fabrication interface, finite manufactured costs, upgrade limits, persistent installed equipment and clear comparisons before purchase.

- Engines: thrust/control authority versus fuel burn, equipment mass and handling.
- Tanks: more fuel capacity with actual fuel mass; avoid granting a free full tank on installation.
- Cargo: increased capacity versus rack mass and manoeuvrability.
- Mining/tractor: range, collection or throughput versus energy/heat and equipment costs.
- Weapons/defence: ammunition, energy, cooling and armour tradeoffs; respect existing finite rearm/repair rules.
- Navigation/utility: towing improvements, surveying and optional landing aids. Preserve manual flight and make assistance explicit.

Unlock/fabrication requirements belong to Phase 8 progression. Replacement/salvage, wreck recovery and migration rules must prevent duplicated equipment or refunded supplies. Tests must use dynamic upgraded masses/capacities and cover install/replace/save/recovery boundaries. No unlimited stacking of numerical bonuses.

## Oxygen habitat domes — Phase 7.5

The user requested a dome covering an area where the astronaut can work without draining suit oxygen. Start with two configurable sizes, **40 m and 160 m surface spans**, with 20 m / 45 m ceilings. Task 007F replaces the provisional 80 m large span so its footings can clear the home pad and terminals. See [implemented rates and limits](HABITATS.md).

The intended behavior is concrete:

- Dome coverage follows the curved planet. Placement overlays existing colony space rather than using ordinary solid-building exclusion for the whole covered span; foundations still need valid sites.
- Pressurization fills a finite oxygen buffer. Continuous oxygen use includes size-dependent leakage/maintenance and actual occupants, in kg/s. Existing suit service implies roughly one kg per 180 seconds of crew breathing; use a consistent budget rather than free air.
- Only an operational, sufficiently supplied breathable zone pauses **suit oxygen depletion**. It does not freely refill the suit, heal the crew or remove fall/combat damage. Outside or above coverage, suit air is used normally.
- Depleted oxygen, power loss, breach/destruction and disabled life support have defined buffer/grace behavior, advance warning and automatic return to suit air. No instant death solely from crossing the boundary.
- Overlap must not duplicate oxygen, count the same crew twice or create an infinite breathable zone. Supply allocation and reserve priority must be explicit, alongside defence and industrial demand.
- The HUD identifies habitat air versus suit air, coverage, oxygen demand/buffer and failure countdown. A visible boundary makes safe working space discoverable.
- Save/load retains buffer, active supply and damage; pause freezes consumption. Tests cover boundary/ceiling, overlap, supply shortage, destruction, transitions and frame-rate independence.

Habitat air coverage is a life-support mechanic. It does not automatically grant a damage shield.

## Shield domes — Phase 8.2

Add separate small/large emitters with defined coverage. Larger areas cost more materials and sustained power. A shield has finite charge, bounded recharge, impact energy cost and a recovery delay; it must not make a colony invulnerable simply by toggling power.

- Sweep incoming threats against the coverage boundary so fast projectiles/meteors cannot tunnel through it.
- Absorb only damage supported by remaining charge. Overflow, dangerous fragments and emitter destruction still threaten the colony. Preserve a clear mass/energy accounting for destroyed/deflected bodies; no free collectible ore.
- Define outgoing friendly fire, ship movement, hauling/entry gates and overlapping fields before implementation. Those rules cannot silently delete a towed asteroid or trap the player.
- Show charge, coverage, power demand and recharge/breach state, with distinct feedback and configurable/reduced-motion effects.
- Persist active shields and charge/damage; test low power, simultaneous hits, depletion, overlap, friendly interactions and restoration.

Shield coverage supplies no breathing oxygen. Combining a habitat and shield requires paying for and supplying both systems. The full Phase 9 presentation work must make those two functions distinguishable.
