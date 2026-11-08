import { describe, expect, it } from 'vitest';
import { newWorld } from '../src/preferences/sun';
import { telemetry } from '../src/sim/physics';

describe('a new day-cycle game', () => {
  it('shows no drift on the parked lander before the first step', () => {
    const w = newWorld(77);
    if (!w.system.sun) return;
    expect(Math.abs(telemetry(w.ship, 7, w.system).tangential)).toBeLessThan(0.01);
  });
});
