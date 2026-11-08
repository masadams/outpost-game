import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { stepWorld } from '../src/sim/world';
import { STEP } from '../src/sim/config';
import { EVENTS, createEvents, eventPodRisk, eventRigFactor, eventSolarFactor, lanesBlocked, startEvent, stepEvents } from '../src/sim/events';
import { validExploration } from '../src/persistence/validateExploration';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';
import { generatorOutput } from '../src/sim/generators';

function game() {
  const w = createWorld(11);
  w.system.sun = true;
  w.exploration.events = createEvents();
  return w;
}
const advance = (w: ReturnType<typeof game>, seconds: number) => {
  for (let i = 0; i < seconds; i++) {
    w.system.time += 1;
    stepEvents(w, 1);
  }
};

describe('events between storms', () => {
  it('never run in the standard layout', () => {
    const w = createWorld();
    w.system.sun = true;
    w.system.time = 5000;
    stepEvents(w, 1);
    expect(w.exploration.events).toBeUndefined();
  });

  it('bring a solar flare: warned, brighter panels, then gone', () => {
    const w = game();
    w.colony.buildings.push({ id: 90, kind: 'observatory', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'running' });
    w.system.time = 2000;
    expect(startEvent(w, 'flare')).toBe(true);
    expect(eventSolarFactor(w)).toBe(1);
    advance(w, EVENTS.flare.lead + 1);
    expect(eventSolarFactor(w)).toBe(EVENTS.flare.boost);
    advance(w, EVENTS.flare.duration + 1);
    expect(eventSolarFactor(w)).toBe(1);
    expect(w.exploration.events!.active).toHaveLength(0);
  });

  it('trips a machine in a base with no battery, and spares one with a battery', () => {
    const bare = game();
    bare.colony.buildings.push({ id: 91, kind: 'refinery', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'running' });
    bare.system.time = 2000;
    startEvent(bare, 'flare');
    advance(bare, EVENTS.flare.lead + 1);
    expect(bare.colony.buildings[0].boot).toBe(0);
    const safe = game();
    safe.colony.buildings.push({ id: 91, kind: 'refinery', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'running' });
    safe.colony.buildings.push({ id: 92, kind: 'battery', angle: 0.2, enabled: true, progress: 0, recipe: 0, status: 'idle' });
    safe.system.time = 2000;
    startEvent(safe, 'flare');
    advance(safe, EVENTS.flare.lead + 1);
    expect(safe.colony.buildings[0].boot).toBeUndefined();
    expect(safe.exploration.events!.journal.join(' ')).toMatch(/soaked/);
  });

  it('dims panels and slows rigs in a dust front', () => {
    const w = game();
    w.system.time = 2000;
    startEvent(w, 'dust');
    advance(w, EVENTS.dust.lead + 1);
    expect(eventSolarFactor(w)).toBe(EVENTS.dust.solar);
    expect(eventRigFactor(w)).toBe(EVENTS.dust.rigs);
    w.colony.buildings.push({ id: 93, kind: 'solar', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'running' });
    const dim = generatorOutput(w, w.colony.buildings[0]);
    advance(w, EVENTS.dust.duration + 1);
    expect(dim).toBeCloseTo(generatorOutput(w, w.colony.buildings[0]) * EVENTS.dust.solar, 1);
  });

  it('opens a richer pocket in a seam', () => {
    const w = game();
    const before = w.surfaceDeposits.reduce((n, d) => n + d.remaining, 0);
    expect(startEvent(w, 'pocket', () => 0.5)).toBe(true);
    const after = w.surfaceDeposits.reduce((n, d) => n + d.remaining, 0);
    expect(after).toBeGreaterThan(before);
  });

  it('drops ice rocks into orbit with a comet', () => {
    const w = game();
    const before = w.asteroids.length;
    expect(startEvent(w, 'comet')).toBe(true);
    expect(w.asteroids.length).toBe(before + EVENTS.comet.rocks);
    expect(new Set([...w.asteroids, ...w.pickups].map(b => b.id)).size).toBe(w.asteroids.length + w.pickups.length);
  });

  it('damages a running machine with a fault', () => {
    const w = game();
    w.colony.buildings.push({ id: 94, kind: 'refinery', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'running' });
    expect(startEvent(w, 'fault')).toBe(true);
    expect(w.colony.buildings[0].health).toBe(100 - EVENTS.fault.damage);
  });

  it('lets a claim-jumper take a share of an unclaimed seam, unless a rig is on it', () => {
    const w = game();
    w.outposts.moon.colony.buildings.push({ id: 95, kind: 'solar', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'running' });
    w.system.time = 3000;
    expect(startEvent(w, 'jumper', () => 0)).toBe(true);
    const seamId = w.exploration.events!.active[0].seam!;
    const seam = w.surfaceDeposits.find(d => d.id === seamId)!;
    const start = seam.remaining;
    advance(w, 60);
    expect(seam.remaining).toBeLessThan(start);
    w.colony.buildings.push({ id: 96, kind: 'miningRig', angle: seam.angle, enabled: true, progress: 0, recipe: 0, status: 'running', depositId: seamId });
    advance(w, 2);
    expect(w.exploration.events!.active).toHaveLength(0);
  });

  it('holds supply lanes and raises pod risk in a debris field', () => {
    const w = game();
    w.system.time = 4000;
    startEvent(w, 'debris');
    expect(lanesBlocked(w)).toBe(false);
    advance(w, EVENTS.debris.lead + 1);
    expect(lanesBlocked(w)).toBe(true);
    expect(eventPodRisk(w)).toBe(EVENTS.debris.podRisk);
  });

  it('choose by themselves from a seed, the same way every time', () => {
    const run = () => {
      const w = game();
      w.colony.buildings.push({ id: 97, kind: 'observatory', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'running' });
      w.objectives.completed.push('buoy');
      w.system.time = EVENTS.first;
      for (let t = 0; t < 12; t++) {
        advance(w, 1000);
        expect(validExploration(w)).toBe(true);
      }
      return { journal: w.exploration.events!.journal.join('|'), count: w.exploration.events!.count };
    };
    expect(run()).toEqual(run());
    expect(run().count).toBeGreaterThan(0);
  });

  it('save and load with the world', () => {
    const w = game();
    w.system.time = 2000;
    startEvent(w, 'dust');
    expect(validExploration(w)).toBe(true);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.events).toEqual(w.exploration.events);
    stepWorld(loaded, { thrust: false, turn: 0 }, STEP);
  });
});
