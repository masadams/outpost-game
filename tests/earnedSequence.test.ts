import { afterEach, describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { buildView } from '../src/ui/build/buildView';
import { setFeatureMode } from '../src/preferences/features';
import { completedBuilding } from '../src/sim/construction';

afterEach(() => setFeatureMode(null));

/** The new-player build menu at each step of the intended sequence. */
describe('the earned sequence', () => {
  it('opens buildings in the order the plan says', () => {
    setFeatureMode('focus');
    const w = createWorld();
    w.system.sun = true;
    const menu = () => buildView(w).cards.map(c => c.kind);
    expect(menu()).toEqual(['solar', 'refinery']);

    w.objectives.completed.push('industry');
    expect(menu()).toEqual(['solar', 'battery', 'storage', 'refinery', 'fuelProcessor', 'miningRig', 'relay']);

    w.exploration.surveyed.push('frost');
    expect(menu()).toContain('observatory');
    expect(menu()).toContain('researchLab');
    expect(menu()).not.toContain('laser');

    w.colony.buildings.push(completedBuilding(1, 'observatory', 0.1, w));
    expect(menu()).toContain('laser');
    expect(menu()).not.toContain('missile');

    w.storm.wave = 2;
    expect(menu()).toContain('missile');
    expect(menu()).not.toContain('shieldSmall');

    w.storm.phase = 'over';
    expect(menu()).toContain('shieldSmall');
    expect(menu()).not.toContain('habitatSmall');

    w.outposts.moon.colony.buildings.push(completedBuilding(1001, 'solar', 0.05, w));
    expect(menu()).toContain('habitatSmall');
  });
});
