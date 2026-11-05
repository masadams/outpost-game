import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { demolishError, salvageOf } from '../src/sim/colony';
import { baseView } from '../src/ui/base/baseView';

function withSolar() {
  const w = createWorld();
  const b = completedBuilding(w.colony.nextId++, 'solar', 0.05, w);
  w.colony.buildings.push(b);
  return { w, b };
}

describe('demolish', () => {
  it('takes a building down from the menu without standing next to it, and returns three quarters of the cost', () => {
    const { w, b } = withSolar();
    const before = { ...w.colony.products };
    stepWorld(w, { thrust: false, turn: 0, colonyActions: [{ type: 'remote', id: b.id, operation: 'demolish' }] }, 1 / 60);
    expect(w.colony.buildings.some(x => x.id === b.id)).toBe(false);
    expect(w.colony.products.alloy).toBeCloseTo(before.alloy + 4 * 0.75, 5);
    expect(w.colony.products.wire).toBeCloseTo(before.wire + 2 * 0.75, 5);
  });

  it('gives back less from a damaged building and says so in words', () => {
    const { w, b } = withSolar();
    b.health = 40;
    expect(salvageOf(b).alloy).toBeCloseTo(4 * 0.75 * 0.4, 5);
    expect(baseView(w).buildings[0].salvage).toMatch(/alloy/);
  });

  it('refuses when the salvage would not fit, and says why', () => {
    const { w, b } = withSolar();
    w.colony.products.alloy = 400;
    expect(demolishError(w, b)).toContain('storage');
    stepWorld(w, { thrust: false, turn: 0, colonyActions: [{ type: 'remote', id: b.id, operation: 'demolish' }] }, 1 / 60);
    expect(w.colony.buildings.some(x => x.id === b.id)).toBe(true);
    expect(baseView(w).buildings[0].demolishBlocked).not.toBeNull();
  });
});
