import type Phaser from 'phaser';
import { planets, surfaceAngle, surfacePosition } from '../sim/celestial';
import { WORLD } from '../sim/config';
import { heading, wrap } from '../sim/math';
import type { WorldState } from '../sim/world';
import { visible, type RenderView } from './budget';
import { seeded } from './mining/random';

/** Metres between candidate rocks along the ground. */
const SPACING = 14;

/**
 * Small rocks and pits along the ground, fixed to the surface. They give the ground texture and show it turning under you.
 * Deterministic from position, so the same rock is always in the same place. Kept clear of the pad.
 */
export function drawGround(g: Phaser.GameObjects.Graphics, w: WorldState, view: RenderView, zoom: number): void {
  if (zoom < 0.35) return;
  for (const planet of planets(w.system)) {
    const toCentre = Math.hypot(view.centre.x - planet.position.x, view.centre.y - planet.position.y);
    if (Math.abs(toCentre - planet.radius) > view.radius + 50) continue;
    const here = surfaceAngle(planet, view.centre);
    const span = Math.min(Math.PI, (view.radius + 30) / planet.radius);
    const step = SPACING / planet.radius;
    const first = Math.floor((here - span) / step);
    const last = Math.ceil((here + span) / step);
    for (let k = first; k <= last; k++) {
      const rand = seeded(k * 7919 + (planet.id === 'moon' ? 104729 : 0));
      if (rand() < 0.35) continue;
      const angle = wrap(k * step + (rand() - 0.5) * step * 0.8);
      if (planet.id === 'home' && Math.abs(wrap(angle - WORLD.padAngle)) * planet.radius < 40) continue;
      const at = surfacePosition(planet, angle, 0);
      if (!visible(view, at, 10)) continue;
      const up = heading(angle + planet.spin);
      const side = { x: -up.y, y: up.x };
      const size = 0.6 + rand() * 1.8;
      if (rand() < 0.25) {
        // A shallow pit: a dark dip with a light lip.
        g.lineStyle(0.5, 0x0f1d26, 0.7);
        g.lineBetween(at.x - side.x * size * 1.8, at.y - side.y * size * 1.8, at.x + side.x * size * 1.8, at.y + side.y * size * 1.8);
        continue;
      }
      const lean = (rand() - 0.5) * 0.8;
      g.fillStyle(planet.id === 'moon' ? 0x3c3848 : 0x2b3a42, 0.95);
      g.fillTriangle(
        at.x - side.x * size, at.y - side.y * size,
        at.x + side.x * size * 0.9, at.y + side.y * size * 0.9,
        at.x + up.x * size * 1.1 + side.x * lean * size, at.y + up.y * size * 1.1 + side.y * lean * size,
      );
      g.lineStyle(0.3, 0x6c8692, 0.6);
      g.lineBetween(at.x - side.x * size, at.y - side.y * size, at.x + up.x * size * 1.1 + side.x * lean * size, at.y + up.y * size * 1.1 + side.y * lean * size);
    }
  }
}
