import { describe, expect, it } from 'vitest';
import { SUN, daylightAt, sunAngle, sunClock, sunElevation } from '../src/sim/sun';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';

const sys = (time: number, sun = true) => ({ time, binary: true, sun });

describe('sun and day', () => {
  it('is always full daylight when the sun is off', () => {
    for (const t of [0, 300, 450, 600]) expect(daylightAt(sys(t, false), 0)).toBe(1);
  });

  it('starts in the morning in full light, reaches noon, then dusk, night and dawn', () => {
    expect(daylightAt(sys(0), 0)).toBe(1);
    const noon = (0 - SUN.startAngle) / (Math.PI * 2) * SUN.dayLength;
    expect(sunElevation(0, noon)).toBeCloseTo(1, 3);
    const clock = (t: number) => sunClock(sys(t), 0);
    expect(clock(noon).phase).toBe('day');
    expect(clock(noon + SUN.dayLength * 0.28).phase).toBe('dusk');
    expect(clock(noon + SUN.dayLength * 0.5).phase).toBe('night');
    expect(clock(noon + SUN.dayLength * 0.72).phase).toBe('dawn');
    expect(clock(noon + SUN.dayLength).phase).toBe('day');
  });

  it('keeps the first night after the first sortie and makes nights shorter than days', () => {
    let firstDusk = -1;
    let nightSeconds = 0;
    for (let t = 0; t < SUN.dayLength; t += 1) {
      const d = daylightAt(sys(t), 0);
      if (firstDusk < 0 && d < 0.9) firstDusk = t;
      if (d <= 0.01) nightSeconds++;
    }
    expect(firstDusk).toBeGreaterThan(300);
    expect(nightSeconds).toBeLessThan(SUN.dayLength * 0.45);
    expect(nightSeconds).toBeGreaterThan(SUN.dayLength * 0.25);
  });

  it('says how long until the light changes, and that moment really is half light', () => {
    for (const t of [0, 200, 480, 700]) {
      const c = sunClock(sys(t), 0);
      const later = sunClock(sys(t + c.secondsToChange + 0.01), 0);
      expect(later.day).toBe(!c.day);
      expect(Math.abs(daylightAt(sys(t + c.secondsToChange), 0) - 0.5)).toBeLessThan(0.02);
    }
  });

  it('is deterministic from time alone', () => {
    expect(sunAngle(1234.5)).toBe(sunAngle(1234.5));
  });
});

describe('solar power follows the sun', () => {
  function plant(sun: boolean, time: number) {
    const w = createWorld();
    w.system.sun = sun;
    w.system.time = time;
    w.colony.buildings.push(completedBuilding(w.colony.nextId++, 'solar', 0.05, w));
    stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    return w.colony.generation;
  }

  it('gives full power in daylight, none at night, and is unchanged with the sun off', () => {
    expect(plant(false, 450)).toBeCloseTo(8, 5);
    expect(plant(true, 0)).toBeCloseTo(8, 1);
    expect(plant(true, 620)).toBe(0);
    const dusk = plant(true, 470);
    expect(dusk).toBeGreaterThanOrEqual(0);
    expect(dusk).toBeLessThan(8);
  });
});

describe('what the Base says about night', () => {
  it('says the panels are off and how long storage lasts', async () => {
    const { baseView } = await import('../src/ui/base/baseView');
    const w = createWorld();
    w.system.sun = true;
    w.system.time = 640;
    w.colony.buildings.push(completedBuilding(w.colony.nextId++, 'solar', 0.05, w));
    w.colony.buildings.push(completedBuilding(w.colony.nextId++, 'battery', 0.07, w));
    w.colony.buildings.push(completedBuilding(w.colony.nextId++, 'refinery', 0.09, w));
    w.depot.iron = 10;
    w.colony.energy = 100;
    for (let i = 0; i < 120; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(baseView(w).power.summary).toMatch(/^Night: solar panels are off\./);
  });
});

describe('power forecast', () => {
  it('says when the light changes and whether storage covers a night', async () => {
    const { baseView } = await import('../src/ui/base/baseView');
    const w = createWorld();
    expect(baseView(w).power.forecast).toBeNull();
    w.system.sun = true;
    w.colony.buildings.push(completedBuilding(w.colony.nextId++, 'solar', 0.05, w));
    w.colony.buildings.push(completedBuilding(w.colony.nextId++, 'refinery', 0.09, w));
    w.depot.iron = 20;
    for (let i = 0; i < 300; i++) stepWorld(w, { thrust: false, turn: 0 }, 1 / 60);
    expect(baseView(w).power.forecast).toMatch(/^Dusk in .* needs about \d+ kJ/);
    w.system.time = 640;
    expect(baseView(w).power.forecast).toMatch(/^Light returns in/);
  });
});
