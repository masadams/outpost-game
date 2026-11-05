import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { baseView, whyStopped } from '../src/ui/base/baseView';

function withBuildings() {
  const w = createWorld();
  w.colony.buildings.push(completedBuilding(1, 'solar', -0.05, w), completedBuilding(2, 'refinery', 0.06, w));
  w.colony.nextId = 3;
  return w;
}

describe('base view', () => {
  it('summarises an empty outpost with a prompt to build power', () => {
    const view = baseView(createWorld());
    expect(view.name).toBe('Selene');
    expect(view.buildings).toEqual([]);
    expect(view.power).toMatchObject({ level: 'none', summary: 'No power yet. Build a solar array.' });
    expect(view.stocks.find(s => s.key === 'alloy')).toMatchObject({ label: 'Alloy', value: '28', group: 'product' });
    expect(view.ship).toMatchObject({ where: 'On the pad', fuel: '100%', hint: 'Ready to launch. Press W.' });
  });

  it('explains a stopped refinery in plain words and lists it under attention', () => {
    const w = withBuildings();
    const refinery = w.colony.buildings[1];
    refinery.status = 'no feedstock';
    const view = baseView(w);
    const card = view.buildings.find(b => b.id === 2)!;
    expect(card).toMatchObject({ chip: 'stopped', chipLabel: 'No input', canToggle: true, canCycleRecipe: true });
    expect(card.why).toBe('Needs iron ore. Mine some and unload it at the pad.');
    expect(view.attention).toEqual([{ id: 2, text: 'Refinery: Needs iron ore. Mine some and unload it at the pad.' }]);
    expect(card.facts).toContainEqual(['Making', 'Iron → alloy']);
  });

  it('maps every reason to a short sentence without internal jargon', () => {
    const w = withBuildings();
    const b = w.colony.buildings[1];
    for (const status of ['no power', 'power limited', 'output full', 'wrecked', 'depleted', 'no deposit'] as const) {
      b.status = status;
      const text = whyStopped(b)!;
      expect(text).toMatch(/^[A-Z].*\.$/);
      expect(text).not.toMatch(/unreserved|supplied|paid|escrow/i);
    }
    b.status = 'running';
    expect(whyStopped(b)).toBeNull();
  });

  it('reports power balance and turns off controls that make no sense', () => {
    const w = withBuildings();
    w.colony.generation = 8;
    w.colony.demand = 4;
    w.colony.buildings.push(completedBuilding(3, 'storage', 0.2, w));
    const view = baseView(w);
    expect(view.power).toMatchObject({ level: 'good', summary: 'Using 4.0 of 8.0 kW' });
    expect(view.buildings.find(b => b.kind === 'storage')!.canToggle).toBe(false);
    expect(view.buildings.find(b => b.kind === 'solar')!.canCycleRecipe).toBe(false);
  });

  it('tells a wrecked pilot how to recover', () => {
    const w = createWorld();
    w.ship.state = 'crashed';
    expect(baseView(w).ship.hint).toContain('Backspace');
  });
});
