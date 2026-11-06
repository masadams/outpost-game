import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { actionAllowed } from '../src/preferences/features';
import { baseView } from '../src/ui/base/baseView';

function base() {
  const w = createWorld();
  w.asteroids = [];
  w.colony.buildings = [
    { id: 1, kind: 'observatory', angle: 0.02, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 2, kind: 'laser', angle: 0.075, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 3, kind: 'battery', angle: 0.06, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
  ] as never;
  w.colony.nextId = 10;
  w.colony.energy = 40;
  return w;
}

describe('power kept for the turrets', () => {
  it('can be set from Base in the focus set, in steps of 50 kJ', () => {
    expect(actionAllowed({ type: 'adjustPolicy', field: 'energyReserve', direction: 1, step: 50 }, 'focus')).toBe(true);
    expect(actionAllowed({ type: 'adjustPolicy', field: 'deliveryReserve', direction: 1 }, 'focus')).toBe(false);
    const w = base();
    stepWorld(w, { thrust: false, turn: 0, colonyActions: [{ type: 'adjustPolicy', field: 'energyReserve', direction: 1, step: 50 }] }, 1 / 60);
    expect(w.colony.policy?.energyReserve).toBe(50);
    expect(baseView(w).power.reserve).toBe(50);
  });

  it('stops the Observatory from eating into it, and says how many shots are stored', () => {
    const w = base();
    w.colony.policy = { energyReserve: 50, deliveryReserve: 0, alloyReserve: 0, componentsReserve: 0 };
    for (let i = 0; i < 60 * 30; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.colony.energy).toBeCloseTo(40, 3);
    expect(w.colony.buildings[0].status).toBe('power reserved');
    expect(baseView(w).power.defence).toMatch(/about 13 shots/);
    const open = base();
    for (let i = 0; i < 60 * 30; i++) stepWorld(open, { thrust: false, turn: 0 }, 1 / 60);
    expect(open.colony.energy).toBeLessThan(1);
  });
});
