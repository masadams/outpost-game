import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { WORLD } from '../src/sim/config';
import { SUIT } from '../src/sim/astronaut';
import { planetAt, surfacePosition } from '../src/sim/celestial';
import { flightView, measure } from '../src/ui/flight/flightView';

function approaching() {
  const w = createWorld();
  w.asteroids = [];
  w.ship.state = 'flying';
  w.ship.position.y = -WORLD.radius - WORLD.shipRadius - 80;
  w.ship.velocity = { x: 6, y: 20 };
  w.ship.angle = 0.4;
  w.ship.fuel = 10;
  return w;
}

describe('flight view', () => {
  it('shows the landed lander with three bars, an attitude dial and three readouts', () => {
    const view = flightView(createWorld());
    expect(view.mode).toBe('ship');
    expect(view.title).toBe('LANDED · SELENE');
    expect(view.bars.map(b => b.key)).toEqual(['fuel', 'hull', 'cargo']);
    expect(view.readouts.map(r => r.key)).toEqual(['altitude', 'radial', 'drift']);
    expect(view.attitude).not.toBeNull();
    expect(view.attitude!.motion).toBeNull();
    expect(view.limits).toEqual([]);
    expect(view.bars[0]).toMatchObject({ value: '100', unit: '%', fraction: 1 });
  });

  it('adds touchdown limits and cautions on a fast, tilted approach', () => {
    const view = flightView(approaching());
    expect(view.title).toMatch(/^LANDING/);
    expect(view.limits.map(l => l.key)).toEqual(['radial', 'drift', 'tilt']);
    expect(view.limits[0]).toMatchObject({ label: 'Descent', max: `${WORLD.safeRadialSpeed}` });
    expect(view.limits.find(l => l.key === 'radial')!.level).toBe('critical');
    expect(view.cautions.map(c => c.key)).toEqual(expect.arrayContaining(['radial', 'tilt', 'fuel']));
  });

  it('points the motion arrow along the velocity in the local frame', () => {
    const w = approaching();
    // Velocities are relative to Selene, which is itself moving.
    const home = planetAt('home', w.system).velocity;
    // Falling straight down at the top of Selene: motion points away from local up.
    w.ship.velocity = { x: home.x, y: home.y + 10 };
    expect(Math.abs(flightView(w).attitude!.motion!)).toBeCloseTo(180, 5);
    // Drifting right without vertical speed: 90 degrees clockwise.
    w.ship.velocity = { x: home.x + 10, y: home.y };
    expect(flightView(w).attitude!.motion!).toBeCloseTo(90, 5);
  });

  it('reports nose attitude clockwise from local up', () => {
    const w = approaching();
    w.ship.angle = 0.2;
    expect(flightView(w).attitude!.nose).toBeCloseTo(0.2 * 180 / Math.PI, 3);
  });

  it('switches to suit air and suit integrity on foot', () => {
    const w = createWorld();
    w.playerMode = 'astronaut';
    w.astronaut.position = surfacePosition(planetAt('home', w.system), 0, SUIT.radius);
    w.astronaut.oxygen = 20;
    const view = flightView(w);
    expect(view.mode).toBe('crew');
    expect(view.title).toMatch(/^EVA · SELENE/);
    expect(view.bars.map(b => b.key)).toEqual(['oxygen', 'suit']);
    expect(view.readouts.map(r => r.key)).toEqual(['altitude', 'speed']);
    expect(view.attitude).toBeNull();
    expect(view.bars[0].level).toBe('critical');
  });

  it('formats signed values and switches to kilometres', () => {
    expect(measure({ value: -3.24, unit: 'm/s', digits: 1, min: -10 })).toEqual({ value: '−3.2', unit: 'm/s' });
    expect(measure({ value: 3.24, unit: 'm/s', digits: 1, min: -10 })).toEqual({ value: '+3.2', unit: 'm/s' });
    expect(measure({ value: 0.01, unit: 'm/s', digits: 1, min: -10 })).toEqual({ value: '0.0', unit: 'm/s' });
    expect(measure({ value: 1520, unit: 'm', digits: 0, min: 0 })).toEqual({ value: '1.5', unit: 'km' });
  });
});
