import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { firstSortie } from './pilot';
import { inventoryMass } from '../src/sim/resources';

function total(w: ReturnType<typeof createWorld>): number {
  return w.asteroids.reduce((s, r) => s + r.mass, 0) + w.pickups.reduce((s, p) => s + p.mass, 0) + inventoryMass(w.ship.cargo) + inventoryMass(w.depot);
}

describe('the first sortie, flown with the player\'s controls', () => {
  it.each([[0, false], [4242, true], [77, true]] as const)('seed %i, day cycle %s: lift off, mine, pull in, land on the pad, unload', (seed, sun) => {
    const w = createWorld(seed);
    w.system.sun = sun;
    const before = total(w);
    const result = firstSortie(w);
    expect(result.why).toBe('delivered');
    expect(result.delivered).toBeGreaterThan(0);
    expect(w.objectives.completed).toContain('delivery');
    expect(total(w)).toBeCloseTo(before, 6);
    expect(w.ship.hull).toBeGreaterThan(90);
  }, 60000);
});

describe('after the first delivery: build, survey, watch, storm', () => {
  it('builds by queueing on foot, earns the Observatory from the buoy, watches and sees the storm come', async () => {
    const { stepWorld } = await import('../src/sim/world');
    const { completedBuilding } = await import('../src/sim/construction');
    const w = createWorld(4242);
    w.system.sun = true;
    expect(firstSortie(w).why).toBe('delivered');
    // Step out and queue a solar array and a refinery near the pad; the astronaut walks over and builds them.
    stepWorld(w, { thrust: false, turn: 0, board: true }, 1 / 60);
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.playerMode).toBe('astronaut');
    stepWorld(w, { thrust: false, turn: 0, colonyActions: [{ type: 'queueBuild', kind: 'solar', angle: 0.06 }, { type: 'queueBuild', kind: 'refinery', angle: -0.06 }] }, 1 / 60);
    stepWorld(w, { thrust: false, turn: 0, colonyActions: [{ type: 'crewOrder', operation: 'build' }] }, 1 / 60);
    const built = () => w.colony.buildings.filter(b => b.kind !== 'headquarters').length;
    for (let i = 0; i < 60 * 240 && built() < 2; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.colony.buildings.map(b => b.kind).filter(k => k !== 'headquarters').sort()).toEqual(['refinery', 'solar']);
    // The refinery turns the delivered ore into products while the sun is up, and industry counts as running.
    for (let i = 0; i < 60 * 60 && !w.objectives.completed.includes('industry'); i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.objectives.completed).toContain('industry');
    // Surveying the buoy is a flight task covered elsewhere; here it is recorded, as the visit does.
    w.exploration.surveyed.push('frost');
    w.colony.buildings.push(completedBuilding(w.colony.nextId++, 'observatory', 0.12, w));
    for (let i = 0; i < 4 * 1600 && w.storm.phase !== 'approaching'; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.25);
    expect(w.storm.armed).toBe(true);
    expect(w.storm.phase).toBe('approaching');
    expect(w.exploration.known).toContain('moon');
  }, 120000);
});
