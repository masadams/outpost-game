# Fun pass: make the first ten minutes engaging

Playtest note: the early game is dry and a little boring. The systems are there, but the first minutes are mostly holding keys, reading text and waiting. The bible's first pillar is physical satisfaction; this run puts it first, ahead of growth run 4.

Diagnosis (from the scripted pass and the code):
- **Long holds, little feedback.** Lift off (hold W), cut (hold Space), pull (hold C), land, press E. Each step works, but nothing punctuates it: no hit, no burst, no score, no "nice".
- **The reward is abstract.** Ore becomes a number in a table; the first delivery has no moment.
- **Slow middle.** Walking out, queueing, waiting for construction and refining are minutes with nothing to do.
- **No pressure early.** Nothing threatens or times the player until the first storm, about 20 minutes in.
- **Text-heavy guidance.** Correct but dry; the clone pilot has no voice.

Slices, in order (each small, tested, merged on its own; all feedback, no free resources):

| # | Slice | What it changes | Status |
|---|---|---|---|
| F1 | **Sortie report and landing grade.** On landing: ore delivered, time, fuel used, and a touchdown grade (rough, good, clean, perfect) from the real landing numbers; best sortie kept. | Every flight ends with a moment and a number to beat. | Planned |
| F2 | **Juice.** Hit-stop and a camera kick when a rock breaks, ore pickups that pop with a rising chime and a "+3 kg" float, a combo count while pickups chain, hull rattle on hard contact, engine flare that scales with thrust. Respects reduced motion. | Cutting and collecting feel physical. | Planned |
| F3 | **Pacing.** First rocks close and slow-falling, the first cut quicker, construction and the first refinery batches faster early on (tuned, not free), and the astronaut walks faster. | Less waiting in the first five minutes. | Planned |
| F4 | **Pilot voice.** Short radio lines from the clone pilot on first events (first cut, first ore, first landing, first building running, dusk, storm sighted). One line at a time, never blocking. | Character and warmth instead of instructions. | Planned |
| F5 | **Early pressure.** A light shower of small rocks a few minutes in: shoot them with the ship laser for ore, or they pit the ground near the base. Seeded, fair, skippable by staying landed. | An early arcade beat and a reason to fly well. | Planned |
| F6 | **Quick contracts.** Small timed asks from the base (deliver 20 kg of ice before dusk; land cleanly three times) with a badge, no material reward. | Short goals between the big milestones. | Planned |
| F7 | **Feel check.** Hands-on pass with screenshots and a short screen-capture style sequence; tune numbers; remove anything that adds noise. | Keep what is fun, cut what is not. | Planned |

Bible checks: no free resources from grades or contracts; feedback only. Arcade feel is presentation and pacing, not changed physics. Everything respects reduced motion and audio settings.
