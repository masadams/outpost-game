import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/world';
import { preflight } from '../src/sim/preflight';

function world() {
  const w = createWorld();
  w.system.binary = true;
  return w;
}

describe('pre-flight check', () => {
  it('is ready with a full tank for a near trip', () => {
    const w = world();
    const check = preflight(w, 'moon');
    expect(check.verdict).toBe('ready');
    expect(check.line).toMatch(/Enough fuel/);
  });

  it('asks for a refuel when the tank is low but big enough', () => {
    const w = world();
    w.ship.fuel = 1;
    const check = preflight(w, 'moon');
    expect(check.verdict).toBe('refuel');
    expect(check.line).toMatch(/Refuel first/);
  });
});

import { thrustToWeight, liftoffWarning } from '../src/sim/preflight';

describe('liftoff weight check', () => {
  it('the standard ship lifts off easily, loaded or not', () => {
    const w = createWorld();
    w.ship.cargo.iron = 100;
    expect(thrustToWeight(w)).toBeGreaterThan(1.5);
    expect(liftoffWarning(w)).toBeNull();
  });

  it('warns when a heavy build and a full hold barely climb', () => {
    const w = createWorld();
    w.ship.equipment = ['ionDrive', 'surveyTank', 'bulkHold', 'layeredArmour', 'deepMining'];
    w.ship.fuel = 400;
    w.ship.cargo.iron = 300;
    const ratio = thrustToWeight(w);
    expect(ratio).toBeLessThan(1.5);
    expect(liftoffWarning(w)).toMatch(/Heavy/);
  });

  it('says too heavy below 1', () => {
    const w = createWorld();
    w.ship.cargo.iron = 5000;
    expect(thrustToWeight(w)).toBeLessThan(1);
    expect(liftoffWarning(w)).toMatch(/Too heavy/);
  });
});
