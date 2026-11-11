import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { BODIES, planetAt, surfacePosition, type BodyId } from '../src/sim/celestial';
import { colonyWorld } from '../src/sim/localWorld';
import { seasOf } from '../src/sim/nature';
import { WEATHER, flooded, stepWeather, weatherChip, weatherOn, weatherSolar } from '../src/sim/weather';
import { completedBuilding } from '../src/sim/construction';
import { generatorOutput } from '../src/sim/generators';

/** Moves the clock to the first moment a world's weather is at the given strength band. */
function timeWhen(w: ReturnType<typeof createWorld>, body: BodyId, test: (strength: number, startsIn: number) => boolean) {
  for (let t = 0; t < 2000; t += 0.5) {
    w.system.time = t;
    const now = weatherOn(w, body)!;
    if (test(now.strength, now.startsIn)) return t;
  }
  throw new Error('never');
}

describe('weather on the far worlds', () => {
  it('keeps the same rhythm for a seed, on for its length once every period', () => {
    const w = createWorld(4242);
    const spec = WEATHER.ember!;
    let on = 0;
    for (let t = 0; t < spec.period; t += 1) {
      w.system.time = t;
      if (weatherOn(w, 'ember')!.strength > 0) on += 1;
    }
    expect(on).toBeGreaterThanOrEqual(spec.length - 2);
    expect(on).toBeLessThanOrEqual(spec.length + 1);
    const again = createWorld(4242);
    again.system.time = w.system.time = 333;
    expect(weatherOn(again, 'ember')).toEqual(weatherOn(w, 'ember'));
    expect(weatherOn(w, 'home')).toBeNull();
  });

  it('dims solar on Ember in a dust storm, and leaves Selene alone', () => {
    const w = createWorld(4242);
    timeWhen(w, 'ember', s => s >= 1);
    const ember = colonyWorld(w, 'ember');
    expect(weatherSolar(ember)).toBeCloseTo(WEATHER.ember!.solar);
    expect(weatherSolar(w)).toBe(1);
    timeWhen(w, 'ember', s => s === 0);
    expect(weatherSolar(colonyWorld(w, 'ember'))).toBe(1);
  });

  it('floods the shore on Tide at high water and never the pad, and stops power made there', () => {
    const w = createWorld(4242);
    const tide = colonyWorld(w, 'tide');
    const sea = seasOf('tide', w.seed ?? 0)[0];
    const shore = sea.angle + sea.half + 30 / BODIES.tide.radius;
    timeWhen(w, 'tide', s => s >= 1);
    expect(flooded(tide, shore)).toBe(true);
    expect(flooded(tide, 0)).toBe(false);
    const solar = completedBuilding(2001, 'solar', shore, tide);
    expect(generatorOutput(tide, solar)).toBe(0);
    timeWhen(w, 'tide', s => s === 0);
    expect(flooded(tide, shore)).toBe(false);
  });

  it('warns before it comes, says when it arrives, and stays quiet on load', () => {
    const w = createWorld(4242);
    w.ship.position = surfacePosition(planetAt('ember', w.system), 0, 300);
    w.ship.state = 'flying';
    const lead = WEATHER.ember!.lead;
    const warn = timeWhen(w, 'ember', (s, startsIn) => s === 0 && startsIn > lead && startsIn < lead + 5);
    w.system.time = warn;
    w.ship.position = surfacePosition(planetAt('ember', w.system), 0, 300);
    w.notice = { message: '', time: 0 };
    stepWeather(w);
    expect(w.notice.message).toBe('');
    w.system.time = warn + 6;
    w.ship.position = surfacePosition(planetAt('ember', w.system), 0, 300);
    stepWeather(w);
    expect(w.notice.message).toMatch(/^DUST STORM ON EMBER IN \d+ S/);
    expect(weatherChip(w)).toMatchObject({ label: 'Dust storm', active: false });
    w.system.time = warn + lead + 10;
    w.ship.position = surfacePosition(planetAt('ember', w.system), 0, 300);
    stepWeather(w);
    expect(w.notice.message).toMatch(/^DUST STORM ON EMBER · PANELS DIM/);
    expect(weatherChip(w)).toMatchObject({ label: 'Dust storm', active: true });
  });
});
