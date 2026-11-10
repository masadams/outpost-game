import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { MEMORIES, hasMemory, memories, stepStory, validStory } from '../src/sim/story';
import { blueprintRevealed } from '../src/sim/unlocks';
import { stepBlueprintNotices } from '../src/sim/blueprintNotice';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';

const storyWorld = () => {
  const w = createWorld(4242);
  w.system.sun = true;
  stepStory(w);
  stepBlueprintNotices(w);
  return w;
};

describe('the story', () => {
  it('starts with only the waking memory and the two starting blueprints', () => {
    const w = storyWorld();
    expect(memories(w).map(m => m.id)).toEqual(['boot']);
    expect(blueprintRevealed(w, 'solar')).toBe(true);
    expect(blueprintRevealed(w, 'refinery')).toBe(true);
    for (const kind of ['battery', 'storage', 'fuelProcessor', 'miningRig', 'relay', 'condenser'] as const) {
      expect(blueprintRevealed(w, kind)).toBe(false);
    }
  });

  it('does not hand over every early blueprint the moment the refinery runs', () => {
    const w = storyWorld();
    w.unloaded = 40;
    w.objectives.completed.push('delivery', 'industry');
    stepStory(w);
    const early = (['battery', 'storage', 'fuelProcessor', 'miningRig', 'relay', 'condenser'] as const).filter(k => blueprintRevealed(w, k));
    // Daylight, a nearly full tank, a nearly empty depot, two buildings: nothing has called for any of them yet.
    expect(early.filter(k => k !== 'battery')).toEqual([]);
  });

  it('brings each blueprint back when the base meets its problem, with the reason in the notice', () => {
    const w = storyWorld();
    w.objectives.completed.push('delivery', 'industry');
    w.unloaded = 40;
    stepStory(w);
    stepBlueprintNotices(w);
    w.ship.fuel *= 0.5;
    stepStory(w);
    expect(hasMemory(w, 'fuelProcessor')).toBe(true);
    stepBlueprintNotices(w);
    expect(w.notice.message).toContain('MEMORY RESTORED · FUEL PROCESSOR');
    expect(w.notice.message).toContain('Ice is fuel');
    expect(blueprintRevealed(w, 'storage')).toBe(false);
    w.unloaded = 300;
    stepStory(w);
    expect(blueprintRevealed(w, 'storage')).toBe(true);
    expect(blueprintRevealed(w, 'miningRig')).toBe(true);
  });

  it('never leaves a player without a blueprint: enough deliveries bring back every early one', () => {
    const w = storyWorld();
    w.objectives.completed.push('delivery', 'industry');
    w.unloaded = 300;
    stepStory(w);
    for (const kind of ['battery', 'storage', 'fuelProcessor', 'miningRig'] as const) expect(blueprintRevealed(w, kind)).toBe(true);
  });

  it('keeps what was remembered through a save and rejects unknown memories', () => {
    const w = storyWorld();
    w.exploration.story!.memories.push('firstOre');
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(memories(loaded).map(m => m.id)).toEqual(['boot', 'firstOre']);
    expect(validStory({ memories: ['boot', 'boot'] })).toBe(false);
    expect(validStory({ memories: ['nonsense'] })).toBe(false);
  });

  it('can be saved while a long memory notice is still on screen', () => {
    const w = storyWorld();
    w.exploration.story!.memories.push('firstOre');
    w.notice = { message: 'MEMORY RESTORED · BATTERY', time: 7 };
    expect(() => encodeCheckpoint(w)).not.toThrow();
  });

  it('catches an older save up quietly instead of announcing everything late', () => {
    const w = createWorld(4242);
    w.system.sun = true;
    w.objectives.completed.push('delivery', 'industry');
    w.unloaded = 500;
    const before = w.notice.message;
    stepStory(w);
    expect(memories(w).length).toBeGreaterThan(4);
    expect(w.notice.message).toBe(before);
  });

  it('leaves the standard test layout ungated', () => {
    const w = createWorld();
    w.objectives.completed.push('delivery', 'industry');
    expect(blueprintRevealed(w, 'battery')).toBe(true);
    expect(blueprintRevealed(w, 'relay')).toBe(true);
  });

  it('has short, unique memories', () => {
    expect(new Set(MEMORIES.map(m => m.id)).size).toBe(MEMORIES.length);
    for (const m of MEMORIES) expect(m.text.length).toBeLessThan(170);
  });
});
