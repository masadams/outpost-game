import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { applyColonyAction, placementError, stepColony, type Building } from '../src/sim/colony';
import { createPolicy, availableProduct, MAX_RESERVE, policyFor } from '../src/sim/colonyPolicy';
import { STEP, WORLD } from '../src/sim/config';
import { stationPosition } from '../src/sim/stations';
import { unloadCargo } from '../src/sim/cargo';
import { stepWeapons } from '../src/sim/weapons';
import { serviceAtBuilding } from '../src/sim/colonyService';
import { resupplyArmament, serviceCombatAtPad } from '../src/sim/combatSupply';
import { applyCombatAction } from '../src/sim/combat';
import { damageColony, repairBuilding } from '../src/sim/buildingDamage';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { FixedClock } from '../src/sim/clock';
import { createSchedule } from '../src/sim/scheduling';

const machine = (id: number, kind: Building['kind'], angle: number): Building => ({ id, kind, angle, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 });
function fixture(kind: 'refinery' | 'miningRig' = 'refinery') {
  const w = createWorld(); w.playerMode = 'astronaut'; w.colony.energy = 20; w.colony.policy = createPolicy();
  const building = machine(2, kind, kind === 'miningRig' ? 160 / WORLD.radius : 0.2); if (kind === 'miningRig') building.depositId = 1;
  w.colony.buildings = [machine(1, 'solar', 0.4), building]; w.colony.buildings[0].enabled = false; w.colony.nextId = 3;
  w.astronaut.position = stationPosition(building.angle); w.astronaut.grounded = true; w.depot.iron = kind === 'refinery' ? 10 : 0;
  return { w, building, policy: w.colony.policy };
}
function run(w: WorldState, seconds: number) { for (let i = 0; i < Math.round(seconds / STEP); i++) stepColony(w, STEP); }

describe('power and storage reserves', () => {
  it('keeps legacy and explicit-zero policies identical without reserving imaginary stock', () => {
    const { w } = fixture(); const legacy = structuredClone(w); delete legacy.colony.policy;
    run(w, 3); run(legacy, 3); expect(w.depot).toEqual(legacy.depot); expect(w.colony.energy).toBe(legacy.colony.energy);
    expect(policyFor(legacy.colony)).toEqual(createPolicy()); expect(availableProduct(legacy.colony, 'alloy')).toBe(w.colony.products.alloy);
  });
  it.each(['refinery', 'miningRig'] as const)('makes %s preserve a charge floor and resume paid progress when it is released', kind => {
    const { w, building, policy } = fixture(kind); run(w, 1); const progress = building.progress, energy = w.colony.energy;
    policy.energyReserve = 20; run(w, 5); expect(building.progress).toBe(progress); expect(w.colony.energy).toBe(energy); expect(building.status).toBe('power reserved');
    policy.energyReserve = 0; run(w, 1); expect(building.progress).toBe(0);
    expect(kind === 'refinery' ? w.colony.products.alloy : w.depot.iron).toBe(kind === 'refinery' ? 29 : 0.5);
    w.colony.energy = 0; run(w, STEP); expect(building.status).toBe('no power');
  });
  it('lets a turret spend charge held back from industrial machinery', () => {
    const { w, building, policy } = fixture(); policy.energyReserve = 20;
    const turret = machine(3, 'laser', 0.3); w.colony.buildings.push(turret); w.colony.nextId = 4; w.defence.controlled = 3;
    stepColony(w, STEP); expect(building.status).toBe('power reserved');
    stepWeapons(w, true, 0, STEP, new Map()); expect(w.defence.shots).toBe(1); expect(w.colony.energy).toBe(18.5);
  });
  it('lets supplied service spend protected power while respecting turret material floors', () => {
    const { w, policy } = fixture(); policy.energyReserve = 20; policy.alloyReserve = 28; w.astronaut.oxygen = 100;
    const service = machine(3, 'service', 0); w.ship.hull = 60; serviceAtBuilding(w, service);
    expect(w.colony.energy).toBe(18); expect(w.ship.hull).toBe(60); expect(w.astronaut.oxygen).toBe(180); expect(w.colony.products.alloy).toBe(28);
  });
  it('leaves finite raw storage room for actual ship deliveries without losing ore', () => {
    const { w, building, policy } = fixture('miningRig'); w.colony.buildings[0].enabled = true; policy.deliveryReserve = 50;
    w.depot.copper = 349.8; run(w, 2); expect(w.depot.iron).toBeCloseTo(0.2); expect(w.surfaceDeposits[0].remaining).toBeCloseTo(179.8);
    const energy = w.colony.energy; run(w, 3); expect(building.status).toBe('delivery reserved'); expect(w.colony.energy).toBeGreaterThanOrEqual(energy);
    w.ship.cargo.ice = 80; expect(unloadCargo(w)).toBeCloseTo(50); expect(w.ship.cargo.ice).toBeCloseTo(30);
    run(w, STEP); expect(building.status).toBe('output full'); expect(w.surfaceDeposits[0].remaining).toBeCloseTo(179.8);
    expect(w.depot.copper + w.depot.iron + w.depot.ice + w.ship.cargo.ice).toBeCloseTo(430);
  });
  it('does not evict existing inventory when the reserve grows, and resumes after it is lowered', () => {
    const { w, building, policy } = fixture('miningRig'); w.depot.copper = 390; policy.deliveryReserve = 100; run(w, 2);
    expect(w.depot.copper).toBe(390); expect(building.status).toBe('delivery reserved'); expect(w.surfaceDeposits[0].remaining).toBe(180);
    policy.deliveryReserve = 0; run(w, 2); expect(w.depot.iron).toBe(0.5);
  });
  it('keeps goals without shielding inventory or charge from storage/battery destruction', () => {
    const { w, policy } = fixture('miningRig'); w.colony.buildings.push(machine(3, 'storage', 0.8), machine(4, 'battery', 1)); w.colony.nextId = 5;
    w.depot.iron = 590; w.colony.products.alloy = 150; w.colony.products.components = 150; w.colony.energy = 210;
    Object.assign(policy, { energyReserve: 200, deliveryReserve: 500, alloyReserve: 150, componentsReserve: 150 });
    damageColony(w, stationPosition(0.8), 200, 4); damageColony(w, stationPosition(1), 200, 4);
    expect(w.depot.iron).toBe(400); expect(w.colony.products.alloy).toBe(100); expect(w.colony.products.components).toBe(100); expect(w.colony.energy).toBe(20);
    expect(policy.energyReserve).toBe(200); expect(availableProduct(w.colony, 'alloy')).toBe(0);
    expect(decodeCheckpoint(encodeCheckpoint(w)).colony.policy).toEqual(policy);
  });
});

describe('turret material protection', () => {
  it('blocks construction from using held supplies, charges only after release and keeps physical insufficiency distinct', () => {
    const w = createWorld(); w.playerMode = 'astronaut'; w.astronaut.position = stationPosition(100 / WORLD.radius); w.astronaut.grounded = true;
    w.colony.buildOpen = true; w.colony.policy = { ...createPolicy(), alloyReserve: 28 };
    const before = { ...w.colony.products }; applyColonyAction(w, { type: 'place' }); expect(w.colony.products).toEqual(before); expect(placementError(w)).toContain('reserved');
    w.colony.policy.alloyReserve = 20; applyColonyAction(w, { type: 'place' }); expect(w.colony.products.alloy).toBe(24);
    w.colony.products.alloy = 0; expect(placementError(w, 'solar', 160 / WORLD.radius)).toContain('Insufficient');
  });
  it.each(['flak', 'missile'] as const)('lets %s turrets spend reserved alloy/components with normal finite shot costs', kind => {
    const { w, policy } = fixture(); policy.alloyReserve = 28; policy.componentsReserve = 8;
    const turret = machine(3, kind, 0.3); w.colony.buildings.push(turret); w.colony.nextId = 4; w.defence.controlled = 3;
    stepWeapons(w, true, 0, STEP, new Map()); expect(w.defence.shots).toBe(1);
    expect(w.colony.products.alloy).toBe(kind === 'flak' ? 27.75 : 27); expect(w.colony.products.components).toBe(kind === 'flak' ? 8 : 7.75);
  });
  it('makes ship repair/rearm spend only material above the floor and resumes after release', () => {
    const { w, policy } = fixture(); policy.alloyReserve = 28; policy.componentsReserve = 8; w.ship.hull = 70;
    w.ship.armament.cannon = 0; w.ship.armament.missile = 0; serviceCombatAtPad(w);
    expect(w.ship.hull).toBe(70); expect(w.ship.armament.cannon).toBe(0); expect(resupplyArmament(w)).toBe(0);
    policy.alloyReserve = 20; policy.componentsReserve = 7; serviceCombatAtPad(w);
    expect(w.ship.hull).toBe(100); expect(w.ship.armament.cannon).toBeGreaterThan(0);
    expect(w.colony.products.alloy).toBeGreaterThanOrEqual(20 - 1e-9); expect(w.colony.products.components).toBeGreaterThanOrEqual(7 - 1e-9);
  });
  it('protects repair/recovery supplies and permits releasing a reserve from a wrecked ship', () => {
    const { w, building, policy } = fixture(); building.health = 50; policy.alloyReserve = 28;
    repairBuilding(w); expect(building.health).toBe(50); policy.alloyReserve = 27; repairBuilding(w); expect(building.health).toBe(60);
    policy.componentsReserve = 8; w.ship.state = 'crashed'; w.ship.hull = 0; applyCombatAction(w, { type: 'recoverShip' }); expect(w.ship.state).toBe('crashed');
    w.playerMode = 'ship'; applyColonyAction(w, { type: 'adjustPolicy', field: 'alloyReserve', direction: -1 });
    policy.alloyReserve = 0; policy.componentsReserve = 0; applyCombatAction(w, { type: 'recoverShip' }); expect(w.ship.state).toBe('landed');
    expect(w.colony.products.alloy).toBe(19); expect(w.colony.products.components).toBe(6);
  });
  it('preserves actual paid progress through impact wrecking and supplied repair', () => {
    const { w, building } = fixture(); run(w, 1); const progress = building.progress;
    damageColony(w, stationPosition(building.angle), 200, 4); expect(building.health).toBe(0); expect(building.progress).toBe(progress);
    // Survive away from the blast, then repair the machine through the normal action.
    w.astronaut.health = 100; repairBuilding(w); expect(building.health).toBe(100); run(w, 1);
    expect(w.depot.iron).toBe(9); expect(w.colony.products.alloy).toBe(19); // 28 - 10 repair + 1 product.
  });
});

describe('reserve controls, persistence and simulation', () => {
  it('supports remote bounded policy edits without changing actual inventory or energy', () => {
    const w = createWorld(), stock = { ...w.colony.products }; w.ship.state = 'flying';
    applyColonyAction(w, { type: 'adjustPolicy', field: 'energyReserve', direction: 1 }); expect(w.colony.policy!.energyReserve).toBe(5);
    applyColonyAction(w, { type: 'adjustPolicy', field: 'deliveryReserve', direction: 1 }); expect(w.colony.policy!.deliveryReserve).toBe(25);
    w.colony.policy!.energyReserve = MAX_RESERVE; applyColonyAction(w, { type: 'adjustPolicy', field: 'energyReserve', direction: 1 }); expect(w.colony.policy!.energyReserve).toBe(MAX_RESERVE);
    applyColonyAction(w, { type: 'adjustPolicy', field: 'alloyReserve', direction: -1 }); expect(w.colony.policy!.alloyReserve).toBe(0);
    expect(w.colony.products).toEqual(stock); expect(w.colony.energy).toBe(0);
  });
  it('round-trips policy, schedule and blocked progress and continues identically', () => {
    const { w, building, policy } = fixture(); building.schedule = createSchedule(); building.schedule.enabled = true;
    run(w, 1); policy.energyReserve = 20; policy.deliveryReserve = 50; run(w, 1);
    const loaded = decodeCheckpoint(encodeCheckpoint(w)); expect(loaded.colony).toEqual(w.colony);
    loaded.colony.policy!.energyReserve = 0; policy.energyReserve = 0; run(w, 2); run(loaded, 2);
    expect(loaded.colony).toEqual(w.colony); expect(loaded.depot).toEqual(w.depot);
  });
  it('loads version-6 progress without adding reserves or resetting schedules, combat or depletion', () => {
    const { w, building } = fixture(); delete w.colony.policy; building.schedule = createSchedule(); building.schedule.enabled = true;
    w.surfaceDeposits[0].remaining = 90; w.ship.armament.cannon = 12; const old = JSON.parse(encodeCheckpoint(w)); old.version = 6;
    const loaded = decodeCheckpoint(JSON.stringify(old)); expect(loaded.colony).toEqual(w.colony); expect(loaded.ship).toEqual(w.ship); expect(loaded.surfaceDeposits).toEqual(w.surfaceDeposits);
  });
  it('rejects missing fields, negative, excessive, nonnumeric and unknown reserve fields', () => {
    const { w } = fixture(), valid = JSON.parse(encodeCheckpoint(w));
    for (const policy of [null, [], {}, { ...createPolicy(), energyReserve: -1 }, { ...createPolicy(), deliveryReserve: MAX_RESERVE + 1 }, { ...createPolicy(), alloyReserve: '10' }, { ...createPolicy(), imaginary: 1 }]) {
      const bad = structuredClone(valid); bad.world.colony.policy = policy; expect(() => decodeCheckpoint(JSON.stringify(bad))).toThrow();
    }
  });
  it('maintains identical background power limits at 30 and 144 rendering Hz', () => {
    const simulate = (fps: number) => { const { w, policy } = fixture('miningRig'); policy.energyReserve = 10; w.colony.buildings[0].enabled = true;
      w.playerMode = 'ship'; w.ship.state = 'flying'; w.ship.position.y = -WORLD.radius - 5000; const clock = new FixedClock();
      for (let i = 0; i < fps * 10; i++) clock.advance(1 / fps, dt => stepWorld(w, { thrust: false, turn: 0 }, dt)); return w; };
    const a = simulate(30); expect(a).toEqual(simulate(144)); expect(a.colony.energy).toBeGreaterThanOrEqual(10 - 1e-9); expect(a.depot.iron).toBeGreaterThan(0);
  });
});
