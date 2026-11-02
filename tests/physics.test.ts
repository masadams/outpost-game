import { describe, expect, it } from 'vitest';
import { FixedClock } from '../src/sim/clock';
import { ATMOSPHERE, STEP, WORLD } from '../src/sim/config';
import { length } from '../src/sim/math';
import { createShip, gravity, IDLE, safeLanding, stepShip, surfaceHit, telemetry } from '../src/sim/physics';

describe('radial gravity', () => {
  it.each([[WORLD.radius, 0], [0, -WORLD.radius], [-WORLD.radius, 0], [0, WORLD.radius]])('points inward at (%s,%s)', (x, y) => {
    const g = gravity({ x, y }); expect(g.x * x + g.y * y).toBeLessThan(0);
    expect(g.x * y - g.y * x).toBeCloseTo(0);
    expect(length(g)).toBeCloseTo(5);
  });
  it('falls with inverse square distance and remains finite at the core', () => {
    expect(length(gravity({ x: WORLD.radius * 2, y: 0 }))).toBeCloseTo(1.25);
    expect(gravity({ x: 0, y: 0 })).toEqual({ x: -0, y: -0 });
    expect(Number.isFinite(gravity({ x: 0.001, y: 0 }).x)).toBe(true);
  });
});
describe('thrust, rotation and clock', () => {
  it('launches, burns fuel at a rate in seconds, and resets identically', () => {
    const ship = createShip();
    for (let i = 0; i < 600; i++) stepShip(ship, { thrust: true, turn: 0 }, STEP);
    expect(telemetry(ship).altitude).toBeGreaterThan(300);
    expect(ship.fuel).toBeCloseTo(WORLD.fuelCapacity - 8);
    expect(createShip()).toEqual(createShip());
    expect(createShip().state).toBe('landed');
  });
  it('retains tangential inertia in free flight', () => {
    const ship = createShip(); ship.state = 'flying'; ship.position = { x: 0, y: -WORLD.radius - ATMOSPHERE.height - 1000 }; ship.velocity.x = 100;
    stepShip(ship, IDLE, STEP);
    expect(ship.velocity.x).toBe(100); expect(ship.velocity.y).toBeGreaterThan(0);
  });
  it('scales acceleration with total mass and uses only remaining fuel', () => {
    const ship = createShip(); ship.fuel = WORLD.burnRate * STEP / 2;
    stepShip(ship, { thrust: true, turn: 0 }, STEP);
    expect(ship.fuel).toBe(0); const vy = ship.velocity.y;
    stepShip(ship, { thrust: true, turn: 0 }, STEP);
    expect(ship.thrusting).toBe(false); expect(ship.velocity.y).toBeGreaterThan(vy);
  });
  it('damps angular velocity without damping linear velocity', () => {
    const ship = createShip(); ship.state = 'flying'; ship.position.y = -WORLD.radius - ATMOSPHERE.height - 1000;
    stepShip(ship, { thrust: false, turn: 1 }, STEP); expect(ship.angularVelocity).toBeGreaterThan(0);
    const spin = ship.angularVelocity; stepShip(ship, IDLE, STEP); expect(ship.angularVelocity).toBeLessThan(spin);
  });
  it('produces identical simulation at 30, 60 and 144 rendering Hz', () => {
    const run = (hz: number) => {
      const clock = new FixedClock(), ship = createShip();
      for (let i = 0; i < hz * 10; i++) clock.advance(1 / hz, dt => stepShip(ship, { thrust: true, turn: 0.1 }, dt));
      return ship;
    };
    expect(run(30)).toEqual(run(60)); expect(run(144)).toEqual(run(60));
  });
  it('caps catch-up and drops stale time on reset', () => {
    const clock = new FixedClock(); let ticks = 0;
    clock.advance(20, () => ticks++); expect(ticks).toBe(15);
    clock.advance(STEP / 2, () => ticks++); clock.reset();
    clock.advance(STEP / 2, () => ticks++); expect(ticks).toBe(15);
  });
});
describe('landing and collision', () => {
  const safe = { onPad: true, radial: -3, tangential: 1, tilt: 0.1, spin: 0.1 };
  it('accepts a controlled pad touchdown', () => expect(safeLanding(safe)).toBe(true));
  it.each([{ onPad: false }, { radial: -7 }, { tangential: 5 }, { tilt: Math.PI / 6 }, { spin: 0.5 }])('rejects unsafe condition %o', change => {
    expect(safeLanding({ ...safe, ...change })).toBe(false);
  });
  it('catches a segment that crosses the entire moon', () => {
    expect(surfaceHit({ x: 0, y: -1000 }, { x: 0, y: 1000 }, 607)).toBeCloseTo(0.1965);
    const ship = createShip(); ship.state = 'flying'; ship.position.y = -WORLD.radius - ATMOSPHERE.height - 1000; ship.velocity.y = 600000;
    stepShip(ship, IDLE, STEP); expect(ship.state).toBe('crashed'); expect(length(ship.position)).toBeCloseTo(WORLD.radius + WORLD.shipRadius);
  });
  it('locks a safe landing without contact jitter and allows relaunch', () => {
    const ship = createShip(); ship.state = 'flying'; ship.position.y -= 0.02; ship.velocity.y = 2;
    stepShip(ship, IDLE, STEP); expect(ship.state).toBe('landed'); expect(ship.landings).toBe(1);
    for (let i = 0; i < 600; i++) stepShip(ship, IDLE, STEP);
    expect(ship.hull).toBe(100); expect(ship.velocity).toEqual({ x: 0, y: 0 });
    stepShip(ship, { thrust: true, turn: 0 }, STEP); expect(ship.state).toBe('flying');
  });
  it('damages a moderate impact and crashes a hard impact', () => {
    const ship = createShip(); ship.state = 'flying'; ship.position.y -= 0.01; ship.velocity.y = 8;
    stepShip(ship, IDLE, STEP); expect(ship.hull).toBeLessThan(100); expect(ship.state).toBe('flying'); expect(ship.velocity.y).toBeLessThan(0);
    ship.position.y = -WORLD.radius - WORLD.shipRadius - 0.01; ship.velocity.y = 40;
    stepShip(ship, IDLE, STEP); expect(ship.state).toBe('crashed'); expect(ship.hull).toBe(0);
  });
  it('does not accept a touchdown beyond the pad or with excess tilt', () => {
    for (const mode of ['terrain', 'tilted']) {
      const ship = createShip(); ship.state = 'flying';
      if (mode === 'terrain') { ship.position = { x: WORLD.radius + WORLD.shipRadius + 0.01, y: 0 }; ship.angle = Math.PI / 2; ship.velocity = { x: -1, y: 0 }; }
      else { ship.position.y -= 0.01; ship.angle = 0.5; ship.velocity.y = 1; }
      stepShip(ship, IDLE, STEP); expect(ship.state).not.toBe('landed'); expect(ship.hull).toBeLessThan(100);
    }
  });
  it('supports a full orbit without surface penetration or arbitrary drag', () => {
    const radius = WORLD.radius + ATMOSPHERE.height + 500;
    const ship = createShip(); ship.state = 'flying'; ship.position = { x: 0, y: -radius }; ship.velocity = { x: Math.sqrt(WORLD.mu / radius), y: 0 };
    const period = 2 * Math.PI * Math.sqrt(radius ** 3 / WORLD.mu);
    for (let i = 0; i < period / STEP; i++) stepShip(ship, IDLE, STEP);
    expect(ship.position.x).toBeCloseTo(0, -1); expect(ship.position.y).toBeCloseTo(-radius, -1);
    expect(ship.hull).toBe(100); expect(ship.fuel).toBe(WORLD.fuelCapacity);
  });
  it('completes launch, ballistic coast, powered descent and landing on the original pad', () => {
    const ship = createShip(); let maxAltitude = 0;
    for (let i = 0; i < 24000 && ship.landings === 0 && ship.state !== 'crashed'; i++) {
      const t = telemetry(ship); maxAltitude = Math.max(maxAltitude, t.altitude);
      const targetDescent = -Math.min(30, Math.max(2, t.altitude * 0.3));
      const thrust = i < 600 || (t.radial < targetDescent);
      stepShip(ship, { thrust, turn: 0 }, STEP);
    }
    expect(maxAltitude).toBeGreaterThan(ATMOSPHERE.height); expect(ship.landings).toBe(1); expect(ship.hull).toBe(100);
  });
});
