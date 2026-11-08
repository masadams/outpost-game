# Encounters and events: ideas to keep it exciting

Status: ideas 1 to 7 are built (see `src/sim/events.ts` and DECISIONS.md): flares, dust fronts, seam events (richer pocket), comets, faults, claim-jumpers and debris fields. Also built: 8 in part (wrecks to salvage on the expedition) and 9 in part (air leaks in domes). Still design only: 10 (the rare big one). Written to be picked from in order of payoff per effort. Every item follows the rules in
AGENTS.md: it must be caused by something the player did or a seeded schedule, show a clear warning, give a way to respond, and
never take something from the player behind a window they cannot see past.

## What the game has today

Storms (warned, defended, aftermath), strays and big rocks, the survey buoy, finds, Nacre's crystal, pods that can be lost,
the deep signal (echo, expedition with trouble decisions) and far worlds. Everything dangerous so far falls from the sky or
happens on the expedition. There is little that happens **on the ground**, **to the economy**, or **between** storms.

## The gap

Between storms the loop is calm: mine, refine, build. The fix is a steady drip of smaller things that ask for a *decision*
rather than only reflexes, and a few rare big ones that change the map.

## Ideas, ranked

### 1. Solar flares (star-driven power events) — small build, big effect
The star is already a real body. A flare warning (observatory-aided, like storms) gives about a minute, then panels are
boosted for a short time (a windfall if you have batteries) followed by a surge that trips unprotected relays/lines. Players who
built batteries and spread the grid ride it out; players with one line lose a building's boot-up.
*Needs*: a flare schedule in the sun module, a surge rule in the grid, one warning chip. *Rewards*: pushes batteries and relays.

### 2. Dust fronts and wind (air worlds only) — small
On Selene and Ember air drives a slow dust front that cuts solar for a stretch and clogs mining rigs (efficiency down, wear up)
until a repair pass. Wind turbines love it. Gives the generator choice a weather reason.
*Needs*: a seeded weather timeline; a multiplier on solar and rig output; a notice.

### 3. Ore seam events: rich vein, collapse, depletion warning — small
When a seam is nearly gone, say so ("The seam is thinning"); sometimes a worked seam uncovers a richer pocket (small windfall)
or a rig is caught in a collapse (damage, repair). Turns the mining rig from a fire-and-forget into something to watch.

### 4. Wandering visitors — medium, strongest for story
A drifting derelict, probe or comet appears on the Map on a seeded schedule with a window to reach it. Reaching it gives a
find (a new tech opener), salvage, or a hazard. Ties into the find system (there are only seven finds; more means more beats).
Comets give a one-off ice bonanza that reaches a different body's ice shortage.

### 5. Equipment fatigue and breakdowns — medium
Buildings wear; at a threshold a machine stutters (slower, then a fault) until a crew repair. The Repair / fuel station and Field
repair tech finally matter on their own. Keep it gentle: a repair is a short walk, never a lock-out.

### 6. Rival or claim-jumper drones — medium
A seeded drone arrives and starts mining a seam you haven't claimed (a rig on it protects it). You can chase it off with the
ship laser or buy it off with a delivery. Makes empty seams worth claiming early. Uses the existing drone logic in reverse.

### 7. Supply line sabotage by weather — small, ties pods together
Pods already have a chance to be lost. Add a visible "bad lane" window: when a body is crossing a lane (a moon in transit) a
pod risk goes up; the supply line pauses and says why. Players learn to read the sky for logistics, not just defence.

### 8. Expedition events with more branches — medium
Right now trouble is a single decision with three outcomes. Add a short chain: a find in the far system that costs
something to take, an old signal that points to the next system, a crew injury that changes the next leg. Each choice
should spend something real (fuel, a part, time) and be recorded in the Journal.

### 9. Habitat life events — medium
Once people live in domes: a low-oxygen warning during a storm, a morale-lifting find, a visitor needing a spare bunk. Keep it
to a notice and a choice; do not add a survival micro-management layer.

### 10. A rare "big one" — large
Once every few storms, a body too big for any turret that has to be steered, nudged with the tractor/mass driver, or sheltered
from. The player decides between a heroic intercept and a managed loss (buildings in the zone are damaged but nobody dies).
Needs new physics for pushing a body; leave until the rest is bedded in.

## How to schedule them

* One **seeded timeline per game**, like storms: events never come from a random roll at the moment of play, so the same seed
  tells the same story and tests can replay it.
* A **cooldown** between events (never two sources of warning at once) and a ceiling on how many are active.
* Each event type is **gated by the story**: flares after the first Observatory, weather on air worlds only, visitors after the
  buoy, claim-jumpers after a second world. That reuses the cue pattern used for milestones.
* Each one writes a line in the Journal when it resolves, so the story reads back.

## Suggested first slice

Flares (1) and seam events (3), then visitors (4). They add three different kinds of response (power planning, mining
attention, a short trip) with the smallest code, and none needs new physics.
