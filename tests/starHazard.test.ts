import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { HEAT_FLUX, heating, starTide } from '../src/sim/starHazard';
import { starPosition, STAR } from '../src/sim/star';
import { gravity } from '../src/sim/environment';

const sys = { time: 0, binary: true, sun: true };

describe('Helia, the far and deadly star', () => {
  it('pulls on nothing you can notice near the planets', () => {
    const tide = starTide({ x: 0, y: -1900 }, sys);
    expect(Math.hypot(tide.x, tide.y)).toBeLessThan(1e-4);
  });

  it('pulls hard close in: past a point no lander can climb away', () => {
    const star = starPosition(sys);
    const n = { x: star.x / STAR.distance, y: star.y / STAR.distance };
    const near = { x: star.x - n.x * (STAR.radius + 20000), y: star.y - n.y * (STAR.radius + 20000) };
    const g = gravity(near, sys);
    expect(Math.hypot(g.x, g.y)).toBeGreaterThan(30);
  });

  it('is hours of flight away at a good speed', () => {
    expect(STAR.distance / 130 / 3600).toBeGreaterThan(6);
  });

  it('cooks the hull only when close, warns at once, and the lander is lost if it stays', () => {
    const w = createWorld();
    w.system.sun = true;
    expect(heating(w)).toBe(0);
    const star = starPosition(w.system);
    const n = { x: star.x / STAR.distance, y: star.y / STAR.distance };
    const r = STAR.distance / Math.sqrt(HEAT_FLUX * 3);
    w.ship.state = 'flying';
    w.ship.position = { x: star.x - n.x * r, y: star.y - n.y * r };
    w.ship.velocity = { x: 0, y: 0 };
    expect(heating(w)).toBeGreaterThan(1);
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.notice.message).toMatch(/HULL IS HEATING/);
    for (let i = 0; i < 60 * 30 && w.ship.state === 'flying'; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.ship.state).toBe('crashed');
  });

  it('does nothing with the day cycle off', () => {
    expect(starTide({ x: 5e5, y: 0 }, { time: 0, binary: true })).toEqual({ x: 0, y: 0 });
  });
});
