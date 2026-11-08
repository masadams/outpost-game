import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { DRIFT, homeRocks, orbitRock, stepDrift } from '../src/sim/drift';
import { planetAt } from '../src/sim/celestial';
import { WORLD } from '../src/sim/config';

function bare(seed = 9) {
  const w = createWorld(seed);
  w.system.sun = true;
  w.asteroids = w.asteroids.filter(a => a.belt);
  return w;
}
const run = (w: ReturnType<typeof bare>, seconds: number) => {
  for (let i = 0; i < seconds; i++) {
    w.system.time += 1;
    stepDrift(w, 1);
  }
};

describe('rocks drifting in', () => {
  it('bring a new rock every few minutes while the sky is bare, up to a floor', () => {
    const w = bare();
    run(w, DRIFT.every * 3 + 1);
    expect(homeRocks(w)).toBe(3);
    run(w, DRIFT.every * 20);
    expect(homeRocks(w)).toBe(DRIFT.floor);
  });
  it('favour iron', () => {
    const w = bare(21);
    w.asteroids = [];
    let iron = 0;
    let total = 0;
    for (let k = 0; k < 120; k++) {
      run(w, DRIFT.every);
      total += w.asteroids.length;
      iron += w.asteroids.filter(a => a.resource === 'iron').length;
      w.asteroids = [];
    }
    expect(iron / total).toBeGreaterThan(0.25);
  });
  it('never happen in the standard layout', () => {
    const w = createWorld();
    w.system.sun = true;
    w.asteroids = [];
    run(w, DRIFT.every * 5);
    expect(w.asteroids).toHaveLength(0);
  });
  it('place a rock in orbit around home wherever home is', () => {
    const w = bare();
    w.system.time = 1000;
    orbitRock(w, 0.3, 1600, 'iron', 50, 18);
    const rock = w.asteroids[w.asteroids.length - 1];
    const home = planetAt('home', w.system);
    expect(Math.hypot(rock.position.x - home.position.x, rock.position.y - home.position.y)).toBeCloseTo(WORLD.radius + 1600, 3);
  });
});
