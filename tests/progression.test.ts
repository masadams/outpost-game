import { applyExplorationAction } from '../src/sim/exploration';
import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { stepColony, type Building } from '../src/sim/colony';
import { applyResearch } from '../src/sim/research';
import { applyEquipment, equipmentError } from '../src/sim/equipment';
import { TECHNOLOGIES, TECH_IDS, UPGRADES, UPGRADE_IDS, type UpgradeId } from '../src/sim/progressionConfig';
import { fuelCapacity, cargoCapacity } from '../src/sim/shipStats';
import { shipMass } from '../src/sim/shipMass';
import { createShip, stepShip } from '../src/sim/physics';
import { fireLaser, powerTractor, tractor } from '../src/sim/mining';
import { refuelShip } from '../src/sim/colonyService';
import { applyCombatAction, stepCombat } from '../src/sim/combat';
import { damageShip } from '../src/sim/combatProjectiles';
import { flightSafety } from '../src/sim/flightSafety';
import { FixedClock } from '../src/sim/clock';
import { STEP, WORLD } from '../src/sim/config';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
const run = (w: ReturnType<typeof createWorld>, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) stepColony(w, STEP); };
function laboratory() {
  const w = createWorld(); w.asteroids = [];
  const make = (id: number, kind: Building['kind']): Building => ({ id, kind, angle: id * .1, health: 100, enabled: true, recipe: 0, progress: 0, status: 'idle' });
  w.colony.buildings = [make(1, 'solar'), make(2, 'researchLab')]; w.colony.nextId = 3;
  return w;
}
function workshop() {
  const w = laboratory(); w.colony.research.completed = [...TECH_IDS]; w.colony.energy = 20;
  for (const p of ['alloy', 'wire', 'components'] as const) w.colony.products[p] = 100;
  return w;
}
const install = (w: ReturnType<typeof createWorld>, upgrade: UpgradeId) => { w.colony.energy = 20; applyEquipment(w, { type: 'equipment', upgrade, operation: 'install' }); };
describe('paid research progression', () => {
  it('commits finite samples, requires a powered lab and unlocks only after paid work', () => {
    const w = laboratory(); applyResearch(w, { type: 'researchStart', tech: 'materials' }); expect(w.colony.products.alloy).toBe(24);
    w.colony.buildings[1].enabled = false; run(w, 20); expect(w.colony.research.completed).toEqual([]); expect(w.colony.research.queue[0].progress).toBe(0);
    w.colony.buildings[1].enabled = true; run(w, 14); expect(w.colony.research.completed).toEqual([]); run(w, 1);
    expect(w.colony.research.completed).toEqual(['materials']); expect(w.colony.research.energyUsed).toBeCloseTo(60); expect(w.colony.products.alloy).toBe(24);
  });
  it('enforces prerequisites, completed/queued uniqueness and protected samples', () => {
    const w = laboratory(); applyResearch(w, { type: 'researchStart', tech: 'propulsion' }); expect(w.colony.research.queue).toHaveLength(0);
    w.colony.policy = { energyReserve: 0, alloyReserve: 28, componentsReserve: 0, deliveryReserve: 0 }; applyResearch(w, { type: 'researchStart', tech: 'materials' }); expect(w.colony.research.queue).toHaveLength(0);
    w.colony.policy.alloyReserve = 0; applyResearch(w, { type: 'researchStart', tech: 'materials' }); applyResearch(w, { type: 'researchStart', tech: 'materials' }); expect(w.colony.research.queue).toHaveLength(1); run(w, 15);
    applyResearch(w, { type: 'researchStart', tech: 'materials' }); expect(w.colony.research.queue).toHaveLength(0);
  });
  it('respects power holds, damage, priority and throttle without resetting research work', () => {
    const w = laboratory(); applyResearch(w, { type: 'researchStart', tech: 'materials' }); const lab = w.colony.buildings[1]; lab.dispatch = { rank: 1, limit: 50 };
    run(w, 4); expect(w.colony.research.queue[0].progress).toBeCloseTo(2); expect(lab.gridPower).toBe(2);
    lab.health = 0; run(w, 2); lab.health = 100; w.colony.policy = { energyReserve: 1000, alloyReserve: 0, componentsReserve: 0, deliveryReserve: 0 }; run(w, 2);
    expect(w.colony.research.queue[0].progress).toBeCloseTo(2); expect(lab.status).toBe('power reserved');
  });
  it('only one lab contributes per tick and another may take over without free speed', () => {
    const w = laboratory(); w.colony.buildings.push({ ...w.colony.buildings[1], id: 3 }); w.colony.nextId = 4;
    applyResearch(w, { type: 'researchStart', tech: 'materials' }); run(w, 2); expect(w.colony.research.queue[0].progress).toBeCloseTo(2); expect(w.colony.research.energyUsed).toBeCloseTo(8);
    w.colony.buildings[1].enabled = false; run(w, 1); expect(w.colony.research.queue[0].progress).toBeCloseTo(3);
  });
  it('pause yields to other eligible projects; cancellation refunds unworked material once', () => {
    const w = laboratory(); w.colony.research.completed = ['materials']; applyResearch(w, { type: 'researchStart', tech: 'propulsion' }); applyResearch(w, { type: 'researchStart', tech: 'extraction' });
    run(w, 10); applyResearch(w, { type: 'researchControl', tech: 'propulsion', operation: 'pause' }); run(w, 1); expect(w.colony.research.queue[1].progress).toBeCloseTo(1);
    const alloy = w.colony.products.alloy; applyResearch(w, { type: 'researchControl', tech: 'propulsion', operation: 'cancel' }); expect(w.colony.products.alloy).toBeCloseTo(alloy + 3);
    applyResearch(w, { type: 'researchControl', tech: 'propulsion', operation: 'cancel' }); expect(w.colony.products.alloy).toBeCloseTo(alloy + 3);
  });
  it('retains committed work rather than discarding a refund that cannot fit storage', () => {
    const w = laboratory(); applyResearch(w, { type: 'researchStart', tech: 'materials' }); w.colony.products.alloy = 100;
    applyResearch(w, { type: 'researchControl', tech: 'materials', operation: 'cancel' }); expect(w.colony.research.queue).toHaveLength(1);
    w.colony.products.alloy = 96; applyResearch(w, { type: 'researchControl', tech: 'materials', operation: 'cancel' }); expect(w.colony.products.alloy).toBe(100);
  });
});
describe('ship fabrication, equipment and real consequences', () => {
  it('requires research, home presence, unreserved materials and paid grid energy', () => {
    const w = laboratory(); expect(equipmentError(w, 'cargo', 'install')).toMatch(/Research/); w.colony.research.completed = ['materials'];
    expect(equipmentError(w, 'cargo', 'install')).toMatch(/20 kJ/); w.colony.energy = 20; w.colony.policy = { energyReserve: 5, alloyReserve: 0, componentsReserve: 0, deliveryReserve: 0 };
    expect(equipmentError(w, 'cargo', 'install')).toMatch(/20 kJ/); w.colony.policy.energyReserve = 0; w.ship.state = 'flying'; expect(equipmentError(w, 'cargo', 'install')).toMatch(/home pad/);
    w.ship.state = 'landed'; w.playerMode = 'astronaut'; w.astronaut.position.x = 500; expect(equipmentError(w, 'cargo', 'install')).toMatch(/20 m/);
  });
  it.each(UPGRADE_IDS)('fabricates %s exactly once, paying its stated materials, energy and mass', id => {
    const w = workshop(), before = shipMass(w.ship), alloy = w.colony.products.alloy, fuel = w.ship.fuel, hull = w.ship.hull;
    install(w, id); expect(w.ship.equipment).toContain(id); expect(shipMass(w.ship) - before).toBeCloseTo(UPGRADES[id].mass); expect(w.colony.products.alloy).toBe(alloy - UPGRADES[id].cost.alloy!); expect(w.colony.energy).toBe(0);
    expect(w.ship.fuel).toBe(fuel); expect(w.ship.hull).toBe(hull); const paid = w.colony.products.alloy; install(w, id); expect(w.ship.equipment.filter(v => v === id)).toHaveLength(1); expect(w.colony.products.alloy).toBe(paid);
  });
  it('increases thrust and burn together, with real acceleration and no passive propulsion', () => {
    const base = createShip(), enhanced = createShip(); base.state = enhanced.state = 'flying'; base.position.y = enhanced.position.y = -WORLD.radius - 1600; enhanced.equipment = ['engine'];
    stepShip(base, { thrust: true, turn: 0 }, 1); stepShip(enhanced, { thrust: true, turn: 0 }, 1);
    expect(enhanced.fuel).toBeCloseTo(WORLD.fuelCapacity - 1.04); expect(base.fuel).toBeCloseTo(WORLD.fuelCapacity - .8); expect(enhanced.velocity.y).toBeLessThan(base.velocity.y);
    const fuel = enhanced.fuel; stepShip(enhanced, { thrust: false, turn: 0 }, STEP); expect(enhanced.fuel).toBe(fuel);
  });
  it('adds empty tank capacity, uses real stored fuel, and returns excess on safe removal', () => {
    const w = workshop(); install(w, 'tank'); expect(fuelCapacity(w.ship)).toBe(320); expect(w.ship.fuel).toBe(240); w.colony.products.fuel = 80;
    expect(refuelShip(w, w.ship.position)).toBe(80); expect(w.ship.fuel).toBe(320); expect(w.colony.products.fuel).toBe(0);
    applyEquipment(w, { type: 'equipment', upgrade: 'tank', operation: 'remove' }); expect(w.ship.fuel).toBe(240); expect(w.colony.products.fuel).toBe(80); expect(fuelCapacity(w.ship)).toBe(240);
  });
  it('uses actual upgraded capacities for finite salvage and tender transfers, including saves', () => {
    const w = workshop(); install(w, 'tank'); install(w, 'cargo'); w.ship.state = 'flying'; w.ship.fuel = 310; w.ship.cargo.iron = 199;
    const cache = w.exploration.sites.find(s => s.key === 'cache')!, tender = w.exploration.sites.find(s => s.key === 'tender')!;
    w.exploration.selected = 'cache'; w.ship.position = { x: cache.position.x, y: cache.position.y - 80 }; w.ship.velocity = { ...cache.velocity };
    applyExplorationAction(w, { type: 'visitSite' }); expect(w.ship.cargo.copper).toBe(1); expect(cache.stock.copper).toBe(11);
    w.exploration.selected = 'tender'; w.ship.position = { x: tender.position.x, y: tender.position.y - 80 }; w.ship.velocity = { ...tender.velocity };
    applyExplorationAction(w, { type: 'visitSite' }); expect(w.ship.fuel).toBe(320); expect(tender.fuel).toBe(8);
    const loaded = decodeCheckpoint(encodeCheckpoint(w)); expect(loaded.ship.fuel).toBe(320); expect(loaded.ship.cargo.iron + loaded.ship.cargo.copper).toBe(200);
  });
  it('blocks tank removal if returned fuel cannot fit, without losing or duplicating supplies', () => {
    const w = workshop(); install(w, 'tank'); w.ship.fuel = 320; w.colony.products.fuel = 30; const alloy = w.colony.products.alloy;
    applyEquipment(w, { type: 'equipment', upgrade: 'tank', operation: 'remove' }); expect(w.ship.equipment).toContain('tank'); expect(w.ship.fuel).toBe(320); expect(w.colony.products.alloy).toBe(alloy);
  });
  it('allows extra cargo through the existing tractor and requires unloading before rack removal', () => {
    const w = workshop(); install(w, 'cargo'); w.ship.state = 'flying'; w.ship.position.y = -4000; w.ship.cargo.iron = 119;
    const p = { id: 100, position: { ...w.ship.position }, velocity: { ...w.ship.velocity }, radius: 2, mass: 30, resource: 'iron' as const }; tractor(w.ship, p, STEP); expect(w.ship.cargo.iron).toBe(149); expect(cargoCapacity(w.ship)).toBe(200);
    w.ship.state = 'landed'; w.ship.position = createShip().position; expect(equipmentError(w, 'cargo', 'remove')).toMatch(/Unload/); expect(w.ship.equipment).toContain('cargo');
  });
  it('pays upgraded mining energy and damage rate, and stops when the cell cannot pay', () => {
    const w = workshop(); install(w, 'mining'); w.ship.state = 'flying'; w.ship.position = { x: 0, y: -4000 }; w.ship.armament.energy = 10;
    const rock = { id: 99, position: { x: 0, y: -4500 }, velocity: { x: 0, y: 0 }, radius: 10, mass: 20, resource: 'iron' as const, health: 1, maxHealth: 1, stage: 0 };
    expect(fireLaser(w.ship, [rock], .1)?.targetId).toBe(99); expect(rock.health).toBeCloseTo(.85); expect(w.ship.armament.energy).toBeCloseTo(9.4);
    w.ship.armament.energy = 0; expect(fireLaser(w.ship, [rock], .1)).toBeNull(); expect(rock.health).toBeCloseTo(.85);
  });
  it('charges a long-range tractor once per step instead of once per pickup', () => {
    const w = workshop(); install(w, 'tractor'); w.ship.state = 'flying'; w.ship.position.y = -4000; w.ship.armament.energy = 10;
    expect(powerTractor(w.ship, .1)).toBe(true); const after = w.ship.armament.energy;
    for (let i = 0; i < 3; i++) { const p = { id: 99 + i, position: { x: 300, y: -4000 }, velocity: { x: 0, y: 0 }, radius: 2, mass: 2, resource: 'iron' as const }; tractor(w.ship, p, .1); expect(p.velocity.x).toBeLessThan(0); }
    expect(after).toBeCloseTo(9.7); expect(w.ship.armament.energy).toBe(after); w.ship.armament.energy = 0; expect(powerTractor(w.ship, STEP)).toBe(false);
  });
  it('snapshots boosted cannon damage and pays extra heat/energy without free ammunition', () => {
    const w = workshop(); install(w, 'coil'); w.ship.state = 'flying'; w.ship.position.y = -4000;
    stepCombat(w, true, STEP, { ship: { ...w.ship.position }, suit: { ...w.astronaut.position }, rocks: new Map(), meteors: new Map() });
    expect(w.combat.projectiles[0].damage).toBe(24); expect(w.ship.armament.cannon).toBe(39); expect(w.ship.armament.energy).toBeCloseTo(88); expect(w.ship.armament.heat).toBe(22);
    w.ship.equipment = []; const saved = encodeCheckpoint(w); expect(decodeCheckpoint(saved).combat.projectiles[0].damage).toBe(24);
    const invalid = JSON.parse(saved); invalid.world.combat.projectiles[0].damage = 56; expect(() => decodeCheckpoint(JSON.stringify(invalid))).toThrow();
  });
  it('cools faster while reducing capacitor recharge and armour only reduces future damage', () => {
    const w = workshop(); install(w, 'cooling'); install(w, 'armour'); w.ship.armament.heat = 50; w.ship.armament.energy = 0;
    stepCombat(w, false, 1, { ship: { ...w.ship.position }, suit: { ...w.astronaut.position }, rocks: new Map(), meteors: new Map() });
    expect(w.ship.armament.heat).toBe(20); expect(w.ship.armament.energy).toBe(9); w.ship.hull = 40; damageShip(w, 10); expect(w.ship.hull).toBe(32);
  });
  it('armour preserves the hard terrain-crash rule instead of granting safe high-speed landings', () => {
    const s = createShip(); s.equipment = ['armour']; s.state = 'flying'; s.position.y = -WORLD.radius - WORLD.shipRadius - .1; s.velocity.y = 40;
    stepShip(s, { thrust: false, turn: 0 }, STEP); expect(s.state).toBe('crashed'); expect(s.hull).toBe(0);
  });
  it('uses upgraded fuel capacity for actual landing/fuel warnings', () => {
    const s = createShip(); s.equipment = ['tank']; s.fuel = 45; expect(flightSafety(s).instruments.fuel.level).toBe('caution'); s.fuel = 15; expect(flightSafety(s).instruments.fuel.level).toBe('critical');
  });
  it('salvages only 50% scaled by hull and never repeats a refund', () => {
    const w = workshop(); install(w, 'cargo'); const alloy = w.colony.products.alloy; w.ship.hull = 50;
    applyEquipment(w, { type: 'equipment', upgrade: 'cargo', operation: 'remove' }); expect(w.colony.products.alloy).toBeCloseTo(alloy + 1.5);
    applyEquipment(w, { type: 'equipment', upgrade: 'cargo', operation: 'remove' }); expect(w.colony.products.alloy).toBeCloseTo(alloy + 1.5);
  });
  it('keeps paid modules on supplied wreck recovery without refilling their capacities', () => {
    const w = workshop(); install(w, 'tank'); install(w, 'cargo'); w.ship.state = 'crashed'; w.ship.fuel = 250; w.ship.cargo.iron = 180;
    applyCombatAction(w, { type: 'recoverShip' }); expect(w.ship.equipment).toEqual(['tank', 'cargo']); expect(w.ship.fuel).toBe(20); expect(w.ship.hull).toBe(30); expect(w.combat.lostCargo).toBe(180);
  });
  it('persists installed equipment and continues paid research', () => {
    const w = workshop(); install(w, 'cargo'); const text = encodeCheckpoint(w); expect(JSON.parse(text).version).toBe(20); expect(decodeCheckpoint(text).ship.equipment).toEqual(['cargo']);
    const active = laboratory(); applyResearch(active, { type: 'researchStart', tech: 'materials' }); run(active, 3); const resumed = decodeCheckpoint(encodeCheckpoint(active)); run(resumed, 12); expect(resumed.colony.research.completed).toEqual(['materials']);
  });
  it('rejects stacked/unknown/unresearched modules, invalid project work and malformed queues', () => {
    const w = workshop(), text = encodeCheckpoint(w);
    for (const change of [(x: any) => x.world.ship.equipment = ['cargo', 'cargo'], (x: any) => x.world.ship.equipment = ['unknown'], (x: any) => { x.world.colony.research.completed = []; x.world.ship.equipment = ['cargo']; }, (x: any) => { x.world.colony.research.completed = []; x.world.colony.research.queue = [{ tech: 'materials', progress: 15, paused: false }]; }]) {
      const save = JSON.parse(text); change(save); expect(() => decodeCheckpoint(JSON.stringify(save))).toThrow();
    }
  });
  it('has identical research and equipped-flight outcomes at 30 and 144 Hz', () => {
    const simulate = (hz: number) => { const w = laboratory(), clock = new FixedClock(); w.ship.equipment = ['engine']; w.colony.research.completed = ['materials', 'propulsion']; applyResearch(w, { type: 'researchStart', tech: 'extraction' }); for (let i = 0; i < hz * 5; i++) clock.advance(1 / hz, dt => stepWorld(w, { thrust: true, turn: 0 }, dt)); return w; };
    expect(simulate(30)).toEqual(simulate(144));
  });
});
