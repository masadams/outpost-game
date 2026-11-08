import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { auroraStrength } from '../src/sim/aurora';
import { createEvents, EVENTS, startEvent, stepEvents } from '../src/sim/events';

describe('northern lights', () => {
  it('glow faintly over a world with air, not over an airless one, and not without the day cycle', () => {
    const w = createWorld(5);
    expect(auroraStrength(w)).toBe(0);
    w.system.sun = true;
    expect(auroraStrength(w, 'home')).toBeGreaterThan(0);
    expect(auroraStrength(w, 'moon')).toBe(0);
  });
  it('blaze during a solar flare', () => {
    const w = createWorld(5);
    w.system.sun = true;
    w.exploration.events = createEvents();
    w.system.time = 2000;
    const quiet = auroraStrength(w);
    startEvent(w, 'flare');
    for (let i = 0; i <= EVENTS.flare.lead; i++) {
      w.system.time += 1;
      stepEvents(w, 1);
    }
    expect(auroraStrength(w)).toBeGreaterThan(quiet);
  });
});
