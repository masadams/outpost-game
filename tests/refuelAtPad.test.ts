import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { groundVelocity, planetAt, surfacePosition } from '../src/sim/celestial';
import { WORLD } from '../src/sim/config';
import { onPad } from '../src/sim/colonyService';

function landedAt(metresFromPad: number) {
  const w = createWorld();
  w.asteroids = [];
  const p = planetAt('home', w.system);
  const angle = WORLD.padAngle + metresFromPad / p.radius;
  w.ship.position = surfacePosition(p, angle, WORLD.shipRadius);
  w.ship.velocity = groundVelocity(p, w.ship.position);
  w.ship.angle = angle + p.spin;
  w.ship.state = 'landed';
  w.ship.fuel = 50;
  w.colony.products.fuel = 80;
  return w;
}

describe('fuel from the base store', () => {
  it('goes into the lander on the landing pad', () => {
    const w = landedAt(0);
    expect(onPad(w)).toBe(true);
    stepWorld(w, { thrust: false, turn: 0, unload: true }, 1 / 60);
    expect(w.ship.fuel).toBeGreaterThan(50);
    expect(w.colony.products.fuel).toBeLessThan(80);
  });

  it('does not move anywhere else on the world', () => {
    for (const metres of [80, 400, 3000]) {
      const w = landedAt(metres);
      expect(onPad(w)).toBe(false);
      stepWorld(w, { thrust: false, turn: 0, unload: true }, 1 / 60);
      expect(w.ship.fuel, `${metres} m from the pad`).toBe(50);
      expect(w.colony.products.fuel).toBe(80);
    }
  });
});
