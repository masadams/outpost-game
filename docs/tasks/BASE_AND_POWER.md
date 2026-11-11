# Task: headquarters, power grids and moving ore (planned, not built)

Status: planned from playtest notes. Nothing here is built yet. Decisions go in `docs/DECISIONS.md` as each part lands.

## 1. Headquarters
The base has no centre: the game starts with only the lander.
- A **Headquarters** stands beside the home pad from the start. Everything else hangs off it.
- It can be upgraded (several levels). Each level raises the base's building limit, storage and power store,
  and later opens the next tier of buildings. The flat limit (`MAX_BUILDINGS`, now 96) becomes the HQ's limit.
- It is the root of the power grid (see 2): the grid is everything connected back to it.
- Other worlds get a smaller **Outpost core** from the rig kit, which does the same job there.
- Story fit: the HQ is the seed unit's own housing; upgrading it is the unit growing.

## 2. Power grids and relays
Playtest problems: a relay on the far side of the world kept linking back to the base instead of to the nearest
relay; relays near the base link things that do not need them and add line losses; there is no way to see
separate grids.
- **Clear rules.** Buildings within normal reach link to their nearest neighbour; relays only carry power between
  groups that are otherwise out of reach. A relay never sits in a path that is shorter without it.
- **Separate grids are allowed.** A far-side mine with its own solar and battery is its own grid, with its own
  store. Connecting it to the base is a choice (a relay line), not automatic.
- **A Grids view** in Base: each grid, what makes and stores power on it, what it feeds, and its losses.
  The world shows the lines on demand.
- Losses: per hop and per kilometre, shown in the Grids view.

## 3. Moving ore from far mines
For now a rig's ore goes straight into the base depot wherever the rig is. Options to decide later:
carts or a rail along the ground, drone haulers, or each grid keeping its own depot until moved.
Not urgent; noted so the grid work leaves room for it.

## 4. Ore deposits, once over
Deposits date from early work. Bring them up to date: clearer markers and amounts on the ground and the Map,
richer and poorer seams, depletion that shows, and a reason to prospect (a scan from the lander or a probe).

## 5. Base kit for other worlds
The rig kit carries a rig, a solar array, a battery and a relay. Idea from playtest: send enough for a small
refinery too, so ore can be refined on the spot and shipped or used as materials there. Weigh against the kit's
size and the lander's hold.

## Order
1. Grid rules and the Grids view (fixes what players hit now).
2. Headquarters, with the building limit and storage moving onto it.
3. Base kit with a refinery.
4. Deposits once over.
5. Moving ore from far mines.
