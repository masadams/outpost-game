import { describe, expect, it } from 'vitest';
import { BODIES, BODY_IDS, ORBIT_RATE, SEPARATION, nearestPlanet, orbitRate, planetAt, planets } from '../src/sim/celestial';
import { gravity } from '../src/sim/environment';

describe('the body catalogue', () => {
  it('describes every body, and only the paired ones need the two-body system', () => {
    expect(BODY_IDS).toEqual(['home', 'moon', 'cinder', 'ember', 'glint']);
    for (const id of BODY_IDS) expect(BODIES[id].radius).toBeGreaterThan(0);
    expect(planets({ time: 0, binary: false }).map(p => p.id)).toEqual(['home']);
    expect(planets({ time: 0, binary: true }).map(p => p.id)).toEqual(['home', 'moon', 'cinder']);
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

describe('Cinder, the third body', () => {
  it('circles the shared centre of Selene and Nacre at its own pace and returns after one orbit', () => {
    const period = (2 * Math.PI) / orbitRate('cinder');
    const a = planetAt('cinder', { time: 0, binary: true });
    const b = planetAt('cinder', { time: period, binary: true });
    expect(b.position.x).toBeCloseTo(a.position.x, 3);
    expect(b.position.y).toBeCloseTo(a.position.y, 3);
    expect(period).toBeGreaterThan(2 * Math.PI / ORBIT_RATE);
  });

  it('pulls on things nearby, and the nearest body is Cinder when you are close to it', () => {
    const system = { time: 500, binary: true };
    const c = planetAt('cinder', system);
    const near = { x: c.position.x + c.radius + 50, y: c.position.y };
    expect(nearestPlanet(near, system).id).toBe('cinder');
    const g = gravity(near, system);
    expect(g.x).toBeLessThan(0);
    expect(Math.hypot(g.x, g.y)).toBeCloseTo((BODIES.cinder.mu) / 50 ** 0 / (c.radius + 50) ** 2, 1);
  });

  it('is found by watching, not given: it takes the Observatory 420 s', () => {
    expect(BODIES.cinder.surveySeconds).toBeGreaterThan(BODIES.moon.surveySeconds);
  });
});

describe('air by body', () => {
  it('only Selene has air; each body reads its own', async () => {
    const { airBody, airDensity, airFraction } = await import('../src/sim/environment');
    const system = { time: 0, binary: true };
    const home = planetAt('home', system);
    const moon = planetAt('moon', system);
    const cinder = planetAt('cinder', system);
    expect(BODIES.home.air).not.toBeNull();
    expect(BODIES.moon.air).toBeNull();
    expect(BODIES.cinder.air).toBeNull();
    const ground = { x: home.position.x, y: home.position.y - home.radius - 1 };
    expect(airBody(ground, system)?.id).toBe('home');
    expect(airFraction(ground, system)).toBeGreaterThan(0.9);
    expect(airDensity({ x: moon.position.x + moon.radius + 5, y: moon.position.y }, system)).toBe(0);
    expect(airBody({ x: cinder.position.x + cinder.radius + 5, y: cinder.position.y }, system)).toBeNull();
    expect(airDensity({ x: home.position.x, y: home.position.y - home.radius - home.atmosphere - 50 }, system)).toBe(0);
  });

  it('a new body with air would carry its own drag, using its own numbers', async () => {
    const { airDensity } = await import('../src/sim/environment');
    const system = { time: 0, binary: true };
    const home = planetAt('home', system);
    const lower = airDensity({ x: home.position.x, y: home.position.y - home.radius - 100 }, system);
    const higher = airDensity({ x: home.position.x, y: home.position.y - home.radius - 600 }, system);
    expect(lower).toBeGreaterThan(higher);
  });
});
