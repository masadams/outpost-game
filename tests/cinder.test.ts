import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { groundVelocity, nearestPlanet, planetAt, surfacePosition } from '../src/sim/celestial';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { completedBuilding } from '../src/sim/construction';
import { colonyWorld } from '../src/sim/localWorld';
import { mapView } from '../src/ui/map/mapView';
import { setFeatureMode } from '../src/preferences/features';

describe('Cinder in play', () => {
  it('can be landed on, and it has its own outpost', () => {
    const w = createWorld();
    const cinder = planetAt('cinder', w.system);
    w.ship.position = surfacePosition(cinder, 0.3, 40);
    w.ship.velocity = { ...groundVelocity(cinder, w.ship.position) };
    w.ship.state = 'flying';
    for (let i = 0; i < 3000 && w.ship.state === 'flying'; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.05);
    expect(nearestPlanet(w.ship.position, w.system).id).toBe('cinder');
    expect(['landed', 'crashed']).toContain(w.ship.state);
    expect(w.outposts.cinder.colony.nextId).toBe(2001);
    expect(colonyWorld(w, 'cinder').siteBody).toBe('cinder');
  });

  it('is found by the Observatory after long watching, then shows on the Map', () => {
    setFeatureMode('focus');
    const w = createWorld();
    w.colony.buildings.push(completedBuilding(1, 'observatory', 0.1, w), completedBuilding(2, 'solar', -0.1, w));
    w.colony.energy = 500;
    expect(mapView(w).bodies.map(b => b.id)).toEqual(['home']);
    for (let i = 0; i < 4 * 460; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.25);
    expect(w.exploration.known).toEqual(['moon', 'cinder']);
    expect(mapView(w).bodies.map(b => b.id)).toEqual(['home', 'moon', 'cinder']);
    expect(mapView(w).places.map(p => p.id)).toContain('cinder');
    setFeatureMode(null);
  });

  it('survives a save and load', () => {
    const w = createWorld();
    w.exploration.known.push('moon', 'cinder');
    w.outposts.cinder.colony.products.alloy = 7;
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.known).toEqual(['moon', 'cinder']);
    expect(loaded.outposts.cinder.colony.products.alloy).toBe(7);
  });
});

describe('belts as data', () => {
  it('the Cinder debris circles Cinder, close to it, and moves with it', () => {
    const w = createWorld();
    const rocks = w.asteroids.filter(r => r.belt === 'cinderDebris');
    expect(rocks).toHaveLength(4);
    for (const rock of rocks) {
      const c = planetAt('cinder', w.system);
      const d = Math.hypot(rock.position.x - c.position.x, rock.position.y - c.position.y);
      expect(d).toBeGreaterThan(c.radius);
      expect(d).toBeLessThan(c.radius + 300);
    }
    for (let i = 0; i < 1200; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.25);
    const c = planetAt('cinder', w.system);
    for (const rock of w.asteroids.filter(r => r.belt === 'cinderDebris')) {
      expect(Math.hypot(rock.position.x - c.position.x, rock.position.y - c.position.y)).toBeLessThan(2500);
    }
  });

  it('stays off the chart until Cinder is found', () => {
    setFeatureMode('focus');
    const w = createWorld();
    expect(mapView(w).places.map(p => p.id)).not.toContain('cinderDebris');
    w.exploration.known.push('cinder');
    expect(mapView(w).places.map(p => p.id)).toContain('cinderDebris');
    setFeatureMode(null);
  });

  it('can be reached by a probe once Cinder is found, aiming ahead of its orbit', async () => {
    const { probeError, launchProbe } = await import('../src/sim/probes');
    const w = createWorld();
    w.exploration.selected = 'cinderDebris';
    w.colony.products.alloy = 9;
    w.colony.products.wire = 9;
    w.colony.products.components = 9;
    expect(probeError(w)).toBe('Pick a belt or mark a point on the Map.');
    w.exploration.known.push('cinder');
    expect(probeError(w)).toBeNull();
    launchProbe(w);
    for (let i = 0; i < 9000 && w.exploration.probes.length > 0; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.1);
    expect(w.exploration.surveyed).toContain('cinderDebris');
  });
});
