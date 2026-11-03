import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { applyTowAction, resolveTow, stepTow, towInstallationError } from '../src/sim/towing';
import { TOW, createTowing } from '../src/sim/towingConfig';
import { WORLD, STEP } from '../src/sim/config';
import { shipMass } from '../src/sim/shipMass';
import { telemetry } from '../src/sim/physics';
import { inventoryMass } from '../src/sim/resources';
import { createPolicy } from '../src/sim/colonyPolicy';
import { createSchedule } from '../src/sim/scheduling';
import { applyCombatAction } from '../src/sim/combat';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { FixedClock } from '../src/sim/clock';
import { AudioDirector } from '../src/audio/director';

const idle = { thrust: false, turn: 0 };
function fixture() {
  const w = createWorld(); w.ship.towRig = true; w.ship.state = 'flying'; w.ship.position = { x: 0, y: -WORLD.radius - 500 };
  w.asteroids = [{ id: 1, position: { x: 80, y: w.ship.position.y }, velocity: { x: 0, y: 0 }, mass: 40, radius: 16, resource: 'iron', stage: 0, health: 1, maxHealth: 1 }];
  return w;
}
const momentum = (w: WorldState) => ({ x: shipMass(w.ship) * w.ship.velocity.x + w.asteroids[0].mass * w.asteroids[0].velocity.x,
  y: shipMass(w.ship) * w.ship.velocity.y + w.asteroids[0].mass * w.asteroids[0].velocity.y });
const oreMass = (w: WorldState) => w.asteroids.reduce((n, r) => n + r.mass, 0) + w.pickups.reduce((n, p) => n + p.mass, 0) + inventoryMass(w.ship.cargo) + inventoryMass(w.depot);

describe('earned towing equipment and capture', () => {
  it('fabricates exactly 25 kg of equipment from supplied stock once, adding that mass to flight', () => {
    const w = createWorld(), before = shipMass(w.ship), stock = Object.values(w.colony.products).reduce((a, b) => a + b, 0);
    applyTowAction(w, { type: 'installTowRig' }); expect(w.ship.towRig).toBe(true); expect(shipMass(w.ship) - before).toBe(TOW.mass);
    expect(stock - Object.values(w.colony.products).reduce((a, b) => a + b, 0)).toBe(TOW.mass);
    expect(w.colony.products).toMatchObject({ alloy: 12, wire: 8, components: 5 });
    const paid = { ...w.colony.products }; applyTowAction(w, { type: 'installTowRig' }); expect(w.colony.products).toEqual(paid);
  });
  it('requires the piloted home pad and unreserved fabrication supplies', () => {
    const w = createWorld(); w.playerMode = 'astronaut'; expect(towInstallationError(w)).toContain('home pad');
    w.playerMode = 'ship'; w.colony.policy = { ...createPolicy(), alloyReserve: 20 }; applyTowAction(w, { type: 'installTowRig' });
    expect(w.ship.towRig).toBe(false); expect(w.colony.products.alloy).toBe(28);
    w.colony.policy.alloyReserve = 0; w.ship.position.x = 100; expect(towInstallationError(w)).toContain('home pad');
  });
  it('latches the nearest eligible rock deterministically without changing mass or momentum', () => {
    const w = fixture(); w.asteroids.push({ ...structuredClone(w.asteroids[0]), id: 2, position: { x: 100, y: w.ship.position.y } });
    const ship = structuredClone(w.ship), rocks = structuredClone(w.asteroids); applyTowAction(w, { type: 'toggleTow' });
    expect(w.towing.targetId).toBe(1); expect(w.towing.length).toBe(80); expect(w.ship).toEqual(ship); expect(w.asteroids).toEqual(rocks);
  });
  it('rejects excess range/relative speed, missing equipment and a terrain-obscured target', () => {
    const w = fixture(); w.asteroids[0].velocity.x = TOW.relativeSpeed + 1; applyTowAction(w, { type: 'toggleTow' }); expect(w.towing.targetId).toBeNull();
    w.asteroids[0].velocity.x = 0; w.asteroids[0].position.x = TOW.range + 1; applyTowAction(w, { type: 'toggleTow' }); expect(w.towing.targetId).toBeNull();
    w.asteroids[0].position.x = 80; w.ship.towRig = false; applyTowAction(w, { type: 'toggleTow' }); expect(w.towing.targetId).toBeNull();
    w.ship.towRig = true; w.ship.position = { x: -80, y: -WORLD.radius + 1 }; w.asteroids[0].position = { x: 80, y: -WORLD.radius + 1 };
    applyTowAction(w, { type: 'toggleTow' }); expect(w.towing.targetId).toBeNull();
  });
});

describe('finite cable dynamics and vulnerability', () => {
  it('never pushes a slack cable or creates an initial latch impulse', () => {
    const w = fixture(); applyTowAction(w, { type: 'toggleTow' }); const before = momentum(w); stepTow(w, STEP); expect(momentum(w)).toEqual(before);
    w.asteroids[0].position.x -= 10; stepTow(w, STEP); expect(w.towing.tension).toBe(0); expect(w.ship.velocity.x).toBe(0); expect(w.asteroids[0].velocity.x).toBe(0);
  });
  it('applies equal/opposite impulses and dissipates closing/extension energy through damping', () => {
    const w = fixture(); applyTowAction(w, { type: 'toggleTow' }); w.asteroids[0].position.x += 2; w.asteroids[0].velocity.x = 3;
    const before = momentum(w); stepTow(w, STEP); expect(momentum(w).x).toBeCloseTo(before.x, 10); expect(momentum(w).y).toBeCloseTo(before.y, 10);
    expect(w.ship.velocity.x).toBeGreaterThan(0); expect(w.asteroids[0].velocity.x).toBeLessThan(3); expect(w.towing.tension).toBeGreaterThan(0);
    const energy = () => 0.5 * shipMass(w.ship) * w.ship.velocity.x ** 2 + 0.5 * w.asteroids[0].mass * w.asteroids[0].velocity.x ** 2 +
      0.5 * TOW.spring * Math.max(0, Math.hypot(w.asteroids[0].position.x - w.ship.position.x, w.asteroids[0].position.y - w.ship.position.y) - w.towing.length) ** 2;
    const start = energy();
    for (let i = 0; i < 180; i++) { stepTow(w, STEP); w.ship.position.x += w.ship.velocity.x * STEP; w.asteroids[0].position.x += w.asteroids[0].velocity.x * STEP; }
    expect(energy()).toBeLessThan(start); expect(w.towing.targetId).toBe(1);
  });
  it('actually hauls an asteroid toward home using ordinary thrust, without granting ore', () => {
    const w = fixture(); w.ship.position.x = -200; w.asteroids[0].position.x = -280; w.ship.angle = Math.PI / 2; applyTowAction(w, { type: 'toggleTow' });
    const original = oreMass(w); for (let i = 0; i < 240; i++) stepWorld(w, { thrust: true, turn: 0 }, STEP);
    expect(w.towing.targetId).toBe(1); expect(w.asteroids[0].position.x).toBeGreaterThan(-260);
    expect(w.ship.fuel).toBeLessThan(WORLD.fuelCapacity); expect(w.towing.tension).toBeGreaterThan(0); expect(oreMass(w)).toBe(original); expect(inventoryMass(w.ship.cargo)).toBe(0);
  });
  it('breaks on overstretch or excessive tension without deleting or refunding the target', () => {
    for (const force of [false, true]) {
      const w = fixture(); applyTowAction(w, { type: 'toggleTow' });
      if (force) { w.asteroids[0].position.x += 1; w.asteroids[0].velocity.x = 100; } else w.asteroids[0].position.x += TOW.stretch + 1;
      stepTow(w, STEP); expect(w.towing.targetId).toBeNull(); expect(w.towing.breaks).toBe(1); expect(oreMass(w)).toBe(40); expect(w.ship.towRig).toBe(true);
      stepTow(w, STEP); expect(w.towing.breaks).toBe(1);
    }
  });
  it('severs on ship impact, target destruction or terrain contact exactly once', () => {
    for (const reason of ['impact', 'target', 'terrain']) {
      const w = fixture(); applyTowAction(w, { type: 'toggleTow' });
      if (reason === 'impact') w.ship.impact = 1;
      if (reason === 'target') w.asteroids = [];
      if (reason === 'terrain') { w.ship.position = { x: -80, y: -WORLD.radius + 1 }; w.asteroids[0].position = { x: 80, y: -WORLD.radius + 1 }; w.towing.length = 160; }
      resolveTow(w); resolveTow(w); expect(w.towing.breaks).toBe(1); expect(w.towing.targetId).toBeNull();
    }
  });
  it('manual release preserves each body momentum and does not count a break', () => {
    const w = fixture(); applyTowAction(w, { type: 'toggleTow' }); w.ship.velocity.x = 3; w.asteroids[0].velocity.y = 2;
    const ship = structuredClone(w.ship), rock = structuredClone(w.asteroids[0]); applyTowAction(w, { type: 'toggleTow' });
    expect(w.ship).toEqual(ship); expect(w.asteroids[0]).toEqual(rock); expect(w.towing).toEqual(createTowing());
  });
  it('lets the planet anchor a landed ship while the rock remains physical', () => {
    const w = fixture(); applyTowAction(w, { type: 'toggleTow' }); w.ship.state = 'landed'; w.asteroids[0].position.x += 2;
    stepTow(w, STEP); expect(w.ship.velocity).toEqual({ x: 0, y: 0 }); expect(w.asteroids[0].velocity.x).toBeLessThan(0);
  });
  it('preserves paid equipment through recovery, loses the cable and still charges recovery supplies', () => {
    const w = fixture(); applyTowAction(w, { type: 'toggleTow' }); w.ship.state = 'crashed'; w.ship.hull = 0;
    applyCombatAction(w, { type: 'recoverShip' }); expect(w.ship.towRig).toBe(true); expect(w.ship.hull).toBe(30);
    expect(w.towing.targetId).toBeNull(); expect(w.colony.products.alloy).toBe(20); expect(w.colony.products.components).toBe(6);
  });
});

describe('towing integration and checkpoints', () => {
  it('mines a hauled fragment, collects it, lands and unloads using normal controls without duplicating mass', () => {
    const w = fixture(); w.ship.position = { x: 0, y: -WORLD.radius - WORLD.shipRadius - 80 };
    Object.assign(w.asteroids[0], { position: { x: 0, y: w.ship.position.y - 50 }, mass: 20, radius: 11, stage: 1, health: 0.005, maxHealth: 0.55 });
    applyTowAction(w, { type: 'toggleTow' }); stepWorld(w, { ...idle, mine: true, tractor: true }, STEP);
    expect(w.towing.targetId).toBeNull(); expect(w.towing.breaks).toBe(1); expect(oreMass(w)).toBe(20);
    for (let i = 0; i < 600 && inventoryMass(w.ship.cargo) < 19.999; i++) stepWorld(w, { thrust: telemetry(w.ship).radial < 0, turn: 0, tractor: true }, STEP);
    expect(inventoryMass(w.ship.cargo)).toBeCloseTo(20);
    for (let i = 0; i < 3600 && w.ship.state === 'flying'; i++) { const t = telemetry(w.ship); stepWorld(w, { thrust: t.radial < (t.altitude > 30 ? -8 : -2), turn: 0 }, STEP); }
    expect(w.ship.state).toBe('landed'); stepWorld(w, { ...idle, unload: true }, STEP); expect(inventoryMass(w.depot)).toBeCloseTo(20); expect(oreMass(w)).toBeCloseTo(20);
  });
  it('round-trips a live cable and continues with identical world state', () => {
    const w = fixture(); applyTowAction(w, { type: 'toggleTow' }); for (let i = 0; i < 60; i++) stepWorld(w, { thrust: true, turn: 0 }, STEP);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    for (let i = 0; i < 120; i++) { stepWorld(w, idle, STEP); stepWorld(loaded, idle, STEP); }
    expect(loaded.ship).toEqual(w.ship); expect(loaded.asteroids).toEqual(w.asteroids); expect(loaded.towing).toEqual(w.towing);
  });
  it('rejects dangling targets, impossible cable state and untyped or missing equipment', () => {
    const w = fixture(); applyTowAction(w, { type: 'toggleTow' }); const valid = JSON.parse(encodeCheckpoint(w));
    for (const mutate of [
      (v: typeof valid) => { v.world.towing.targetId = 999; }, (v: typeof valid) => { v.world.towing.length = 181; },
      (v: typeof valid) => { v.world.towing.tension = 6001; }, (v: typeof valid) => { v.world.ship.towRig = false; },
      (v: typeof valid) => { v.world.ship.towRig = 'yes'; }, (v: typeof valid) => { v.world.towing.breaks = -1; },
      (v: typeof valid) => { v.world.towing.targetId = null; },
    ]) { const bad = structuredClone(valid); mutate(bad); expect(() => decodeCheckpoint(JSON.stringify(bad))).toThrow(); }
  });
  it('runs identically at 30 and 144 rendering Hz with the rig and cable masses accounted for', () => {
    const simulate = (fps: number) => { const w = fixture(); applyTowAction(w, { type: 'toggleTow' }); const clock = new FixedClock();
      for (let i = 0; i < fps * 4; i++) clock.advance(1 / fps, dt => stepWorld(w, { thrust: true, turn: 0 }, dt)); return w; };
    expect(simulate(30)).toEqual(simulate(144));
  });
  it('selects mechanical latch/release/snap cues once and suppresses them while paused', () => {
    const w = fixture(), d = new AudioDirector(); d.reset(w); applyTowAction(w, { type: 'toggleTow' }); expect(d.update(w, STEP, false).cues).toContain('towLatch');
    applyTowAction(w, { type: 'toggleTow' }); expect(d.update(w, STEP, false).cues).toContain('towRelease');
    applyTowAction(w, { type: 'toggleTow' }); d.reset(w); w.ship.impact = 1; resolveTow(w); expect(d.update(w, STEP, false).cues).toContain('towSnap');
    expect(d.update(w, STEP, false).cues).not.toContain('towSnap'); expect(d.update(w, STEP, true).cues).toEqual([]);
  });
});
