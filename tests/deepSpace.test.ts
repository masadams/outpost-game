import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { BODY_IDS, planetAt } from '../src/sim/celestial';
import { DEEP, DEEP_IDS, FIND_RANGE, deepFound, deepPointer, deepPosition, validDeep } from '../src/sim/deepSpace';
import { hasMemory, stepStory } from '../src/sim/story';
import { mapView } from '../src/ui/map/mapView';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';

function flyingAt(x: number, y: number) {
  const w = createWorld(4242);
  w.system.sun = true;
  w.asteroids = [];
  stepStory(w);
  w.ship.state = 'flying';
  w.ship.position = { x, y };
  w.ship.velocity = { x: 0, y: 0 };
  return w;
}

describe('deep space', () => {
  it('lies far beyond every world, the same place every time', () => {
    for (const seed of [1, 7, 4242]) {
      for (const id of DEEP_IDS) {
        const at = deepPosition(id, seed);
        expect(Math.hypot(at.x, at.y)).toBeGreaterThan(90_000);
        expect(deepPosition(id, seed)).toEqual(at);
        for (const body of BODY_IDS) {
          const p = planetAt(body, { time: 0, binary: true, sun: true, seed });
          expect(Math.hypot(p.position.x - at.x, p.position.y - at.y), `${id} vs ${body}`).toBeGreaterThan(15_000);
        }
      }
    }
  });

  it('is found by flying close, gives up its salvage once, and is remembered', () => {
    const at = deepPosition('hulk', 4242);
    const w = flyingAt(at.x + FIND_RANGE * 0.5, at.y);
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(deepFound(w)).toEqual(['hulk']);
    expect(w.ship.freight.alloy).toBe(DEEP.hulk.salvage!.alloy);
    expect(w.notice.message).toContain('CARRIER HULK');
    stepStory(w);
    expect(hasMemory(w, 'deep-hulk')).toBe(true);
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.ship.freight.alloy).toBe(DEEP.hulk.salvage!.alloy);
    expect(decodeCheckpoint(encodeCheckpoint(w)).exploration.deep).toEqual(['hulk']);
  });

  it('points the way once you are far out, and not from home', () => {
    const home = createWorld(4242);
    home.system.sun = true;
    expect(deepPointer(home)).toBeNull();
    const at = deepPosition('comet', 4242);
    const w = flyingAt(at.x + 20_000, at.y);
    expect(deepPointer(w)).toEqual(at);
  });

  it('shows on the Map only once found or heard', () => {
    const w = flyingAt(0, 0);
    expect(mapView(w).deep).toEqual([]);
    w.exploration.deep = ['marker'];
    expect(mapView(w).deep.map(d => d.label)).toEqual([expect.stringContaining('Makers’ marker'.replace('’', "'"))]);
    w.exploration.story!.memories.push('makersRelay');
    expect(mapView(w).deep).toHaveLength(DEEP_IDS.length);
    expect(validDeep(['hulk', 'hulk'])).toBe(false);
  });
});
