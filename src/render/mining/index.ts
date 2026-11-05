import Phaser from 'phaser';
import { visible, type RenderView } from '../budget';
import { tractorStats } from '../../sim/shipStats';
import { MINING } from '../../sim/mining';
import { RESOURCE_INFO } from '../../sim/resources';
import type { WorldState } from '../../sim/world';
import { drawLaser } from './laser';
import { drawRock } from './rocks';

export interface MiningDrawOptions {
  zoom: number;
  view?: RenderView;
  /** Craters, glints and twinkling. Off on reduced graphics. */
  detail: boolean;
  /** Seconds of animation time. */
  time: number;
  /** False when paused or reduced motion is on. */
  animate: boolean;
}

/** Rocks, ore, the tractor field and the mining laser. */
export function drawMining(g: Phaser.GameObjects.Graphics, world: WorldState, options: MiningDrawOptions): void {
  const { zoom, view, detail, time, animate } = options;
  const px = 1 / zoom;
  const targeted = world.beam?.targetId ?? null;

  for (const rock of world.asteroids) {
    if (!visible(view, rock.position, rock.radius)) continue;
    drawRock(g, rock, { zoom, time: animate ? time : 0, detail, targeted: rock.id === targeted });
  }

  for (const ore of world.pickups) {
    if (!visible(view, ore.position, 4 * px)) continue;
    const colour = RESOURCE_INFO[ore.resource].color;
    const size = Math.max(2, 2 * px);
    const turn = animate ? time * 1.4 + ore.id : ore.id;
    const x = ore.position.x;
    const y = ore.position.y;
    g.fillStyle(colour, 0.16);
    g.fillCircle(x, y, size * 2.4);
    const corners = [0, 1, 2, 3].map(i => {
      const a = turn + (i * Math.PI) / 2;
      const r = i % 2 === 0 ? size * 1.1 : size * 0.8;
      return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
    });
    g.fillStyle(colour);
    g.fillPoints(corners, true);
    g.lineStyle(0.9 * px, 0xffffff, 0.7);
    g.strokePoints(corners, true);
    if (animate) {
      g.fillStyle(0xffffff, Math.max(0, 0.4 + 0.5 * Math.sin(time * 5 + ore.id * 1.7)));
      g.fillCircle(x - size * 0.2, y - size * 0.25, size * 0.28);
    }
  }

  if (world.tractorActive) drawTractor(g, world, zoom, time, animate);

  if (world.beam) {
    drawLaser(g, world.beam, { zoom, time, animate, hitting: world.beam.targetId !== null });
  }
}

function drawTractor(g: Phaser.GameObjects.Graphics, world: WorldState, zoom: number, time: number, animate: boolean): void {
  const px = 1 / zoom;
  const ship = world.ship.position;
  const range = tractorStats(world.ship).range;
  g.lineStyle(1 * px, 0x73f3cf, 0.14);
  g.strokeCircle(ship.x, ship.y, range);

  for (const ore of world.pickups) {
    const dx = ship.x - ore.position.x;
    const dy = ship.y - ore.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance > range) continue;
    const colliding = distance <= MINING.collectRange;
    g.lineStyle(1 * px, 0x73f3cf, colliding ? 0.5 : 0.2);
    g.lineBetween(ship.x, ship.y, ore.position.x, ore.position.y);
    g.strokeCircle(ore.position.x, ore.position.y, Math.max(3.5, 3.5 * px));
    // Dots stream from the ore towards the ship, so the pull has a direction.
    const dots = Math.max(3, Math.min(14, Math.round(distance / 22)));
    g.fillStyle(0xbffcf0, 0.85);
    for (let i = 0; i < dots; i++) {
      const t = animate ? (i / dots + time * 0.9) % 1 : (i + 0.5) / dots;
      g.fillCircle(ore.position.x + dx * t, ore.position.y + dy * t, 1.3 * px);
    }
  }
}
