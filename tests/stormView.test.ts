import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { duration, stormView } from '../src/ui/flight/stormView';
import { objectiveCard } from '../src/ui/flight/chromeView';
import { observeObjectives } from '../src/sim/objectives';

function watching(seconds: number) {
  const w = createWorld();
  w.system.time = 1000;
  w.colony.buildings.push({ id: 90, kind: 'observatory', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'idle' } as never);
  w.colony.buildings.push({ id: 91, kind: 'solar', angle: -0.1, enabled: true, progress: 0, recipe: 0, status: 'idle' } as never);
  w.colony.energy = 50;
  while (w.storm.phase !== 'approaching') stepWorld(w, { thrust: false, turn: 0 }, 0.25);
  for (let i = 0; i < seconds * 4; i++) stepWorld(w, { thrust: false, turn: 0 }, 0.25);
  return w;
}

describe('storm warning', () => {
  it('formats times in plain words', () => {
    expect(duration(35)).toBe('35 s');
    expect(duration(120)).toBe('2 min');
    expect(duration(250)).toBe('4 min 10 s');
  });

  it('says nothing before an Observatory, then scanning, then a rough warning, then a sharper one', () => {
    expect(stormView(createWorld())).toBeNull();
    expect(stormView(watching(5))?.title).toBe('Scanning the sky');
    const rough = stormView(watching(20));
    expect(rough?.title).toBe('Debris detected');
    expect(rough?.detail).toContain('Several rocks');
    const sharp = stormView(watching(200));
    expect(sharp?.title).toBe('Storm tracked');
    expect(sharp?.detail).toMatch(/\d+ rocks arriving in/);
  });

  it('feeds the objective card and completes the sky goal once the Observatory is running', () => {
    const w = createWorld();
    expect(objectiveCard(w, 'sky').detail).toContain('Observatory');
    const scanning = watching(10);
    observeObjectives(scanning);
    expect(scanning.objectives.completed).toContain('sky');
    expect(objectiveCard(scanning, 'storm').detail).toContain('Something may be out there');
  });
});

describe('storm on the map', () => {
  it('shows nothing until the Observatory has seen it, then rocks on the chart edge and a landing zone', async () => {
    const { mapView } = await import('../src/ui/map/mapView');
    expect(mapView(createWorld()).storm).toBeNull();
    const w = watching(20);
    const marks = mapView(w).storm!;
    expect(marks.rocks.length).toBeGreaterThan(0);
    expect(marks.rocks.every(r => r.offChart)).toBe(true);
    expect(marks.doubt).toBeGreaterThan(300);
    expect(marks.zone?.radius).toBeGreaterThan(70);
    expect(marks.line).toMatch(/Landing about \d+ m (left|right) of the pad/);
    const sharp = mapView(watching(200)).storm!;
    expect(sharp.doubt).toBeLessThan(marks.doubt);
    expect(sharp.zone!.radius).toBeLessThan(marks.zone!.radius);
  });
});
