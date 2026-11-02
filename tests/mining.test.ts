import { describe, expect, it } from 'vitest';
import { collideShip, moveBody, separateBodies, type Asteroid, type Pickup } from '../src/sim/bodies';
import { FixedClock } from '../src/sim/clock';
import { STEP } from '../src/sim/config';
import { length } from '../src/sim/math';
import { fireLaser, fracture, rayCircle, tractor } from '../src/sim/mining';
import { createShip, IDLE, stepShip, telemetry } from '../src/sim/physics';
import { CARGO_CAPACITY, inventoryMass, RESOURCES } from '../src/sim/resources';
import { createWorld, stepWorld, unloadCargo, type WorldState } from '../src/sim/world';

const rock = (change: Partial<Asteroid> = {}): Asteroid => ({ id: 1, position: { x: 0, y: -1000 }, velocity: { x: 0, y: 0 },
  radius: 16, mass: 40, resource: 'iron', stage: 0, health: 1, maxHealth: 1, ...change });
const ore = (change: Partial<Pickup> = {}): Pickup => ({ id: 2, position: { x: 0, y: -1000 }, velocity: { x: 0, y: 0 },
  radius: 2, mass: 10, resource: 'iron', ...change });
function total(world: WorldState): number {
  return world.asteroids.reduce((sum, body) => sum + body.mass, 0) + world.pickups.reduce((sum, body) => sum + body.mass, 0)
    + inventoryMass(world.ship.cargo) + inventoryMass(world.depot);
}
describe('laser and fracture', () => {
  it('raycasts forward, rejects misses/behind, and handles an origin inside', () => {
    expect(rayCircle({ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: -100 }, 10)).toBe(90);
    expect(rayCircle({ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 20, y: -100 }, 10)).toBeNull();
    expect(rayCircle({ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 100 }, 10)).toBeNull();
    expect(rayCircle({ x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 0 }, 10)).toBe(0);
  });
  it('damages only the first forward rock within range and respects moon occlusion', () => {
    const ship = createShip(); ship.state = 'flying';
    const near = rock({ id: 1, position: { x: 0, y: -750 } }), far = rock({ id: 2, position: { x: 0, y: -900 } });
    expect(fireLaser(ship, [far, near], 0.5)?.targetId).toBe(1);
    expect(near.health).toBe(0.5); expect(far.health).toBe(1);
    ship.angle = Math.PI;
    const hidden = rock({ position: { x: 0, y: -400 } });
    expect(fireLaser(ship, [hidden], 1)?.targetId).toBeNull(); expect(hidden.health).toBe(1);
    ship.angle = 0; const distant = rock({ position: { x: 0, y: -2000 } });
    expect(fireLaser(ship, [distant], 1)?.targetId).toBeNull();
    ship.state = 'landed'; expect(fireLaser(ship, [near], 1)).toBeNull();
  });
  it('conserves resource mass and momentum across both fracture stages', () => {
    let id = 10; const parent = rock({ velocity: { x: 4, y: 8 } });
    const first = fracture(parent, () => id++);
    expect(first.rocks).toHaveLength(2); expect(first.ore).toHaveLength(0);
    const chips = first.rocks.flatMap(child => fracture(child, () => id++).ore);
    expect(chips).toHaveLength(8); expect(new Set(chips.map(p => p.id)).size).toBe(8);
    expect(chips.reduce((sum, p) => sum + p.mass, 0)).toBe(parent.mass);
    expect(chips.reduce((sum, p) => sum + p.mass * p.velocity.x, 0)).toBeCloseTo(parent.mass * 4);
    expect(chips.reduce((sum, p) => sum + p.mass * p.velocity.y, 0)).toBeCloseTo(parent.mass * 8);
  });
});
describe('cargo and transfer', () => {
  it('collects partial stacks up to capacity without losing the remainder', () => {
    const ship = createShip(); ship.state = 'flying'; ship.cargo.copper = CARGO_CAPACITY - 3;
    const pickup = ore({ position: { ...ship.position } }); tractor(ship, pickup, STEP);
    expect(inventoryMass(ship.cargo)).toBe(CARGO_CAPACITY); expect(ship.cargo.iron).toBe(3); expect(pickup.mass).toBe(7);
    tractor(ship, pickup, STEP); expect(pickup.mass).toBe(7);
  });
  it('pulls nearby ore with a capped force and leaves distant ore alone', () => {
    const ship = createShip(); ship.state = 'flying'; ship.position.y = -1000;
    const close = ore({ position: { x: 100, y: -1000 } }); tractor(ship, close, STEP);
    expect(close.velocity.x).toBeLessThan(0); expect(length(close.velocity)).toBeLessThanOrEqual(35 * STEP + 1e-9);
    const far = ore({ position: { x: 1000, y: -1000 } }); tractor(ship, far, STEP); expect(length(far.velocity)).toBe(0);
  });
  it('adds cargo to thrust mass while retaining gravity acceleration', () => {
    const light = createShip(), heavy = createShip(); heavy.cargo.iron = 120;
    stepShip(light, { thrust: true, turn: 0 }, STEP); stepShip(heavy, { thrust: true, turn: 0 }, STEP);
    expect(light.velocity.y).toBeLessThan(heavy.velocity.y);
    light.position.y = heavy.position.y = -1000; light.velocity.y = heavy.velocity.y = 0;
    stepShip(light, IDLE, STEP); stepShip(heavy, IDLE, STEP); expect(light.velocity.y).toBe(heavy.velocity.y);
  });
  it('unloads all five resources only while safely landed and never duplicates a delivery', () => {
    const world = createWorld(); for (const type of RESOURCES) world.ship.cargo[type] = 2;
    world.ship.state = 'flying'; expect(unloadCargo(world)).toBe(0);
    world.ship.state = 'crashed'; expect(unloadCargo(world)).toBe(0);
    world.ship.state = 'landed'; expect(unloadCargo(world)).toBe(10); expect(inventoryMass(world.depot)).toBe(10);
    expect(inventoryMass(world.ship.cargo)).toBe(0); expect(unloadCargo(world)).toBe(0);
  });
});
describe('world dynamics', () => {
  it('spawns a deterministic finite field containing all five resources', () => {
    expect(createWorld()).toEqual(createWorld()); expect(new Set(createWorld().asteroids.map(r => r.resource)).size).toBe(5);
  });
  it('sweeps a fast ship against a moving asteroid and damages hull', () => {
    const ship = createShip(); ship.state = 'flying'; ship.position = { x: 100, y: -1000 }; ship.velocity.x = 200;
    const obstacle = rock(); collideShip(ship, obstacle, { x: -100, y: -1000 }, { ...obstacle.position });
    expect(ship.state).toBe('crashed'); expect(ship.position.x).toBeLessThan(0);
  });
  it('moves bodies under gravity and resolves surface and body contacts finitely', () => {
    const sample = rock({ position: { x: 0, y: -1000 }, velocity: { x: 0, y: 120000 } }); moveBody(sample, STEP);
    expect(length(sample.position)).toBeGreaterThanOrEqual(616); expect(sample.velocity.y).toBeLessThan(0);
    const a = rock(), b = rock({ id: 2, position: { ...a.position } }); separateBodies(a, b);
    expect(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y)).toBeCloseTo(32);
  });
  it('has identical mining outcomes at different rendering frame rates', () => {
    const run = (hz: number) => {
      const world = createWorld(), clock = new FixedClock();
      for (let i = 0; i < hz * 5; i++) clock.advance(1 / hz, dt => stepWorld(world, { thrust: true, turn: 0, mine: true, tractor: true }, dt));
      return world;
    };
    expect(run(30)).toEqual(run(144));
  });
  it('completes launch, mining, collection, return and unloading while conserving ore', () => {
    const world = createWorld(), original = total(world); let maxAltitude = 0;
    for (let i = 0; i < 24000 && world.ship.landings === 0 && world.ship.state !== 'crashed'; i++) {
      const t = telemetry(world.ship); maxAltitude = Math.max(maxAltitude, t.altitude);
      const targetDescent = -Math.min(30, Math.max(2, t.altitude * 0.3));
      stepWorld(world, { thrust: i < 390 || t.radial < targetDescent, turn: 0, mine: true, tractor: true }, STEP);
    }
    expect(maxAltitude).toBeGreaterThan(400); expect(world.ship.landings).toBe(1);
    expect(inventoryMass(world.ship.cargo)).toBeGreaterThan(0);
    const delivered = unloadCargo(world); expect(delivered).toBeGreaterThan(0);
    expect(inventoryMass(world.depot)).toBe(delivered); expect(total(world)).toBeCloseTo(original, 8);
  });
});
