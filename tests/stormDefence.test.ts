import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { turretState } from '../src/sim/weapons';
import { STORM } from '../src/sim/stormConfig';
import { buildingHealth } from '../src/sim/buildingHealth';

const IDLE = { thrust: false, turn: 0 };

/** A small base on the colony side of the pad, in the path of the first storm. */
function base(extra: Array<{ kind: 'laser' | 'battery' | 'solar'; angle: number }>): WorldState {
  const w = createWorld();
  w.asteroids = [];
  w.colony.buildings = [
    { id: 1, kind: 'observatory', angle: 0.02, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 2, kind: 'solar', angle: 0.03, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    ...extra.map((e, i) => ({ id: 3 + i, kind: e.kind, angle: e.angle, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 })),
  ] as never;
  w.colony.nextId = 10;
  w.colony.energy = 30;
  for (const b of w.colony.buildings) if (b.kind === 'laser') turretState(b).automatic = true;
  w.system.time = 1000;
  return w;
}

function outcome(w: WorldState) {
  while (w.storm.phase !== 'over') stepWorld(w, IDLE, 1 / 60);
  const hull = w.colony.buildings.reduce((sum, b) => sum + buildingHealth(b), 0);
  return { impacts: w.defence.impacts, intercepted: w.defence.intercepted, hull, wrecks: w.colony.buildings.filter(b => buildingHealth(b) <= 0).length };
}

describe('first storm against a prepared and an unprepared base', { timeout: 120000 }, () => {
  it('hurts an undefended base, and automatic laser turrets with power make a real difference', () => {
    const bare = outcome(base([]));
    const guarded = outcome(base([
      { kind: 'laser', angle: 0.075 },
      { kind: 'laser', angle: 0.085 },
      { kind: 'battery', angle: 0.06 },
      { kind: 'battery', angle: 0.065 },
    ]));
    const single = outcome(base([{ kind: 'laser', angle: 0.075 }, { kind: 'battery', angle: 0.06 }]));
    const nobattery = outcome(base([{ kind: 'laser', angle: 0.075 }, { kind: 'laser', angle: 0.085 }]));
    // Preparation matters, and power is the limit: turrets with no battery run dry almost at once, one turret with a
    // battery stops about half, two turrets with two batteries stop everything.
    expect(single.impacts).toBeLessThan(bare.impacts);
    expect(nobattery.impacts).toBeGreaterThanOrEqual(single.impacts);
    expect(guarded.impacts).toBeLessThan(single.impacts);
    expect(guarded.impacts).toBe(0);
    // Nobody is wiped out: the first storm is survivable even with no defence at all.
    expect(bare.wrecks).toBe(0);
    expect(bare.hull).toBeGreaterThan(0);
  });
});
