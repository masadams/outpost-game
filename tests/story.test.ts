import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { bootLog } from '../src/ui/flight/chromeView';
import { carriedStory, MEMORIES, SECOND_SIGNAL_SECONDS, hasMemory, memories, stepStory, validStory } from '../src/sim/story';
import { completedBuilding } from '../src/sim/construction';
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
    expect(w.notice.message).toContain('NOW IN BUILD');
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

  it('waits for the notice on screen to clear before announcing a memory', () => {
    const w = storyWorld();
    w.notice = { message: 'A SIGNAL CAME BACK', time: 3 };
    w.objectives.completed.push('delivery');
    stepStory(w);
    expect(hasMemory(w, 'firstOre')).toBe(true);
    expect(w.notice.message).toBe('A SIGNAL CAME BACK');
    w.notice.time = 0;
    stepStory(w);
    expect(w.notice.message).toContain('MEMORY RESTORED · ORE IN THE DEPOT');
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

  it('brings the echo back in pieces while the beacon is out, then finds a second signal', () => {
    const w = storyWorld();
    w.system.time = 1000;
    w.exploration.signal = { phase: 'sent', sentAt: 1000, hearAt: 4000, echo: null };
    stepStory(w);
    expect(hasMemory(w, 'beacon')).toBe(true);
    expect(hasMemory(w, 'static')).toBe(false);
    w.system.time = 2100;
    stepStory(w);
    expect(hasMemory(w, 'static')).toBe(true);
    expect(hasMemory(w, 'words')).toBe(false);
    w.system.time = 3100;
    stepStory(w);
    expect(hasMemory(w, 'words')).toBe(true);
    expect(hasMemory(w, 'echo')).toBe(false);
    w.system.time = 4000;
    w.exploration.signal.phase = 'heard';
    stepStory(w);
    expect(hasMemory(w, 'echo')).toBe(true);
    expect(hasMemory(w, 'second')).toBe(false);
    // The second signal needs time and an antenna still standing.
    w.system.time = 4000 + SECOND_SIGNAL_SECONDS;
    stepStory(w);
    expect(hasMemory(w, 'second')).toBe(false);
    w.colony.buildings.push(completedBuilding(9, 'antenna', 0.2, w));
    stepStory(w);
    expect(hasMemory(w, 'second')).toBe(true);
    const order = memories(w).map(m => m.id);
    expect(order.indexOf('static')).toBeLessThan(order.indexOf('words'));
    expect(order.indexOf('words')).toBeLessThan(order.indexOf('echo'));
    expect(order.indexOf('echo')).toBeLessThan(order.indexOf('second'));
  });

  it('names the carrier once the slag and the derelict can be compared', () => {
    const w = storyWorld();
    w.objectives.completed.push('analysis');
    stepStory(w);
    expect(hasMemory(w, 'oneShip')).toBe(false);
    w.exploration.surveyed.push('copper');
    stepStory(w);
    expect(hasMemory(w, 'oneShip')).toBe(true);
  });

  it('begins again remembering how many systems it has made', () => {
    const w = createWorld(7);
    w.system.sun = true;
    w.exploration.story = carriedStory(1);
    stepStory(w);
    expect(hasMemory(w, 'inherited')).toBe(true);
    expect(validStory(w.exploration.story)).toBe(true);
    expect(validStory({ memories: [], lives: -1 })).toBe(false);
    expect(bootLog(w)![0]).toContain('COPY 2');
  });

  it('has short, unique memories', () => {
    expect(new Set(MEMORIES.map(m => m.id)).size).toBe(MEMORIES.length);
    for (const m of MEMORIES) expect(m.text.length).toBeLessThanOrEqual(260);
  });
});
