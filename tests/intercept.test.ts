import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { beltAfter, interceptBelt } from '../src/sim/intercept';
import { planetAt } from '../src/sim/celestial';
import { destination } from '../src/sim/exploration';
import { mapView } from '../src/ui/map/mapView';

describe('aiming ahead', () => {
  it('a belt comes back to the same spot around its body after one orbit', () => {
    const w = createWorld();
    const start = destination(w, 'copper').position;
    const body = planetAt('home', w.system);
    const rel = { x: start.x - body.position.x, y: start.y - body.position.y };
    const r = Math.hypot(rel.x, rel.y);
    const period = (2 * Math.PI) / Math.sqrt(body.mu / r ** 3);
    const back = beltAfter(w, 'copper', period).position;
    const bodyThen = planetAt('home', { ...w.system, time: w.system.time + period });
    expect(back.x - bodyThen.position.x).toBeCloseTo(rel.x, 3);
    expect(back.y - bodyThen.position.y).toBeCloseTo(rel.y, 3);
  });

  it('the aim point settles, and is not where the belt is now', () => {
    const w = createWorld();
    const now = destination(w, 'frost').position;
    const aim = interceptBelt(w, 'frost', { x: 0, y: -1800 }, 110);
    expect(aim.seconds).toBeGreaterThan(5);
    const again = interceptBelt(w, 'frost', { x: 0, y: -1800 }, 110);
    expect(again.position.x).toBeCloseTo(aim.position.x, 6);
    expect(Math.hypot(aim.position.x - now.x, aim.position.y - now.y)).toBeGreaterThan(50);
  });

  it('the Map shows the aim point for a selected belt only', () => {
    const w = createWorld();
    w.exploration.selected = 'home';
    expect(mapView(w).intercept).toBeNull();
    w.exploration.selected = 'copper';
    expect(mapView(w).intercept?.seconds).toBeGreaterThan(0);
  });
});
