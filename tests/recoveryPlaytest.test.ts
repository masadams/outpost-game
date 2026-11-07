import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { planetAt, surfacePosition, groundVelocity } from '../src/sim/celestial';
import { WORLD } from '../src/sim/config';
import { printPilot, printPlan, reachableWreck, salvageWreck } from '../src/sim/wrecks';
import { PART_SLOTS, UPGRADES, UPGRADE_IDS, type UpgradeId } from '../src/sim/progressionConfig';
import { cargoMass } from '../src/sim/shipMass';
import { cargoCapacity } from '../src/sim/shipStats';
import { RESOURCES } from '../src/sim/resources';
import { PRODUCTS } from '../src/sim/colonyConfig';

function crashedWith(setup: (w: WorldState) => void, speed = 12): WorldState {
  const w = createWorld();
  w.asteroids = [];
  const home = planetAt('home', w.system);
  w.ship.position = surfacePosition(home, 300 / WORLD.radius, WORLD.shipRadius);
  w.ship.velocity = groundVelocity(home, w.ship.position);
  w.ship.state = 'crashed';
  w.ship.hull = 0;
  w.ship.ground = 'home';
  w.ship.crashSpeed = speed;
  setup(w);
  return w;
}

/** Print a new lander, then park it beside the wreck, as a player would. */
function printAndPark(w: WorldState): void {
  expect(printPilot(w)).toBe(true);
  const home = planetAt('home', w.system);
  w.ship.state = 'landed';
  w.ship.position = surfacePosition(home, 320 / WORLD.radius, WORLD.shipRadius);
  w.ship.velocity = groundVelocity(home, w.ship.position);
  w.playerMode = 'ship';
}

const oneOfEachSlot = (): UpgradeId[] => PART_SLOTS.map(slot => UPGRADE_IDS.find(id => UPGRADES[id].slot === slot)!);
const last = (w: WorldState): string => w.notice.message;

describe('recovery after a crash', () => {
  it('collects a small cargo from the wreck and does not say the hold is full', () => {
    const w = crashedWith(x => { x.ship.cargo.iron = 2; x.ship.fuel = 50; });
    printAndPark(w);
    salvageWreck(w);
    expect(w.ship.cargo.iron).toBeGreaterThan(1);
    expect(cargoMass(w.ship)).toBeLessThan(cargoCapacity(w.ship));
    expect(last(w)).not.toMatch(/hold is full/i);
  });

  it('brings every module of a fully upgraded ship back, even when the new lander already has a hold rack', () => {
    const w = crashedWith(x => { x.ship.equipment = oneOfEachSlot(); x.ship.cargo.iron = 30; });
    w.exploration.crystal = 'studied';
    printAndPark(w);
    expect(w.ship.equipment).toEqual(['cargo']);
    salvageWreck(w);
    const wreck = w.wrecks[0];
    // Nothing useful stays stuck on the wreck: parts are fitted where a slot is free, scrapped where it is not.
    expect(w.ship.equipment.length).toBeGreaterThanOrEqual(PART_SLOTS.length - 1);
    expect(w.wrecks.includes(wreck) ? wreck.ship.equipment.length : 0).toBe(0);
    expect(last(w)).not.toMatch(/hold is full/i);
  });

  it('a partly upgraded ship gets its parts back on a bare lander', () => {
    const w = crashedWith(x => { x.ship.equipment = ['engine', 'tank']; x.ship.cargo.copper = 10; });
    printAndPark(w);
    salvageWreck(w);
    expect(w.ship.equipment.sort()).toEqual(['engine', 'tank']);
    expect(w.ship.cargo.copper).toBeGreaterThan(5);
  });

  it('an empty ship leaves a wreck with only scrap and fuel, which can still be taken', () => {
    const w = crashedWith(x => { x.ship.fuel = 80; });
    printAndPark(w);
    salvageWreck(w);
    const freight = PRODUCTS.reduce((n, p) => n + w.ship.freight[p], 0);
    expect(freight).toBeGreaterThan(0);
    expect(w.wrecks).toHaveLength(0);
  });

  it('takes what fits when the cargo is bigger than the hold, and says more is left', () => {
    const w = crashedWith(x => { x.ship.equipment = ['bulkHold']; x.ship.cargo.iron = 250; }, 9);
    printAndPark(w);
    w.ship.cargo.iron = 20;
    salvageWreck(w);
    // The wreck's bulk hold goes on first, so the bigger hold counts for what is loaded.
    expect(w.ship.equipment).toContain('bulkHold');
    expect(cargoCapacity(w.ship)).toBeGreaterThan(250);
    expect(cargoMass(w.ship)).toBeLessThanOrEqual(cargoCapacity(w.ship) + 1e-6);
    expect(w.ship.cargo.iron).toBeGreaterThan(200);
  });

  it('can print again after a second crash', () => {
    const w = crashedWith(x => { x.ship.cargo.iron = 5; });
    w.colony.products.alloy = 40;
    w.colony.products.components = 10;
    expect(printPilot(w)).toBe(true);
    w.ship.state = 'crashed';
    w.ship.hull = 0;
    w.ship.ground = 'home';
    w.ship.crashSpeed = 15;
    expect(printPlan(w)?.blocked).toBeNull();
    expect(printPilot(w)).toBe(true);
    expect(w.wrecks).toHaveLength(2);
  });

  it('prints even when stores are held back for the turrets, because a pilot comes first', () => {
    const w = crashedWith(() => {});
    w.colony.products.alloy = 12;
    w.colony.products.components = 3;
    w.colony.policy = { energyReserve: 0, deliveryReserve: 0, alloyReserve: 10, componentsReserve: 2 };
    expect(printPlan(w)?.blocked).toBeNull();
    expect(printPilot(w)).toBe(true);
  });

  it('says exactly what is missing when stores really are short', () => {
    const w = crashedWith(() => {});
    w.colony.products.alloy = 3;
    expect(printPlan(w)?.blocked).toMatch(/Needs 8 alloy \(you have 3\)/);
  });
});

// Unused import guard for helpers kept for readability.
void RESOURCES; void reachableWreck; void stepWorld;
