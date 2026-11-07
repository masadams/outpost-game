import { describe, expect, it } from 'vitest';
import { createWorld, type WorldState } from '../src/sim/world';
import { applyColonyAction, placementError, stepColony } from '../src/sim/colony';
import { type BuildType } from '../src/sim/colonyConfig';
import { DRONE } from '../src/sim/droneConfig';
import { blueprintRevealed } from '../src/sim/unlocks';
import { stationPosition } from '../src/sim/stations';
import { STEP, WORLD } from '../src/sim/config';

function build(w: WorldState, kind: BuildType, arc: number) {
  w.playerMode = 'astronaut';
  w.astronaut.position = stationPosition((arc - 24) / WORLD.radius);
  w.astronaut.grounded = true;
  w.colony.buildOpen = true;
  w.colony.selected = kind;
  w.colony.offset = 24;
  const error = placementError(w);
  if (error) throw new Error(error);
  applyColonyAction(w, { type: 'place' });
}
const run = (w: WorldState, s: number) => { for (let i = 0; i < Math.round(s / STEP); i++) stepColony(w, STEP); };
function fixture(arc = 300) {
  const w = createWorld();
  w.colony.research.completed.push('precision');
  w.colony.products = { ...w.colony.products, alloy: 40, wire: 20, components: 20, fuel: 5 };
  build(w, 'solar', 120);
  build(w, 'droneBay', arc);
  return w;
}

describe('mining drone bay', () => {
  it('is earned by Precision extraction research', () => {
    const w = createWorld();
    expect(blueprintRevealed(w, 'droneBay')).toBe(false);
    expect(placementError(w, 'droneBay', 0.3, { remote: true })).toMatch(/Precision/);
    w.colony.research.completed.push('precision');
    expect(blueprintRevealed(w, 'droneBay')).toBe(true);
  });
  it('mines the nearest seam in reach without sitting on it, and moves ore, not creates it', () => {
    const w = fixture();
    const before = w.surfaceDeposits.reduce((n, d) => n + d.remaining, 0);
    run(w, DRONE.seconds + 2);
    const after = w.surfaceDeposits.reduce((n, d) => n + d.remaining, 0);
    const stored = Object.values(w.depot).reduce((n, v) => n + v, 0);
    expect(before - after).toBeCloseTo(DRONE.yield, 6);
    expect(stored).toBeCloseTo(DRONE.yield, 6);
  });
  it('is slower than a rig, burns fuel and wears the bay each trip', () => {
    const w = fixture();
    const bay = w.colony.buildings[1];
    run(w, DRONE.seconds + 2);
    // One trip is done and the next has already taken its fuel.
    expect(w.colony.products.fuel).toBeCloseTo(5 - 2 * DRONE.fuel, 6);
    expect(bay.health).toBe(100 - DRONE.wear);
    expect(DRONE.yield / DRONE.seconds).toBeLessThan(0.25);
  });
  it('stops with a plain reason: no fuel, no seam in reach, worn out', () => {
    const w = fixture();
    const bay = w.colony.buildings[1];
    w.colony.products.fuel = 0;
    run(w, 2);
    expect(bay.status).toBe('no fuel');
    w.colony.products.fuel = 5;
    bay.health = DRONE.grounded;
    run(w, 2);
    expect(bay.status).toBe('worn out');
    const far = fixture(1600);
    run(far, 2);
    expect(far.colony.buildings[1].status).toBe('no deposit');
  });
});
