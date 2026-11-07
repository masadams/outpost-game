import { describe, expect, it } from 'vitest';
import { BODY_IDS, bodyExists, planets } from '../src/sim/celestial';

const day = (seed: number) => ({ time: 0, binary: true, sun: true, seed });

describe('optional world Ember', () => {
  it('is never in the standard layout', () => {
    expect(bodyExists('ember', { time: 0, binary: true })).toBe(false);
    expect(planets({ time: 0, binary: true }).some(p => p.id === 'ember')).toBe(false);
  });
  it('is in some seeds and not others, the same way every time', () => {
    const seeds = Array.from({ length: 60 }, (_, i) => i + 1);
    const has = seeds.filter(s => bodyExists('ember', day(s)));
    expect(has.length).toBeGreaterThan(10);
    expect(has.length).toBeLessThan(55);
    expect(seeds.filter(s => bodyExists('ember', day(s)))).toEqual(has);
  });
  it('shows up in the planet list only where it exists', () => {
    const withIt = Array.from({ length: 60 }, (_, i) => i + 1).find(s => bodyExists('ember', day(s)))!;
    expect(planets(day(withIt)).map(p => p.id)).toContain('ember');
  });
  it('always keeps the three standard worlds', () => {
    for (const id of BODY_IDS.filter(i => i !== 'ember' && i !== 'glint')) expect(bodyExists(id, day(7))).toBe(true);
  });
});

import { createWorld } from '../src/sim/world';
import { tripFuel } from '../src/sim/tripFuel';
import { WORLD } from '../src/sim/config';
import { planetAt } from '../src/sim/celestial';
import { POD } from '../src/sim/pods';

describe('Ember is far but possible', () => {
  const seeds = Array.from({ length: 200 }, (_, i) => i + 1).filter(s => bodyExists('ember', day(s)));

  it('costs the ship little more fuel than Cinder, and fits in the tank', () => {
    for (const seed of seeds.slice(0, 12)) {
      const w = createWorld(seed);
      w.system.sun = true;
      w.system.binary = true;
      const ember = tripFuel(w, 'ember').kg;
      const cinder = tripFuel(w, 'cinder').kg;
      expect(ember).toBeLessThan(cinder * 1.6);
      expect(ember).toBeLessThan(WORLD.fuelCapacity ?? Infinity);
    }
  });

  it('a pod crosses to it in well under half an hour, even at the farthest', () => {
    for (const seed of seeds.slice(0, 12)) {
      const sys = { ...day(seed) };
      for (const t of [0, 400, 900, 1800, 3600]) {
        const a = planetAt('home', { ...sys, time: t }).position;
        const b = planetAt('ember', { ...sys, time: t }).position;
        expect(Math.hypot(b.x - a.x, b.y - a.y) / POD.speed).toBeLessThan(1800);
      }
    }
  });
});

import { mapView } from '../src/ui/map/mapView';

describe('Ember on the Map', () => {
  const find = (has: boolean) => Array.from({ length: 200 }, (_, i) => i + 1).find(s => bodyExists('ember', day(s)) === has)!;

  it('is listed as a route once surveyed, in a seed that has it', () => {
    const w = createWorld(find(true));
    w.system.sun = true;
    w.system.binary = true;
    w.exploration.known.push('moon', 'cinder', 'ember');
    const ids = mapView(w).places.map(p => p.id);
    expect(ids).toContain('ember');
    expect(mapView(w).places.find(p => p.id === 'ember')?.label).toBe('Ember');
  });

  it('never appears in a seed without it, even if marked known', () => {
    const w = createWorld(find(false));
    w.system.sun = true;
    w.system.binary = true;
    w.exploration.known.push('moon', 'cinder', 'ember');
    expect(mapView(w).places.map(p => p.id)).not.toContain('ember');
  });
});

describe('optional world Glint', () => {
  const seeds = Array.from({ length: 200 }, (_, i) => i + 1);
  it('is never in the standard layout and is in some seeds', () => {
    expect(bodyExists('glint', { time: 0, binary: true })).toBe(false);
    const has = seeds.filter(s => bodyExists('glint', day(s)));
    expect(has.length).toBeGreaterThan(40);
    expect(has.length).toBeLessThan(120);
  });

  it('is farther than Ember and takes longer to find', async () => {
    const { BODIES } = await import('../src/sim/celestial');
    expect(BODIES.glint.surveySeconds).toBeGreaterThan(BODIES.ember.surveySeconds);
    const seed = seeds.find(s => bodyExists('glint', day(s)))!;
    const a = planetAt('home', day(seed)).position;
    const b = planetAt('glint', day(seed)).position;
    expect(Math.hypot(b.x - a.x, b.y - a.y) / POD.speed).toBeLessThan(2400);
  });
});
