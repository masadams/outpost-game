import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
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
  it('shows nothing before research opens, and every technology once all is done, laid out on a grid', () => {
    expect(researchTreeView(day()).nodes).toEqual([]);
    const w = day();
    w.colony.research.completed.push(...TECH_IDS);
    const view = researchTreeView(w);
    expect(view.nodes).toHaveLength(TECH_IDS.length);
    expect(view.hidden).toBe(0);
    const seen = new Set(view.nodes.map(n => `${n.col},${n.row}`));
    expect(seen.size).toBe(view.nodes.length);
    expect(view.edges.length).toBeGreaterThan(20);
  });

  it('shows what is done and the next step from it, and hides the rest', () => {
    const w = day();
    w.colony.buildings.push(completedBuilding(1, 'researchLab', 0.2, w));
    w.colony.research.completed.push('materials');
    const view = researchTreeView(w);
    const ids = view.nodes.map(n => n.id);
    expect(ids).toContain('materials');
    expect(ids).toContain('propulsion');
    expect(ids).toContain('extraction');
    expect(ids).not.toContain('combat');
    expect(ids).not.toContain('ionics');
    expect(view.hidden).toBe(TECH_IDS.length - ids.length);
    expect(view.nodes.find(n => n.id === 'propulsion')!.line).toMatch(/Needs a find|lab|Start|materials/i);
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
    // A part whose research is not done is not listed at all.
    expect(hold.parts.find(p => p.id === 'bulkHold')).toBeUndefined();
  });
});

describe('building upgrade tree', () => {
  it('lists every building with two tiers, the techs each needs, and what is already built', () => {
    const w = day();
    const view = researchTreeView(w);
    // Only blueprints already given are listed.
    expect(view.buildings.map(b => b.kind)).toEqual(['solar', 'refinery']);
    w.colony.buildings.push(completedBuilding(9, 'droneBay', 0.4, w));
    expect(researchTreeView(w).buildings.find(b => b.kind === 'droneBay')!.open).toBe(false);
    const solar = view.buildings.find(b => b.kind === 'solar')!;
    expect(solar.tiers.map(t => t.tier)).toEqual([2, 3]);
    expect(solar.tiers[0].needs.map(n => n.label)).toEqual(['Infrastructure upgrades']);
    expect(solar.tiers[1].needs.map(n => n.label)).toEqual(['Advanced facility systems', 'Cell engineering']);
    expect(solar.tiers[0].effect).toMatch(/power/);

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
