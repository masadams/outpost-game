import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { groundVelocity, planetAt, surfacePosition } from '../src/sim/celestial';
import { WORLD } from '../src/sim/config';
import { RIG } from '../src/sim/geology';
import { STOCKPILE, loadPiles, pileMass } from '../src/sim/stockpile';
import { inventoryMass } from '../src/sim/resources';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';

const idle = { thrust: false, turn: 0 };
/** A rig on a seam far from the pad, with its own solar array and battery: a separate grid. */
function farMine() {
  const w = createWorld(4242);
  w.system.sun = true;
  w.asteroids = [];
  const seam = w.surfaceDeposits.reduce((far, d) => (Math.abs(d.angle) > Math.abs(far.angle) ? d : far));
  seam.surveyed = true;
  const rig = completedBuilding(1, 'miningRig', seam.angle, w);
  rig.depositId = seam.id;
  rig.boot = 8;
  const solar = completedBuilding(2, 'solar', seam.angle + 25 / WORLD.radius, w);
  const battery = completedBuilding(3, 'battery', seam.angle - 25 / WORLD.radius, w);
  battery.charge = 1000;
  w.colony.buildings = [rig, solar, battery];
  w.colony.nextId = 10;
  return { w, rig, seam };
}

describe('ore from far mines', () => {
  it('piles beside a mine that is off the base grid, instead of appearing in the depot', () => {
    const { w, rig } = farMine();
    for (let i = 0; i < 60 * RIG.seconds * 6; i++) stepWorld(w, idle, 1 / 60);
    expect(rig.linked).toBe(false);
    expect(pileMass(rig)).toBeGreaterThan(0);
    expect(inventoryMass(w.depot)).toBe(0);
    expect(decodeCheckpoint(encodeCheckpoint(w)).colony.buildings.find(b => b.id === rig.id)!.stock).toEqual(rig.stock);
  });

  it('stops when the pile is full', () => {
    const { w, rig, seam } = farMine();
    rig.stock = { [seam.resource]: STOCKPILE };
    for (let i = 0; i < 60 * RIG.seconds * 2; i++) stepWorld(w, idle, 1 / 60);
    expect(pileMass(rig)).toBeCloseTo(STOCKPILE, 6);
    expect(rig.status).toBe('output full');
  });

  it('can be loaded by the lander landed beside it', () => {
    const { w, rig, seam } = farMine();
    rig.stock = { [seam.resource]: 60 };
    const p = planetAt('home', w.system);
    w.ship.position = surfacePosition(p, rig.angle, WORLD.shipRadius);
    w.ship.velocity = groundVelocity(p, w.ship.position);
    w.ship.state = 'landed';
    expect(loadPiles(w)).toBeCloseTo(60, 6);
    expect(w.ship.cargo[seam.resource]).toBeCloseTo(60, 6);
    expect(rig.stock).toBeUndefined();
  });

  it('flows into the depot once the mine is joined to the base grid', () => {
    const { w, rig, seam } = farMine();
    rig.stock = { [seam.resource]: 40 };
    // Put the rig right by the pad: now it is on the base grid.
    rig.angle = 0.06;
    w.surfaceDeposits.find(d => d.id === seam.id)!.angle = 0.06;
    stepWorld(w, idle, 1 / 60);
    expect(rig.stock).toBeUndefined();
    expect(w.depot[seam.resource]).toBeGreaterThanOrEqual(40);
  });
});
