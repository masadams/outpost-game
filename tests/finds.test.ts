import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { openTechs, studiedFinds } from '../src/sim/finds';
import { researchError } from '../src/sim/research';
import { blueprintRevealed } from '../src/sim/unlocks';
import { researchView } from '../src/ui/base/researchView';
import { actionAllowed } from '../src/preferences/features';

describe('research from finds', () => {
  it('opens a project only for something you have studied, in day-cycle games', () => {
    const w = createWorld();
    w.system.sun = true;
    w.colony.products.alloy = 20;
    w.colony.products.wire = 20;
    w.colony.products.components = 20;
    expect(openTechs(w)).toEqual([]);
    expect(researchError(w, 'materials')).toBe('Study a find first');
    expect(blueprintRevealed(w, 'researchLab')).toBe(false);
    w.storm.analysed = true;
    expect(studiedFinds(w).map(f => f.id)).toEqual(['storm']);
    expect(researchError(w, 'materials')).toBeNull();
    expect(researchError(w, 'logistics')).toBe('Study a find first');
    expect(blueprintRevealed(w, 'researchLab')).toBe(true);
  });

  it('the Base view walks from study to research to fabrication, with reasons', () => {
    const w = createWorld();
    w.system.sun = true;
    expect(researchView(w)).toBeNull();
    w.storm.analysed = true;
    const rows = () => researchView(w)!;
    expect(rows()[0].action).toMatchObject({ kind: 'research', reason: 'Build a Research lab first.' });
    expect(rows()[1].action).toBeNull();
    w.colony.buildings.push({ id: 5, kind: 'researchLab', angle: 0.2, enabled: true, progress: 0, recipe: 0, status: 'idle' } as never);
    w.colony.products.alloy = 10;
    w.colony.products.wire = 10;
    w.colony.products.components = 10;
    expect(rows()[0].action?.reason).toBeNull();
    w.colony.research.completed.push('materials');
    expect(rows()[0].action).toMatchObject({ kind: 'fit' });
    w.ship.equipment.push('armour');
    expect(rows()[0].action).toBeNull();
    expect(rows()[0].line).toMatch(/fitted/);
  });

  it('the new-player set may start only find research', () => {
    expect(actionAllowed({ type: 'researchStart', tech: 'materials' }, 'focus')).toBe(true);
    expect(actionAllowed({ type: 'researchStart', tech: 'thermal' }, 'focus')).toBe(false);
    expect(actionAllowed({ type: 'equipment', upgrade: 'armour', operation: 'install' }, 'focus')).toBe(true);
    expect(actionAllowed({ type: 'equipment', upgrade: 'coil', operation: 'install' }, 'focus')).toBe(false);
  });
});

describe('shields and domes arrive in sequence', () => {
  it('shields after the second storm, domes once a world has a base, larger ones after the small', async () => {
    const { blueprintRevealed } = await import('../src/sim/unlocks');
    const { completedBuilding } = await import('../src/sim/construction');
    const w = createWorld();
    for (const kind of ['shieldSmall', 'shieldLarge', 'habitatSmall', 'habitatLarge'] as const) expect(blueprintRevealed(w, kind)).toBe(false);
    w.storm.wave = 2;
    w.storm.phase = 'over';
    expect(blueprintRevealed(w, 'shieldSmall')).toBe(true);
    expect(openTechs(w)).toContain('combat');
    w.outposts.moon.colony.buildings.push(completedBuilding(1001, 'solar', 0.05, w));
    expect(blueprintRevealed(w, 'habitatSmall')).toBe(true);
    expect(blueprintRevealed(w, 'habitatLarge')).toBe(false);
    w.colony.buildings.push(completedBuilding(1, 'habitatSmall', 0.2, w), completedBuilding(2, 'shieldSmall', -0.2, w));
    expect(blueprintRevealed(w, 'habitatLarge')).toBe(true);
    expect(blueprintRevealed(w, 'shieldLarge')).toBe(true);
  });
});
