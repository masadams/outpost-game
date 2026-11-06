import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { planetAt, surfacePosition, groundVelocity } from '../src/sim/celestial';
import { WORLD } from '../src/sim/config';
import { WRECK, printPilot, printPlan, wreckCourse } from '../src/sim/wrecks';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';

const IDLE = { thrust: false, turn: 0 };
const run = (w: WorldState, seconds: number, dt = 1 / 60) => { for (let i = 0; i < Math.round(seconds / dt); i++) stepWorld(w, IDLE, dt); };

/** A lander that came down hard 300 m from the pad, with ore aboard. */
function crashed(speed = 20): WorldState {
  const w = createWorld();
  w.asteroids = [];
  const home = planetAt('home', w.system);
  w.ship.position = surfacePosition(home, 300 / WORLD.radius, WORLD.shipRadius);
  w.ship.velocity = groundVelocity(home, w.ship.position);
  w.ship.state = 'crashed';
  w.ship.hull = 0;
  w.ship.ground = 'home';
  w.ship.crashSpeed = speed;
  w.ship.cargo.iron = 40;
  w.ship.fuel = 100;
  return w;
}

describe('printing a new pilot', () => {
  it('replaces a crashed lander with a basic one on the pad and leaves the old one as a wreck', () => {
    const w = crashed(20);
    const alloy = w.colony.products.alloy;
    expect(printPlan(w)?.cost).toMatchObject({ alloy: 8, components: 2 });
    expect(printPilot(w)).toBe(true);
    expect(w.colony.products.alloy).toBe(alloy - 8);
    expect(w.ship.state).toBe('landed');
    expect(w.ship.hull).toBe(100);
    expect(w.ship.cargo.iron).toBe(0);
    expect(w.wrecks).toHaveLength(1);
    const wreck = w.wrecks[0];
    expect(wreck.condition).toBeCloseTo(0.7, 5);
    expect(wreck.ship.cargo.iron).toBeCloseTo(28, 5);
    expect(wreck.ship.freight.alloy).toBeGreaterThan(0);
    expect(wreck.beaconUntil).toBeCloseTo(w.system.time + WRECK.beacon, 5);
    expect(wreckCourse(w, wreck)).toBe('on the ground');
  });

  it('keeps more of a gentle crash than a fast one', () => {
    const soft = crashed(9); printPilot(soft);
    const hard = crashed(45); printPilot(hard);
    expect(soft.wrecks[0].ship.cargo.iron).toBeGreaterThan(hard.wrecks[0].ship.cargo.iron);
  });

  it('says what is missing and changes nothing when the stores are short', () => {
    const w = crashed();
    w.colony.products.components = 1;
    expect(printPlan(w)?.blocked).toContain('components');
    expect(printPilot(w)).toBe(false);
    expect(w.wrecks).toHaveLength(0);
    expect(w.ship.state).toBe('crashed');
  });

  it('prints only a pilot, more cheaply, when the lander is fine', () => {
    const w = createWorld();
    w.playerMode = 'astronaut';
    w.astronaut.health = 0;
    const alloy = w.colony.products.alloy;
    expect(printPilot(w)).toBe(true);
    expect(w.colony.products.alloy).toBe(alloy - 2);
    expect(w.astronaut.health).toBe(100);
    expect(w.wrecks).toHaveLength(0);
  });
});

describe('salvaging a wreck', () => {
  it('takes cargo, fuel and fitted modules back with E, and the wreck is gone when empty', () => {
    const w = crashed(20);
    w.ship.equipment = ['tank'];
    printPilot(w);
    const wreck = w.wrecks[0];
    // Bring the new lander down beside it.
    w.ship.state = 'landed';
    const home = planetAt('home', w.system);
    w.ship.position = surfacePosition(home, 300 / WORLD.radius + 20 / WORLD.radius, WORLD.shipRadius);
    w.ship.velocity = groundVelocity(home, w.ship.position);
    w.ship.fuel = 50;
    stepWorld(w, { ...IDLE, unload: true }, 1 / 60);
    expect(w.ship.cargo.iron).toBeCloseTo(28, 5);
    expect(w.ship.equipment).toEqual(['tank']);
    expect(w.ship.fuel).toBeGreaterThan(50);
    expect(w.wrecks.includes(wreck)).toBe(false);
  });

  it('says to get closer, or to match speed, when it cannot be reached yet', async () => {
    const { reachableWreck } = await import('../src/sim/wrecks');
    const w = crashed();
    printPilot(w);
    const home = planetAt('home', w.system);
    w.ship.state = 'flying';
    w.ship.position = surfacePosition(home, 300 / WORLD.radius, WORLD.shipRadius + 80);
    expect(reachableWreck(w)?.reason).toMatch(/Get closer/);
    w.ship.position = surfacePosition(home, 300 / WORLD.radius, WORLD.shipRadius + 20);
    w.ship.velocity = { x: w.ship.velocity.x + 20, y: w.ship.velocity.y };
    expect(reachableWreck(w)?.reason).toMatch(/Match its speed/);
  });
});

describe('wrecks in space', () => {
  it('stays in orbit when moving fast enough round the planet', () => {
    const w = createWorld();
    const home = planetAt('home', w.system);
    const r = WORLD.radius + 3000;
    w.ship.state = 'crashed';
    w.ship.hull = 0;
    w.ship.ground = undefined;
    w.ship.position = { x: home.position.x, y: home.position.y - r };
    w.ship.velocity = { x: home.velocity.x + Math.sqrt(WORLD.mu / r), y: home.velocity.y };
    printPilot(w);
    expect(wreckCourse(w, w.wrecks[0])).toBe('in orbit');
    expect(w.wrecks[0].condition).toBeCloseTo(0.6, 5);
  });

  it('drifts away and is gone for good once far enough out', () => {
    const w = createWorld();
    w.asteroids = [];
    const home = planetAt('home', w.system);
    w.ship.state = 'crashed';
    w.ship.hull = 0;
    w.ship.ground = undefined;
    w.ship.position = { x: home.position.x, y: home.position.y - WORLD.radius - 3000 };
    w.ship.velocity = { x: home.velocity.x, y: home.velocity.y - 400 };
    printPilot(w);
    expect(wreckCourse(w, w.wrecks[0])).toBe('drifting away');
    run(w, 200, 0.25);
    expect(w.wrecks).toHaveLength(0);
  });

  it('saves and loads with its wreck', () => {
    const w = crashed();
    printPilot(w);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.wrecks).toHaveLength(1);
    expect(loaded.wrecks[0].ship.cargo.iron).toBeCloseTo(w.wrecks[0].ship.cargo.iron, 5);
  });
});
