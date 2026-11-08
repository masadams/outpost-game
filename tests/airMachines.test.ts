import { describe, expect, it } from 'vitest';
import { createWorld, type WorldState } from '../src/sim/world';
import { stepColony } from '../src/sim/colony';
import { completedBuilding } from '../src/sim/construction';
import { STEP, WORLD } from '../src/sim/config';
import { ANTENNA, CONDENSER, condenserSeconds, watchBoost } from '../src/sim/airMachines';
import { colonyWorld } from '../src/sim/localWorld';
import { blueprintRevealed } from '../src/sim/unlocks';

const run = (w: WorldState, s: number) => { for (let i = 0; i < Math.round(s / STEP); i++) stepColony(w, STEP); };

function powered() {
  const w = createWorld();
  w.colony.buildings.push(completedBuilding(1, 'solar', 0.12, w), completedBuilding(2, 'solar', 0.15, w), completedBuilding(3, 'battery', 0.2, w));
  w.colony.nextId = 10;
  w.colony.energy = 20;
  return w;
}

describe('air condenser', () => {
  it('makes a little water and oxygen from Selene air with nothing mined', () => {
    const w = powered();
    w.colony.buildings.push(completedBuilding(5, 'condenser', 0.25, w));
    const water = w.colony.products.water;
    const oxygen = w.colony.products.oxygen;
    run(w, CONDENSER.seconds + 1);
    expect(w.colony.products.water - water).toBeCloseTo(CONDENSER.output.water, 6);
    expect(w.colony.products.oxygen - oxygen).toBeCloseTo(CONDENSER.output.oxygen, 6);
    expect(w.colony.buildings[3].status).toBe('running');
  });

  it('is slower in thin air and stops where there is none', () => {
    const w = powered();
    expect(condenserSeconds(w)).toBeCloseTo(CONDENSER.seconds, 6);
    const nacre = colonyWorld(w, 'moon');
    expect(condenserSeconds(nacre)).toBeNull();
    nacre.colony.buildings.push(completedBuilding(1001, 'condenser', 0.25, nacre));
    nacre.colony.energy = 20;
    run(nacre, 3);
    expect(nacre.colony.buildings[0].status).toBe('no feedstock');
    const ember = colonyWorld(createWorld(2), 'ember');
    expect(condenserSeconds(ember)!).toBeGreaterThan(CONDENSER.seconds * 5);
  });
});

describe('comms antenna', () => {
  it('speeds the Observatory up, up to two antennas, and nothing without power', () => {
    const w = powered();
    expect(watchBoost(w)).toBe(1);
    w.colony.buildings.push(completedBuilding(5, 'antenna', 0.25, w), completedBuilding(6, 'antenna', 0.3, w), completedBuilding(7, 'antenna', 0.35, w));
    run(w, 2);
    expect(watchBoost(w)).toBeCloseTo(1 + 2 * ANTENNA.boost, 6);
    w.colony.energy = 0;
    w.colony.buildings.filter(b => b.kind === 'solar').forEach(b => { b.enabled = false; });
    run(w, 3);
    expect(watchBoost(w)).toBe(1);
  });

  it('is earned with an Observatory; the condenser after the first industry', () => {
    const w = createWorld();
    expect(blueprintRevealed(w, 'antenna')).toBe(false);
    expect(blueprintRevealed(w, 'condenser')).toBe(false);
    w.objectives.completed.push('industry');
    expect(blueprintRevealed(w, 'condenser')).toBe(true);
    w.colony.buildings.push(completedBuilding(9, 'observatory', 0.25, w));
    expect(blueprintRevealed(w, 'antenna')).toBe(true);
  });
});

describe('antenna and the Observatory together', () => {
  it('a running antenna makes the Observatory log watch time faster', () => {
    const plain = powered();
    plain.colony.buildings.push(completedBuilding(5, 'observatory', 0.25, plain));
    run(plain, 20);
    const boosted = powered();
    boosted.colony.buildings.push(completedBuilding(5, 'observatory', 0.25, boosted), completedBuilding(6, 'antenna', 0.3, boosted));
    run(boosted, 20);
    expect(plain.exploration.watch).toBeGreaterThan(5);
    expect(boosted.exploration.watch).toBeGreaterThan(plain.exploration.watch * 1.3);
  });
});

import { equipmentError, shopError } from '../src/sim/equipment';
import { planetAt, surfacePosition, groundVelocity } from '../src/sim/celestial';

describe('workshop', () => {
  function nacre() {
    const root = createWorld(3);
    root.system.binary = true;
    root.colony.research.completed.push('materials');
    const site = colonyWorld(root, 'moon');
    const moon = planetAt('moon', root.system);
    root.ship.position = surfacePosition(moon, 0, WORLD.shipRadius);
    root.ship.velocity = groundVelocity(moon, root.ship.position);
    root.ship.state = 'landed';
    root.playerMode = 'ship';
    site.colony.products = { ...site.colony.products, alloy: 40, wire: 20, components: 20 };
    site.colony.energy = 30;
    site.colony.research.completed.push('materials');
    return site;
  }

  it('away from home, fitting needs a powered workshop on that world', () => {
    const site = nacre();
    expect(shopError(site)).toMatch(/Workshop/);
    site.colony.buildings.push(completedBuilding(1001, 'solar', 0.2, site), completedBuilding(1002, 'workshop', 0.3, site), completedBuilding(1003, 'battery', 0.4, site));
    site.colony.energy = 40;
    run(site, 2);
    expect(site.colony.buildings[1].status).toBe('running');
    expect(shopError(site)).toBeNull();
    expect(equipmentError(site, 'cargo', 'install')).toBeNull();
  });

  it('a workshop without power does not count', () => {
    const site = nacre();
    site.colony.energy = 0;
    site.colony.buildings.push(completedBuilding(1002, 'workshop', 0.3, site));
    run(site, 2);
    expect(shopError(site)).toMatch(/Workshop/);
  });

  it('is earned once there is a base on another world', () => {
    const w = createWorld();
    expect(blueprintRevealed(w, 'workshop')).toBe(false);
    colonyWorld(w, 'moon').colony.buildings.push(completedBuilding(1001, 'solar', 0.2, colonyWorld(w, 'moon')));
    expect(blueprintRevealed(w, 'workshop')).toBe(true);
  });
});

import { encodeCheckpoint } from '../src/persistence/checkpoint';

describe('long cycles can be saved', () => {
  it('a condenser and a drone bay part-way through their cycles do not make the game unsaveable', () => {
    const w = powered();
    w.colony.products.fuel = 10;
    w.colony.buildings.push(completedBuilding(5, 'condenser', 0.25, w), completedBuilding(6, 'droneBay', 0.3, w));
    run(w, 6);
    expect(w.colony.buildings.find(b => b.kind === 'condenser')!.progress).toBeGreaterThan(3);
    expect(() => encodeCheckpoint(w)).not.toThrow();
  });
});
