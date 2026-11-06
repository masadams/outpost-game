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
