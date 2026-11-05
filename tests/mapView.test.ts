import { afterEach, describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { setFeatureMode } from '../src/preferences/features';
import { mapView } from '../src/ui/map/mapView';

afterEach(() => setFeatureMode(null));

describe('map view', () => {
  it('lists home, the ore clusters and the sites, but not Nacre in the focus set', () => {
    setFeatureMode('focus');
    const view = mapView(createWorld());
    expect(view.places.map(p => p.label)).toEqual([
      'Home pad', 'Frost arc', 'Copper shoal', 'Far rim', 'Frost survey buoy', 'Copper derelict', 'Far rim fuel tender',
    ]);
    expect(view.bodies.map(b => b.id)).toEqual(['home']);
    expect(view.places.find(p => p.selected)!.id).toBe('home');
  });

  it('includes Nacre with all features', () => {
    setFeatureMode('all');
    const view = mapView(createWorld());
    expect(view.places.map(p => p.id)).toContain('moon');
    expect(view.bodies.map(b => b.id)).toEqual(['home', 'moon']);
  });

  it('keeps an unsurveyed cluster unknown and reveals it after a survey', () => {
    const w = createWorld();
    w.exploration.selected = 'frost';
    let view = mapView(w);
    expect(view.selected).toMatchObject({ kind: 'Ore cluster', state: 'Not surveyed' });
    expect(view.selected.body).toMatch(/^Unknown until surveyed/);
    w.exploration.surveyed.push('frost');
    view = mapView(w);
    expect(view.selected.state).toBe('Surveyed');
    expect(view.selected.body).toMatch(/ice \d+\.\d kg/);
  });

  it('offers the site action only when in range, with the reason otherwise', () => {
    const w = createWorld();
    w.exploration.selected = 'cache';
    const far = mapView(w).selected.action!;
    expect(far).toMatchObject({ label: 'Recover salvage', enabled: false });
    expect(far.reason).toBe('Fly out to it first.');

    const site = w.exploration.sites.find(s => s.key === 'cache')!;
    w.ship.state = 'flying';
    w.ship.position = { x: site.position.x, y: site.position.y - 80 };
    w.ship.velocity = { ...site.velocity };
    const near = mapView(w).selected;
    expect(near.action!.enabled).toBe(true);
    expect(near.body).toMatch(/salvage \d+\.\d kg/);
    expect(near.facts[0]).toEqual(['Distance', '80 m']);
  });

  it('frames the ship, bodies and sites', () => {
    const w = createWorld();
    const { bounds } = mapView(w);
    for (const p of [w.ship.position, ...w.exploration.sites.map(s => s.position)]) {
      expect(p.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(p.x).toBeLessThanOrEqual(bounds.maxX);
      expect(p.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(p.y).toBeLessThanOrEqual(bounds.maxY);
    }
  });
});
