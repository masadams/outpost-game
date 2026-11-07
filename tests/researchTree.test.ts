import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { researchTreeView } from '../src/ui/base/researchTreeView';
import { researchError } from '../src/sim/research';
import { TECH_IDS } from '../src/sim/progressionConfig';

function day() {
  const w = createWorld(4);
  w.system.sun = true;
  w.colony.products.alloy = 100;
  w.colony.products.wire = 100;
  w.colony.products.components = 100;
  return w;
}

describe('research tree view', () => {
  it('has a node for every technology, laid out on a grid, and an edge per prerequisite', () => {
    const view = researchTreeView(day());
    expect(view.nodes).toHaveLength(TECH_IDS.length);
    const seen = new Set(view.nodes.map(n => `${n.col},${n.row}`));
    expect(seen.size).toBe(view.nodes.length);
    expect(view.edges.length).toBeGreaterThan(20);
  });

  it('says what a find-gated tech needs, and what a later one needs first', () => {
    const view = researchTreeView(day());
    expect(view.nodes.find(n => n.id === 'materials')!.line).toMatch(/Needs a find: Pieces of the storm/);
    expect(view.nodes.find(n => n.id === 'ionics')!.line).toMatch(/Needs .* first/);
  });

  it('opens later techs by prerequisites alone once the tree reaches them', () => {
    const w = day();
    w.colony.research.completed.push('materials', 'propulsion');
    expect(researchError(w, 'orbital')).toBeNull();
    const node = researchTreeView(w).nodes.find(n => n.id === 'orbital')!;
    expect(node.state).toBe('ready');
    expect(node.start?.reason).toMatch(/Research lab/);
  });

  it('lists the ship parts a tech unlocks and whether each can be fitted', () => {
    const w = day();
    w.colony.research.completed.push('materials');
    const view = researchTreeView(w);
    expect(view.nodes.find(n => n.id === 'materials')!.unlocks.join(' ')).toMatch(/Cargo rack|Impact armour/);
    const hold = view.slots.find(s => s.slot === 'hold')!;
    expect(hold.parts.find(p => p.id === 'cargo')!.state).toBe('ready');
    expect(hold.parts.find(p => p.id === 'bulkHold')!.state).toBe('locked');
    expect(hold.parts.find(p => p.id === 'bulkHold')!.reason).toMatch(/Needs Bulk logistics/);
  });
});

describe('building upgrade tree', () => {
  it('lists every building with two tiers, the techs each needs, and what is already built', () => {
    const w = day();
    const view = researchTreeView(w);
    expect(view.buildings.length).toBeGreaterThanOrEqual(20);
    const solar = view.buildings.find(b => b.kind === 'solar')!;
    expect(solar.tiers.map(t => t.tier)).toEqual([2, 3]);
    expect(solar.tiers[0].needs.map(n => n.label)).toEqual(['Infrastructure retrofits']);
    expect(solar.tiers[1].needs.map(n => n.label)).toEqual(['Advanced facility systems', 'Cell engineering']);
    expect(solar.tiers[0].effect).toMatch(/power/);
    expect(view.buildings.find(b => b.kind === 'droneBay')!.open).toBe(false);
  });

  it('tier III needs the family technology on top of Advanced facility systems', async () => {
    const { buildingUpgradeError } = await import('../src/sim/buildingUpgrades');
    const { completedBuilding } = await import('../src/sim/construction');
    const w = day();
    const b = completedBuilding(1, 'solar', 0.2, w);
    b.level = 2;
    w.colony.buildings.push(b);
    w.colony.research.completed.push('infrastructure', 'industrialSystems');
    expect(buildingUpgradeError(w, b)).toBe('Research Cell engineering');
    w.colony.research.completed.push('reactor');
    expect(buildingUpgradeError(w, b)).not.toMatch(/^Research/);
  });
});
