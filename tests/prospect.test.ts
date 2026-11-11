import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../src/sim/world';
import { planetAt, surfacePosition } from '../src/sim/celestial';
import { WORLD } from '../src/sim/config';
import { seamKnown } from '../src/sim/geology';
import { PROSPECT, prospect, prospectBlock, scanButton } from '../src/sim/prospect';
import { wrap } from '../src/sim/math';

const idle = { thrust: false, turn: 0 };

/** A lander hovering above the farthest seam from the pad, with every seam still unknown. */
function hovering(height = 400) {
  const w = createWorld(4242);
  w.asteroids = [];
  const seam = w.surfaceDeposits.reduce((far, d) => (Math.abs(d.angle) > Math.abs(far.angle) ? d : far));
  for (const d of w.surfaceDeposits) d.surveyed = false;
  w.ship.state = 'flying';
  w.ship.position = surfacePosition(planetAt('home', w.system), seam.angle, height);
  return { w, seam };
}

describe('ground scan from the lander', () => {
  it('finds every seam within reach of the point below, and none beyond', () => {
    const { w, seam } = hovering();
    const found = prospect(w);
    expect(found).toBeGreaterThan(0);
    expect(seamKnown(seam)).toBe(true);
    for (const d of w.surfaceDeposits) {
      const gap = Math.abs(wrap(seam.angle - d.angle)) * WORLD.radius - d.halfWidth;
      expect(seamKnown(d)).toBe(gap <= PROSPECT.reach);
    }
  });

  it('needs time to recharge, and says how long', () => {
    const { w } = hovering();
    prospect(w);
    expect(prospectBlock(w)).toMatch(/recharging · \d+ s/);
    expect(prospect(w)).toBeNull();
    for (let i = 0; i < 60 * (PROSPECT.cooldown + 1); i++) stepWorld(w, idle, 1 / 60);
    w.ship.state = 'flying';
    w.ship.position = surfacePosition(planetAt('home', w.system), 0, 400);
    expect(prospectBlock(w)).toBeNull();
  });

  it('says why it cannot scan when too high or on foot', () => {
    const { w } = hovering(PROSPECT.height + 500);
    expect(prospectBlock(w)).toMatch(/Fly lower/);
    expect(prospect(w)).toBeNull();
    w.playerMode = 'astronaut';
    expect(prospectBlock(w)).toMatch(/Board the lander/);
    expect(scanButton(w)).toBeNull();
  });

  it('hides the button once every seam on the world is known', () => {
    const { w } = hovering();
    expect(scanButton(w)?.unknown).toBeGreaterThan(0);
    for (const d of w.surfaceDeposits) d.surveyed = true;
    expect(scanButton(w)).toBeNull();
  });
});
