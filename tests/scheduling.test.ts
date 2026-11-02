import { describe, expect, it } from 'vitest';
import { applyColonyAction, stepColony, type Building } from '../src/sim/colony';
import { createWorld, stepWorld } from '../src/sim/world';
import { STEP, WORLD } from '../src/sim/config';
import { stationPosition } from '../src/sim/stations';
import { createSchedule, MAX_STOCK_TARGET, SCHEDULE_PRODUCTS } from '../src/sim/scheduling';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { FixedClock } from '../src/sim/clock';

function fixture() {
  const w = createWorld(); w.playerMode = 'astronaut'; w.astronaut.position = stationPosition(0.2); w.astronaut.grounded = true;
  const refinery: Building = { id: 2, kind: 'refinery', angle: 0.2, enabled: true, progress: 0, recipe: 0, status: 'idle', schedule: createSchedule() };
  w.colony.buildings = [{ id: 1, kind: 'solar', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'idle' }, refinery];
  w.colony.nextId = 3; w.colony.products = { alloy: 0, wire: 0, components: 0, water: 0, oxygen: 0, fuel: 0 };
  refinery.schedule!.enabled = true;
  return { w, refinery, schedule: refinery.schedule! };
}
function run(w: ReturnType<typeof createWorld>, seconds: number) { for (let i = 0; i < Math.round(seconds / STEP); i++) stepColony(w, STEP); }
const mass = (v: object) => Object.values(v).reduce((sum, n) => sum + n, 0);

describe('target-based refinery scheduling', () => {
  it('rotates through all needed recipes, stops at targets and conserves ore/product mass', () => {
    const { w, refinery, schedule } = fixture();
    w.depot = { iron: 20, copper: 20, silicon: 18, rareMetals: 2, ice: 20 };
    schedule.targets = { alloy: 3, wire: 3, components: 3, water: 4, oxygen: 2 };
    const initial = mass(w.depot); run(w, 40);
    expect(w.colony.products.alloy).toBe(3); expect(w.colony.products.wire).toBe(3); expect(w.colony.products.components).toBe(3);
    expect(w.colony.products.water).toBeCloseTo(4.9); expect(w.colony.products.oxygen).toBeCloseTo(2.1);
    expect(mass(w.depot) + mass(w.colony.products)).toBeCloseTo(initial, 8); expect(refinery.status).toBe('target met');
    const products = { ...w.colony.products }; run(w, 20); expect(w.colony.products).toEqual(products);
  });
  it('skips unavailable inputs, then revisits them when ore arrives without starving other goals', () => {
    const { w, refinery } = fixture(); w.depot.copper = 4; run(w, 4);
    expect(w.colony.products.wire).toBe(2); expect(w.colony.products.alloy).toBe(0);
    w.depot.iron = 2; run(w, 4); expect(w.colony.products.alloy).toBe(1); expect(w.colony.products.wire).toBe(3);
    expect(refinery.schedule!.cursor).toBe(2);
  });
  it('skips an ice recipe with a full co-product and reports the block when no alternative can run', () => {
    const { w, refinery, schedule } = fixture(); w.depot.ice = 10; w.depot.copper = 2;
    w.colony.products.water = 99.8; w.colony.products.alloy = 20; w.colony.products.components = 5;
    schedule.cursor = 3; run(w, 4); expect(w.colony.products.wire).toBe(2); expect(w.depot.ice).toBe(10);
    schedule.targets.wire = 0; run(w, STEP); expect(refinery.status).toBe('output full');
    w.colony.products.water = 0; run(w, 2); expect(w.depot.ice).toBe(9); expect(w.colony.products.oxygen).toBeCloseTo(0.3);
  });
  it('draws no power when all targets are zero, and restarts when stocks fall below a goal', () => {
    const { w, refinery, schedule } = fixture(); w.colony.buildings[0].enabled = false; w.colony.energy = 20;
    for (const p of SCHEDULE_PRODUCTS) schedule.targets[p] = 0;
    w.depot.iron = 2; run(w, 5); expect(w.colony.energy).toBe(20); expect(w.colony.demand).toBe(0); expect(refinery.status).toBe('target met');
    schedule.targets.alloy = 1; run(w, 2); expect(w.colony.products.alloy).toBe(1); run(w, STEP); expect(refinery.status).toBe('target met');
    w.colony.products.alloy = 0; run(w, 2); expect(w.colony.products.alloy).toBe(1);
  });
  it('pins a paid cycle through target edits, missing feedstock and a power interruption', () => {
    const { w, refinery, schedule } = fixture(); w.depot.iron = 2; w.depot.copper = 2; run(w, 1);
    const progress = refinery.progress; schedule.targets.alloy = 0; w.depot.iron = 0; run(w, 3);
    expect(refinery.progress).toBe(progress); expect(refinery.recipe).toBe(0); expect(refinery.status).toBe('no feedstock');
    w.depot.iron = 2; w.colony.buildings[0].enabled = false; w.colony.energy = 0; run(w, 3);
    expect(refinery.progress).toBe(progress); expect(refinery.status).toBe('no power');
    w.colony.buildings[0].enabled = true; run(w, 1); expect(w.colony.products.alloy).toBe(1);
    run(w, 2); expect(w.colony.products.wire).toBe(1); expect(w.colony.products.alloy).toBe(1);
  });
  it('pauses disabled/wrecked factories and resumes their paid cycle without producing free output', () => {
    const { w, refinery } = fixture(); w.depot.iron = 2; run(w, 1); const progress = refinery.progress;
    refinery.enabled = false; run(w, 4); expect(refinery.status).toBe('disabled'); expect(refinery.progress).toBe(progress);
    refinery.enabled = true; refinery.health = 0; run(w, 4); expect(refinery.status).toBe('wrecked'); expect(w.depot.iron).toBe(2);
    refinery.health = 100; run(w, 1); expect(w.depot.iron).toBe(1); expect(w.colony.products.alloy).toBe(1);
  });
  it('shares feedstock between factories and allows only already-active batches to exceed a target', () => {
    const { w, refinery, schedule } = fixture(); schedule.targets = { alloy: 1, wire: 0, components: 0, water: 0, oxygen: 0 };
    const second = structuredClone(refinery); second.id = 3; second.angle = 0.3;
    w.colony.buildings.push(second); w.colony.nextId = 4; w.depot.iron = 5; run(w, 5);
    expect(w.colony.products.alloy).toBe(2); expect(w.depot.iron).toBe(3);
    expect(refinery.status).toBe('target met'); expect(second.status).toBe('target met');
  });
  it('supports on-foot target controls with bounds; manual recipe selection disables automatic switching', () => {
    const { w, refinery, schedule } = fixture(); w.depot.iron = 3; run(w, 1); const progress = refinery.progress;
    applyColonyAction(w, { type: 'toggleSchedule' }); expect(schedule.enabled).toBe(false); expect(refinery.progress).toBe(progress);
    applyColonyAction(w, { type: 'toggleSchedule' }); expect(refinery.progress).toBe(progress);
    schedule.targets.alloy = MAX_STOCK_TARGET; applyColonyAction(w, { type: 'adjustTarget', product: 'alloy', delta: 5 }); expect(schedule.targets.alloy).toBe(MAX_STOCK_TARGET);
    schedule.targets.water = 0; applyColonyAction(w, { type: 'adjustTarget', product: 'water', delta: -5 }); expect(schedule.targets.water).toBe(0);
    applyColonyAction(w, { type: 'adjustTarget', product: 'wire', delta: 5 }); expect(schedule.targets.wire).toBe(15);
    applyColonyAction(w, { type: 'cycleRecipe' }); expect(schedule.enabled).toBe(false); expect(refinery.progress).toBe(0); expect(refinery.recipe).toBe(1);
    w.playerMode = 'ship'; applyColonyAction(w, { type: 'toggleSchedule' }); expect(schedule.enabled).toBe(false);
  });
  it('does not duplicate scarce input when two paid cycles compete for the final ore', () => {
    const { w, refinery, schedule } = fixture(); schedule.targets = { alloy: 1, wire: 0, components: 0, water: 0, oxygen: 0 };
    const second = structuredClone(refinery); second.id = 3; second.angle = 0.3; w.colony.buildings.push(second); w.colony.nextId = 4;
    w.depot.iron = 1; run(w, 4); expect(w.colony.products.alloy).toBe(1); expect(w.depot.iron).toBe(0);
    expect(second.status).toBe('no feedstock'); const paid = second.progress; expect(paid).toBeGreaterThan(0);
    run(w, 4); expect(second.progress).toBe(paid); expect(w.colony.products.alloy).toBe(1);
    w.depot.iron = 1; run(w, 1); expect(w.colony.products.alloy).toBe(2); expect(w.depot.iron).toBe(0);
  });
  it('keeps legacy/manual refineries on the selected recipe until scheduling is explicitly enabled', () => {
    const { w, refinery } = fixture(); delete refinery.schedule; w.depot.copper = 5; run(w, 10);
    expect(w.colony.products.wire).toBe(0); expect(refinery.status).toBe('no feedstock');
    applyColonyAction(w, { type: 'toggleSchedule' }); run(w, 2); expect(w.colony.products.wire).toBe(1);
  });
});

describe('scheduled production persistence and background operation', () => {
  it('keeps automatic ice processing connected to manufactured fuel and supplied ship refuelling', () => {
    const { w, schedule } = fixture(); schedule.targets.alloy = 0; schedule.targets.wire = 0; schedule.targets.components = 0;
    w.colony.buildings.push({ id: 3, kind: 'fuelProcessor', angle: 0.3, enabled: true, progress: 0, recipe: 0, status: 'idle' }, { ...w.colony.buildings[0], id: 4, angle: 0.4 });
    w.colony.nextId = 5; w.depot.ice = 20; w.ship.fuel = 100; run(w, 100);
    expect(w.colony.products.fuel).toBeGreaterThan(0);
    w.playerMode = 'ship'; stepWorld(w, { thrust: false, turn: 0, unload: true }, STEP); expect(w.ship.fuel).toBeGreaterThan(100);
    expect(mass(w.depot) + mass(w.colony.products) + w.ship.fuel - 100).toBeCloseTo(20, 8);
  });
  it('preserves enabled state, goals, cursor and active-cycle progress across save and continuation', () => {
    const { w, refinery } = fixture(); w.depot.iron = 5; w.depot.copper = 5; run(w, 3);
    const loaded = decodeCheckpoint(encodeCheckpoint(w)); expect(loaded.colony.buildings[1]).toEqual(refinery);
    run(w, 20); run(loaded, 20); expect(loaded.colony).toEqual(w.colony); expect(loaded.depot).toEqual(w.depot);
  });
  it('accepts version-5 checkpoints with all prior progress and leaves their refineries manual', () => {
    const { w, refinery } = fixture(); delete refinery.schedule; w.surfaceDeposits[0].remaining = 120; w.ship.cargo.ice = 4; w.ship.armament.cannon = 20;
    const old = JSON.parse(encodeCheckpoint(w)); old.version = 5; const loaded = decodeCheckpoint(JSON.stringify(old));
    expect(loaded.colony).toEqual(w.colony); expect(loaded.surfaceDeposits).toEqual(w.surfaceDeposits); expect(loaded.ship).toEqual(w.ship);
    expect(loaded.colony.buildings[1].schedule).toBeUndefined();
  });
  it('rejects malformed schedules, illegal goals and schedules on non-refinery buildings', () => {
    const { w } = fixture(), saved = JSON.parse(encodeCheckpoint(w));
    for (const mutate of [
      (v: typeof saved) => { v.world.colony.buildings[1].schedule.enabled = 'yes'; },
      (v: typeof saved) => { v.world.colony.buildings[1].schedule.cursor = 4; },
      (v: typeof saved) => { v.world.colony.buildings[1].schedule.targets.alloy = -1; },
      (v: typeof saved) => { v.world.colony.buildings[1].schedule.targets.wire = MAX_STOCK_TARGET + 1; },
      (v: typeof saved) => { delete v.world.colony.buildings[1].schedule.targets.oxygen; },
      (v: typeof saved) => { v.world.colony.buildings[1].schedule.targets.fuel = 1; },
      (v: typeof saved) => { v.world.colony.buildings[0].schedule = v.world.colony.buildings[1].schedule; },
    ]) { const bad = structuredClone(saved); mutate(bad); expect(() => decodeCheckpoint(JSON.stringify(bad))).toThrow(); }
  });
  it('runs while flying with identical results at 30 and 144 rendering Hz', () => {
    const simulate = (fps: number) => {
      const { w } = fixture(); w.playerMode = 'ship'; w.ship.state = 'flying'; w.ship.position.y = -WORLD.radius - 5000;
      w.depot.iron = 20; w.depot.ice = 20; const clock = new FixedClock();
      for (let i = 0; i < fps * 20; i++) clock.advance(1 / fps, dt => stepWorld(w, { thrust: false, turn: 0 }, dt));
      return w;
    };
    const a = simulate(30), b = simulate(144); expect(a).toEqual(b); expect(a.colony.products.alloy).toBeGreaterThan(0); expect(a.colony.products.water).toBeGreaterThan(0);
  });
});
