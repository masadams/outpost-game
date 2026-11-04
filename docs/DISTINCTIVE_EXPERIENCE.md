# OUTPOST — Distinctive Experience & Design Differentiation
**Version:** 1.0 · **Date:** 2026-11-04 · **Status:** Living creative direction, not a claim of unique invention  
**Read with:** [Master Design Bible](MASTER_DESIGN_BIBLE.md) · [Scale & Experience](SCALE_AND_EXPERIENCE.md) · [Master Roadmap](MASTER_ROADMAP.md)

## 1. Why this document exists

OUTPOST must not become an under-resourced facsimile of a larger studio's space game. More planets, recipes, buildings, technology tiers or enemy factions are not a distinctive identity. The goal is a **small number of unusually deep, satisfying and interacting systems** that produce stories not explicitly scripted by the developer.

**Creative thesis:** OUTPOST is about *building a civilization through physical actions in a persistent, discoverable universe*. Its smallest actions (a difficult landing, one asteroid recovered, one refinery constructed) causally support its largest ambitions (orbital infrastructure and multiple settled star systems). Players retain the option to fly, build and explore personally even when their industry becomes highly automated.

We are not claiming that continuous space, asteroid mining, ship construction, research or procedural planets are new inventions. Differentiation rests on the integration, pacing, consequences and player agency of their interactions.

## 2. Competitive reference study (design comparisons, not replication targets)

These are useful established reference points, with the comparison kept to their recognizable design strengths. Revalidate competitor details before public positioning.

| Reference | Recognized strength | Avoid copying | OUTPOST's design opportunity |
|---|---|---|---|
| **ΔV: Rings of Saturn** | Tactile 2D asteroid mining, engineering and physical flight | Mining simulation as the whole game | Link hands-on mining to colonies, physical orbital hazards, scientific discovery and expansion |
| **Cosmoteer** | Deep spacecraft design, fleet combat and system construction | Competing on ship-editor intricacy | Use smaller modular decisions with real landing, cargo, expedition and colony consequences |
| **Factorio: Space Age** | Interplanetary production and logistics, technology and asteroid hazards | An enormous recipe/conveyor optimization competition | Make industry emerge from personally flown expeditions, with physical shipping and strategic outposts |
| **Space Engineers** | Ship/base construction, survival, mining and physical world | Replicating a studio-scale engineering sandbox | A focused 2D experience centered on discoverable science, orbital events and an intimate-to-vast scale arc |
| **Nimbatus** | Modular automation and physical drones | Making programming vehicles the entire game | Introduce automation as earned help for a civilization originally built by hand |

**Review question:** For each new mechanic, are we adding an imitation of a familiar feature, or does it strengthen interactions that are distinctly OUTPOST?

## 3. Five signature promises

### 3.1 One object, many uses — the asteroid as the canonical example
An asteroid is not categorically “ore,” “enemy projectile” or “mission marker.” It is a persistent body with motion, mass, composition and physical consequences.

The same asteroid may be:
1. **Mined:** fractured, harvested, transported.
2. **Studied:** scanned, sampled, used to develop material science.
3. **Destroyed:** intercepted and broken into physical fragments whose trajectories still matter.
4. **Deflected:** pushed onto a harmless trajectory with ship thrust or specialized equipment.
5. **Captured:** guided into a stable/useful orbit and eventually mined in place.
6. **Redirected:** deliberately sent toward a safe impact or salvage zone (with risk).
7. **Used as a construction anchor:** develop an orbital mine or other facility around a recovered body (exploratory).

The signature emergent story: a dangerous incoming body is captured, becomes a source of rare materials, and years later hosts an industrial station. No authored quest needs to dictate this history.

**Engineering caution:** Capture/deflection must follow consistent momentum and orbital rules. Fragmentation must not simply erase dangerous mass. We may need physically justified simplifications for gameplay and performance. Test whether this is fun before allowing every exotic use.

### 3.2 The universe, not a script, provides challenges
An Observatory detects an approaching asteroid field with imperfect predictions. The event then unfolds under the same local gravity and collisions as player-operated craft. Objects may miss entirely, hit the far side, threaten an orbital station or intersect the player's flight path.

The player responds with meaningful alternatives: powered point defense, manual interception, tug/deflection, protecting a facility, evacuation, or accepting calculated risk. Impacts and recoverable meteorites persist. The aftermath may open research.

Avoid the conventional pattern “build X turrets before a timer, then receive scripted reward.” Detection, preparation, physical event and persistent aftermath are one connected story.

### 3.3 Discovery is an input to engineering
Use the cycle **encounter → observe/sample → research principles → build an application → gain new reach**.

Example: encounter damaging micrometeoroids → sample or analyze hull damage → understand particle shielding → fabricate armor or active deflector → choose between protection, payload, energy and maneuverability.

Where useful, research should unlock *principles* with multiple applications:
- High-energy emitters, capacitors and cooling underpin mining lasers, point-defense weapons and ship weapons.
- Better sensors support orbital survey, interception and navigation.
- Materials science helps hulls, pressure vessels and mining tools.
- Efficient propulsion supports probes, freight and exploration.

Different applications still incur different mounts, duty cycles, cooling, power and fabrication needs. Avoid three near-identical “laser II” research entries without physical distinctions.

**Discovery is not a forced quest:** A skilled explorer may encounter a relevant phenomenon before the intended story sequence. Basic survival and progression must remain possible without rare RNG.

### 3.4 World history matters
One save should accumulate a recognizable history: early wrecks, surviving starter lander, depleted mineral deposits, impact craters, recovered asteroid stations, old satellites, remote industrial facilities and missed/observed events.

The world does not reset its consequences merely because the player is far away. Save seeded baseline plus meaningful persistent deltas. A player should be able to return to the site of an early failure and recognize it.

**Anti-clutter rule:** Preserve meaningful structures and events; aggregate or expire trivial particles, dust and debris to protect performance.

### 3.5 Civilization-scale command never removes tactile flight
Early game is one vulnerable pilot retrieving a rock, managing thrust, fuel and safe touchdown. Later game includes automated mines, cargo routes and multiple star systems. But individual landings, interceptions, salvage operations and expeditions remain playable and skillful.

Do not automatically replace all manual activities with menus when automation unlocks. Allow the player to choose how directly to participate.

## 4. Where NOT to compete
Avoid committing to these as headline features without evidence that they improve the core:
- Hundreds of buildings or research nodes for their own sake.
- A deeply nested assembly editor rivaling full ship-construction games.
- Enormous Factorio-style conveyor optimization.
- Complex faction diplomacy or an MMO-like economy.
- Huge scripted questlines as a substitute for emergent play.
- Automatically level-scaled enemies and generic enemy waves.
- Massive procedural universes populated with indistinguishable content.
- Making all advanced technologies small percentage buffs.

Ordinary supporting mechanics can be simple. A refinery may have only a few useful recipes if it creates consequential real-world decisions. A tiny building set can be more memorable when each facility changes what the player can do.

## 5. Three “make it excellent” vertical slices

### Slice A — The first excellent mining flight
**Experience:** Personally pilot a small lander, identify one asteroid, fracture and collect material, survive return, land and fabricate a useful object. Every part is readable and gratifying.

**Quality bar:** Responsive thrust and camera, visible inertia, satisfying fracture/collection feedback, intelligible cargo/fuel limits, credible landing danger, unmistakable accomplishment and a clear next use for the ore. No mandatory menus obscuring the action.

**Failure signals:** Mining is tedious; pickups are confusing; landing feels arbitrary; the ore has no meaningful immediate use.

### Slice B — The first unscripted-feeling asteroid storm
**Experience:** Detect a threat, understand uncertainty, choose preparation, witness actual orbital trajectories, defend or manipulate objects, and live with persistent damage and valuable aftermath.

**Quality bar:** At least two genuinely different viable responses (for example turret interception and manually flown interception/deflection), physical misses and far-side impacts, understandable warning/coverage, consequences and a credible salvage/research opportunity.

**Failure signals:** The storm is a cosmetic cutscene; all rocks magically target home; fragmentation is a damage animation; one turret count is the only meaningful choice.

### Slice C — The first expedition to another world
**Experience:** See a distant body before access is comfortable, observe or survey it, engineer a viable spacecraft, plan sufficient fuel/braking margin, make the journey, obtain something new and return or establish a foothold.

**Quality bar:** Distance and gravity are felt, equipment trade-offs matter, no invisible level wall, destination is meaningfully different, first arrival is memorable, a risky early attempt is possible.

**Failure signals:** Destination selected from a level menu, research gives permission to enter, travel is pure empty waiting, and rewards could equally have been purchased at home.

**Priority:** Perfect these three before pursuing an enormous galaxy, faction warfare or a massive module catalogue.

## 6. The four-part feature identity test

Before approving a major feature, answer:

1. **Physical consequence:** Does it change or interact with the simulated world rather than only a UI number?
2. **Meaningful discovery:** Does it reveal information, a phenomenon or a new *kind* of capability?
3. **Interesting decision:** Are there multiple viable approaches, trade-offs or creative uses?
4. **Growing scale:** Does it make expansion feel earned while preserving tactile play?

**Rule of thumb:** A signature mechanic should satisfy at least **three** of four. A supporting feature may satisfy two or fewer when essential to usability, performance, access or economy; do not reject needed infrastructure solely for failing a creativity score.

Examples:
- Asteroid capture: all four.
- Observatory with uncertain warnings: physical event + information + decisions + expanding horizon.
- Generic +10% refinery efficiency: perhaps useful for balance, but not a signature feature.
- Another identical planet type with only different color: insufficient without gameplay consequences.

For feature reviews, document which qualities it supplies and why.

## 7. More distinctive experiments (optional)

**Physical experiments:** Players may personally test thrust and orbital deflection, cooling, heat shielding or entry profiles. Research can acknowledge actual measurements/samples. Avoid making every science step an exhausting puzzle.

**Dual-use technology:** One emitter or sensor breakthrough yields multiple applications; mounts and engineering trade-offs define roles.

**Asteroid rescue/history:** The rock that nearly destroyed a home settlement is saved, captured and eventually supports mining and station construction.

**Economy grounded in transport:** No remote factory output appears at home until a real hauler or equivalent physical service brings it.

**Scale-sensitive interface:** Lander instruments at the small scale, command planning at the colony/system scale, and a survey-derived stellar map beyond; all reflect the same universe.

## 8. Unique enough? A sober evaluation
No individual mechanic listed here is guaranteed original, nor does a design bible prove market differentiation. Strong identity depends on implementation quality and interaction depth. The real test is a playable prototype and comparison with the reference games.

Outpost's plausible defensible combination:
- Lunar Lander-like direct control and gravitational consequences,
- Asteroids-style combat and hands-on mining,
- physically persistent threats that can be repurposed into resources/infrastructure,
- discoveries that drive engineering options,
- player-built civilization that keeps small-scale piloting relevant,
- a seeded continuous 2D universe that remembers its history.

**External validation criteria:** Have unfamiliar players describe what they did, not what feature list they saw. Strong outcomes sound like “I redirected an asteroid and later built a mine on it,” not simply “it has lasers, research and planets.” Ask whether they can describe one event or choice they have not experienced in a close comparator.

## 9. Change control and next review
- Treat these as **creative priorities**, not proof of current implementation.
- Do not replace existing research, physics or ships solely to satisfy prose; extend and validate first.
- Add physical-system invariants and testable acceptance criteria in roadmap slices.
- Keep this file, the [Bible](MASTER_DESIGN_BIBLE.md), and [Roadmap](MASTER_ROADMAP.md) linked.
- Revisit after the three signature slices are playable, with direct player feedback and evidence.

### Design position (2026-11-04)
Prefer **depth through interacting systems** over breadth through content volume. The studio-scale ambition is allowed to grow, but only on a foundation of exceptionally good hand-scale experiences.
