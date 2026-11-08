import { describe, expect, it } from 'vitest';
import { createWorld, type WorldState } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { colonyWorld } from '../src/sim/localWorld';
import { applySupplyAction, stepSupply, SUPPLY, supplyUnlocked } from '../src/sim/supply';
import { stepPods } from '../src/sim/pods';
import { baseView } from '../src/ui/base/baseView';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';

function lines(unlocked = true): WorldState {
  const w = createWorld(3);
  w.system.binary = true;
  w.exploration.known.push('moon');
  if (unlocked) w.colony.research.completed.push('materials', 'extraction', 'logistics', 'propulsion', 'orbital', 'massDrivers', 'navigation', 'flightControl', 'podLogistics');
  w.colony.buildings.push(completedBuilding(1, 'refinery', 0.2, w));
  w.colony.nextId = 10;
  w.colony.products.fuel = 60;
  w.depot.iron = 200;
  const moon = colonyWorld(w, 'moon');
  moon.colony.buildings.push(completedBuilding(1001, 'solar', 0.2, moon));
  moon.colony.nextId = 1010;
  w.nextId = 50;
  return w;
}
const on = (w: WorldState) => applySupplyAction(w, { type: 'supply', op: 'toggle' });
const reserve = (w: WorldState, body: 'home' | 'moon', resource: 'iron' | 'ice', times: number) => {
  for (let i = 0; i < times; i++) applySupplyAction(w, { type: 'supplyReserve', body, resource, delta: SUPPLY.step });
};
const tick = (w: WorldState) => { w.system.time += SUPPLY.every + 1; stepSupply(w); };

describe('automatic supply lines', () => {
  it('need Pod logistics, and show only with two worlds', () => {
    const locked = lines(false);
    expect(supplyUnlocked(locked)).toBe(false);
    expect(baseView(locked).supply).toBeNull();
    on(locked);
    expect(locked.exploration.supply).toBeUndefined();
    const w = lines();
    expect(baseView(w).supply?.worlds.map(x => x.body)).toEqual(['home', 'moon']);
  });

  it('reserves move in steps and stop at the limits', () => {
    const w = lines();
    reserve(w, 'moon', 'iron', 3);
    expect(w.exploration.supply!.reserves.moon!.iron).toBe(30);
    applySupplyAction(w, { type: 'supplyReserve', body: 'moon', resource: 'iron', delta: -SUPPLY.step * 10 });
    expect(w.exploration.supply!.reserves.moon!.iron).toBe(30);
    reserve(w, 'moon', 'iron', 100);
    expect(w.exploration.supply!.reserves.moon!.iron).toBe(SUPPLY.limit);
  });

  it('tops a world up from one with ore to spare, with just the kind it needs, and does not double up while the pod flies', () => {
    const w = lines();
    reserve(w, 'moon', 'iron', 4);
    on(w);
    tick(w);
    expect(w.exploration.pods).toHaveLength(1);
    const pod = w.exploration.pods[0];
    expect(pod.to).toBe('moon');
    expect(pod.cargo.iron).toBe(40);
    expect(pod.cargo.ice).toBe(0);
    expect(w.depot.iron).toBe(160);
    expect(w.exploration.supply!.line).toMatch(/Sent 40 kg of iron for Nacre/);
    tick(w);
    expect(w.exploration.pods).toHaveLength(1);
    w.system.time = pod.arrives + 1;
    stepPods(w);
    expect(colonyWorld(w, 'moon').depot.iron).toBe(40);
    tick(w);
    expect(w.exploration.pods).toHaveLength(0);
    expect(w.exploration.supply!.line).toMatch(/has its reserve/);
  });

  it('never takes a world below its own reserve, and says so when nothing is spare', () => {
    const w = lines();
    reserve(w, 'moon', 'iron', 10);
    reserve(w, 'home', 'iron', 19);
    on(w);
    tick(w);
    expect(w.exploration.pods).toHaveLength(1);
    expect(w.exploration.pods[0].cargo.iron).toBe(10);
    expect(w.depot.iron).toBe(190);
    const empty = lines();
    reserve(empty, 'moon', 'ice', 3);
    on(empty);
    tick(empty);
    expect(empty.exploration.pods).toHaveLength(0);
    expect(empty.exploration.supply!.line).toMatch(/no world has any to spare/);
  });

  it('says plainly when it cannot pay for the launch', () => {
    const w = lines();
    w.colony.products.fuel = 0;
    reserve(w, 'moon', 'iron', 4);
    on(w);
    tick(w);
    expect(w.exploration.pods).toHaveLength(0);
    expect(w.exploration.supply!.line).toMatch(/Could not send .* more fuel/);
  });

  it('can be switched off, waits between checks, and saves', () => {
    const w = lines();
    reserve(w, 'moon', 'iron', 4);
    on(w);
    w.system.time += 10;
    stepSupply(w);
    expect(w.exploration.pods).toHaveLength(0);
    on(w);
    tick(w);
    expect(w.exploration.pods).toHaveLength(0);
    on(w);
    tick(w);
    expect(w.exploration.pods).toHaveLength(1);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.supply?.reserves.moon?.iron).toBe(40);
    expect(loaded.exploration.supply?.enabled).toBe(true);
  });
});
