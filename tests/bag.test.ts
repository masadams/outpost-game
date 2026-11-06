import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { planetAt, surfaceAngle, surfacePosition, groundVelocity } from '../src/sim/celestial';
import { SUIT } from '../src/sim/astronaut';
import { STATIONS } from '../src/sim/stations';
import { WORLD } from '../src/sim/config';

const IDLE = { thrust: false, turn: 0 };
const run = (w: WorldState, seconds: number, input: Parameters<typeof stepWorld>[1] = IDLE) => { for (let i = 0; i < Math.round(seconds * 60); i++) stepWorld(w, input, 1 / 60); };

function rock(w: WorldState, angle: number, mass = 4, height = 30) {
  const home = planetAt('home', w.system);
  const position = surfacePosition(home, angle, height);
  w.pickups.push({ id: w.nextId++, position, velocity: groundVelocity(home, position), radius: 2, mass, resource: 'iron' } as never);
}

describe('ore on the ground', () => {
  it('settles and stays put on a turning planet instead of sliding away', () => {
    const w = createWorld();
    w.system.sun = true;
    w.asteroids = [];
    rock(w, 0.2);
    run(w, 10);
    const home = () => planetAt('home', w.system);
    const settled = surfaceAngle(home(), w.pickups[0].position);
    run(w, 20);
    expect(Math.abs(surfaceAngle(home(), w.pickups[0].position) - settled) * WORLD.radius).toBeLessThan(0.5);
  });

  it('can be picked up on foot, up to what the bag holds, and goes into the hold on boarding', () => {
    const w = createWorld();
    w.asteroids = [];
    stepWorld(w, { ...IDLE, board: true }, 1 / 60);
    expect(w.playerMode).toBe('astronaut');
    const home = planetAt('home', w.system);
    const here = surfaceAngle(home, w.astronaut.position);
    rock(w, here + 1 / WORLD.radius, 15, 2);
    rock(w, here - 1 / WORLD.radius, 15, 2);
    run(w, 1);
    expect(w.astronaut.bag.iron).toBeCloseTo(SUIT.bagCapacity, 5);
    expect(w.pickups.reduce((m, p) => m + p.mass, 0)).toBeCloseTo(10, 5);
    // Walk back and board.
    const target = surfaceAngle(home, w.ship.position);
    for (let i = 0; i < 600 && Math.abs(surfaceAngle(planetAt('home', w.system), w.astronaut.position) - target) * WORLD.radius > 3; i++) {
      stepWorld(w, { ...IDLE, turn: surfaceAngle(planetAt('home', w.system), w.astronaut.position) > target ? -1 : 1 }, 1 / 60);
    }
    stepWorld(w, { ...IDLE, board: true }, 1 / 60);
    stepWorld(w, IDLE, 1 / 60);
    expect(w.playerMode).toBe('ship');
    expect(w.ship.cargo.iron).toBeCloseTo(SUIT.bagCapacity, 5);
    expect(w.astronaut.bag.iron).toBe(0);
  });

  it('empties the bag into the depot at the terminal', async () => {
    const { bagToDepot } = await import('../src/sim/bag');
    const w = createWorld();
    w.astronaut.bag.iron = 12;
    const before = w.depot.iron;
    expect(bagToDepot(w)).toBe(12);
    expect(w.depot.iron).toBe(before + 12);
    expect(STATIONS.some(s => s.kind === 'depot')).toBe(true);
  });
});

describe('rocks that fall', () => {
  it('break into loose ore when they hit the ground, with the same mass, instead of blocking the pad', async () => {
    const w = createWorld();
    w.system.sun = true;
    const rocks = w.asteroids.filter(a => a.id === 1 || a.id === 3);
    const mass = rocks.reduce((m, r) => m + r.mass, 0);
    w.asteroids = rocks;
    run(w, 130);
    expect(w.asteroids).toHaveLength(0);
    const ore = w.pickups.reduce((m, p) => m + p.mass, 0);
    expect(ore).toBeCloseTo(mass, 5);
    expect(w.pickups).toHaveLength(8);
    // The pad is clear: the lander can take off.
    run(w, 2, { thrust: true, turn: 0 });
    expect(w.ship.state).toBe('flying');
    const { telemetry } = await import('../src/sim/physics');
    expect(telemetry(w.ship, WORLD.shipRadius, w.system).altitude).toBeGreaterThan(3);
  });
});
