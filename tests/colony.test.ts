import { describe, expect, it } from 'vitest';
import { applyColonyAction, energyCapacity, oreCapacity, placementError, stepColony } from '../src/sim/colony';
import { BUILD_TYPES, type BuildType } from '../src/sim/colonyConfig';
import { refuelShip, serviceAtBuilding } from '../src/sim/colonyService';
import { FixedClock } from '../src/sim/clock';
import { ATMOSPHERE, STEP, WORLD } from '../src/sim/config';
import { inventoryMass } from '../src/sim/resources';
import { stationPosition } from '../src/sim/stations';
import { createWorld, stepWorld, unloadCargo, type WorldState } from '../src/sim/world';

export function build(world: WorldState, kind: BuildType, arc: number): void {
  world.playerMode = 'astronaut'; world.astronaut.grounded = true;
  world.astronaut.position = stationPosition((arc - 24) / WORLD.radius);
  world.colony.buildOpen = true; world.colony.offset = 24; world.colony.selected = kind;
  const error = placementError(world); if (error) throw new Error(error);
  applyColonyAction(world, { type: 'place' });
}
function run(world: WorldState, seconds: number): void { for (let i = 0; i < Math.round(seconds / STEP); i++) stepColony(world, STEP); }
describe('surface construction', () => {
  it('builds each facility once, deducts costs, and anchors to the surface arc', () => {
    const world = createWorld(); BUILD_TYPES.forEach((kind, i) => build(world, kind, 120 + i * 40));
    expect(world.colony.buildings).toHaveLength(6); expect(new Set(world.colony.buildings.map(b => b.id)).size).toBe(6);
    expect(world.colony.products.alloy).toBe(0); expect(world.colony.products.wire).toBe(2);
    expect(world.colony.buildings[0].angle * WORLD.radius).toBeCloseTo(120);
    expect(oreCapacity(world.colony)).toBe(600); expect(energyCapacity(world.colony)).toBe(220);
  });
  it('rejects piloting, airborne, pad/terminal, overlapping and unaffordable sites without spending', () => {
    const world = createWorld(), original = { ...world.colony.products };
    applyColonyAction(world, { type: 'place' }); expect(world.colony.products).toEqual(original);
    world.playerMode = 'astronaut'; world.astronaut.grounded = false; expect(placementError(world)).toMatch(/Stand/);
    world.astronaut.grounded = true; world.astronaut.position = stationPosition(0);
    expect(placementError(world, 'solar', 0)).toMatch(/pad/);
    expect(placementError(world, 'solar', 54 / WORLD.radius)).toMatch(/terminals/);
    build(world, 'solar', 120); expect(placementError(world)).toMatch(/overlap/);
    world.astronaut.position = stationPosition(0.5); world.colony.products.alloy = 0;
    expect(placementError(world)).toMatch(/materials/);
  });
  it('demolishes with a 75% refund and never duplicates the refund', () => {
    const world = createWorld(); build(world, 'solar', 120);
    world.astronaut.position = stationPosition(120 / WORLD.radius);
    applyColonyAction(world, { type: 'demolish' });
    expect(world.colony.buildings).toHaveLength(0); expect(world.colony.products.alloy).toBe(27);
    applyColonyAction(world, { type: 'demolish' }); expect(world.colony.products.alloy).toBe(27);
  });
  it('blocks storage demolition that would strand inventory, and clamps discarded battery charge', () => {
    const world = createWorld(); build(world, 'storage', 120); world.depot.iron = 500;
    world.astronaut.position = stationPosition(120 / WORLD.radius); applyColonyAction(world, { type: 'demolish' });
    expect(world.colony.buildings).toHaveLength(1);
    world.depot.iron = 390; applyColonyAction(world, { type: 'demolish' }); expect(world.colony.buildings).toHaveLength(0);
    build(world, 'battery', 160); world.colony.energy = 220;
    world.astronaut.position = stationPosition(160 / WORLD.radius); applyColonyAction(world, { type: 'demolish' });
    expect(world.colony.energy).toBe(20);
  });
  it('leaves overflow aboard until more storage is constructed', () => {
    const world = createWorld(); world.depot.iron = 399; world.ship.cargo.copper = 5;
    expect(unloadCargo(world)).toBe(1); expect(world.ship.cargo.copper).toBe(4); expect(inventoryMass(world.depot)).toBe(400);
    build(world, 'storage', 120); expect(unloadCargo(world)).toBe(4); expect(world.unloaded).toBe(5);
  });
});
describe('power and manufacturing', () => {
  it('requires power and feedstock, then consumes ore only once per completed recipe', () => {
    const world = createWorld(); build(world, 'refinery', 120); world.depot.iron = 1;
    run(world, 3); expect(world.depot.iron).toBe(1); expect(world.colony.buildings[0].status).toBe('no power');
    build(world, 'solar', 160); const alloy = world.colony.products.alloy;
    run(world, 1); expect(world.depot.iron).toBe(1); expect(world.colony.products.alloy).toBe(alloy);
    run(world, 1); expect(world.depot.iron).toBe(0); expect(world.colony.products.alloy).toBe(alloy + 1);
    run(world, 4); expect(world.colony.products.alloy).toBe(alloy + 1); expect(world.colony.buildings[0].status).toBe('no feedstock');
  });
  it('stores solar energy, caps battery charge, and retains it after the generator is disabled', () => {
    const world = createWorld(); build(world, 'solar', 120); build(world, 'battery', 160);
    run(world, 40); expect(world.colony.energy).toBeCloseTo(220);
    world.colony.buildings[0].enabled = false; run(world, 10); expect(world.colony.energy).toBeCloseTo(220);
  });
  it('shares limited power deterministically without negative energy or free output', () => {
    const world = createWorld(); build(world, 'solar', 120); build(world, 'refinery', 160); build(world, 'refinery', 200); build(world, 'fuelProcessor', 240);
    world.depot.iron = 50; run(world, 0.5);
    expect(world.colony.demand).toBe(14); expect(world.colony.energy).toBeGreaterThanOrEqual(0);
    expect(world.colony.buildings[3].status).toBe('no power'); expect(world.colony.products.fuel).toBe(0);
  });
  it('pauses at full product storage and changes recipe without granting output', () => {
    const world = createWorld(); build(world, 'solar', 120); build(world, 'refinery', 160);
    world.depot.iron = 10; world.colony.products.alloy = 100; run(world, 4);
    expect(world.colony.buildings[1].status).toBe('output full'); expect(world.depot.iron).toBe(10);
    world.astronaut.position = stationPosition(160 / WORLD.radius); applyColonyAction(world, { type: 'cycleRecipe' });
    expect(world.colony.buildings[1].recipe).toBe(1); expect(world.colony.buildings[1].progress).toBe(0);
    world.depot.copper = 1; const wire = world.colony.products.wire; run(world, 2); expect(world.colony.products.wire).toBe(wire + 1);
  });
  it('refines mined ice into water/oxygen and fuel while conserving feedstock mass', () => {
    const world = createWorld(); build(world, 'solar', 120); build(world, 'refinery', 160); build(world, 'fuelProcessor', 200);
    world.colony.buildings[1].recipe = 3; world.colony.products.water = 0; world.colony.products.oxygen = 0;
    world.ship.cargo.ice = 10; expect(unloadCargo(world)).toBe(10); run(world, 70);
    const { water, oxygen, fuel } = world.colony.products;
    expect(world.depot.ice).toBe(0); expect(fuel).toBeGreaterThan(8); expect(water + oxygen + fuel).toBeCloseTo(10, 8);
    world.ship.fuel = 220; const transferred = refuelShip(world, world.ship.position);
    expect(transferred).toBeCloseTo(fuel); expect(world.ship.fuel).toBeCloseTo(220 + fuel); expect(world.colony.products.fuel).toBeCloseTo(0);
  });
  it('keeps production running while the player is piloting away from the colony', () => {
    const world = createWorld(); build(world, 'solar', 120); build(world, 'fuelProcessor', 160);
    world.playerMode = 'ship'; world.ship.state = 'flying'; world.ship.position.y = -WORLD.radius - ATMOSPHERE.height - 500;
    for (let i = 0; i < 240; i++) stepWorld(world, { thrust: false, turn: 0 }, STEP);
    expect(world.colony.products.fuel).toBe(1.25);
  });
  it('produces identical world state at 30 and 144 rendering Hz', () => {
    const runAt = (hz: number) => {
      const world = createWorld(); build(world, 'solar', 120); build(world, 'fuelProcessor', 160);
      const clock = new FixedClock(); for (let i = 0; i < hz * 10; i++) clock.advance(1 / hz, dt => stepWorld(world, { thrust: false, turn: 0 }, dt));
      return world;
    };
    expect(runAt(30)).toEqual(runAt(144));
  });
  it('services only with stored energy, consumes oxygen/alloy/fuel, and cannot refuel remotely or in flight', () => {
    const world = createWorld(); build(world, 'service', 79); const station = world.colony.buildings[0];
    world.astronaut.position = stationPosition(station.angle); world.astronaut.oxygen = 90; world.astronaut.health = 50;
    world.ship.hull = 65; world.ship.fuel = 230; world.colony.products.fuel = 3;
    serviceAtBuilding(world, station); expect(world.ship.fuel).toBe(230);
    world.colony.energy = 10; const alloy = world.colony.products.alloy; serviceAtBuilding(world, station);
    expect(world.colony.energy).toBe(8); expect(world.astronaut.oxygen).toBeCloseTo(180); expect(world.astronaut.health).toBe(100);
    expect(world.ship.hull).toBe(100); expect(world.colony.products.alloy).toBe(alloy - 3.5); expect(world.ship.fuel).toBe(233);
    world.colony.products.fuel = 2; expect(refuelShip(world, { x: 1000, y: 0 })).toBe(0);
    world.ship.state = 'flying'; expect(refuelShip(world, world.ship.position)).toBe(0);
  });
});
