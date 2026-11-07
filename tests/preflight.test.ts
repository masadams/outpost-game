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
