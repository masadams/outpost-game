import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { AudioDirector } from '../src/audio/director';
import { entryHeat } from '../src/sim/flightRegion';
import { stepStory } from '../src/sim/story';

function game() {
  const w = createWorld(4242);
  w.system.sun = true;
  stepStory(w);
  return w;
}

describe('sounds for story moments', () => {
  it('plays a cue for one memory, a seam, a deep find, and stays quiet for a loaded save', () => {
    const w = game();
    const director = new AudioDirector();
    director.reset(w);
    w.exploration.story!.memories.push('firstOre');
    expect(director.update(w, 1 / 60, false).cues).toContain('memory');
    w.surfaceDeposits.find(d => d.surveyed === false)!.surveyed = true;
    expect(director.update(w, 1 / 60, false).cues).toContain('survey');
    w.exploration.deep = ['hulk'];
    w.exploration.story!.memories.push('deep-hulk');
    const cues = director.update(w, 1 / 60, false).cues;
    expect(cues).toContain('deepFind');
    expect(cues).not.toContain('memory');
    // A whole save's worth at once (a load) is not a moment.
    w.exploration.story!.memories.push('firstMetal', 'battery', 'storage', 'buoy');
    expect(director.update(w, 1 / 60, false).cues).not.toContain('memory');
  });

  it('heats the lander only when it comes into the air fast', () => {
    expect(entryHeat(300, 'space')).toBe(0);
    expect(entryHeat(60, 'thin-air')).toBe(0);
    expect(entryHeat(130, 'thin-air')).toBeGreaterThan(0.4);
    expect(entryHeat(130, 'atmosphere')).toBeLessThan(entryHeat(130, 'thin-air'));
    expect(entryHeat(1000, 'thin-air')).toBe(1);
  });
});

describe('soft screen tints', () => {
  it('ease in, hold briefly and fade out slowly, never covering the screen', async () => {
    const { veilStrength } = await import('../src/render/effects');
    const samples = Array.from({ length: 101 }, (_, i) => veilStrength(0.45, i / 100));
    expect(samples[0]).toBe(0);
    expect(samples[100]).toBe(0);
    expect(Math.max(...samples)).toBeCloseTo(0.45);
    // Gentle start: a tenth of the way in it is still faint.
    expect(samples[10]).toBeLessThan(0.45 * 0.3);
    // The fade takes longer than the rise.
    const peakAt = samples.indexOf(Math.max(...samples));
    expect(100 - peakAt).toBeGreaterThan(peakAt);
  });
});
