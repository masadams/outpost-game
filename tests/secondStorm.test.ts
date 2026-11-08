import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { stepStorm } from '../src/sim/storm';
import { quietAfter, stormFor, LATER_STORM_LIMIT, STORM_2 } from '../src/sim/stormConfig';
import { blueprintRevealed } from '../src/sim/unlocks';
import { findStudied } from '../src/sim/finds';
import { researchView } from '../src/ui/base/researchView';

function afterFirstStorm() {
  const w = createWorld();
  w.colony.buildings.push({ id: 90, kind: 'observatory', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'idle' } as never);
  w.storm.armed = true;
  w.storm.planned = true;
  w.storm.phase = 'over';
  w.storm.endedAt = 1000;
  return w;
}

describe('the second storm', () => {
  it('waits out the quiet spell, then plans a bigger storm with a full warning window', () => {
    const w = afterFirstStorm();
    w.system.time = 1000 + quietAfter(1) - 1;
    stepStorm(w);
    expect(w.storm.wave).toBe(1);
    w.system.time = 1000 + quietAfter(1) + 1;
    stepStorm(w);
    expect(w.storm.wave).toBe(2);
    expect(w.storm.phase).toBe('quiet');
    for (let i = 0; i < STORM_2.aim.length + 2; i++) stepStorm(w);
    expect(w.storm.planned).toBe(true);
    expect(w.storm.plan).toHaveLength(STORM_2.aim.length);
    expect(w.storm.arrival).toBeGreaterThanOrEqual(w.system.time + 420);
    expect(STORM_2.aim.length).toBeGreaterThan(7);
  });

  it('reveals the missile turret only once the second storm is on its way', () => {
    const w = createWorld();
    expect(blueprintRevealed(w, 'missile')).toBe(false);
    w.storm.wave = 2;
    expect(blueprintRevealed(w, 'missile')).toBe(true);
  });
});

describe('derelict data', () => {
  it('counts as a find once the copper derelict is visited, and points at the engine', () => {
    const w = createWorld();
    w.system.sun = true;
    expect(findStudied(w, 'derelict')).toBe(false);
    w.exploration.surveyed.push('copper');
    expect(findStudied(w, 'derelict')).toBe(true);
    const row = researchView(w)!.find(r => r.id === 'derelict')!;
    expect(row.action?.kind).toBe('research');
  });
});

describe('refinery auto recipe', () => {
  it('a refinery built in a day-cycle game chooses what the base is short of', async () => {
    const { completedBuilding } = await import('../src/sim/construction');
    const { selectScheduledRecipe } = await import('../src/sim/scheduling');
    const w = createWorld();
    w.depot.iron = 10;
    w.depot.copper = 10;
    const b = completedBuilding(77, 'refinery', 0.2, w);
    b.schedule = { cursor: 0, enabled: true, targets: { alloy: 20, wire: 10, components: 5, water: 10, oxygen: 5 } };
    w.colony.products = { ...w.colony.products, alloy: 25, wire: 0, components: 5, water: 10, oxygen: 5 };
    expect(selectScheduledRecipe(w, b, 400)).toBe(true);
    expect(b.recipe).toBe(1);
  });
});

describe('storms that keep coming', () => {
  it('later storms grow a little, to a limit, and always leave a quiet spell', () => {
    const third = stormFor(3);
    const sixth = stormFor(LATER_STORM_LIMIT);
    const tenth = stormFor(10);
    expect(third.aim.length).toBeGreaterThan(STORM_2.aim.length);
    expect(sixth.aim.length).toBeGreaterThan(third.aim.length);
    expect(tenth.aim.length).toBe(sixth.aim.length);
    expect(Math.max(...sixth.masses)).toBeGreaterThan(Math.max(...third.masses));
    expect(sixth.aim.length).toBeLessThanOrEqual(20);
    expect(quietAfter(5)).toBeGreaterThan(quietAfter(1));
    expect(quietAfter(1)).toBeGreaterThanOrEqual(500);
  });

  it('after the second storm the next one forms, and what the second unlocked stays unlocked', () => {
    const w = afterFirstStorm();
    w.storm.wave = 2;
    w.storm.endedAt = 5000;
    w.system.time = 5000 + quietAfter(2) + 1;
    stepStorm(w);
    expect(w.storm.wave).toBe(3);
    expect(w.storm.phase).toBe('quiet');
    expect(blueprintRevealed(w, 'shieldSmall')).toBe(true);
    expect(blueprintRevealed(w, 'missile')).toBe(true);
    expect(w.objectives.completed).toEqual([]);
  });
});
