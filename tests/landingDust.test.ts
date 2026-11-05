import { describe, expect, it } from 'vitest';
import { dustStrength, groundBelow } from '../src/render/landing';
import { VisualEffects } from '../src/render/effects';
import { createWorld } from '../src/sim/world';
import { WORLD } from '../src/sim/config';

const view = { centre: { x: 0, y: 0 }, radius: 1e6 };

describe('landing feel', () => {
  it('blows dust only near the ground and only under thrust', () => {
    expect(dustStrength(5, false)).toBe(0);
    expect(dustStrength(100, true)).toBe(0);
    expect(dustStrength(3, true)).toBeGreaterThan(dustStrength(20, true));
  });

  it('finds the ground straight below the lander', () => {
    const w = createWorld();
    w.ship.state = 'flying';
    w.ship.position = { x: w.ship.position.x, y: w.ship.position.y - 10 };
    const ground = groundBelow(w.ship, w.system);
    expect(ground.altitude).toBeGreaterThan(0);
    expect(Math.hypot(ground.up.x, ground.up.y)).toBeCloseTo(1);
  });

  it('kicks up dust when the engine fires close to the ground', () => {
    const w = createWorld();
    const fx = new VisualEffects();
    w.ship.state = 'flying';
    w.ship.position = { x: w.ship.position.x, y: w.ship.position.y - 8 };
    w.ship.thrusting = true;
    fx.reset(w);
    for (let i = 0; i < 30; i++) {
      w.system.time += 1 / 60;
      fx.update(w, 1 / 60, false, 12, view);
    }
    expect(fx.dust).toBeGreaterThan(0);
    w.ship.thrusting = false;
    for (let i = 0; i < 400; i++) fx.update(w, 1 / 60, false, 12, view);
    expect(fx.dust).toBe(0);
  });

  it('throws a ring of dust on touchdown, and none on reduced motion', () => {
    const w = createWorld();
    const fx = new VisualEffects();
    fx.reset(w);
    w.ship.landings += 1;
    fx.update(w, 1 / 60, false, 12, view);
    expect(fx.dust).toBe(12);
    fx.reset(w);
    w.ship.landings += 1;
    fx.update(w, 1 / 60, false, 0, view);
    expect(fx.dust).toBe(0);
    expect(WORLD.shipRadius).toBeGreaterThan(0);
  });
});
