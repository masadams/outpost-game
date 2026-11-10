import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { applyResearch } from '../src/sim/research';
import { BOOT_SECONDS, needsBoot } from '../src/sim/boot';
import type { BuildType } from '../src/sim/colonyConfig';

/** A base that wants more power than its one solar array makes, run through dusk; counts status changes per machine. */
function flips(battery: boolean): Map<string, number> {
  const w = createWorld();
  w.system.sun = true;
  w.asteroids = [];
  const kinds: BuildType[] = ['solar', ...(battery ? ['battery' as BuildType] : []), 'refinery', 'refinery', 'researchLab', 'observatory', 'fuelProcessor'];
  kinds.forEach((k, i) => {
    const b = completedBuilding(i + 1, k, 0.06 + i * 0.03, w);
    if (needsBoot(k)) b.boot = BOOT_SECONDS;
    w.colony.buildings.push(b);
  });
  w.colony.nextId = 50;
  w.depot.iron = 300;
  w.depot.copper = 300;
  w.depot.ice = 200;
  w.colony.products = { ...w.colony.products, alloy: 40, wire: 30, components: 20, water: 30, oxygen: 10 };
  w.system.time = 300;
  applyResearch(w, { type: 'researchStart', tech: 'materials' });
  w.colony.buildings.filter(b => b.kind === 'refinery')[1].recipe = 1;
  const last = new Map<number, string>();
  const count = new Map<string, number>();
  for (let i = 0; i < 60 * 240; i++) {
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    for (const b of w.colony.buildings) {
      if (last.has(b.id) && last.get(b.id) !== b.status) count.set(`${b.kind}#${b.id}`, (count.get(`${b.kind}#${b.id}`) ?? 0) + 1);
      last.set(b.id, b.status);
    }
  }
  return count;
}

/** The same shortage with the machines a later base has, as an older save holds them (no warm-up state). */
function laterFlips(): Map<string, number> {
  const w = createWorld();
  w.system.sun = true;
  w.asteroids = [];
  const kinds: BuildType[] = ['solar', 'battery', 'condenser', 'condenser', 'antenna', 'workshop', 'refinery', 'fuelProcessor'];
  kinds.forEach((k, i) => w.colony.buildings.push(completedBuilding(i + 1, k, 0.06 + i * 0.03, w)));
  w.colony.nextId = 50;
  w.depot.iron = 300;
  w.depot.ice = 200;
  w.colony.products = { ...w.colony.products, alloy: 40, wire: 30, components: 20, water: 5, oxygen: 5 };
  w.system.time = 300;
  const last = new Map<number, string>();
  const count = new Map<string, number>();
  for (let i = 0; i < 60 * 240; i++) {
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    for (const b of w.colony.buildings) {
      if (last.has(b.id) && last.get(b.id) !== b.status) count.set(`${b.kind}#${b.id}`, (count.get(`${b.kind}#${b.id}`) ?? 0) + 1);
      last.set(b.id, b.status);
    }
  }
  return count;
}

describe('machines short of power', () => {
  it('settle on a later base too: condensers, antenna and workshop, from an older save', () => {
    const counts = laterFlips();
    for (const [machine, n] of counts) expect(n, machine).toBeLessThan(12);
  }, 60000);

  for (const battery of [false, true]) {
    it(`settle instead of flickering on and off (${battery ? 'with' : 'without'} a battery)`, () => {
      for (const [machine, n] of flips(battery)) expect(n, machine).toBeLessThan(12);
    }, 60000);
  }
});
