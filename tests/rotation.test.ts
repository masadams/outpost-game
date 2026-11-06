import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { HOME_SPIN_RATE, groundVelocity, planetAt, surfaceAngle, surfacePosition } from '../src/sim/celestial';
import { telemetry } from '../src/sim/physics';
import { WORLD } from '../src/sim/config';
import { localAngle, wrap } from '../src/sim/math';
import { planStorm } from '../src/sim/storm';
import { STORM } from '../src/sim/stormConfig';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';

const IDLE = { thrust: false, turn: 0 };
function turning(): WorldState {
  const w = createWorld();
  w.system.sun = true;
  w.asteroids = [];
  return w;
}
const run = (w: WorldState, seconds: number, input: Parameters<typeof stepWorld>[1] = IDLE) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) stepWorld(w, input, 1 / 60);
};

describe('planets turn when the day cycle is on', () => {
  it('turns Selene once per day and leaves it still with the day cycle off', () => {
    expect(planetAt('home', { time: 250, binary: true }).spin).toBe(0);
    const home = planetAt('home', { time: 250, binary: true, sun: true });
    expect(home.spin).toBeCloseTo(HOME_SPIN_RATE * 250, 9);
    const ground = groundVelocity(home, surfacePosition(home, 0, 0));
    const speed = Math.hypot(ground.x - home.velocity.x, ground.y - home.velocity.y);
    expect(speed).toBeCloseTo(Math.abs(HOME_SPIN_RATE) * WORLD.radius, 6);
    expect(speed).toBeGreaterThan(5);
  });

  it('carries a landed ship round with the ground, upright and on the pad', () => {
    const w = turning();
    const start = { ...w.ship.position };
    run(w, 120);
    const home = planetAt('home', w.system);
    expect(w.ship.state).toBe('landed');
    expect(Math.abs(surfaceAngle(home, w.ship.position)) * home.radius).toBeLessThan(0.5);
    expect(Math.hypot(w.ship.position.x - start.x, w.ship.position.y - start.y)).toBeGreaterThan(100);
    expect(Math.abs(wrap(w.ship.angle - localAngle({ x: w.ship.position.x - home.position.x, y: w.ship.position.y - home.position.y })))).toBeLessThan(1e-3);
    const t = telemetry(w.ship, WORLD.shipRadius, w.system);
    expect(Math.abs(t.tangential)).toBeLessThan(0.05);
    expect(Math.abs(t.radial)).toBeLessThan(0.05);
  });

  it('lets the lander hop and come back down without drifting off the pad', () => {
    const w = turning();
    run(w, 30);
    run(w, 1.2, { thrust: true, turn: 0 });
    let peak = 0;
    for (let i = 0; i < 60 * 40 && w.ship.state === 'flying'; i++) {
      const t = telemetry(w.ship, WORLD.shipRadius, w.system);
      peak = Math.max(peak, t.altitude);
      // Brake gently near the ground.
      stepWorld(w, { thrust: t.radial < -4 && t.altitude < 40, turn: 0 }, 1 / 60);
    }
    expect(peak).toBeGreaterThan(3);
    expect(w.ship.state).toBe('landed');
    const home = planetAt('home', w.system);
    expect(Math.abs(surfaceAngle(home, w.ship.position)) * home.radius).toBeLessThan(WORLD.padHalfWidth);
  });

  it('keeps the astronaut on the ground and walking moves them along the surface', () => {
    const w = turning();
    stepWorld(w, { ...IDLE, board: true }, 1 / 60);
    expect(w.playerMode).toBe('astronaut');
    const home = () => planetAt('home', w.system);
    const before = surfaceAngle(home(), w.astronaut.position);
    run(w, 3, { ...IDLE, turn: 1 });
    run(w, 2);
    expect(w.astronaut.grounded).toBe(true);
    const after = surfaceAngle(home(), w.astronaut.position);
    expect(Math.abs(wrap(after - before)) * WORLD.radius).toBeGreaterThan(10);
    const altitude = Math.hypot(w.astronaut.position.x - home().position.x, w.astronaut.position.y - home().position.y) - WORLD.radius;
    expect(altitude).toBeGreaterThan(0);
    expect(altitude).toBeLessThan(5);
  });

  it('still aims the storm at the colony while the planet turns', () => {
    const w = turning();
    planStorm(w);
    const metres = w.storm.plan.map(p => (p.impactAngle === null ? null : wrap(p.impactAngle - WORLD.padAngle) * WORLD.radius));
    expect(metres.filter(m => m !== null && Math.abs(m - STORM.targetOffset) < 120).length).toBeGreaterThanOrEqual(3);
  });

  it('saves and loads part-way through a day', () => {
    const w = turning();
    run(w, 200);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.system.sun).toBe(true);
    run(w, 20);
    run(loaded, 20);
    expect(loaded.ship.position.x).toBeCloseTo(w.ship.position.x, 6);
    expect(loaded.ship.position.y).toBeCloseTo(w.ship.position.y, 6);
  });
});

describe('coast path on a turning planet', () => {
  it('shows where you will come down on the ground as it is now', async () => {
    const { predictCoast } = await import('../src/sim/trajectory');
    const w = turning();
    run(w, 10);
    run(w, 1.5, { thrust: true, turn: 0 });
    const path = predictCoast(w.ship, 60, w.system);
    expect(path.contact).not.toBeNull();
    const home = planetAt('home', w.system);
    // A straight hop comes down close to where it left, on today's ground.
    expect(Math.abs(surfaceAngle(home, path.contact!.position)) * home.radius).toBeLessThan(10);
  });
});

describe('defence on a turning planet', { timeout: 120000 }, () => {
  it('turrets still find and break up the storm', async () => {
    const { turretState } = await import('../src/sim/weapons');
    const w = turning();
    w.colony.buildings = [
      { id: 1, kind: 'observatory', angle: 0.02, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
      { id: 2, kind: 'solar', angle: 0.03, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
      { id: 3, kind: 'laser', angle: 0.075, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
      { id: 4, kind: 'laser', angle: 0.085, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
      { id: 5, kind: 'battery', angle: 0.06, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
      { id: 6, kind: 'battery', angle: 0.065, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    ] as never;
    w.colony.nextId = 10;
    w.colony.energy = 150;
    for (const b of w.colony.buildings) if (b.kind === 'laser') turretState(b).automatic = true;
    // Arm it so the storm arrives in daylight: these tests are about aiming on a turning planet, not about the night.
    w.system.time = 1600;
    while (w.storm.phase !== 'over') stepWorld(w, IDLE, 1 / 60);
    expect(w.defence.intercepted).toBeGreaterThan(5);
    expect(w.defence.impacts).toBeLessThanOrEqual(2);
  });
});
