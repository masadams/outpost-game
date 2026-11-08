import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { researchError } from '../src/sim/research';
import { stormsSurvived, techStoryGate } from '../src/sim/storyGates';

describe('story gates on research', () => {
  it('holds back deeper techs until their story beat', () => {
    const w = createWorld(7);
    w.system.sun = true;
    expect(stormsSurvived(w)).toBe(0);
    expect(techStoryGate(w, 'ballistics')).toMatch(/storm/);
    expect(techStoryGate(w, 'massDrivers')).toMatch(/another world/);
    expect(techStoryGate(w, 'materials')).toBeNull();
  });
  it('opens a gate when its beat happens', () => {
    const w = createWorld(7);
    w.system.sun = true;
    w.storm.wave = 1;
    w.storm.phase = 'over';
    expect(techStoryGate(w, 'ballistics')).toBeNull();
    expect(techStoryGate(w, 'deepSignal')).toMatch(/Antenna/);
  });
  it('reports the story reason once prerequisites are done', () => {
    const w = createWorld(7);
    w.system.sun = true;
    w.colony.research.completed = ['materials', 'propulsion', 'extraction', 'combat'];
    expect(researchError(w, 'ballistics')).toMatch(/^Not yet:/);
  });
  it('does not gate the standard layout used by scripted tests', () => {
    const w = createWorld();
    w.colony.research.completed = ['materials', 'propulsion', 'extraction', 'combat'];
    expect(String(researchError(w, 'ballistics'))).not.toMatch(/^Not yet:/);
  });
});
