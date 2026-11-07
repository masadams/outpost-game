import { describe, expect, it } from 'vitest';
import { BODIES, orbitShape, planetAt, surveyTime } from '../src/sim/celestial';
import { createWorld } from '../src/sim/world';

describe('seeded orbits', () => {
  it('seed 0 keeps the standard orbit and survey time', () => {
    expect(orbitShape('cinder', 0)).toEqual({ radius: 22000, phase: 2.2 });
    expect(surveyTime('cinder', 0)).toBe(BODIES.cinder.surveySeconds);
  });

  it('another seed moves Cinder the same way every time, within what a probe and a kit can reach', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const a = orbitShape('cinder', seed);
      expect(orbitShape('cinder', seed)).toEqual(a);
      expect(a.radius).toBeGreaterThanOrEqual(19800);
      expect(a.radius).toBeLessThanOrEqual(23760);
      const t = surveyTime('cinder', seed);
      expect(t).toBeGreaterThanOrEqual(336);
      expect(t).toBeLessThanOrEqual(504);
      expect(t).toBeGreaterThan(BODIES.moon.surveySeconds);
    }
    expect(orbitShape('cinder', 5)).not.toEqual(orbitShape('cinder', 6));
  });

  it('a seeded world puts Cinder and its debris belt together, and the planets stay fixed', () => {
    const w = createWorld(99);
    const c = planetAt('cinder', w.system);
    const rocks = w.asteroids.filter(r => r.belt === 'cinderDebris');
    expect(rocks).toHaveLength(4);
    for (const r of rocks) expect(Math.hypot(r.position.x - c.position.x, r.position.y - c.position.y)).toBeLessThan(c.radius + 300);
    expect(planetAt('home', w.system)).toEqual(planetAt('home', { time: 0, binary: true }));
    expect(planetAt('cinder', createWorld(0).system).position).not.toEqual(c.position);
  });
});
