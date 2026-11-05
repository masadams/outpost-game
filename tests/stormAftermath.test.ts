import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, type WorldState } from '../src/sim/world';
import { planetAt, surfacePosition } from '../src/sim/celestial';
import { STORM, ANALYSED_DAMAGE_FACTOR } from '../src/sim/stormConfig';
import { turretState } from '../src/sim/weapons';
import { damageColony } from '../src/sim/buildingDamage';
import { buildingHealth } from '../src/sim/buildingHealth';
import { baseView } from '../src/ui/base/baseView';
import { encodeCheckpoint, decodeCheckpoint } from '../src/persistence/checkpoint';

const IDLE = { thrust: false, turn: 0 };

function afterStorm(): WorldState {
  const w = createWorld();
  w.asteroids = [];
  w.colony.buildings = [
    { id: 1, kind: 'observatory', angle: 0.02, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 2, kind: 'solar', angle: 0.03, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 3, kind: 'laser', angle: 0.075, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 4, kind: 'laser', angle: 0.085, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 5, kind: 'battery', angle: 0.06, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
    { id: 6, kind: 'battery', angle: 0.065, enabled: true, progress: 0, recipe: 0, status: 'idle', health: 100 },
  ] as never;
  w.colony.nextId = 10;
  w.colony.energy = 120;
  for (const b of w.colony.buildings) if (b.kind === 'laser') turretState(b).automatic = true;
  w.system.time = 1000;
  while (w.storm.phase !== 'over') stepWorld(w, IDLE, 1 / 60);
  return w;
}

describe('after the first storm', { timeout: 120000 }, () => {
  it('leaves pieces on the ground even when every rock was shot apart, and picking one up needs a walk', () => {
    const w = afterStorm();
    expect(w.defence.impacts).toBe(0);
    expect(w.storm.samples.length).toBeGreaterThanOrEqual(3);
    expect(w.storm.held).toBe(0);
    // Standing in the ship, nothing is collected.
    for (let i = 0; i < 60; i++) stepWorld(w, IDLE, 1 / 60);
    expect(w.storm.held).toBe(0);
    const target = w.storm.samples[0];
    const planet = planetAt('home', w.system);
    w.playerMode = 'astronaut';
    w.astronaut.position = surfacePosition(planet, target.angle, 1.5);
    w.astronaut.velocity = { ...planet.velocity };
    w.astronaut.grounded = true;
    stepWorld(w, IDLE, 1 / 60);
    expect(w.storm.held).toBe(1);
    expect(w.storm.samples.some(s => s.id === target.id)).toBe(false);
  });

  it('analysing a piece costs power and a working Observatory, and then hardens buildings', () => {
    const w = afterStorm();
    const act = (type: 'analyseSample') => stepWorld(w, { ...IDLE, colonyActions: [{ type }] }, 1 / 60);
    act('analyseSample');
    expect(w.storm.analysed).toBe(false);
    expect(baseView(w).storm?.blocked).toContain('piece');
    w.storm.held = 1;
    w.colony.energy = 5;
    act('analyseSample');
    expect(w.storm.analysed).toBe(false);
    w.colony.energy = 60;
    act('analyseSample');
    expect(w.storm.analysed).toBe(true);
    expect(w.storm.held).toBe(0);
    expect(w.colony.energy).toBeLessThan(45);
    expect(baseView(w).storm?.analysed).toBe(true);

    const plain = afterStorm();
    const hurt = (world: WorldState) => {
      const b = world.colony.buildings[1];
      b.health = 100;
      const at = surfacePosition(planetAt('home', world.system), b.angle, 0);
      damageColony(world, at, 50, 30);
      return 100 - buildingHealth(b);
    };
    expect(hurt(w)).toBeCloseTo(hurt(plain) * ANALYSED_DAMAGE_FACTOR, 5);
  });

  it('keeps pieces, carried samples and the analysis through a save', () => {
    const w = afterStorm();
    w.storm.held = 1;
    w.storm.analysed = true;
    const loaded = decodeCheckpoint(encodeCheckpoint(w));
    expect(loaded.storm.samples).toEqual(w.storm.samples);
    expect(loaded.storm.held).toBe(1);
    expect(loaded.storm.analysed).toBe(true);
    expect(STORM.aim.length).toBeGreaterThan(0);
  });
});
