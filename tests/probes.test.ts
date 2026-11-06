import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { PROBE, launchProbe, probeError, scanAround } from '../src/sim/probes';

function ready() {
  const w = createWorld();
  w.colony.products.alloy = 10;
  w.colony.products.wire = 10;
  w.colony.products.components = 10;
  return w;
}

describe('survey probes', () => {
  it('says why it cannot launch', () => {
    const w = ready();
    expect(probeError(w)).toBe('Pick a belt or mark a point on the Map.');
    w.exploration.selected = 'copper';
    w.colony.products.alloy = 1;
    expect(probeError(w)).toMatch(/^Needs 3 more alloy/);
    w.colony.products.alloy = 10;
    expect(probeError(w)).toBeNull();
    w.exploration.surveyed.push('copper');
    expect(probeError(w)).toBe('Already surveyed.');
  });

  it.each(['frost', 'copper'] as const)('reaches the %s belt', belt => {
    const w = ready();
    w.exploration.selected = belt;
    launchProbe(w);
    for (let i = 0; i < 6000 && w.exploration.probes.length > 0; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.1);
    expect(w.exploration.surveyed).toContain(belt);
  });

  it('cannot reach the far rim', () => {
    const w = ready();
    w.exploration.selected = 'rim';
    expect(probeError(w)).toBe('Too far for a probe. Fly there.');
  });

  it('launches, spends its parts, flies to the belt and returns the survey', () => {
    const w = ready();
    w.exploration.selected = 'copper';
    launchProbe(w);
    expect(w.exploration.probes).toHaveLength(1);
    expect(w.colony.products.alloy).toBe(10 - PROBE.cost.alloy);
    for (let i = 0; i < 6000 && w.exploration.probes.length > 0; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.1);
    expect(w.exploration.surveyed).toContain('copper');
    expect(w.exploration.probes).toHaveLength(0);
  });
});

describe('probe on the Map', () => {
  it('offers a launch button on a belt, with the reason when it cannot', async () => {
    const { mapView } = await import('../src/ui/map/mapView');
    const w = ready();
    w.exploration.selected = 'copper';
    const view = mapView(w);
    expect(view.selected.action).toMatchObject({ label: 'Launch survey probe', enabled: true });
    w.colony.products.alloy = 0;
    expect(mapView(w).selected.action).toMatchObject({ enabled: false });
    launchProbe(ready());
  });
});

describe('probes to any point', () => {
  it('marks a point on the chart and selects it', async () => {
    const { applyExplorationAction, MARK_LIMIT } = await import('../src/sim/exploration');
    const w = ready();
    applyExplorationAction(w, { type: 'mark', point: { x: 100, y: -3000 } });
    expect(w.exploration.mark).toEqual({ x: 100, y: -3000 });
    expect(w.exploration.selected).toBe('mark');
    applyExplorationAction(w, { type: 'mark', point: { x: MARK_LIMIT * 2, y: 0 } });
    expect(w.exploration.mark).toEqual({ x: 100, y: -3000 });
  });

  it('scans where it stops: finds a belt there, or reports empty space', async () => {
    const { applyExplorationAction, destination } = await import('../src/sim/exploration');
    const w = ready();
    const belt = destination(w, 'copper').position;
    expect(scanAround(w, belt)).toContain('Copper shoal');
    expect(w.exploration.surveyed).toContain('copper');
    applyExplorationAction(w, { type: 'mark', point: belt });
    expect(probeError(w)).toBeNull();
    launchProbe(w);
    expect(w.exploration.probes[0].target).toBe('mark');
    const empty = ready();
    applyExplorationAction(empty, { type: 'mark', point: { x: 3000, y: -2500 } });
    launchProbe(empty);
    for (let i = 0; i < 6000 && empty.exploration.probes.length > 0; i++) stepWorld(empty, { thrust: false, turn: 0 }, 0.1);
    expect(empty.exploration.surveyed).toHaveLength(0);
    expect(empty.notice.message).toMatch(/NOTHING HERE|lost|propellant/);
  });

  it('will not send a probe beyond its reach', async () => {
    const { applyExplorationAction } = await import('../src/sim/exploration');
    const w = ready();
    applyExplorationAction(w, { type: 'mark', point: { x: 20000, y: 0 } });
    expect(probeError(w)).toBe('Too far for a probe. Fly there.');
  });
});

describe('probes are earned', () => {
  it('need a working, connected Observatory in a day-cycle game', async () => {
    const { completedBuilding } = await import('../src/sim/construction');
    const w = ready();
    w.system.sun = true;
    w.exploration.selected = 'copper';
    expect(probeError(w)).toBe('Needs a working Observatory to receive its data.');
    w.colony.buildings.push(completedBuilding(9, 'observatory', 0.01, w));
    expect(probeError(w)).toBeNull();
    w.colony.buildings[0].linked = false;
    expect(probeError(w)).toBe('Needs a working Observatory to receive its data.');
  });
});
