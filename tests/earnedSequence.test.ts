import { afterEach, describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { buildView } from '../src/ui/build/buildView';
import { setFeatureMode } from '../src/preferences/features';
import { completedBuilding } from '../src/sim/construction';
import { stepStory } from '../src/sim/story';

afterEach(() => setFeatureMode(null));

/** The new-player build menu at each step of the intended sequence. */
describe('the earned sequence', () => {
  it('opens buildings in the order the plan says', () => {
    setFeatureMode('focus');
    const w = createWorld();
    w.system.sun = true;
    // Past eight cards the menu sorts into tabs; read them all.
    const menu = () => {
      const first = buildView(w);
      if (!first.groups) return first.cards.map(c => c.kind);
      return first.groups.flatMap(g => buildView(w, g.id as never).cards.map(c => c.kind));
    };
    expect(menu()).toEqual(['solar', 'refinery']);

    // The first metal alone brings nothing back: each early building returns when the base meets its problem.
    stepStory(w);
    w.objectives.completed.push('delivery', 'industry');
    w.unloaded = 40;
    stepStory(w);
    expect(menu().filter(k => k !== 'battery')).toEqual(['solar', 'refinery']);
    w.unloaded = 300;
    stepStory(w);
    expect(menu()).toEqual(['solar', 'battery', 'storage', 'refinery', 'fuelProcessor', 'miningRig']);
    w.colony.buildings = [1, 2, 3, 4, 5].map(i => completedBuilding(i, i === 5 ? 'fuelProcessor' : 'solar', 0.02 * i, w));
    stepStory(w);
    // The air condenser waits for the first storm, even with a fuel plant running.
    expect(menu()).toEqual(['solar', 'battery', 'storage', 'refinery', 'fuelProcessor', 'miningRig', 'relay']);

    // The Frost trip opens one thing: the Observatory. Not the lab, not the antenna.
    const before = menu().length;
    w.exploration.surveyed.push('frost');
    expect(menu()).toContain('observatory');
    expect(menu().length).toBe(before + 1);

    w.colony.buildings.push(completedBuilding(1, 'observatory', 0.1, w));
    expect(menu()).toContain('laser');
    expect(menu()).not.toContain('antenna');
    expect(menu()).not.toContain('missile');

    // The first storm brings the condenser; analysing a piece of it brings the lab and the antenna.
    w.objectives.completed.push('storm');
    stepStory(w);
    expect(menu()).toContain('condenser');
    expect(menu()).not.toContain('researchLab');
    w.objectives.completed.push('analysis');
    w.storm.analysed = true;
    expect(menu()).toContain('researchLab');
    expect(menu()).toContain('antenna');

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
