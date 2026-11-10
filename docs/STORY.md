# Story: The Seed

Short story bible. Code: `src/sim/story.ts`. Player-facing text lives there, in the `MEMORIES` list.

## Premise
You are **seed unit 7**: a machine mind sent ahead to make a star system ready for colonists who would follow.
The base console is the unit; the pilot is a body it prints, which is why a lost pilot can be printed again.
The unit has just woken after 412 years with 6% of its memory readable. It still has its standing order.
It does not know its makers are long gone.

## How the story is told
- **Boot log.** The first seconds of a new game print five lines in the console style. It never blocks input.
- **Memories.** Things the unit recalls as events happen. Each is one or two short lines, announced once
  ("MEMORY RESTORED · ...") and kept in the Journal, newest first, with how much of the archive now reads back.
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
| Mining rig | 250 kg delivered by hand | The survey buoy is reached |
| Power relay | The base has five buildings | |
| Air condenser | A fuel processor is built | |

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
5. **The beacon.** You report "system ready". The echo is a recording, centuries old: "We cannot follow. Do not
   wait for us. What you build is yours."
6. **The choice.** The expedition leaves anyway, because you chose it and not because you were ordered.

## Voice
Terse, plain, second person or none. A machine log that is slowly becoming a person. No jokes, no jargon.
Each memory stays under 170 characters.

## Not yet
- No ending screen after the expedition returns.
- World memories are story only; they give no materials or parts.
- The standard test layout (no day cycle) has no story and keeps the old unlock order.
