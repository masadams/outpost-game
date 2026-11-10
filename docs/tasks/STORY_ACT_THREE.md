# Task: the story's second half (the seed ship and the ending)

Status: planned. Agreed direction; not built yet. Story bible: `docs/STORY.md`.

## Why
The story stops at the beacon's echo. It should carry on to a real ending the player chooses, and every world
in the system should matter on the way there. A longer game is fine.

## Agreed
- **The beacon is the midpoint.** "Do not wait for us" is not the last word.
- **A second signal.** Behind the makers' recording is a newer, fainter one: one seed project, at another
  star, worked. People live there.
- **The seed ship is the final project.** A large, staged build at home.
- **Every world must be explored first.** Each world holds one thing the ship cannot be finished without.
- **Every game has all eight worlds.** Verdant, Tide and Murk stop being optional, so the ending is the same
  journey in every game. Their positions and details still vary with the seed.
- **Why the pieces are scattered: the carrier broke up.** The seven seed units did not arrive separately. They
  came on one ship, the carrier, which broke apart on arrival. Its landers came down on different worlds, each
  carrying part of what the carrier held. The rest stayed in orbit as wreckage, and that wreckage is the
  storms: the slag you analyse after the first storm is carrier hull. So the storms, the derelicts, the units
  on each world and the keystones are all one event.
- **The ending is a choice**, made when the ship is ready:
  1. Go to the living colony (hopeful; leaves room for an expansion or a new game in a fresh system).
  2. Go home, to the makers' star (bittersweet; epilogue only, left open).
  3. Stay: you are the colony now. Keep playing.

## Shape
### Act 2: the silence (fills the wait for the echo)
- The echo arrives in pieces over the wait: static, then single words, then the whole message. Each piece is a
  memory in the Journal.
- Keep the long wait; it now has beats.

### Act 3: the second signal
1. After the echo, a running Antenna picks out the second signal over time (a new memory, then a goal).
2. An expedition to the far system finds the makers' relay and brings back where the living colony is.
3. That opens the **Shipyard** blueprint and the seed ship's stages.

### How the player learns it
- Already in the game: storm pieces are "worked metal, melted and flung. Something was built out there once,
  and broken." That line stays as the first hint.
- New memories name it in steps: the derelict's hull plate matches the slag; a keystone carries the carrier's
  name; the relay's log gives the break-up itself.
- The seed ship is built from the carrier's own surviving parts, which is why nothing else will do.

### What each world gives (one keystone each)
Found by landing, walking to a marked site and carrying it back to the lander, like the Nacre crystal.

| World | Keystone | Ship stage it finishes |
|---|---|---|
| Selene (home) | The yard itself | Frame |
| Nacre | Crystal lattice | Hull plating |
| Cinder | Unit 2's intact archive | Archive core (what the ship remembers) |
| Ember | Engine test records | Long-burn drive |
| Glint | The tracking mirror | Navigation (a fix on the target star) |
| Verdant | Living samples | Seed bank |
| Tide | Landing grid survey | Landing gear for a big ship |
| Murk | Unit 5 | A second mind for the voyage |

Each stage also costs materials, so the base has to be producing well.

### The ending
- When every stage is done the ship can launch. The choice is offered then, not before.
- Each choice has a short epilogue screen in the console style and a line in the Journal.
- "Stay" returns to play with the ship kept on the pad.
- "Go to the colony" offers a new game in a new system that keeps the recovered archive.

## Build order
0. All eight worlds in every game (system generation, Map, tests that every seed has them and can save).
1. Echo fragments and the second signal (memories only; small).
2. Keystones on each world: sites, pick-up and carry, Map markers, saved state, tests that each world's
   keystone can be reached and brought home.
3. Shipyard and staged build, with the world requirement.
4. Ending choice, epilogues, new game carrying the archive.
5. Balance pass on total length; playtest notes.

## Open
- Whether a keystone is lost with a wrecked lander (suggest: it stays in the wreck and can be recovered).
- How much each stage costs.
- What carries into the new game besides the archive.
