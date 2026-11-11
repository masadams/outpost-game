import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { demolishError, energyCapacity, oreCapacity, placementError, productCapacity } from '../src/sim/colony';
import { HQ, buildingLimit, headquarters, hqLevel, hqUpgradeBlock, upgradeHq } from '../src/sim/headquarters';
import { linkTree } from '../src/sim/grid';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';

const idle = { thrust: false, turn: 0 };
function game() {
  const w = createWorld(4242);
  w.system.sun = true;
  w.asteroids = [];
  stepWorld(w, idle, 1 / 60);
  return w;
}

describe('the Headquarters', () => {
  it('stands beside the home pad from the start, once, and is on the grid', () => {
    const w = game();
    const hq = headquarters(w.colony)!;
    expect(hq).toBeDefined();
    expect(Math.abs(hq.angle) * 1800).toBeGreaterThan(36);
    stepWorld(w, idle, 1 / 60);
    expect(w.colony.buildings.filter(b => b.kind === 'headquarters')).toHaveLength(1);
    expect(linkTree(w)!.has(hq.id)).toBe(true);
  });

  it('cannot be taken down or switched off', () => {
    const w = game();
    expect(demolishError(w, headquarters(w.colony)!)).toContain('cannot');
  });

  it('starts at level 1, which changes nothing about storage', () => {
    const bare = createWorld(4242);
    const w = game();
    expect(hqLevel(w.colony)).toBe(1);
    expect(oreCapacity(w.colony)).toBe(oreCapacity(bare.colony));
    expect(productCapacity(w.colony)).toBe(productCapacity(bare.colony));
  });

  it('goes up a level for its cost, raising the building limit and the stores', () => {
    const w = game();
    w.colony.buildings.push(completedBuilding(90, 'storage', 0.1, w), completedBuilding(91, 'battery', 0.12, w));
    w.colony.nextId = 100;
    w.colony.products = { ...w.colony.products, alloy: 100, wire: 100, components: 100 };
    expect(hqUpgradeBlock(w)).toContain('kJ stored');
    w.colony.energy = energyCapacity(w.colony);
    const ore = oreCapacity(w.colony);
    const limit = buildingLimit(w.colony);
    expect(hqUpgradeBlock(w)).toBeNull();
    upgradeHq(w);
    expect(hqLevel(w.colony)).toBe(2);
    expect(w.colony.products.alloy).toBe(100 - HQ[2].cost.alloy!);
    expect(oreCapacity(w.colony)).toBe(ore + HQ[2].ore);
    expect(buildingLimit(w.colony)).toBeGreaterThan(limit);
    expect(decodeCheckpoint(encodeCheckpoint(w)).colony.buildings.find(b => b.kind === 'headquarters')!.hqLevel).toBe(2);
  });

  it('says to upgrade it when the base is full', () => {
    const w = game();
    for (let i = 0; i < buildingLimit(w.colony); i++) w.colony.buildings.push(completedBuilding(200 + i, 'solar', 0.5 + i * 0.03, w));
    expect(placementError(w, 'solar', 2, { remote: true })).toContain('Upgrade the Headquarters');
  });
});
