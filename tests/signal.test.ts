import { describe, expect, it } from 'vitest';
import { createWorld, type WorldState } from '../src/sim/world';
import { stepColony } from '../src/sim/colony';
import { completedBuilding } from '../src/sim/construction';
import { STEP } from '../src/sim/config';
import { SIGNAL, echoFor, launchBeacon, signalError, signalWait, stepSignal } from '../src/sim/signal';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';
import { baseView } from '../src/ui/base/baseView';
import { mapView } from '../src/ui/map/mapView';
import { TECH_IDS } from '../src/sim/progressionConfig';

function ready(seed = 7): WorldState {
  const w = createWorld(seed);
  w.system.sun = true;
  w.colony.research.completed.push(...TECH_IDS);
  w.colony.products = { ...w.colony.products, fuel: 60, alloy: 60, wire: 30, components: 30 };
  w.colony.buildings.push(
    completedBuilding(1, 'solar', 0.12, w),
    completedBuilding(2, 'battery', 0.14, w),
    completedBuilding(3, 'observatory', 0.17, w),
    completedBuilding(4, 'antenna', 0.2, w),
  );
  w.colony.nextId = 10;
  w.colony.energy = 20;
  for (let i = 0; i < 400; i++) stepColony(w, STEP);
  return w;
}

describe('the deep signal', () => {
  it('needs the research, a running Observatory and antenna, and the materials', () => {
    const bare = createWorld(7);
    expect(signalError(bare)).toMatch(/Deep signal/);
    const w = ready();
    expect(signalError(w)).toBeNull();
    w.colony.products.fuel = 5;
    expect(signalError(w)).toMatch(/Needs 30 fuel \(you have 5\)/);
    const dark = ready();
    dark.colony.buildings = dark.colony.buildings.filter(b => b.kind !== 'antenna');
    expect(signalError(dark)).toMatch(/antenna/);
  });

  it('launching costs the materials and starts a long wait, once only', () => {
    const w = ready();
    const fuel = w.colony.products.fuel;
    launchBeacon(w);
    expect(w.colony.products.fuel).toBe(fuel - SIGNAL.cost.fuel!);
    expect(w.exploration.signal?.phase).toBe('sent');
    const wait = w.exploration.signal!.hearAt - w.exploration.signal!.sentAt;
    expect(wait).toBeGreaterThanOrEqual(SIGNAL.minimum * SIGNAL.floor);
    expect(wait).toBeLessThanOrEqual(SIGNAL.minimum + SIGNAL.spread);
    expect(signalError(w)).toMatch(/already out there/);
  });

  it('the wait is the same for the same save, differs between saves, and antennas shorten it a little', () => {
    const a = ready(7);
    const b = ready(8);
    expect(signalWait(a)).toBe(signalWait(ready(7)) );
    expect(signalWait(a)).not.toBe(signalWait(b));
    const without = ready(7);
    without.colony.buildings = without.colony.buildings.filter(b => b.kind !== 'antenna');
    expect(signalWait(a)).toBeLessThan(signalWait(without));
    expect(signalWait(a)).toBeGreaterThan(signalWait(without) * SIGNAL.floor - 1);
  });

  it('hears back when the time comes: a seeded system, on the Base screen and the Map', () => {
    const w = ready();
    launchBeacon(w);
    const view = baseView(w).signal!;
    expect(view.state).toBe('waiting');
    expect(mapView(w).echo?.label).toMatch(/listening/);
    w.system.time = w.exploration.signal!.hearAt - 1;
    stepSignal(w);
    expect(w.exploration.signal!.phase).toBe('sent');
    w.system.time += 2;
    stepSignal(w);
    expect(w.exploration.signal!.phase).toBe('heard');
    const echo = w.exploration.signal!.echo!;
    expect(echo).toEqual(echoFor(w.seed));
    expect(echo.worlds).toBeGreaterThanOrEqual(2);
    expect(baseView(w).signal).toMatchObject({ state: 'heard' });
    expect(mapView(w).echo?.label).toContain(echo.name);
    expect(w.notice.message).toMatch(/SIGNAL CAME BACK/);
  });

  it('is not offered before it is researched, and saves and loads at every stage', () => {
    expect(baseView(createWorld(3)).signal).toBeNull();
    const w = ready();
    launchBeacon(w);
    expect(decodeCheckpoint(encodeCheckpoint(w)).exploration.signal?.phase).toBe('sent');
    w.system.time = w.exploration.signal!.hearAt + 1;
    stepSignal(w);
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.exploration.signal?.echo?.name).toBe(w.exploration.signal!.echo!.name);
  });
});
