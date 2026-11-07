import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { colonyWorld } from '../src/sim/localWorld';
import { airCapacity } from '../src/sim/habitats';
import { HABITATS } from '../src/sim/habitatConfig';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';

describe('domes on other worlds', () => {
  it('an upgraded dome holds more air, and the save accepts it', () => {
    const w = createWorld();
    const dome = completedBuilding(1, 'habitatSmall', 0.3, w);
    w.colony.buildings.push(dome);
    w.colony.nextId = 5;
    expect(airCapacity(dome)).toBe(HABITATS.habitatSmall.capacity);
    dome.level = 2;
    expect(airCapacity(dome)).toBeCloseTo(HABITATS.habitatSmall.capacity * 1.5, 9);
    w.colony.research.completed.push('materials', 'extraction', 'logistics', 'infrastructure');
    dome.habitat!.oxygen = airCapacity(dome) * 0.9;
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.colony.buildings[0].habitat?.oxygen).toBeCloseTo(airCapacity(dome) * 0.9, 9);
  });

  it('a powered, supplied dome on Nacre fills with air from Nacre\'s own oxygen and keeps running while you are away', () => {
    const w = createWorld();
    const moon = colonyWorld(w, 'moon');
    moon.colony.nextId = 1010;
    const dome = completedBuilding(1001, 'habitatSmall', 0.3, moon);
    moon.colony.buildings.push(dome, completedBuilding(1002, 'solar', 0.45, moon), completedBuilding(1003, 'battery', 0.6, moon));
    moon.colony.nextId = 1010;
    moon.colony.products.oxygen = 0.8;
    moon.colony.energy = 100;
    for (let i = 0; i < 60 * 8; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(dome.habitat!.oxygen).toBeGreaterThan(0.3);
    expect(moon.colony.products.oxygen).toBeLessThan(0.8);
    expect(w.colony.products.oxygen).toBe(createWorld().colony.products.oxygen);
  });
});
