# Story: The Seed

Short story bible. Code: `src/sim/story.ts`. Player-facing text lives there, in the `MEMORIES` list.

## Premise
You are **seed unit 7**: a machine mind sent ahead to make a star system ready for colonists who would follow.
The base console is the unit; the pilot is a body it prints, which is why a lost pilot can be printed again.
The unit has just woken after 412 years with 6% of its memory readable. It still has its standing order.
It does not know its makers are long gone.

## How the story is told
- **Boot log.** The first seconds of a new game print five lines in the console style. It never blocks input.
- **Journal entries.** What the unit writes down as things happen. When one comes back it is shown on screen as a
  card (chapter, title, the entry) for as long as it takes to read; Open Journal or Dismiss puts it away, and a
  pause never eats the reading time. Several at once queue up. The objective card shows how many are unread.
- **The Journal.** Entries are filed by chapter: Waking, The sky, The other units, The signal, Long Patience, Far out.
  Each chapter shows how many of its entries have come back. Unread entries are marked New until the Journal is
  closed. A **Leads** box at the top gives one line per chapter on what to do next to find more.
- **Blueprint memories.** Six early buildings are memories too. Each comes back when the base meets the problem
  it solves, with the reason in the notice. This replaces handing over six blueprints at once.
- **What others left.** The derelict, the fuel tender and every other world hold a line from an earlier unit or
  from the makers. The Map says when a world has traces to read; landing there recovers the memory.

## Early blueprints and what brings them back
All need the first refinery, rig or fuel plant to have run. Each has a second trigger so nobody gets stuck.

| Blueprint | Comes back when | Or, at the latest |
|---|---|---|
| Battery | Night falls at the pad | 200 kg delivered |
| Fuel processor | The lander is under 60% fuel | 150 kg delivered |
| Storage | The depot is half full, or a material is 60% full | 300 kg delivered |
| Mining rig | 250 kg delivered by hand | |
| Power relay | The base has five buildings | |
| Air condenser | The first storm is over, with a fuel processor built | |

Later blueprints (Observatory, turrets, shields, domes and so on) keep their existing event triggers.

## The arc
1. **Waking.** Boot log; first ore; first metal ("the archive is not empty, it is asleep").
2. **The makers' traces.** The buoy still repeats its last order: watch the sky. The derelict is seed unit 4,
   whose log ends "No reply on any band. Continuing as ordered." The tender was fuelled for a ship that never came.
3. **The storms.** The archive lists forty, logged by a unit that was awake: you. The storm pieces are slag,
   worked metal from something built out there and broken.
4. **The other worlds.** Unit 2 crashed on Cinder. Engine-test rings on Ember. A mirror field on Glint tracking
   the makers' star. Verdant is why the system was chosen. A landing grid on Tide, never used. Unit 5 on Murk,
   still running, building and unbuilding one wall. Three of these bring back "the count": seven units were
   sent, six stopped.
5. **The beacon.** You report "system ready". The reply resolves out of the noise while the beacon is out: a
   pattern at a third of the wait, three words at two thirds ("cannot", "follow", "yours"), then the whole
   recording, centuries old: "We cannot follow. Do not wait for us. What you build is yours."
6. **The second signal.** Fifteen minutes after the echo, with an Antenna standing, a fainter and newer carrier
   wave shows under the makers' recording: one seed project, at another star, worked.
7. **One ship.** Once the storm slag is analysed and the derelict surveyed, they prove to be the same alloy from
   the same pour: the seven units came on one carrier, and it broke up. What broke it is never explained.
8. **The choice.** The expedition leaves anyway, because you chose it and not because you were ordered.

The rest of the story (a keystone on every world, the seed ship, the ending you choose) is planned in
`docs/tasks/STORY_ACT_THREE.md`.

## Deep space
Five things drift far out, 95 to 240 km: the carrier's spine with its recorder bay opened from inside, the makers'
marker, a frozen comet, a dark world on no chart, and a ring of landers from nowhere in the archive. They are
details that do not add up, left for an expansion to answer. See `src/sim/deepSpace.ts`.

## Voice
The unit's own log, first person, written the way a careful engineer writes up a shift: what happened, what was
found, what it means for the work. Rules for anyone adding entries:
- Say the concrete thing: a number, a name, what the log or the hull plate actually reads.
- Plain sentences of mixed length. No "it is not X, it is Y", no rows of three fragments, no closing aphorism.
- "I", never "you". Other voices (earlier units, the makers) appear only as quoted lines.
- Feeling is shown by what the unit notices and does, not named.
- No jokes, no jargon. An entry is at most 260 characters.
`tests/journalView.test.ts` checks the last three.

## Not yet
- After "To the living colony", Begin again starts a new system as the copy that went with the ship: a different boot log, a memory of the systems made before, and the same journey. The old game stays saved until saved over.
- World memories are story only; they give no materials or parts.
- The standard test layout (no day cycle) has no story and keeps the old unlock order.
