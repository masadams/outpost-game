import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { BOOT_SECONDS, BROWNOUT_SECONDS } from '../src/sim/boot';

const IDLE = { thrust: false, turn: 0 };
const run = (w: WorldState, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) stepWorld(w, IDLE, 1 / 60); };

function base(booting = true) {
  const w = createWorld();
  w.asteroids = [];
  w.colony.buildings = [];
  for (const [kind, angle] of [['observatory', 0.03], ['refinery', 0.06]] as const) {
    const b = completedBuilding(w.colony.nextId++, kind, angle, w);
    if (booting) b.boot = 0;
    w.colony.buildings.push(b);
  }
  for (const [kind, angle] of [['solar', 0.09], ['battery', 0.11]] as const) w.colony.buildings.push(completedBuilding(w.colony.nextId++, kind, angle, w));
  w.depot.iron = 50;
  return w;
}

describe('boot-up', () => {
  it('needs steady power for a few seconds before a new machine runs', () => {
    const w = base();
    w.colony.energy = 100;
    run(w, 2);
    expect([w.colony.buildings[0].status, w.colony.buildings[1].status]).toEqual(['starting', 'starting']);
    expect(w.colony.buildings[1].progress).toBe(0);
    run(w, BOOT_SECONDS + 1);
    expect([w.colony.buildings[0].status, w.colony.buildings[1].status]).toEqual(['running', 'running']);
  });

  it('does not start with only a trickle of power: it waits instead of flickering on and off', () => {
    const w = base();
    w.colony.buildings = w.colony.buildings.filter(b => b.kind !== 'solar');
    w.colony.energy = 0;
    const seen = new Set<string>();
    // About a kilowatt for a few minutes: far less than both machines want.
    for (let i = 0; i < 60 * 120; i++) {
      w.colony.energy = Math.min(w.colony.energy + 1 / 60, 20);
      stepWorld(w, IDLE, 1 / 60);
      for (const b of w.colony.buildings) seen.add(`${b.kind}:${b.status}`);
    }
    expect([...seen].some(s => s.endsWith(':running'))).toBe(false);
  });

  it('rides out a short power cut but shuts down after a long one and must boot again', () => {
    const w = base();
    w.colony.energy = 100;
    run(w, BOOT_SECONDS + 2);
    expect(w.colony.buildings[0].status).toBe('running');
    w.colony.buildings = w.colony.buildings.filter(b => b.kind !== 'solar');
    w.colony.energy = 0;
    run(w, BROWNOUT_SECONDS - 1.5);
    expect(w.colony.buildings[0].boot).toBeGreaterThanOrEqual(BOOT_SECONDS);
    run(w, 4);
    expect(w.colony.buildings[0].boot).toBeLessThan(BOOT_SECONDS);
    w.colony.buildings.push(completedBuilding(w.colony.nextId++, 'solar', 0.13, w));
    w.colony.energy = 40;
    run(w, 1);
    expect(w.colony.buildings[0].status).toBe('starting');
  });

  it('leaves machines without a boot state running at once, as before', () => {
    const w = base(false);
    w.colony.energy = 100;
    run(w, 1);
    expect(w.colony.buildings[0].status).toBe('running');
  });

});
