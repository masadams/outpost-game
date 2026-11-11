import { afterEach, describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { TECH_IDS } from '../src/sim/progressionConfig';
import { actionAllowed, setFeatureMode } from '../src/preferences/features';
import { researchTreeView } from '../src/ui/base/researchTreeView';

afterEach(() => setFeatureMode(null));

/** A new player's game with a lab and plenty of everything, with some research done. */
function game(done: string[]) {
  const w = createWorld(4242);
  w.system.sun = true;
  w.colony.buildings.push(completedBuilding(1, 'researchLab', 0.1, w), completedBuilding(2, 'storage', 0.14, w));
  w.colony.nextId = 5;
  w.colony.products = { alloy: 200, wire: 200, components: 200, water: 50, oxygen: 50, fuel: 50 };
  w.colony.energy = 20;
  w.colony.research.completed = done as never;
  return w;
}

describe('what the research screens offer a new player', () => {
  it('never shows research as ready to start that the game then ignores', () => {
    setFeatureMode('focus');
    for (const done of [[], ['materials'], ['materials', 'extraction', 'propulsion'], [...TECH_IDS].slice(0, 12)]) {
      const view = researchTreeView(game(done));
      const startable = view.nodes.filter(n => n.state === 'ready' && n.start && n.start.reason === null);
      for (const node of startable) {
        expect(actionAllowed({ type: 'researchStart', tech: node.id as never }, 'focus'), node.label).toBe(true);
      }
    }
  });

  it('never lists a ship part it will not let you fit', () => {
    setFeatureMode('focus');
    const view = researchTreeView(game([...TECH_IDS]));
    const parts = view.slots.flatMap(s => s.parts);
    expect(parts.length).toBeGreaterThan(5);
    for (const part of parts) {
      expect(actionAllowed({ type: 'equipment', upgrade: part.id as never, operation: 'install' }, 'focus'), part.label).toBe(true);
    }
    // The cannon and flight computers are not part of a new player's game yet.
    expect(view.slots.map(s => s.slot)).not.toContain('weapon');
    expect(view.slots.map(s => s.slot)).not.toContain('avionics');
  });
});
