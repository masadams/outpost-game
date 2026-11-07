import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { colonyWorld } from '../src/sim/localWorld';
import { POD, podError } from '../src/sim/pods';
import { inventoryMass } from '../src/sim/resources';
import { decodeCheckpoint, encodeCheckpoint } from '../src/persistence/checkpoint';

function outpost() {
  const w = createWorld();
  w.exploration.known.push('moon');
  const moon = colonyWorld(w, 'moon');
  moon.colony.nextId = 1010;
  moon.colony.buildings.push(completedBuilding(1001, 'miningRig', 160 / 450, moon));
  moon.colony.nextId = 1010;
  moon.depot.ice = 25;
  moon.depot.iron = 30;
  moon.colony.products.fuel = 20;
  return { w, moon };
}
const total = (w: ReturnType<typeof createWorld>) => ['home', 'moon'].reduce((s, id) => s + inventoryMass(colonyWorld(w, id as never).depot), 0) + w.exploration.pods.reduce((s, p) => s + inventoryMass(p.cargo), 0);

describe('supply pods', () => {
  it('say why they cannot go, and need a working base and fuel at the sending end', () => {
    const { w, moon } = outpost();
    expect(podError(w, 'moon', 'moon')).toMatch(/another world/);
    expect(podError(w, 'home', 'moon')).toMatch(/mining rig or refinery/);
    moon.colony.products.fuel = 1;
    expect(podError(w, 'moon', 'home')).toMatch(/more fuel/);
    moon.colony.products.fuel = 20;
    expect(podError(w, 'moon', 'home')).toBeNull();
  });

  it('take ore and fuel at launch, arrive later and not before, and never create or lose ore on the way', () => {
    const { w, moon } = outpost();
    const before = total(w);
    stepWorld(w, { thrust: false, turn: 0, colonyActions: [{ type: 'sendPod', from: 'moon', to: 'home' }] }, 1 / 60);
    expect(w.exploration.pods).toHaveLength(1);
    expect(inventoryMass(moon.depot)).toBeCloseTo(55 - POD.capacity, 6);
    expect(moon.colony.products.fuel).toBeCloseTo(20 - POD.fuel - POD.fuelPerKg * POD.capacity, 6);
    expect(total(w)).toBeCloseTo(before, 6);
    expect(inventoryMass(w.depot)).toBe(0);
    const arrives = w.exploration.pods[0].arrives;
    w.system.time = arrives - 1;
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.exploration.pods).toHaveLength(1);
    w.system.time = arrives + 1;
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(w.exploration.pods).toHaveLength(0);
    expect(inventoryMass(w.depot)).toBeCloseTo(POD.capacity, 6);
    expect(total(w)).toBeCloseTo(before, 6);
  });

  it('can be lost on a seeded world, never on the standard layout, and the save keeps pods in flight', () => {
    let lost = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const { w } = outpost();
      w.seed = seed;
      stepWorld(w, { thrust: false, turn: 0, colonyActions: [{ type: 'sendPod', from: 'moon', to: 'home' }] }, 1 / 60);
      if (w.exploration.pods[0]?.doomed) lost++;
    }
    expect(lost).toBeGreaterThan(0);
    expect(lost).toBeLessThan(25);
    const { w } = outpost();
    stepWorld(w, { thrust: false, turn: 0, colonyActions: [{ type: 'sendPod', from: 'moon', to: 'home' }] }, 1 / 60);
    expect(w.exploration.pods[0].doomed).toBe(false);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.pods).toHaveLength(1);
    expect(loaded.exploration.pods[0].arrives).toBe(w.exploration.pods[0].arrives);
  });
});

describe('pods in the Base and Map', () => {
  it('Base offers a send button with a reason, and lists pods on their way; the Map draws them along their path', async () => {
    const { baseView } = await import('../src/ui/base/baseView');
    const { mapView } = await import('../src/ui/map/mapView');
    const { w, moon } = outpost();
    const fromMoon = baseView(moon).pods!;
    expect(fromMoon.sends[0]).toMatchObject({ to: 'home', reason: null });
    expect(baseView(w).pods).toBeNull();
    stepWorld(w, { thrust: false, turn: 0, colonyActions: [{ type: 'sendPod', from: 'moon', to: 'home' }] }, 1 / 60);
    expect(baseView(moon).pods!.flying[0]).toMatch(/Nacre to Selene, \d+ s, 40 kg/);
    expect(mapView(w).pods).toHaveLength(1);
  });
});
