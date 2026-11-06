import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { applyCrystalAction, crystalAngle, crystalBlock, stepCrystal } from '../src/sim/crystal';
import { planetAt, surfacePosition } from '../src/sim/celestial';
import { cargoCapacity } from '../src/sim/shipStats';
import { CARGO_CAPACITY } from '../src/sim/resources';

function observatoryWorld() {
  const w = createWorld();
  w.colony.buildings.push({ id: 90, kind: 'observatory', angle: 0.1, enabled: true, progress: 0, recipe: 0, status: 'idle' } as never);
  w.colony.energy = 100;
  return w;
}

describe('the Nacre crystal', () => {
  it('is picked up on foot at its spot on Nacre, and not elsewhere', () => {
    const w = createWorld();
    const moon = planetAt('moon', w.system);
    w.playerMode = 'astronaut';
    w.astronaut.grounded = true;
    w.astronaut.position = surfacePosition(moon, crystalAngle() + 0.2, 1);
    stepCrystal(w);
    expect(w.exploration.crystal).toBe('lying');
    w.astronaut.position = surfacePosition(moon, crystalAngle(), 1);
    stepCrystal(w);
    expect(w.exploration.crystal).toBe('carried');
  });

  it('needs a working Observatory and power, then gives a bigger hold that a new lander keeps', () => {
    const w = observatoryWorld();
    expect(crystalBlock(w)).toMatch(/Find the crystal/);
    w.exploration.crystal = 'carried';
    w.colony.energy = 0;
    expect(crystalBlock(w)).toMatch(/kJ/);
    w.colony.energy = 100;
    expect(crystalBlock(w)).toBeNull();
    applyCrystalAction(w);
    expect(w.exploration.crystal).toBe('studied');
    expect(cargoCapacity(w.ship)).toBeGreaterThan(CARGO_CAPACITY);
    expect(crystalBlock(w)).toMatch(/Already/);
    stepWorld(w, { thrust: false, turn: 0 }, 0.1);
  });
});
