import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { linkedBuildings, LINK_RANGE, RELAY_RANGE } from '../src/sim/grid';
import { completedBuilding } from '../src/sim/construction';
import { WORLD } from '../src/sim/config';

const metres = (m: number) => m / WORLD.radius;

function base() {
  const w = createWorld();
  w.system.sun = true;
  w.colony.buildings = [];
  return w;
}

describe('power links', () => {
  it('everything is one grid when the day cycle is off', () => {
    const w = createWorld();
    w.colony.buildings.push(completedBuilding(1, 'solar', 2, w));
    expect(linkedBuildings(w)).toBeNull();
  });

  it('a building joins by being near the pad or near one that has joined', () => {
    const w = base();
    const near = completedBuilding(1, 'solar', metres(100), w);
    const chain = completedBuilding(2, 'battery', metres(100 + LINK_RANGE - 10), w);
    const far = completedBuilding(3, 'refinery', metres(900), w);
    w.colony.buildings.push(near, chain, far);
    const linked = linkedBuildings(w)!;
    expect(linked.has(1)).toBe(true);
    expect(linked.has(2)).toBe(true);
    expect(linked.has(3)).toBe(false);
  });

  it('a relay carries the link much farther', () => {
    const w = base();
    const relay = completedBuilding(1, 'relay', metres(RELAY_RANGE - 20), w);
    const field = completedBuilding(2, 'solar', metres(RELAY_RANGE + 400), w);
    w.colony.buildings.push(relay, field);
    expect(linkedBuildings(w)!.has(1)).toBe(true);
    expect(linkedBuildings(w)!.has(2)).toBe(true);
  });

  it('a far solar field gives nothing until it is wired, and an unwired machine says why', () => {
    const w = base();
    const field = completedBuilding(1, 'solar', metres(2000), w);
    const lab = completedBuilding(2, 'observatory', metres(1800), w);
    w.colony.buildings.push(field, lab);
    stepWorld(w, { thrust: false, turn: 0 }, 0.25);
    expect(w.colony.generation).toBe(0);
    expect(lab.status).toBe('no power');
    expect(lab.linked).toBe(false);
    w.colony.buildings.push(completedBuilding(3, 'relay', metres(500), w), completedBuilding(4, 'relay', metres(1100), w), completedBuilding(5, 'relay', metres(1700), w));
    stepWorld(w, { thrust: false, turn: 0 }, 0.25);
    expect(lab.linked).toBeUndefined();
  });
});
