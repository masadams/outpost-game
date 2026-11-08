# Automatic cargo pods between worlds (idea, not built)

**Idea (from play):** a command panel that keeps worlds stocked by itself. For each world you set a minimum reserve of each resource. When a world drops below its reserve and another has more than its own reserve to spare, the system fills a cargo pod, launches it and delivers it, on a demand schedule, with no clicking.

## Sketch
- **Panel:** Base → a new "Supply lines" section: a grid of worlds by resources, each cell with a reserve (kg) and a "send surplus" switch.
- **Rules:** a source is only used for what it has above its own reserve plus what is already on the way; a destination asks for what it is short of, minus pods already in flight to it. Never send more than a pod holds; one pod per world pair at a time (or as many as there are pods in the air).
- **Real costs, as now:** each launch pays its fuel at the sender (less with a Mass driver), takes real flight time, can be lost. If the sender cannot pay, the panel says so in one line, and nothing is faked.
- **Cadence:** check every minute or so, so it reads as a calm supply chain, not a flood.
- **Earned:** gated behind Pod logistics and a running Mass driver on the sending world; a Workshop-style building ("Dispatcher") could carry the logic.
- **Seen:** the pods already show on the Map with lanes and beacons, so a busy network is visible for free.

## Questions
- Per resource (iron, ice, ...) or also products (alloy, fuel)? Pods carry ore today.
- Does the player tune priorities between worlds, or only reserves?
