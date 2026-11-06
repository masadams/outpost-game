import type Phaser from 'phaser';
import { planetAt } from '../sim/celestial';
import { heading } from '../sim/math';
import type { WorldState } from '../sim/world';
import type { RenderView } from './budget';
import { visible } from './budget';

/** Pieces of the storm lying on the ground: small dark rocks with a warm glint, so they can be found. */
export function drawStormSamples(g: Phaser.GameObjects.Graphics, w: WorldState, zoom: number, time: number, view: RenderView): void {
  const storm = w.storm;
  if (storm.samples.length === 0) return;
  const planet = planetAt('home', w.system);
  const px = 1 / zoom;
  for (const sample of storm.samples) {
    const up = heading(sample.angle + planet.spin);
    const at = { x: planet.position.x + up.x * (planet.radius + 0.6), y: planet.position.y + up.y * (planet.radius + 0.6) };
    if (!visible(view, at, 60)) continue;
    const side = { x: -up.y, y: up.x };
    const pulse = 0.55 + 0.35 * Math.sin(time * 3 + sample.id);
    g.fillStyle(0xffb06a, 0.16 * pulse);
    g.fillCircle(at.x + up.x * 1.2, at.y + up.y * 1.2, Math.max(5, 9 * px));
    g.fillStyle(0x2d3b47);
    g.fillTriangle(
      at.x - side.x * 1.8, at.y - side.y * 1.8,
      at.x + side.x * 1.6, at.y + side.y * 1.6,
      at.x + up.x * 2.2 - side.x * 0.3, at.y + up.y * 2.2 - side.y * 0.3,
    );
    g.fillStyle(0xffb06a, pulse);
    g.fillCircle(at.x + up.x * 1.1 + side.x * 0.4, at.y + up.y * 1.1 + side.y * 0.4, Math.max(0.5, 0.7));
  }
}
