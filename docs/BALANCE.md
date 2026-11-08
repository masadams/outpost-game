# Balance notes

A best-guess pass on how the numbers fit together, worked from the config values. **Not play-tested by hand**: the figures are
arithmetic on the constants, so treat the targets as a starting point and expect to retune after real play.

## The economy in numbers

| Thing | Value |
|---|---|
| Start | 28 alloy, 14 wire, 8 components, 4 water, 2 oxygen; ship fuel 240 kg, hold 120 kg |
| Stock caps | products 100 (+100 per Storage); ore depot 400 (+200 per Storage); Tier II/III Storage ×1.5/×2 |
| Day | 1000 s |
| Solar / wind / geothermal | 8 kW by day / 6 kW (needs air) / 5 kW all day |
| Battery | 1200 kJ (so one battery carries 1 kW for 20 min; a full night for a 50 kW base needs ~20) |
| Mining rig | 0.25 ore/s at 6 kW (≈250 ore per full day) |
| Drone bay | 0.083 ore/s at 3 kW, no seam needed |
| Refinery | 0.5 ore/s at 4 kW; 1 ore → 1 product (components 0.9 silicon + 0.1 rare metal) |
| Ship hauling | 120 kg hold; a rock holds 40–64 kg, so two rocks fill the hold |
| Ground ore on Selene | iron 540, copper 480, silicon 400, rare metals 160, ice 360 (1,940) plus about 1,500 kg in the 31 starting rocks |
| Other worlds (seams) | Nacre iron 160; Ember iron 170, ice 200, copper 120; Glint ice 460, iron 90; Cinder rare 400, silicon 200 |

## What everything costs (one of each, before duplicates and tiers)

| | alloy | wire | components | total kg |
|---|---|---|---|---|
| Buildings (24 kinds) | 202 | 88 | 56 | 346 |
| Ship parts (34) | 350 | 169 | 103 | 622 |
| Research (29), after this pass | 481 | 267 | 158 | 906 (was 625) |
| **All of it** | **1,033** | **524** | **317** | **~1,870** |

Building upgrades add 1× (Tier II) and 2× (Tier III) the base cost per building, and the game wants several of most buildings, so
a fully built base runs to several thousand kg.

## Where the pressure is

* **Iron is the pinch point.** All of it needs about 1,030 alloy, and Selene gives roughly 840 iron (seams plus iron rocks).
  Finishing the tree and tiering a base means reaching Nacre and Ember, then supply lines or pods to move it.
  This is the intended scale-up from "one world" to "a network".
* **Copper is comfortable, silicon and rare metals are plentiful.** Components never run short; rare metals pile up unused.
* **Research time is not the limit** (1,175 s of lab time in all, a bit over one day); materials are. That is right for a
  game about engineering: you choose what to spend on.
* **Product cap 100** is above the dearest single item (late tech ≈ 40 kg, Tier III building ≈ 2× base), so nothing is un-buyable,
  but you have to build Storage to stockpile for a big purchase.
* **Night is the early power test.** Solar is 8 kW for about half the day, so a base running 20 kW needs three panels and about
  ten batteries to run through the night. Geothermal (5 kW constant) pays back the same as a solar panel and takes pressure off
  the batteries, which is why it is gated behind Geoscience.
* **Hauling**: 120 kg per trip fits two rocks; Cargo rack (+80) and Bulk hold (+180) are the big early quality-of-life steps,
  priced to be among the first parts.

## Changes made in this pass

1. **Research costs climb with depth in the tree.** Each step below the root adds 12% to the cost (rounded up). The first
   technologies are unchanged; the deepest (5 steps) cost 1.6×. Whole tree: 625 → 906 kg. Lab time is unchanged.
   *Why*: a mature base makes 700+ ore a day, so late techs at 30–40 kg were pocket change; now the end of the tree is a
   deliberate spend that competes with parts and buildings.
2. **Storms keep growing for longer.** The ramp used to stop at the sixth storm (15 bodies, +32% toughness). It now runs to the
   ninth (up to 19 bodies, +56% toughness), so the late game keeps asking for better defence. The save limit (24 bodies in
   flight) still holds with strays.
3. Ship part costs were left alone on purpose: a part's cost equals its mass, and the fittings rely on that.

## Pacing targets (to check in play)

| Stage | Target | What gates it |
|---|---|---|
| First delivery | within 3–5 minutes | hold of 120 kg, two rocks |
| Industry running | ~10 minutes | 28 alloy start covers solar + refinery + a rig with a little left |
| First storm warning | ~day 1 (t≈730 s) | fixed schedule |
| First storm | t≈1150 s (early day 2, in daylight) | fixed schedule; turrets and ship laser |
| Observatory, Research lab, first parts | day 2 | Frost buoy survey, a find to study |
| Nacre rig, second storm | day 3 | second storm 500+ s after the first ends |
| Network of two worlds, pods | day 5–7 | iron runs thin on Selene |
| Expedition (deep signal) | day 8+ | Deep signal tech needs two storms survived and an Antenna |
| End game | storm 9 plateau, all tiers, far worlds | defence and supply have to scale together |

## What the economy bot showed

`npm run bot` plays a fixed build order on a seeded game for ten days (it cannot fly: hauling is one 120 kg trip every
150 s, and the buoy and derelict finds are assumed). Findings:

* The 28 alloy start covers solar, refinery, battery, storage and a rig, so industry can run within minutes.
* Hauling clears the 31 starting rocks in about one day. After that the ship only earns from belts and comets.
* Alloy runs out first, at about day 4.5, while wire and components pile up (200+ each). With home iron 1.4x richer
  in seeded games (below) the home-only run reaches 15 to 16 technologies instead of 12 before it stalls. The rest needs
  finds from other worlds (Nacre crystal, Cinder core) and their iron, which is the intended push outward.
* Night is tight: with three or four batteries the store still touches zero before dawn in the first days.
* Storms wreck a building every few days if nobody repairs.

**Change made:** in seeded games Selene's iron seams hold 1.4x the standard amount. The standard layout (seed 0) is unchanged.

## Further knobs, not changed yet

* Rocks now drift in (one every 300 s while fewer than six are left); with that the bot's stock fills up after day 5 and the limit becomes finds on other worlds.
* Wire and components pile up mid-game; shifting a little alloy cost to wire on the big buildings would even it out.

* Tier III costs 2× base; with the new tech costs it may be worth 2.5× for the dearest buildings.
* Iron on Nacre (160) could rise to 220 so the first expedition pays off sooner.
* Rare metal surplus could feed a late sink (for instance Tier III shields) so it is worth carrying.
* Starting fuel is 0 in the depot; ice → fuel is the first real production line and could use one more tutorial nudge.
* The right answer to all of these is a bot-run "economy soak" that plays a fixed build order and reports the day each stage lands.
