import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { WORLD } from '../src/sim/config';
import { TIER_REACH, WORKER, workerPosition, workerReach } from '../src/sim/workerBay';
import { tugLoad, TUG } from '../src/sim/tugBay';
import { tierEffect } from '../src/ui/base/upgradeView';
import { tierTechs } from '../src/sim/tiers';
import { blueprintRevealed } from '../src/sim/unlocks';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';

const idle = { thrust: false, turn: 0 };
const at = (metres: number) => metres / WORLD.radius;

/** A powered base with a worker bay, the pilot sitting in the lander on the pad. */
function base() {
  const w = createWorld(4242);
  w.asteroids = [];
  const bay = completedBuilding(1, 'workerBay', at(80), w);
  const battery = completedBuilding(2, 'battery', at(110), w);
  battery.charge = 2000;
  const solar = completedBuilding(3, 'solar', at(140), w);
  w.colony.buildings.push(bay, battery, solar);
  w.colony.nextId = 20;
  w.colony.products.alloy = 60;
  w.colony.products.wire = 30;
  w.colony.products.components = 30;
  return { w, bay };
}

function run(w: ReturnType<typeof createWorld>, seconds: number, actions: never[] = []) {
  stepWorld(w, { ...idle, colonyActions: actions }, 1 / 30);
  for (let i = 0; i < seconds * 30; i++) stepWorld(w, idle, 1 / 30);
}

describe('the worker bay', () => {
  it('builds a queued order with the pilot still in the lander', () => {
    const { w, bay } = base();
    const before = w.colony.buildings.length;
    run(w, 2, [{ type: 'queueBuild', kind: 'storage', angle: at(300) } as never]);
    expect(bay.job?.kind).toBe('build');
    run(w, 12);
    expect(w.colony.command.queue[0]?.status).toBe('drone building');
    expect(w.playerMode).toBe('ship');
    run(w, 28);
    expect(w.colony.buildings.length).toBe(before + 1);
    expect(w.colony.buildings.some(b => b.kind === 'storage')).toBe(true);
    run(w, 20);
    expect(bay.job).toBeUndefined();
  });

  it('leaves orders beyond its reach to the pilot', () => {
    const { w, bay } = base();
    run(w, 2, [{ type: 'queueBuild', kind: 'storage', angle: at(80 + WORKER.reach + 200) } as never]);
    expect(bay.job).toBeUndefined();
    expect(w.colony.command.queue[0].status).toMatch(/waiting/);
  });

  it('repairs a damaged building, paying alloy as the pilot would', () => {
    const { w, bay } = base();
    const solar = w.colony.buildings.find(b => b.kind === 'solar')!;
    solar.health = 40;
    const alloy = w.colony.products.alloy;
    run(w, 40);
    expect(solar.health).toBe(100);
    expect(alloy - w.colony.products.alloy).toBeCloseTo(60 / 10, 1);
    expect(bay.job === undefined || bay.job.leg === 'back').toBe(true);
  });

  it('flies between the bay and the job, and survives a save mid-trip', () => {
    const { w, bay } = base();
    const solar = w.colony.buildings.find(b => b.kind === 'solar')!;
    solar.health = 10;
    run(w, 0.5);
    expect(bay.job?.leg).toBe('out');
    const p = workerPosition(w, bay)!;
    expect(p.height).toBeGreaterThan(14);
    const copy = decodeCheckpoint(encodeCheckpoint(w));
    expect(copy.colony.buildings.find(b => b.id === bay.id)!.job).toEqual(bay.job);
  });

  it('is offered once there is a workshop or a drone bay', () => {
    const { w } = base();
    expect(blueprintRevealed(w, 'workerBay')).toBe(false);
    w.colony.buildings.push(completedBuilding(9, 'workshop', at(-200), w));
    expect(blueprintRevealed(w, 'workerBay')).toBe(true);
  });
});

describe('worker and tug bay tiers', () => {
  it('reach farther and say so, and Tier III needs research of their family', () => {
    const { w, bay } = base();
    expect(workerReach(w, bay)).toBe(WORKER.reach);
    bay.level = 3;
    expect(workerReach(w, bay)).toBe(WORKER.reach + 2 * TIER_REACH);
    expect(tierEffect({ ...bay, level: 1 }, 2)).toContain(`${WORKER.reach + TIER_REACH} m`);
    expect(tierTechs('workerBay', 3)).toContain('autonomy');
    expect(tierTechs('tugBay', 3)).toContain('industrial');
  });

  it('give the tug a bigger load each tier', () => {
    const { w } = base();
    const tug = completedBuilding(30, 'tugBay', at(-300), w);
    expect(tugLoad(tug)).toBe(TUG.load);
    tug.level = 3;
    expect(tugLoad(tug)).toBe(TUG.load + 10);
  });
});
