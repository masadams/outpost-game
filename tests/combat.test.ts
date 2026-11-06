import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { applyCombatAction, stepCombat, threatTier } from '../src/sim/combat';
import { SHIP_WEAPONS, ammunitionMass, type Drone } from '../src/sim/combatConfig';
import { shipMass } from '../src/sim/shipMass';
import { STEP, WORLD } from '../src/sim/config';
import { stepShip, IDLE, telemetry } from '../src/sim/physics';
import { stepCombatProjectiles, damageShip } from '../src/sim/combatProjectiles';
import { stepDrone } from '../src/sim/drones';
import { serviceCombatAtPad } from '../src/sim/combatSupply';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { FixedClock } from '../src/sim/clock';

function flight(): WorldState {
  const w = createWorld(); w.asteroids = []; w.ship.state = 'flying'; w.ship.position.y -= 400; w.ship.velocity.y = -25; return w;
}
function run(w: WorldState, seconds: number, fire = false) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) stepWorld(w, { ...IDLE, combatFire: fire }, STEP);
}
function starts(w: WorldState) { return { ship: { ...w.ship.position }, suit: { ...w.astronaut.position }, rocks: new Map(), meteors: new Map() }; }
function drone(w: WorldState, x = 0, y = w.ship.position.y - 320): Drone {
  return { id: w.nextId++, position: { x, y }, velocity: { x: 0, y: 0 }, angle: Math.PI, hull: 48, fuel: 120, ammo: 24, energy: 50, cooldown: 0, windup: 0, retreatTime: 0, state: 'approach' };
}
describe('encounter and drone dynamics', () => {
  it('stays peaceful until requested, requires flight and blocks overlapping encounters', () => {
    const w = createWorld(); run(w, 1); expect(w.combat.enemies).toHaveLength(0);
    applyCombatAction(w, { type: 'startEncounter' }); expect(w.combat.encounters).toBe(0);
    w.ship.state = 'flying'; w.ship.position.y -= 250; applyCombatAction(w, { type: 'startEncounter' });
    expect(w.combat.enemies).toHaveLength(1); applyCombatAction(w, { type: 'startEncounter' }); expect(w.combat.encounters).toBe(1);
  });
  it('escalates the capped patrol with delivered ore, colony development and exploration', () => {
    const w = flight(); expect(threatTier(w)).toBe(1); w.unloaded = 40; expect(threatTier(w)).toBe(2);
    w.combat.furthestAltitude = 3000; expect(threatTier(w)).toBe(3); w.unloaded = 1e6; expect(threatTier(w)).toBe(3);
    applyCombatAction(w, { type: 'startEncounter' }); expect(w.combat.enemies).toHaveLength(3);
    w.unloaded = 0; w.combat.furthestAltitude = 0;
    w.colony.buildings = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, kind: 'solar' as const, angle: i * 0.05, enabled: true, recipe: 0, progress: 0, status: 'idle' as const }));
    expect(threatTier(w)).toBe(2);
  });
  it('telegraphs attacks, spends drone fuel/ammo/energy and respects its firing cooldown', () => {
    const w = flight(), d = drone(w); w.combat.enemies = [d];
    for (let i = 0; i < 30; i++) stepDrone(w, d, STEP);
    expect(d.windup).toBeGreaterThan(0); expect(w.combat.enemyShots).toBe(0);
    for (let i = 0; i < 30; i++) stepDrone(w, d, STEP);
    expect(w.combat.enemyShots).toBe(1); expect(d.ammo).toBe(23); expect(d.energy).toBeLessThan(50); expect(d.fuel).toBeLessThan(120);
    for (let i = 0; i < 60; i++) stepDrone(w, d, STEP); expect(w.combat.enemyShots).toBe(1);
  });
  it('disengages on landing or a lost pilot without awarding a kill', () => {
    const w = flight(); applyCombatAction(w, { type: 'startEncounter' }); w.ship.state = 'landed'; w.ship.position.y = -WORLD.radius - 7; w.ship.velocity.y = 0;
    run(w, 26); expect(w.combat.enemies).toHaveLength(0); expect(w.combat.escaped).toBe(1); expect(w.combat.kills).toBe(0);
  });
  it('produces identical active-combat state at 30 and 144 rendering Hz', () => {
    const simulate = (fps: number) => { const w = flight(); applyCombatAction(w, { type: 'startEncounter' }); const clock = new FixedClock(); for (let i = 0; i < fps * 4; i++) clock.advance(1 / fps, dt => stepWorld(w, { ...IDLE, combatFire: true }, dt)); return w; };
    expect(simulate(30)).toEqual(simulate(144));
  });
});
describe('ship weapons and collision invariants', () => {
  it('accounts for ammunition in thrust mass and conserves launch momentum through recoil', () => {
    const w = flight(); w.ship.position.y -= 2000; w.ship.velocity = { x: 12, y: -20 };
    const beforeMass = shipMass(w.ship), momentum = { x: beforeMass * 12, y: beforeMass * -20 };
    stepCombat(w, true, 0, starts(w)); const p = w.combat.projectiles[0];
    expect(ammunitionMass(w.ship.armament)).toBeCloseTo(6.4);
    expect(shipMass(w.ship) * w.ship.velocity.x + SHIP_WEAPONS.cannon.mass * p.velocity.x).toBeCloseTo(momentum.x, 7);
    expect(shipMass(w.ship) * w.ship.velocity.y + SHIP_WEAPONS.cannon.mass * p.velocity.y).toBeCloseTo(momentum.y, 7);
    const empty = structuredClone(w.ship); empty.armament.cannon = 0; empty.armament.missile = 0; empty.velocity = { x: 0, y: 0 };
    const full = structuredClone(empty); full.armament.cannon = 40; full.armament.missile = 2;
    stepShip(empty, { thrust: true, turn: 0 }, STEP); stepShip(full, { thrust: true, turn: 0 }, STEP); expect(empty.velocity.y).toBeLessThan(full.velocity.y);
  });
  it('does not fire while landed, outside the ship, empty, without energy or while overheated', () => {
    const w = createWorld(); stepWorld(w, { ...IDLE, combatFire: true }, STEP); expect(w.combat.shots).toBe(0);
    w.ship.state = 'flying'; w.ship.position.y -= 300; w.playerMode = 'astronaut'; stepWorld(w, { ...IDLE, combatFire: true }, STEP); expect(w.combat.shots).toBe(0);
    w.playerMode = 'ship'; w.ship.armament.cannon = 0; run(w, 0.1, true); expect(w.combat.shots).toBe(0);
    w.ship.armament.cannon = 40; w.ship.armament.energy = 0; stepWorld(w, { ...IDLE, combatFire: true }, STEP); expect(w.combat.shots).toBe(0);
    w.ship.armament.energy = 100; w.ship.armament.overheated = true; w.ship.armament.heat = 80; stepWorld(w, { ...IDLE, combatFire: true }, STEP); expect(w.combat.shots).toBe(0);
  });
  it('limits cadence, locks on overheating and recovers only after cooling', () => {
    const w = flight(); run(w, 2, true); expect(w.ship.armament.overheated).toBe(true); const shots = w.combat.shots;
    expect(shots).toBeLessThan(12); expect(w.ship.armament.cannon).toBe(40 - shots); run(w, 0.2, true); expect(w.combat.shots).toBe(shots);
    run(w, 5); expect(w.ship.armament.overheated).toBe(false); expect(w.ship.armament.heat).toBe(0);
  });
  it('sweeps a fast bolt through a drone and damages only the first surface/body contact', () => {
    const w = flight(), d = drone(w); w.combat.enemies = [d];
    w.combat.projectiles.push({ id: w.nextId++, owner: 'ship', kind: 'cannon', position: { x: 0, y: w.ship.position.y - 20 }, velocity: { x: 0, y: -60000 }, life: 5, targetId: null });
    stepCombatProjectiles(w, STEP, { ...starts(w), enemies: new Map([[d.id, { ...d.position }]]) }); expect(d.hull).toBe(30); expect(w.combat.projectiles).toHaveLength(0);
    w.combat.projectiles.push({ id: w.nextId++, owner: 'ship', kind: 'cannon', position: { ...w.ship.position }, velocity: { x: 0, y: 600000 }, life: 5, targetId: null });
    d.position.y = WORLD.radius + 400; stepCombatProjectiles(w, STEP, { ...starts(w), enemies: new Map() }); expect(d.hull).toBe(30);
  });
  it('locks a missile only to a visible target in its forward cone and consumes its finite magazine', () => {
    const w = flight(); applyCombatAction(w, { type: 'startEncounter' }); applyCombatAction(w, { type: 'cycleWeapon' });
    stepWorld(w, { ...IDLE, combatFire: true }, STEP); expect(w.ship.armament.missile).toBe(1); expect(w.combat.projectiles.find(p => p.owner === 'ship')?.targetId).toBe(w.combat.enemies[0].id);
    const behind = flight(); behind.ship.armament.selected = 'missile'; behind.combat.enemies.push(drone(behind, 0, behind.ship.position.y + 100));
    stepWorld(behind, { ...IDLE, combatFire: true }, STEP); expect(behind.combat.projectiles.find(p => p.owner === 'ship')?.targetId).toBeNull();
  });
  it.each(['cannon', 'missile'] as const)('wins with %s, returns under normal flight controls, then pays to repair and rearm', selected => {
    const w = flight(); w.ship.armament.selected = selected; applyCombatAction(w, { type: 'startEncounter' });
    for (let i = 0; i < 6000 && w.ship.state !== 'crashed' && (w.combat.enemies.length || w.combat.projectiles.length || !w.ship.landings); i++) {
      const t = telemetry(w.ship); stepWorld(w, { thrust: t.radial < -Math.min(20, Math.max(2, t.altitude * 0.25)), turn: 0, combatFire: w.combat.enemies.length > 0 }, STEP);
    }
    expect(w.combat.kills).toBe(1); expect(w.ship.state).toBe('landed'); expect(w.ship.hull).toBeLessThan(100); expect(w.ship.armament[selected]).toBeLessThan(SHIP_WEAPONS[selected].capacity);
    const stock = { ...w.colony.products }, damage = 100 - w.ship.hull, missing = SHIP_WEAPONS[selected].capacity - w.ship.armament[selected];
    stepWorld(w, { ...IDLE, unload: true }, STEP);
    expect(w.ship.hull).toBe(100); expect(w.ship.armament[selected]).toBe(SHIP_WEAPONS[selected].capacity);
    expect(w.colony.products.alloy).toBeCloseTo(stock.alloy - damage / 10 - missing * SHIP_WEAPONS[selected].alloy, 7);
    expect(w.colony.products.components).toBeCloseTo(stock.components - missing * SHIP_WEAPONS[selected].components, 7);
  });
});
describe('supplied recovery and persistence', () => {
  it('blocks remote or unaffordable resupply and does not mint materials through repeated service', () => {
    const w = flight(); w.ship.armament.cannon = 0; serviceCombatAtPad(w); expect(w.ship.armament.cannon).toBe(0);
    w.ship.state = 'landed'; serviceCombatAtPad(w); expect(w.ship.armament.cannon).toBe(0);
    w.ship.position = { x: 0, y: -WORLD.radius - WORLD.shipRadius }; w.colony.products.alloy = 0.25; serviceCombatAtPad(w); expect(w.ship.armament.cannon).toBe(2); expect(w.colony.products.alloy).toBeCloseTo(0.05);
    serviceCombatAtPad(w); expect(w.ship.armament.cannon).toBe(2);
  });
  it('requires a wreck and materials for recovery, loses cargo, and preserves depletion, colony and remaining ammo/fuel', () => {
    const w = flight(); w.asteroids = []; w.depot.iron = 7; w.ship.cargo.ice = 12; w.ship.fuel = 9; w.ship.armament.cannon = 3;
    applyCombatAction(w, { type: 'recoverShip' }); expect(w.combat.recoveries).toBe(0);
    damageShip(w, 100); w.colony.products.components = 0; applyCombatAction(w, { type: 'recoverShip' }); expect(w.ship.state).toBe('crashed');
    w.colony.products.components = 2; applyCombatAction(w, { type: 'recoverShip' });
    expect(w.ship.state).toBe('landed'); expect(w.ship.hull).toBe(100); expect(w.wrecks).toHaveLength(1); expect(w.wrecks[0].ship.armament.cannon).toBe(3); expect(w.ship.cargo.ice).toBe(0);
    expect(w.combat.lostCargo).toBe(12); expect(w.depot.iron).toBe(7); expect(w.asteroids).toHaveLength(0); expect(w.colony.products.alloy).toBe(20);
    expect(w.combat.recoveries).toBe(1); expect(() => encodeCheckpoint(w)).not.toThrow();
  });
  it('persists an active encounter, heat and ammunition, then continues deterministically', () => {
    const w = flight(); applyCombatAction(w, { type: 'startEncounter' }); run(w, 1, true);
    const loaded = decodeCheckpoint(encodeCheckpoint(w)); expect(loaded.combat).toEqual({ ...w.combat, flashes: [] }); expect(loaded.ship).toEqual(w.ship);
    run(w, 2, true); run(loaded, 2, true); expect(loaded.combat).toEqual(w.combat); expect(loaded.ship).toEqual(w.ship);
  });
  it('rejects impossible ammo, over-sized actors, duplicate IDs, invalid effects and nonfinite drone state', () => {
    const w = flight(); applyCombatAction(w, { type: 'startEncounter' }); const valid = JSON.parse(encodeCheckpoint(w));
    for (const mutate of [
      (v: typeof valid) => { v.world.ship.armament.cannon = 41; },
      (v: typeof valid) => { v.world.ship.armament.energy = -1; },
      (v: typeof valid) => { v.world.combat.enemies[0].fuel = null; },
      (v: typeof valid) => { v.world.combat.enemies.push(v.world.combat.enemies[0]); },
      (v: typeof valid) => { v.world.combat.projectiles = Array(97).fill({}); },
      (v: typeof valid) => { v.world.combat.flashes = [{ position: { x: 0, y: 0 }, life: 20 }]; },
    ]) { const v = structuredClone(valid); mutate(v); expect(() => decodeCheckpoint(JSON.stringify(v))).toThrow(); }
  });
});
