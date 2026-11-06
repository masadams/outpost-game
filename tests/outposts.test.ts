import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { completedBuilding } from '../src/sim/construction';
import { colonyWorld } from '../src/sim/localWorld';
import { baseView } from '../src/ui/base/baseView';

describe('other worlds in Base', () => {
  it('lists a found world that has buildings, with its power, stores and what is wrong', () => {
    const w = createWorld();
    expect(baseView(w).elsewhere).toEqual([]);
    const moon = colonyWorld(w, 'moon');
    moon.colony.buildings.push(completedBuilding(1001, 'miningRig', 160 / 450, moon));
    moon.colony.products.alloy = 7;
    expect(baseView(w).elsewhere).toEqual([]);
    w.exploration.known.push('moon');
    const view = baseView(w).elsewhere;
    expect(view).toHaveLength(1);
    expect(view[0].label).toBe('Nacre');
    expect(view[0].stores).toContain('Alloy 7');
    expect(view[0].machines.map(m => m.label)).toEqual(['Mining rig']);
  });

  it('shows home when you are on another world, and keeps running while you are away', () => {
    const w = createWorld();
    w.exploration.known.push('moon');
    const moon = colonyWorld(w, 'moon');
    moon.colony.buildings.push(completedBuilding(1001, 'solar', 0.05, moon));
    w.colony.buildings.push(completedBuilding(1, 'solar', 0.05, w));
    stepWorld(w, { thrust: false, turn: 0 }, 0.25);
    expect(moon.colony.generation).toBeGreaterThan(0);
    const fromMoon = baseView(moon).elsewhere;
    expect(fromMoon.map(o => o.id)).toEqual(['home']);
  });
});

describe('hauling ore home', () => {
  it('loads a remote depot into the hold on its pad, and says why not elsewhere', async () => {
    const { haulError, loadAllDepotOre } = await import('../src/sim/freight');
    const { shipPanelView } = await import('../src/ui/ship/shipView');
    const { planetAt, surfacePosition, groundVelocity } = await import('../src/sim/celestial');
    const w = createWorld();
    expect(haulError(w)).toMatch(/other worlds/);
    const moon = colonyWorld(w, 'moon');
    moon.depot.iron = 60;
    moon.depot.ice = 20;
    expect(shipPanelView(w).haul).toBeNull();
    const body = planetAt('moon', w.system);
    w.ship.position = surfacePosition(body, 0, 7);
    w.ship.velocity = { ...groundVelocity(body, w.ship.position) };
    w.ship.state = 'landed';
    w.ship.ground = 'moon';
    expect(haulError(moon)).toBeNull();
    const panel = shipPanelView(moon).haul!;
    expect(panel.enabled).toBe(true);
    expect(panel.text).toContain('80 kg');
    expect(loadAllDepotOre(moon)).toBeCloseTo(80, 6);
    expect(w.ship.cargo.iron).toBe(60);
    expect(moon.depot.iron).toBe(0);
    expect(haulError(moon)).toMatch(/No ore/);
  });
});
