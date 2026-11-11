import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { orbitRock } from '../src/sim/drift';
import { TUG, stepTugBay, tugTargets } from '../src/sim/tugBay';
import { blueprintRevealed } from '../src/sim/unlocks';
import { inventoryMass } from '../src/sim/resources';

function base() {
  const w = createWorld(4242);
  w.system.sun = true;
  w.asteroids = [];
  const bay = completedBuilding(1, 'tugBay', 0.1, w);
  w.colony.buildings = [bay];
  w.colony.nextId = 5;
  w.colony.energy = 20;
  w.colony.products.fuel = 20;
  return { w, bay };
}

describe('the tug bay', () => {
  it('waits when nothing circles within reach', () => {
    const { w, bay } = base();
    orbitRock(w, 0, TUG.reach + 500, 'iron', 60, 3);
    expect(tugTargets(w)).toEqual([]);
    stepTugBay(w, bay, 1, 1000);
    expect(bay.status).toBe('no deposit');
  });

  it('flies a round trip, pays its fuel and power, and brings a load of that rock down', () => {
    const { w, bay } = base();
    orbitRock(w, 0, 1500, 'copper', 60, 3);
    const rock = w.asteroids[0];
    const fuel = w.colony.products.fuel;
    for (let t = 0; t < TUG.seconds + 1 && inventoryMass(w.depot) === 0; t += 1) {
      w.colony.energy = 20;
      stepTugBay(w, bay, 1, 1000);
    }
    expect(w.depot.copper).toBeCloseTo(TUG.load, 6);
    expect(rock.mass).toBeCloseTo(60 - TUG.load, 6);
    expect(w.colony.products.fuel).toBeCloseTo(fuel - TUG.fuel, 6);
  });

  it('takes a small rock whole', () => {
    const { w, bay } = base();
    orbitRock(w, 0, 1500, 'iron', TUG.load + 2, 1.5);
    for (let t = 0; t < TUG.seconds + 1; t += 1) {
      w.colony.energy = 20;
      stepTugBay(w, bay, 1, 1000);
    }
    expect(w.asteroids).toHaveLength(0);
    expect(w.depot.iron).toBeCloseTo(TUG.load + 2, 6);
  });

  it('opens once a drone bay stands', () => {
    const { w } = base();
    w.colony.buildings = [];
    expect(blueprintRevealed(w, 'tugBay')).toBe(false);
    w.colony.buildings.push(completedBuilding(2, 'droneBay', 0.2, w));
    expect(blueprintRevealed(w, 'tugBay')).toBe(true);
  });
});
