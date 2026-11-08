# Deep signal: a one-way beacon and a far system

**Decision:** the voyage is an expedition that returns (not a relocation).
**Built:** the Deep signal technology, the beacon (needs a running Observatory and Comms antenna), the seeded wait (60 to 180 minutes, shortened a little by antennas and Survey optics), the echo (a seeded far system) on the Base screen and as an arrow at the Map's edge.
**Next:** planning the voyage and the expedition itself (steps 4 and 5 below).


**Idea (from play):** launch a one-way beacon into the dark. Some random time later (an hour or a few of play) it hears something: a new star system, far away, that you can plan a long voyage to.

## How it could work (small steps, each playable on its own)
1. **The beacon.** A new probe-like craft. Earned after the Observatory and Comms antenna are running, plus a technology (a Deep signal tech: antenna tier II, Survey optics). Costs fuel, components and a long launch window. It leaves the system and cannot come back.
2. **The wait.** A seeded timer (from the world seed, so the same save always gets the same answer): the echo arrives between about 60 and 180 minutes of play. Antennas and Survey optics shorten it a little; they never make it instant. Nothing is scripted by quest text: the Observatory just logs a faint repeating signal on the Map, far past every known world, with a bearing and a distance in light-minutes.
3. **What came back.** The echo says what kind of system it is (star type, how many worlds, a hazard such as a flare star or a debris belt). Seeded, fair, never the same twice.
4. **Planning the voyage.** Reuse the pre-flight check: delta-v, fuel, life support days, shielding. A "Voyager" fit (long tank, efficient drive, cooling) is the reason to build a ship for it. The hold fills with what you want to bring.
5. **The voyage.** First version is an expedition: the ship leaves, a few timed events (choices that cost fuel or hull), and it comes back with discoveries (a blueprint, ore, a map of the new system). Later version: you can stay, and the new system is a second seeded space with its own bodies (Phase 4A and 6).

## Why it fits
- It is engineering the ship for the trip (Phase 3 roles) and making the base able to afford it.
- It reuses what exists: probes, Observatory watching, antennas, pods' flight timing, the seeded world, the Map.
- It gives the star Helia and the far worlds a sense of scale without making the first hours harder.

## Questions
- Expedition that returns, or relocation you commit to? (Expedition first is the safe route.)
- Does the voyage run in real time while the base keeps working, or skip ahead?
- One echo per game, or a chain (each system can send its own beacon)?

## Expedition (built)
After the echo is in, Base offers an expedition: a craft (30 alloy, 14 wire, 14 components) plus up to three packs (Long-range fuel, Radiation shielding, Supply stores), each cutting the chance of trouble on each of three legs. The hazard the beacon heard of sets the base chance (quiet 15%, others 35 to 40%); shielding helps most against hazards you can shield from. It is away 20 minutes plus 45 s per light-hour (a half hour or so), then reports: a clean run brings 140 kg of rare metals and silicon and completes a technology that is open by prerequisites; one bad leg halves it, two quarter it and bring no technology, three lose the craft. Seeded by the world and the number of expeditions, so it is the same on reload.
**Still open:** a real destination (landing in the far system), events you choose between, and relocation (not planned).

## The far system and landing (built)
The beacon says how many worlds there are; expeditions find out what they are. A fly-by (the default) surveys the next world in order: its kind (rocky, ice, desert, molten or gas giant) and air. Once surveyed, a world that is not a gas giant can be chosen as the landing target. A landing adds a fourth leg, down to the surface, with the world's own danger (molten 45%, ice 25%, rocky and desert 20%; fuel and supply packs lower it), takes ten minutes longer, and brings home 200 kg of that world's ore (ice worlds bring ice and rare metals, molten worlds rare metals and iron, and so on) instead of a fly-by's rare metals and silicon. Seeded by the world seed, so the same save always has the same system.
