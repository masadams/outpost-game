import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { PROBE, launchProbe, probeError } from '../src/sim/probes';

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
    expect(probeError(w)).toBe('Pick a belt on the Map to survey.');
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
