import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { stepBlueprintNotices } from '../src/sim/blueprintNotice';
import { objectiveCue } from '../src/sim/objectives';
import { objectiveCard } from '../src/ui/flight/chromeView';

describe('revealed by what happens', () => {
  it('announces a blueprint once, when it first becomes available', () => {
    const w = createWorld(3);
    expect(stepBlueprintNotices(w)).toEqual([]);
    w.objectives.completed.push('industry');
    const fresh = stepBlueprintNotices(w);
    expect(fresh).toContain('miningRig');
    expect(stepBlueprintNotices(w)).toEqual([]);
  });
  it('keeps later milestones out of sight until their cue', () => {
    const w = createWorld(3);
    expect(objectiveCue(w, 'delivery')).toBe(true);
    expect(objectiveCue(w, 'industry')).toBe(false);
    expect(objectiveCue(w, 'storm2')).toBe(false);
    expect(objectiveCard(w).title).not.toBe('');
    w.objectives.completed.push('delivery');
    expect(objectiveCue(w, 'industry')).toBe(true);
  });
  it('hides the card when nothing has come up', () => {
    const w = createWorld(3);
    w.objectives.completed.push('delivery', 'industry');
    w.system.sun = true;
    const card = objectiveCard(w, 'auto');
    expect(card.visible).toBe(true);
    expect(card.title).toBeTruthy();
    w.objectives.completed.push('buoy', 'sky');
    expect(objectiveCard(w, 'auto').visible).toBe(false);
  });
});
