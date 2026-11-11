import type Phaser from 'phaser';
import { planetAt } from '../sim/celestial';
import { heading } from '../sim/math';
import { PROSPECT, scanPulse } from '../sim/prospect';
import type { WorldState } from '../sim/world';

/** Seconds the pulse takes to spread to full reach, then to fade. */
const SPREAD = 1.6;
const FADE = 1.2;
const COLOUR = 0x7fe3ff;

/**
 * The ground scan: a ring drops from the lander to the ground, then two bright fronts run out along the surface to
 * the edge of the scanner's reach, leaving a faint band over the stretch it covered.
 */
export function drawScanPulse(g: Phaser.GameObjects.Graphics, world: WorldState): void {
  const { pulse } = scanPulse(world);
  if (pulse === null) return;
  const age = world.system.time - pulse.at;
  if (age < 0 || age > SPREAD + FADE) return;
  const planet = planetAt(pulse.body, world.system);
  const radius = planet.radius;
  const spread = Math.min(1, age / SPREAD);
  const fade = age <= SPREAD ? 1 : 1 - (age - SPREAD) / FADE;
  const reach = (PROSPECT.reach / radius) * (1 - (1 - spread) ** 2);
  g.save();
  g.translateCanvas(planet.position.x, planet.position.y);
  g.rotateCanvas(planet.spin);
  // The drop: a ring falling from the lander to the ground in the first quarter second.
  const drop = Math.min(1, age / 0.25);
  const n = heading(pulse.angle);
  const h = pulse.height * (1 - drop);
  g.lineStyle(2, COLOUR, 0.8 * (1 - drop * 0.6) * fade);
  g.strokeCircle(n.x * (radius + h), n.y * (radius + h), 10 + 30 * drop);
  // The band over the stretch scanned so far.
  const band = (lift: number, width: number, alpha: number) => {
    const steps = Math.max(8, Math.ceil((reach * 2 * radius) / 20));
    g.lineStyle(width, COLOUR, alpha);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const p = heading(pulse.angle - reach + (2 * reach * i) / steps);
      if (i === 0) g.moveTo(p.x * (radius + lift), p.y * (radius + lift));
      else g.lineTo(p.x * (radius + lift), p.y * (radius + lift));
    }
    g.strokePath();
  };
  band(4, 6, 0.18 * fade);
  band(4, 1.5, 0.5 * fade);
  // The two fronts.
  for (const side of [-1, 1]) {
    const p = heading(pulse.angle + side * reach);
    g.lineStyle(2.5, COLOUR, 0.9 * fade);
    g.lineBetween(p.x * radius, p.y * radius, p.x * (radius + 26), p.y * (radius + 26));
  }
  g.restore();
}
