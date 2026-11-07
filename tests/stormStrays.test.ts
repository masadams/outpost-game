import { describe, expect, it } from 'vitest';
import { stormFor, STORM_2 } from '../src/sim/stormConfig';
import { planStorm } from '../src/sim/storm';
import { createWorld } from '../src/sim/world';
import { WORLD } from '../src/sim/config';

const withStrays = (wave: number, kind: 'miss' | 'large') =>
  Array.from({ length: 300 }, (_, i) => i + 1).filter(s => stormFor(wave, s).kinds?.includes(kind));

describe('storm strays', () => {
  it('the standard seed and the first storm never have any', () => {
    expect(stormFor(2, 0).aim).toEqual(STORM_2.aim);
    expect(stormFor(2, 0).kinds).toBeUndefined();
    expect(stormFor(1, 5).kinds).toBeUndefined();
  });

  it('other seeds sometimes get misses from the second storm, and a big one from the third', () => {
    expect(withStrays(2, 'miss').length).toBeGreaterThan(80);
    expect(withStrays(2, 'miss').length).toBeLessThan(260);
    expect(withStrays(2, 'large')).toHaveLength(0);
    expect(withStrays(3, 'large').length).toBeGreaterThan(40);
    expect(withStrays(3, 'large').length).toBeLessThan(200);
  });

  it('a miss really passes by the planet', () => {
    const seed = withStrays(2, 'miss')[0];
    const w = createWorld(seed);
    w.storm.wave = 2;
    w.storm.armed = true;
    planStorm(w);
    const config = stormFor(2, seed);
    config.kinds!.forEach((kind, i) => {
      if (kind === 'miss') expect(w.storm.plan[i].impactAngle).toBeNull();
    });
  });

  it('the big one is bigger and tougher, and comes down well away from the base', () => {
    const seed = withStrays(3, 'large')[0];
    const w = createWorld(seed);
    w.storm.wave = 3;
    w.storm.armed = true;
    planStorm(w);
    const config = stormFor(3, seed);
    const i = config.kinds!.indexOf('large');
    expect(config.radii[i]).toBeGreaterThanOrEqual(24);
    expect(config.health[i]).toBeGreaterThan(8);
    const angle = w.storm.plan[i].impactAngle;
    if (angle !== null) {
      const metres = Math.abs(angle - WORLD.padAngle) * WORLD.radius;
      expect(metres).toBeGreaterThan(450);
    }
  });

  it('stays within what a save can hold', () => {
    for (const seed of withStrays(6, 'large').slice(0, 20)) expect(stormFor(6, seed).aim.length).toBeLessThanOrEqual(24);
  });
});

import { stepDefence } from '../src/sim/defence';
import { planetAt } from '../src/sim/celestial';

describe('a body that missed', () => {
  it('leaves for good, so the storm can end', () => {
    const w = createWorld(3);
    const home = planetAt('home', w.system);
    w.defence.meteors.push({
      id: 900, position: { x: home.position.x + 16500, y: home.position.y }, velocity: { x: 90, y: 5 },
      radius: 8, mass: 300, stage: 0, resource: 'iron', health: 3, maxHealth: 3,
    });
    stepDefence(w, false, 0, 1 / 60, { ...w.ship.position });
    expect(w.defence.meteors).toHaveLength(0);
  });

  it('a body still on its way in is kept', () => {
    const w = createWorld(3);
    const home = planetAt('home', w.system);
    w.defence.meteors.push({
      id: 901, position: { x: home.position.x + 16500, y: home.position.y }, velocity: { x: -90, y: 5 },
      radius: 8, mass: 300, stage: 0, resource: 'iron', health: 3, maxHealth: 3,
    });
    stepDefence(w, false, 0, 1 / 60, { ...w.ship.position });
    expect(w.defence.meteors).toHaveLength(1);
  });
});
