import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { applyColonyAction, placementError, stepColony } from '../src/sim/colony';
import { type BuildType } from '../src/sim/colonyConfig';
import { createSurfaceDeposits, depositAt, RIG } from '../src/sim/geology';
import { stationPosition } from '../src/sim/stations';
import { STEP, WORLD } from '../src/sim/config';
import { RESOURCES, inventoryMass } from '../src/sim/resources';
import { damageColony, repairBuilding } from '../src/sim/buildingDamage';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { FixedClock } from '../src/sim/clock';

function build(w: WorldState, kind: BuildType, arc: number) {
  w.playerMode = 'astronaut'; w.astronaut.position = stationPosition((arc - 24) / WORLD.radius); w.astronaut.grounded = true;
  w.colony.buildOpen = true; w.colony.selected = kind; w.colony.offset = 24;
  const error = placementError(w); if (error) throw new Error(error);
  applyColonyAction(w, { type: 'place' });
}
function run(w: WorldState, seconds: number) { for (let i = 0; i < Math.round(seconds / STEP); i++) stepColony(w, STEP); }
function fixture() { const w = createWorld(); build(w, 'solar', 120); build(w, 'miningRig', 160); return w; }

describe('finite planetary deposits and construction', () => {
  it('creates deterministic finite seams covering all five resources with immutable original capacities', () => {
    const a = createSurfaceDeposits(); expect(a).toEqual(createSurfaceDeposits()); expect(a).toHaveLength(10);
    expect(new Set(a.map(d => d.resource))).toEqual(new Set(RESOURCES)); expect(new Set(a.map(d => d.id)).size).toBe(10);
    expect(a.every(d => d.initial > 0 && d.remaining === d.initial)).toBe(true); a[0].remaining = 0; expect(createSurfaceDeposits()[0].remaining).toBe(180);
  });
  it('requires the whole rig footprint on a live seam without spending on invalid sites', () => {
    const w = createWorld(); w.playerMode = 'astronaut'; w.astronaut.position = stationPosition(0.1); w.colony.buildOpen = true; w.colony.selected = 'miningRig';
    const stock = { ...w.colony.products }; applyColonyAction(w, { type: 'place' }); expect(w.colony.products).toEqual(stock); expect(w.colony.buildings).toHaveLength(0);
    expect(depositAt(w.surfaceDeposits, 190 / WORLD.radius, 12)).toBeUndefined();
    w.surfaceDeposits[0].remaining = 0; expect(placementError(w, 'miningRig', 160 / WORLD.radius)).toMatch(/exhausted/);
  });
  it('charges the blueprint once and binds the rig to a persistent seam', () => {
    const w = fixture(), rig = w.colony.buildings[1]; expect(rig.kind).toBe('miningRig'); expect(rig.depositId).toBe(1);
    expect(w.colony.products.alloy).toBe(16); expect(w.colony.products.wire).toBe(9); expect(w.colony.products.components).toBe(5);
    expect(w.surfaceDeposits[0].remaining).toBe(180);
  });
});
describe('powered extraction invariants', () => {
  it('transfers exactly 0.5 kg every powered two seconds with no ore creation or overspending', () => {
    const w = fixture(); run(w, 10);
    expect(w.depot.iron).toBe(2.5); expect(w.surfaceDeposits[0].remaining).toBe(177.5);
    expect(w.surfaceDeposits[0].remaining + w.depot.iron).toBe(180); expect(w.colony.energy).toBeGreaterThanOrEqual(0);
    expect(w.colony.energy).toBeLessThanOrEqual(20); expect(w.colony.demand).toBe(RIG.power);
  });
  it('stops for missing power, disabled/wrecked machinery, invalid binding and full storage', () => {
    const w = fixture(), rig = w.colony.buildings[1]; w.colony.buildings[0].enabled = false;
    run(w, 3); expect(rig.status).toBe('no power'); expect(w.depot.iron).toBe(0);
    w.colony.energy = 20; rig.enabled = false; run(w, 3); expect(rig.status).toBe('disabled'); expect(w.colony.energy).toBe(20);
    rig.enabled = true; rig.health = 0; run(w, 3); expect(rig.status).toBe('wrecked'); expect(w.depot.iron).toBe(0);
    rig.health = 100; rig.depositId = 99; run(w, 3); expect(rig.status).toBe('no deposit'); expect(w.colony.energy).toBe(20);
    rig.depositId = 1; w.depot.iron = 400; run(w, 3); expect(rig.status).toBe('output full'); expect(w.surfaceDeposits[0].remaining).toBe(180); expect(w.colony.energy).toBe(20);
  });
  it('fills the final fractional storage room and extracts only the final fractional reserve', () => {
    const w = fixture(); w.depot.copper = 399.8; w.surfaceDeposits[0].remaining = 0.3;
    run(w, 2); expect(inventoryMass(w.depot)).toBeCloseTo(400); expect(w.depot.iron).toBeCloseTo(0.2); expect(w.surfaceDeposits[0].remaining).toBeCloseTo(0.1);
    run(w, 2); expect(w.surfaceDeposits[0].remaining).toBeCloseTo(0.1);
    w.depot.copper = 0; run(w, 2); expect(w.depot.iron).toBeCloseTo(0.3); expect(w.surfaceDeposits[0].remaining).toBe(0); expect(w.colony.buildings[1].status).toBe('depleted');
    run(w, 20); expect(w.depot.iron).toBeCloseTo(0.3);
  });
  it('shares the final reserve across multiple rigs without duplicate extraction', () => {
    const w = createWorld(); build(w, 'solar', 88); build(w, 'miningRig', 145); build(w, 'miningRig', 175); w.colony.energy = 20; w.surfaceDeposits[0].remaining = 0.7;
    run(w, 4); expect(w.depot.iron).toBeCloseTo(0.7); expect(w.surfaceDeposits[0].remaining).toBe(0);
    expect(w.colony.buildings.slice(1).every(b => b.status === 'depleted')).toBe(true);
  });
  it('preserves earned partial progress through a power pause without debiting the seam early', () => {
    const w = fixture(), rig = w.colony.buildings[1]; run(w, 1); const progress = rig.progress;
    w.colony.buildings[0].enabled = false; w.colony.energy = 0; run(w, 5); expect(rig.progress).toBe(progress); expect(w.surfaceDeposits[0].remaining).toBe(180);
    w.colony.buildings[0].enabled = true; run(w, 1); expect(w.depot.iron).toBe(0.5);
  });
  it('does not regenerate a seam after damage, paid repair, demolition or rebuilding', () => {
    const w = fixture(), rig = w.colony.buildings[1]; run(w, 6); const remaining = w.surfaceDeposits[0].remaining;
    damageColony(w, stationPosition(rig.angle), 200, 5); expect(rig.health).toBe(0);
    w.astronaut.position = stationPosition(rig.angle); repairBuilding(w); expect(rig.health).toBeGreaterThan(0); expect(w.surfaceDeposits[0].remaining).toBe(remaining);
    applyColonyAction(w, { type: 'demolish' }); expect(w.surfaceDeposits[0].remaining).toBe(remaining);
    w.colony.products.alloy = 20; w.colony.products.components = 5; w.colony.products.wire = 10; build(w, 'miningRig', 160);
    expect(w.surfaceDeposits[0].remaining).toBe(remaining); run(w, 2); expect(w.surfaceDeposits[0].remaining).toBeLessThan(remaining);
  });
});
describe('production loop, background simulation and persistence', () => {
  it('feeds surface iron into existing refining while conserving extracted ore/product mass', () => {
    const w = fixture(); build(w, 'solar', 200); build(w, 'refinery', 240); const alloy = w.colony.products.alloy;
    run(w, 40); expect(w.colony.products.alloy).toBeGreaterThan(alloy);
    expect(w.surfaceDeposits[0].remaining + w.depot.iron + w.colony.products.alloy - alloy).toBeCloseTo(180, 8);
  });
  it('extracts planetary ice, processes water/oxygen/fuel and refuels without inventing feedstock', () => {
    const w = createWorld(); build(w, 'solar', -80); build(w, 'solar', -120); build(w, 'miningRig', -180); build(w, 'refinery', -220); build(w, 'fuelProcessor', -260);
    w.colony.buildings.find(b => b.kind === 'refinery')!.recipe = 3; w.colony.products.water = 0; w.colony.products.oxygen = 0; w.ship.fuel = 100;
    run(w, 60); expect(w.colony.products.fuel).toBeGreaterThan(0);
    w.playerMode = 'ship'; stepWorld(w, { thrust: false, turn: 0, unload: true }, STEP); expect(w.ship.fuel).toBeGreaterThan(100);
    const extracted = 120 - w.surfaceDeposits[1].remaining;
    expect(w.depot.ice + w.colony.products.water + w.colony.products.oxygen + w.colony.products.fuel + w.ship.fuel - 100).toBeCloseTo(extracted, 7);
  });
  it('keeps mining while the player flies elsewhere, with identical 30/144 Hz results', () => {
    const simulate = (fps: number) => { const w = fixture(); w.playerMode = 'ship'; w.ship.state = 'flying'; w.ship.position.y -= 5000; const clock = new FixedClock(); for (let i = 0; i < fps * 10; i++) clock.advance(1 / fps, dt => stepWorld(w, { thrust: false, turn: 0 }, dt)); return w; };
    const a = simulate(30), b = simulate(144); expect(a).toEqual(b); expect(a.depot.iron).toBe(2.5);
  });
  it('round-trips depletion, rig binding and partial cycle progress, continuing identically', () => {
    const w = fixture(); run(w, 3); const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.surfaceDeposits).toEqual(w.surfaceDeposits); expect(loaded.colony.buildings).toEqual(w.colony.buildings);
    run(w, 6); run(loaded, 6); expect(loaded.surfaceDeposits).toEqual(w.surfaceDeposits); expect(loaded.depot).toEqual(w.depot); expect(loaded.colony.energy).toBe(w.colony.energy);
  });
  it('adds finite seams to version-4 saves without resetting old world progress or supplying raw ore', () => {
    const w = createWorld(); w.asteroids.splice(0, 2); w.ship.cargo.ice = 5; w.depot.iron = 8;
    const old = JSON.parse(encodeCheckpoint(w)); old.version = 4; delete old.world.surfaceDeposits;
    const loaded = decodeCheckpoint(JSON.stringify(old)); expect(loaded.surfaceDeposits).toEqual(createSurfaceDeposits()); expect(loaded.asteroids).toEqual(w.asteroids);
    expect(loaded.depot).toEqual(w.depot); expect(loaded.ship).toEqual(w.ship); expect(loaded.colony.products).toEqual(w.colony.products);
  });
  it('rejects missing/duplicate seams, changed capacities, invalid reserves and off-seam rig bindings', () => {
    const w = fixture(), valid = JSON.parse(encodeCheckpoint(w));
    for (const mutate of [
      (v: typeof valid) => { v.world.surfaceDeposits.pop(); },
      (v: typeof valid) => { v.world.surfaceDeposits[1].id = 1; },
      (v: typeof valid) => { v.world.surfaceDeposits[0].initial = 999; },
      (v: typeof valid) => { v.world.surfaceDeposits[0].remaining = 181; },
      (v: typeof valid) => { v.world.surfaceDeposits[0].remaining = -1; },
      (v: typeof valid) => { v.world.colony.buildings[1].depositId = 2; },
      (v: typeof valid) => { v.world.colony.buildings[1].angle = 1; },
    ]) { const v = structuredClone(valid); mutate(v); expect(() => decodeCheckpoint(JSON.stringify(v))).toThrow(); }
  });
});
