import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { demolishError, energyCapacity, oreCapacity, placementError, productCapacity } from '../src/sim/colony';
import { HQ_UNLOCKS } from '../src/sim/headquarters';
import { blueprintRevealed } from '../src/sim/unlocks';
import { hqView } from '../src/ui/base/baseView';
import { workerReach, WORKER } from '../src/sim/workerBay';
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

describe('outpost cores', () => {
  it('arrive with the first building on another world, with a smaller limit and their own upgrades', async () => {
    const { colonyWorld } = await import('../src/sim/localWorld');
    const { CORE, centreName } = await import('../src/sim/headquarters');
    const w = game();
    const moon = colonyWorld(w, 'moon');
    expect(headquarters(moon.colony)).toBeUndefined();
    moon.colony.buildings.push(completedBuilding(500, 'solar', 0.2, moon));
    moon.colony.nextId = 501;
    w.colony.nextId = Math.max(w.colony.nextId, 501);
    stepWorld(w, idle, 1 / 60);
    const core = headquarters(w.outposts.moon.colony)!;
    expect(core.core).toBe(true);
    expect(centreName(w.outposts.moon.colony)).toBe('Outpost core');
    expect(buildingLimit(w.outposts.moon.colony)).toBe(CORE[1].buildings);
    expect(buildingLimit(w.colony)).toBe(HQ[1].buildings);
    const m = colonyWorld(w, 'moon');
    m.colony.products = { ...m.colony.products, alloy: 50, wire: 50, components: 50 };
    m.colony.buildings.push(completedBuilding(502, 'battery', 0.25, m));
    m.colony.nextId = 503;
    w.colony.nextId = Math.max(w.colony.nextId, 503);
    m.colony.energy = 200;
    stepWorld(w, { ...idle, colonyActions: [{ type: 'upgradeHq', body: 'moon' }] }, 1 / 60);
    expect(hqLevel(w.outposts.moon.colony)).toBe(2);
    expect(hqLevel(w.colony)).toBe(1);
    expect(() => encodeCheckpoint(w)).not.toThrow();
  });
});

describe('what each Headquarters level opens', () => {
  it('opens the worker bay at level 2 and the shipyard at level 3, and says so before the upgrade', () => {
    const w = game();
    w.exploration.story = { memories: ['makersRelay'] } as never;
    expect(blueprintRevealed(w, 'workerBay')).toBe(false);
    expect(blueprintRevealed(w, 'shipyard')).toBe(false);
    expect(hqView(w)!.next!.adds).toContain(`Opens ${HQ_UNLOCKS[2]}`);
    headquarters(w.colony)!.hqLevel = 2;
    expect(blueprintRevealed(w, 'workerBay')).toBe(true);
    expect(blueprintRevealed(w, 'shipyard')).toBe(false);
    headquarters(w.colony)!.hqLevel = 3;
    expect(blueprintRevealed(w, 'shipyard')).toBe(true);
  });

  it('sends worker drones farther at level 4', () => {
    const w = game();
    expect(workerReach(w)).toBe(WORKER.reach);
    headquarters(w.colony)!.hqLevel = 4;
    expect(workerReach(w)).toBe(WORKER.reach * 1.5);
  });
});
