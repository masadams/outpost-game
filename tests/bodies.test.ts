import { describe, expect, it } from 'vitest';
import { BODIES, BODY_IDS, ORBIT_RATE, SEPARATION, planetAt, planets } from '../src/sim/celestial';
import { gravity } from '../src/sim/environment';

describe('the body catalogue', () => {
  it('describes every body, and only the paired ones need the two-body system', () => {
    expect(BODY_IDS).toEqual(['home', 'moon']);
    for (const id of BODY_IDS) expect(BODIES[id].radius).toBeGreaterThan(0);
    expect(planets({ time: 0, binary: false }).map(p => p.id)).toEqual(['home']);
    expect(planets({ time: 0, binary: true }).map(p => p.id)).toEqual(['home', 'moon']);
  });

  it('keeps the pair centred on their shared centre of mass at a fixed separation', () => {
    for (const time of [0, 123, 4567]) {
      const system = { time, binary: true };
      const a = planetAt('home', system);
      const b = planetAt('moon', system);
      expect(Math.hypot(b.position.x - a.position.x, b.position.y - a.position.y)).toBeCloseTo(SEPARATION, 6);
      const total = a.mu + b.mu;
      const centre = { x: (a.position.x * a.mu + b.position.x * b.mu) / total, y: (a.position.y * a.mu + b.position.y * b.mu) / total };
      expect(Math.hypot(centre.x - (b.mu * SEPARATION) / total, centre.y)).toBeLessThan(1e-6);
    }
  });

  it('returns to the same place after one orbit', () => {
    const period = (2 * Math.PI) / ORBIT_RATE;
    const start = planetAt('moon', { time: 0, binary: true });
    const end = planetAt('moon', { time: period, binary: true });
    expect(end.position.x).toBeCloseTo(start.position.x, 3);
    expect(end.position.y).toBeCloseTo(start.position.y, 3);
  });

  it('pulls toward both bodies', () => {
    const system = { time: 0, binary: true };
    const moon = planetAt('moon', system);
    const g = gravity({ x: moon.position.x - 600, y: moon.position.y }, system);
    expect(g.x).toBeGreaterThan(0);
  });
});
