import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { upgradeView, tierEffect } from '../src/ui/base/upgradeView';
import { actionAllowed } from '../src/preferences/features';
import { linkedBuildings, RELAY_RANGE } from '../src/sim/grid';
import { WORLD } from '../src/sim/config';
import { openTechs } from '../src/sim/finds';

function base() {
  const w = createWorld();
  w.colony.products.alloy = 20;
  w.colony.products.wire = 20;
  w.colony.products.components = 20;
  w.colony.energy = 100;
  const battery = completedBuilding(5, 'battery', 0.1, w);
  w.colony.buildings.push(battery);
  return { w, battery };
}

describe('upgrading in place', () => {
  it('says what it does, what it costs and why not yet', () => {
    const { w, battery } = base();
    const view = upgradeView(w, battery)!;
    expect(view.effect).toBe('Stores 1800 kJ instead of 1200');
    expect(view.cost).toBe('4 alloy, 2 wire, 2 components');
    expect(view.blocked).toBe('Research Infrastructure upgrades first.');
  });

  it('works once the research is done, and the building gets better', () => {
    const { w, battery } = base();
    w.colony.research.completed.push('infrastructure');
    expect(upgradeView(w, battery)!.blocked).toBeNull();
    stepWorld(w, { thrust: false, turn: 0, colonyActions: [{ type: 'upgradeBuilding', id: 5, level: 2 }] }, 1 / 60);
    expect(battery.level).toBe(2);
    // The next step (tier III) is offered, but needs more research.
    expect(upgradeView(w, battery)).toMatchObject({ tier: 3 });
    expect(upgradeView(w, battery)!.blocked).toMatch(/Research/);
  });

  it('a relay reaches farther when upgraded', () => {
    const w = createWorld();
    w.system.sun = true;
    const relay = completedBuilding(1, 'relay', 0, w);
    const far = completedBuilding(2, 'solar', (RELAY_RANGE * 1.4) / WORLD.radius, w);
    w.colony.buildings.push(relay, far);
    expect(linkedBuildings(w)!.has(2)).toBe(false);
    relay.level = 2;
    expect(linkedBuildings(w)!.has(2)).toBe(true);
    expect(tierEffect(relay)).toContain('900');
  });

  it('opens the retrofit research once materials and logistics are done', () => {
    const w = createWorld();
    w.system.sun = true;
    expect(openTechs(w)).not.toContain('infrastructure');
    w.colony.research.completed.push('materials', 'logistics');
    expect(openTechs(w)).toContain('infrastructure');
  });

  it('the new-player set allows only the first tier', () => {
    expect(actionAllowed({ type: 'upgradeBuilding', id: 1, level: 2 }, 'focus')).toBe(true);
    expect(actionAllowed({ type: 'upgradeBuilding', id: 1, level: 3 }, 'focus')).toBe(false);
  });
});

describe('tier effects for the rest', () => {
  it('every building names what a tier changes, and turrets really fire faster', async () => {
    const { BUILD_TYPES } = await import('../src/sim/colonyConfig');
    const { completedBuilding } = await import('../src/sim/construction');
    const w = createWorld();
    for (const kind of BUILD_TYPES) expect(tierEffect(completedBuilding(1, kind, kind === 'miningRig' ? 160 / 1800 : 0.3, w)).length).toBeGreaterThan(5);
    expect(tierEffect(completedBuilding(1, 'laser', 0.3, w))).toBe('Fires 1.25× as often and reaches 1035 m');
    expect(tierEffect(completedBuilding(1, 'shieldSmall', 0.3, w))).toBe('Recharges 1.25× as fast');
  });
});
